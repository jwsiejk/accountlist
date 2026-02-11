import logging
import os
import re
import subprocess
import tempfile
import time
import uuid
from functools import lru_cache

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from TTS.api import TTS

if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)

app = FastAPI()
logger = logging.getLogger("ai_interview_tts")

MAX_INPUT_LENGTH = 2000
MAX_ERROR_DETAIL_LENGTH = 500
DEFAULT_COQUI_MODEL_NAME = "tts_models/en/vctk/vits"
DEFAULT_MP3_BITRATE = "192k"
LAST_SYNTH_METRICS: dict[str, int | str] = {}

_NON_PRINTABLE_PATTERN = re.compile(r"[\x00-\x1F\x7F-\x9F]")
_BITRATE_PATTERN = re.compile(r"^(?P<rate>\d+)(?P<unit>k)$", re.IGNORECASE)


class SpeechRequest(BaseModel):
    input: str | None = None
    text: str | None = None
    voice: str | None = None
    response_format: str | None = None


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


def env_as_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes"}


EFFECTIVE_MP3_BITRATE = get_bitrate_env("TTS_MP3_BITRATE", DEFAULT_MP3_BITRATE)
logger.info("tts_config model=%s use_cuda=%s mp3_bitrate=%s", DEFAULT_COQUI_MODEL_NAME, env_as_bool("COQUI_USE_CUDA", True), EFFECTIVE_MP3_BITRATE)


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


@lru_cache(maxsize=1)
def get_tts_engine() -> TTS:
    model_name = os.environ.get("COQUI_MODEL_NAME", DEFAULT_COQUI_MODEL_NAME)
    use_cuda = env_as_bool("COQUI_USE_CUDA", True)
    device = "cuda" if use_cuda else "cpu"
    logger.info("loading_coqui_model model=%s device=%s", model_name, device)
    engine = TTS(model_name=model_name)
    return engine.to(device)


def get_output_sample_rate(engine: TTS) -> int:
    synthesizer = getattr(engine, "synthesizer", None)
    if synthesizer is None:
        return 22050
    sample_rate = getattr(synthesizer, "output_sample_rate", None)
    if isinstance(sample_rate, int) and sample_rate > 0:
        return sample_rate
    tts_config = getattr(synthesizer, "tts_config", None)
    audio_cfg = getattr(tts_config, "audio", None)
    nested_rate = getattr(audio_cfg, "sample_rate", None)
    if isinstance(nested_rate, int) and nested_rate > 0:
        return nested_rate
    return 22050


def get_speaker_name(engine: TTS) -> str | None:
    configured_speaker = (os.environ.get("COQUI_SPEAKER") or "").strip()
    if not configured_speaker:
        return None

    speakers = getattr(engine, "speakers", None)
    if not speakers:
        logger.info("coqui_speaker_ignored reason=no_multispeaker_support configured_speaker=%s", configured_speaker)
        return None

    if configured_speaker in speakers:
        return configured_speaker

    logger.warning("coqui_speaker_ignored reason=unknown_speaker configured_speaker=%s", configured_speaker)
    return None


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/debug/info")
def debug_info() -> dict:
    model_name = os.environ.get("COQUI_MODEL_NAME", DEFAULT_COQUI_MODEL_NAME)
    use_cuda = env_as_bool("COQUI_USE_CUDA", True)
    speaker = (os.environ.get("COQUI_SPEAKER") or "").strip() or None
    return {
        "ok": True,
        "engine": "coqui",
        "model_name": model_name,
        "use_cuda": use_cuda,
        "speaker": speaker,
        "mp3_bitrate": EFFECTIVE_MP3_BITRATE,
        "ffmpeg_version": get_ffmpeg_version(),
        "last_synth": LAST_SYNTH_METRICS or None,
    }


@app.post("/v1/audio/speech")
def speech(request: SpeechRequest):
    text_candidate = request.input if request.input is not None else request.text
    if text_candidate is None:
        raise HTTPException(status_code=400, detail="Missing input text")

    try:
        sanitized_text = sanitize_tts_text(text_candidate)
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

    request_id = str(uuid.uuid4())
    model_name = os.environ.get("COQUI_MODEL_NAME", DEFAULT_COQUI_MODEL_NAME)
    engine = get_tts_engine()
    sample_rate = get_output_sample_rate(engine)
    speaker = get_speaker_name(engine)

    mp3_path = None
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
        wav_path = wav_file.name

    try:
        total_start = time.monotonic()
        tts_start = time.monotonic()
        logger.info(
            "tts_request id=%s input_len=%s response_format=%s model_name=%s",
            request_id,
            len(sanitized_text),
            response_format,
            model_name,
        )

        try:
            tts_kwargs = {"text": sanitized_text}
            if speaker:
                tts_kwargs["speaker"] = speaker
            wav = engine.tts(**tts_kwargs)
        except Exception as exc:
            detail = truncate_error_detail(str(exc))
            raise HTTPException(status_code=500, detail=f"coqui tts failed: {detail}")

        wav_array = np.array(wav, dtype=np.float32)
        if wav_array.size == 0:
            raise HTTPException(status_code=500, detail="coqui output WAV was empty")

        sf.write(wav_path, wav_array, sample_rate)
        tts_ms = int((time.monotonic() - tts_start) * 1000)

        if not os.path.isfile(wav_path) or os.path.getsize(wav_path) == 0:
            raise HTTPException(status_code=500, detail="coqui output WAV was empty")

        if response_format == "wav":
            with open(wav_path, "rb") as wav_handle:
                wav_content = wav_handle.read()
            total_ms = int((time.monotonic() - total_start) * 1000)
            wav_bytes = len(wav_content)
            LAST_SYNTH_METRICS.update(
                {
                    "request_id": request_id,
                    "format": "wav",
                    "tts_ms": tts_ms,
                    "ffmpeg_ms": 0,
                    "total_ms": total_ms,
                    "response_bytes": wav_bytes,
                }
            )
            logger.info(
                "tts_timing id=%s format=wav tts_ms=%s ffmpeg_ms=0 total_ms=%s input_len=%s response_bytes=%s",
                request_id,
                tts_ms,
                total_ms,
                len(sanitized_text),
                wav_bytes,
            )
            return Response(
                content=wav_content,
                media_type="audio/wav",
                headers={
                    "X-TTS-Engine": "coqui",
                    "X-TTS-Model": model_name,
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
                "tts_ms": tts_ms,
                "ffmpeg_ms": ffmpeg_ms,
                "total_ms": total_ms,
                "response_bytes": mp3_bytes,
            }
        )
        logger.info(
            "tts_timing id=%s format=mp3 tts_ms=%s ffmpeg_ms=%s total_ms=%s input_len=%s response_bytes=%s",
            request_id,
            tts_ms,
            ffmpeg_ms,
            total_ms,
            len(sanitized_text),
            mp3_bytes,
        )
        return Response(
            content=mp3_content,
            media_type="audio/mpeg",
            headers={
                "X-TTS-Engine": "coqui",
                "X-TTS-Model": model_name,
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
