import os
import tempfile
from fastapi import FastAPI, File, UploadFile
from faster_whisper import WhisperModel

app = FastAPI()

model_name = os.getenv("STT_MODEL", "base.en")
model = WhisperModel(model_name, device="cpu", compute_type="int8")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/v1/audio/transcriptions")
def transcriptions(file: UploadFile = File(...)) -> dict:
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        temp_file.write(file.file.read())
        temp_path = temp_file.name

    try:
        segments, _info = model.transcribe(temp_path)
        text = "".join(segment.text for segment in segments).strip()
        return {"text": text}
    finally:
        os.unlink(temp_path)
