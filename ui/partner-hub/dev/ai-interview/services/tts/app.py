import logging
import os
import re
import subprocess
import tempfile
import time
import uuid
from functools import lru_cache
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)

app = FastAPI()
logger = logging.getLogger("ai_interview_tts")

MAX_INPUT_LENGTH = 2000
MAX_ERROR_DETAIL_LENGTH = 500
DEFAULT_PIPER_MODEL_PATH = "/models/en_US-amy-medium.onnx"
DEFAULT_PIPER_LENGTH_SCALE = 1.10
DEFAULT_PIPER_NOISE_SCALE = 0.60
DEFAULT_PIPER_NOISE_W = 0.80
DEFAULT_MP3_BITRATE = "192k"
MIN_PROSODY_VALUE = 0.5
MAX_PROSODY_VALUE = 2.0


_NON_PRINTABLE_PATTERN = re.compile(r"[\x00-\x1F\x7F-\x9F]")
_BITRATE_PATTERN = re.compile(r"^(?P<rate>\d+)(?P<unit>k)$", re.IGNORECASE)


def truncate_error_detail(detail: str) -> str:
    return detail[:MAX_ERROR_DETAIL_LENGTH]


def sanitize_tts_text(text: str) -> str:
    sanitized = text.replace("\r\n", "\n").replace("\r", "\n")
    sanitized = sanitized.replace("`", "").replace("**", "").replace("__", "")
    sanitized = (
        sanitized.replace("“", '"')
        .replace("”", '"')
        .replace("‘", "'")
        .replace("’", "'")
        .replace("—", "-")
        .replace("–", "-")
    )
    sanitized = _NON_PRINTABLE_PATTERN.sub("", sanitized)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    if len(sanitized) > MAX_INPUT_LENGTH:
        raise ValueError(f"Input text exceeds {MAX_INPUT_LENGTH} characters")
    return sanitized


class SpeechRequest(BaseModel):
    input: str | None = None
    text: str | None = None
    voice: str | None = None
    response_format: str | None = None


def get_float_env(name: str, default: float, minimum: float, maximum: float) -> float:
    raw_value = os.environ.get(name)
    if raw_value is None or not raw_value.strip():
        return default
    try:
        parsed = float(raw_value)
    except ValueError:
        logger.warning("Invalid %s=%r; using default %s", name, raw_value, default)
        return default
    if parsed < minimum or parsed > maximum:
        logger.warning(
            "Out of bounds %s=%r; expected %s-%s. Using default %s",
            name,
            parsed,
            minimum,
            maximum,
            default,
        )
        return default
    return parsed


def get_bitrate_env(name: str, default: str) -> str:
    raw_value = os.environ.get(name)
    if raw_value is None or not raw_value.strip():
        return default
    match = _BITRATE_PATTERN.match(raw_value.strip())
    if not match:
        logger.warning("Invalid %s=%r; using default %s", name, raw_value, default)
        return default
    rate = int(match.group("rate"))
    if rate < 32 or rate > 320:
        logger.warning("Out of bounds %s=%r; using default %s", name, raw_value, default)
        return default
    return f"{rate}k"


