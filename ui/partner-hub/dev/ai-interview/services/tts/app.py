import logging
import os
import re
import subprocess
import tempfile
import time
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
DEFAULT_PIPER_LENGTH_SCALE = 1.0
DEFAULT_PIPER_NOISE_SCALE = 0.667
DEFAULT_PIPER_NOISE_W = 0.8


_NON_PRINTABLE_PATTERN = re.compile(r"[\x00-\x1F\x7F-\x9F]")


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


@app.get("/health")
def health() -> dict:
    return {"ok": True}


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

    length_scale = os.environ.get("PIPER_LENGTH_SCALE", str(DEFAULT_PIPER_LENGTH_SCALE))
    noise_scale = os.environ.get("PIPER_NOISE_SCALE", str(DEFAULT_PIPER_NOISE_SCALE))
    noise_w = os.environ.get("PIPER_NOISE_W", str(DEFAULT_PIPER_NOISE_W))
    speaker_id = os.environ.get("PIPER_SPEAKER_ID")

    mp3_path = None
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
        wav_path = wav_file.name

    try:
        command = ["piper", "--model", model_path, "--output_file", wav_path]
        if "--length_scale" in PIPER_SUPPORTED_FLAGS:
            command += ["--length_scale", length_scale]
        if "--noise_scale" in PIPER_SUPPORTED_FLAGS:
            command += ["--noise_scale", noise_scale]
        if "--noise_w" in PIPER_SUPPORTED_FLAGS:
            command += ["--noise_w", noise_w]
        if speaker_id and "--speaker" in PIPER_SUPPORTED_FLAGS:
            command += ["--speaker", speaker_id]

        total_start = time.monotonic()
        piper_start = time.monotonic()
        logger.info(
            "tts_piper_request voice=%r response_format=%s input_len=%s model_path=%r raw_voice=%r raw_input=%r raw_text=%r",
            voice,
            response_format,
            len(sanitized_text),
            model_path,
            raw_voice,
            request.input,
            request.text,
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

        if response_format == "wav":
            with open(wav_path, "rb") as wav_handle:
                wav_content = wav_handle.read()
            total_ms = int((time.monotonic() - total_start) * 1000)
            logger.info(
                "tts_timing piper_ms=%s ffmpeg_ms=0 total_ms=%s input_len=%s response_bytes=%s",
                piper_ms,
                total_ms,
                len(sanitized_text),
                len(wav_content),
            )
            return Response(
                content=wav_content,
                media_type="audio/wav",
                headers={
                    "X-TTS-Engine": "piper",
                    "X-TTS-Model": os.path.basename(model_path),
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
                    "-ar",
                    "44100",
                    "-b:a",
                    "128k",
                    "-ac",
                    "1",
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

        with open(mp3_path, "rb") as mp3_handle:
            mp3_content = mp3_handle.read()
        total_ms = int((time.monotonic() - total_start) * 1000)
        logger.info(
            "tts_timing piper_ms=%s ffmpeg_ms=%s total_ms=%s input_len=%s response_bytes=%s",
            piper_ms,
            ffmpeg_ms,
            total_ms,
            len(sanitized_text),
            len(mp3_content),
        )
        return Response(
            content=mp3_content,
            media_type="audio/mpeg",
            headers={
                "X-TTS-Engine": "piper",
                "X-TTS-Model": os.path.basename(model_path),
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
