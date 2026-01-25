import os
import re
import subprocess
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI()

MAX_INPUT_LENGTH = 2000
MAX_ERROR_DETAIL_LENGTH = 500


_CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")


def sanitize_tts_text(text: str) -> str:
    sanitized = text.replace("\r\n", "\n").replace("\r", "\n")
    sanitized = sanitized.replace("`", "")
    sanitized = sanitized.replace("**", "").replace("__", "")
    sanitized = (
        sanitized.replace("“", '"')
        .replace("”", '"')
        .replace("‘", "'")
        .replace("’", "'")
        .replace("—", "-")
        .replace("–", "-")
    )
    sanitized = _CONTROL_CHAR_PATTERN.sub("", sanitized)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
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
    sanitized_text = sanitize_tts_text(text)
    if not sanitized_text:
        raise HTTPException(status_code=400, detail="Missing input text")
    if len(sanitized_text) > MAX_INPUT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Input text exceeds {MAX_INPUT_LENGTH} characters",
        )

    response_format = (request.response_format or "mp3").lower()
    if response_format not in {"mp3", "wav"}:
        raise HTTPException(status_code=400, detail="Unsupported response_format")

    voice = (request.voice or "").strip()
    if not voice:
        voice = "en-us"

    mp3_path = None
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
        wav_path = wav_file.name

    try:
        command = ["espeak-ng", "--stdin", "-w", wav_path]
        if voice:
            command.extend(["-v", voice])
        try:
            subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                input=sanitized_text,
            )
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or "").strip()
            if len(stderr) > MAX_ERROR_DETAIL_LENGTH:
                stderr = f"{stderr[:MAX_ERROR_DETAIL_LENGTH]}..."
            raise HTTPException(status_code=500, detail=f"espeak failed: {stderr}")

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
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or "").strip()
            if len(stderr) > MAX_ERROR_DETAIL_LENGTH:
                stderr = f"{stderr[:MAX_ERROR_DETAIL_LENGTH]}..."
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