def get_piper_supported_flags() -> set[str]:
    try:
        result = subprocess.run(
            ["piper", "--help"],
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception as exc:
        logger.warning("Unable to probe piper flags: %s", exc)
        return set()
    help_text = f"{result.stdout}\n{result.stderr}"
    supported = set()
    for flag in ("--length_scale", "--noise_scale", "--noise_w", "--speaker"):
        if flag in help_text:
            supported.add(flag)
    return supported


PIPER_SUPPORTED_FLAGS = get_piper_supported_flags()
EFFECTIVE_LENGTH_SCALE = get_float_env(
    "PIPER_LENGTH_SCALE", DEFAULT_PIPER_LENGTH_SCALE, MIN_PROSODY_VALUE, MAX_PROSODY_VALUE
)
EFFECTIVE_NOISE_SCALE = get_float_env(
    "PIPER_NOISE_SCALE", DEFAULT_PIPER_NOISE_SCALE, MIN_PROSODY_VALUE, MAX_PROSODY_VALUE
)
EFFECTIVE_NOISE_W = get_float_env(
    "PIPER_NOISE_W", DEFAULT_PIPER_NOISE_W, MIN_PROSODY_VALUE, MAX_PROSODY_VALUE
)
EFFECTIVE_MP3_BITRATE = get_bitrate_env("TTS_MP3_BITRATE", DEFAULT_MP3_BITRATE)
LAST_SYNTH_METRICS: dict[str, int | str] = {}

logger.info(
    "tts_config length_scale=%s noise_scale=%s noise_w=%s mp3_bitrate=%s",
    EFFECTIVE_LENGTH_SCALE,
    EFFECTIVE_NOISE_SCALE,
    EFFECTIVE_NOISE_W,
    EFFECTIVE_MP3_BITRATE,
)


@lru_cache(maxsize=1)
def get_piper_version() -> str | None:
    try:
        result = subprocess.run(
            ["piper", "--version"],
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception as exc:
        logger.warning("Unable to read piper version: %s", exc)
        return None
    version_line = (result.stdout or result.stderr or "").strip()
    return version_line or None


@lru_cache(maxsize=1)
def get_ffmpeg_version() -> str | None:
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception as exc:
        logger.warning("Unable to read ffmpeg version: %s", exc)
        return None
    first_line = (result.stdout or "").splitlines()[:1]
    return first_line[0].strip() if first_line else None


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/debug/info")
def debug_info() -> dict:
    model_path = os.environ.get("PIPER_MODEL_PATH", DEFAULT_PIPER_MODEL_PATH)
    return {
        "ok": True,
        "piper_version": get_piper_version(),
        "model_path": model_path,
        "model_basename": os.path.basename(model_path),
        "prosody": {
            "length_scale": EFFECTIVE_LENGTH_SCALE,
            "noise_scale": EFFECTIVE_NOISE_SCALE,
            "noise_w": EFFECTIVE_NOISE_W,
        },
        "mp3_bitrate": EFFECTIVE_MP3_BITRATE,
        "ffmpeg_version": get_ffmpeg_version(),
        "last_synth": LAST_SYNTH_METRICS or None,
    }


@app.post("/v1/audio/speech")
def speech(request: SpeechRequest) -> Response:
    text = request.input or request.text
    if not text:
        raise HTTPException(status_code=400, detail="Missing input text")
    try:
        sanitized_text = sanitize_tts_text(text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not sanitized_text:
        raise HTTPException(status_code=400, detail="Missing input text")
    if len(sanitized_text) < 2:
        raise HTTPException(status_code=400, detail="Input text is too short")

    response_format = (request.response_format or "mp3").lower()
    if response_format not in {"mp3", "wav"}:
        raise HTTPException(status_code=400, detail="Unsupported response_format")

    raw_voice = request.voice
    voice = (raw_voice or "").strip()
    if raw_voice is not None and not voice:
        raise HTTPException(status_code=400, detail="voice must be a non-empty string when provided")
    if not voice:
        voice = "en-us"

    model_path = os.environ.get("PIPER_MODEL_PATH", DEFAULT_PIPER_MODEL_PATH)
    model_config_path = f"{model_path}.json"
    if not os.path.isfile(model_path):
        raise HTTPException(
            status_code=500,
            detail=(
                "Piper model not found. "
                f"model_path={model_path} expected_config={model_config_path}. "
                "Set PIPER_MODEL_PATH or mount /models."
            ),
        )
    if not os.path.isfile(model_config_path):
        raise HTTPException(
            status_code=500,
            detail=(
                "Piper model config not found. "
                f"model_path={model_path} expected_config={model_config_path}."
            ),
        )

    speaker_id = os.environ.get("PIPER_SPEAKER_ID")
    request_id = str(uuid.uuid4())

    mp3_path = None
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
        wav_path = wav_file.name

    try:
        command = ["piper", "--model", model_path, "--output_file", wav_path]
        if "--length_scale" in PIPER_SUPPORTED_FLAGS:
            command += ["--length_scale", str(EFFECTIVE_LENGTH_SCALE)]
        if "--noise_scale" in PIPER_SUPPORTED_FLAGS:
            command += ["--noise_scale", str(EFFECTIVE_NOISE_SCALE)]
        if "--noise_w" in PIPER_SUPPORTED_FLAGS:
            command += ["--noise_w", str(EFFECTIVE_NOISE_W)]
        if speaker_id and "--speaker" in PIPER_SUPPORTED_FLAGS:
            command += ["--speaker", speaker_id]

        total_start = time.monotonic()
        piper_start = time.monotonic()
        logger.info(
            "tts_request id=%s input_len=%s response_format=%s model_basename=%s",
            request_id,
            len(sanitized_text),
            response_format,
            os.path.basename(model_path),
        )
        try:
            subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                input=sanitized_text,
            )
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="piper binary not found in PATH")
        except subprocess.CalledProcessError as exc:
            stderr = truncate_error_detail((exc.stderr or "").strip())
            raise HTTPException(status_code=500, detail=f"piper failed: {stderr}")
        piper_ms = int((time.monotonic() - piper_start) * 1000)

        if not os.path.isfile(wav_path) or os.path.getsize(wav_path) == 0:
            raise HTTPException(status_code=500, detail="piper output WAV was empty")

        if response_format == "wav":
            with open(wav_path, "rb") as wav_handle:
                wav_content = wav_handle.read()
            total_ms = int((time.monotonic() - total_start) * 1000)
            wav_bytes = len(wav_content)
            LAST_SYNTH_METRICS.update(
                {
                    "request_id": request_id,
                    "format": "wav",
                    "piper_ms": piper_ms,
                    "ffmpeg_ms": 0,
                    "total_ms": total_ms,
                    "response_bytes": wav_bytes,
                }
            )
            logger.info(
                "tts_timing id=%s format=wav piper_ms=%s ffmpeg_ms=0 total_ms=%s input_len=%s response_bytes=%s",
                request_id,
                piper_ms,
                total_ms,
                len(sanitized_text),
                wav_bytes,
            )
            return Response(
                content=wav_content,
                media_type="audio/wav",
                headers={
                    "X-TTS-Engine": "piper",
                    "X-TTS-Model": os.path.basename(model_path),
                    "X-Request-Id": request_id,
                },
            )

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as mp3_file:
            mp3_path = mp3_file.name

        try:
            ffmpeg_start = time.monotonic()
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    wav_path,
                    "-vn",
                    "-b:a",
                    EFFECTIVE_MP3_BITRATE,
                    "-codec:a",
                    "libmp3lame",
                    mp3_path,
                ],
                check=True,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="ffmpeg binary not found in PATH")
        except subprocess.CalledProcessError as exc:
            stderr = truncate_error_detail((exc.stderr or "").strip())
            raise HTTPException(status_code=500, detail=f"ffmpeg failed: {stderr}")
        ffmpeg_ms = int((time.monotonic() - ffmpeg_start) * 1000)

        if not os.path.isfile(mp3_path) or os.path.getsize(mp3_path) == 0:
            raise HTTPException(status_code=500, detail="ffmpeg output MP3 was empty")

        with open(mp3_path, "rb") as mp3_handle:
            mp3_content = mp3_handle.read()
        total_ms = int((time.monotonic() - total_start) * 1000)
        mp3_bytes = len(mp3_content)
        LAST_SYNTH_METRICS.update(
            {
                "request_id": request_id,
                "format": "mp3",
                "piper_ms": piper_ms,
                "ffmpeg_ms": ffmpeg_ms,
                "total_ms": total_ms,
                "response_bytes": mp3_bytes,
            }
        )
        logger.info(
            "tts_timing id=%s format=mp3 piper_ms=%s ffmpeg_ms=%s total_ms=%s input_len=%s response_bytes=%s",
            request_id,
            piper_ms,
            ffmpeg_ms,
            total_ms,
            len(sanitized_text),
            mp3_bytes,
        )
        return Response(
            content=mp3_content,
            media_type="audio/mpeg",
            headers={
                "X-TTS-Engine": "piper",
                "X-TTS-Model": os.path.basename(model_path),
                "X-Request-Id": request_id,
            },
        )
    finally:
        try:
            os.remove(wav_path)
        except FileNotFoundError:
            pass
        if mp3_path:
            try:
                os.remove(mp3_path)
            except Exception:
                pass
