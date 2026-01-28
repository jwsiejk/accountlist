import logging
import os
import re
import subprocess
import tempfile
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
            detail=f"Piper model not found at {model_path}. Set PIPER_MODEL_PATH or mount /models.",
        )
    if not os.path.isfile(model_config_path):
        raise HTTPException(
            status_code=500,
            detail=f"Piper model config not found at {model_config_path}.",
        )

    mp3_path = None
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
        wav_path = wav_file.name

    try:
        command = ["piper", "--model", model_path, "--output_file", wav_path]
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

        if response_format == "wav":
            with open(wav_path, "rb") as wav_handle:
                return Response(content=wav_handle.read(), media_type="audio/wav")

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as mp3_file:
            mp3_path = mp3_file.name

        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", mp3_path],
                check=True,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="ffmpeg binary not found in PATH")
        except subprocess.CalledProcessError as exc:
            stderr = truncate_error_detail((exc.stderr or "").strip())
            raise HTTPException(status_code=500, detail=f"ffmpeg failed: {stderr}")

        with open(mp3_path, "rb") as mp3_handle:
            return Response(content=mp3_handle.read(), media_type="audio/mpeg")
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
