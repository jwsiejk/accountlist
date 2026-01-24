import os
import subprocess
import tempfile
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI()

MAX_INPUT_LENGTH = 2000


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
    if len(text) > MAX_INPUT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Input text exceeds {MAX_INPUT_LENGTH} characters",
        )

    response_format = (request.response_format or "mp3").lower()
    if response_format not in {"mp3", "wav"}:
        raise HTTPException(status_code=400, detail="Unsupported response_format")

    mp3_path = None
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
        wav_path = wav_file.name

    try:
        command = ["espeak-ng", "-w", wav_path]
        if request.voice:
            command.extend(["-v", request.voice])
        command.append(text)
        try:
            subprocess.run(command, check=True)
        except subprocess.CalledProcessError:
            raise HTTPException(status_code=500, detail="espeak failed")

        if response_format == "wav":
            with open(wav_path, "rb") as wav_handle:
                return Response(content=wav_handle.read(), media_type="audio/wav")

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as mp3_file:
            mp3_path = mp3_file.name

        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", mp3_path],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except subprocess.CalledProcessError:
            raise HTTPException(status_code=500, detail="ffmpeg failed")

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
