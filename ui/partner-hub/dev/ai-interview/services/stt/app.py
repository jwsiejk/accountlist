import os
import tempfile
from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel

app = FastAPI()

model_name = os.getenv("STT_MODEL", "base.en")
print(f"Loading STT model: {model_name}. First run may download the model.")
model = WhisperModel(model_name, device="cpu", compute_type="int8")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/v1/audio/transcriptions")
def transcriptions(file: UploadFile = File(...)) -> dict:
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        bytes_written = 0
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            bytes_written += len(chunk)
            temp_file.write(chunk)
        temp_path = temp_file.name

    if bytes_written == 0:
        os.unlink(temp_path)
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        try:
            segments, _info = model.transcribe(temp_path)
        except Exception:
            raise HTTPException(status_code=500, detail="Transcription failed")
        text = "".join(segment.text for segment in segments).strip()
        return {"text": text}
    finally:
        os.unlink(temp_path)
