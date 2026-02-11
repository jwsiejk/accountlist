import logging
import os
import re
import subprocess
import tempfile
import time
import uuid
import json
from functools import lru_cache

import numpy as np
import soundfile as sf
import torch
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
DEFAULT_TTS_ATEMPO = 0.94
DEFAULT_SENTENCE_PAUSE_MS = 180
DEFAULT_CLAUSE_PAUSE_MS = 90
DEFAULT_TTS_VOICE_PAUSE_OVERRIDES = {
    "se_leader": {"sentence": 220, "clause": 110},
    "peer_engineer": {"sentence": 170, "clause": 90},
    "sales_exec": {"sentence": 200, "clause": 100},
}
LAST_SYNTH_METRICS: dict[str, int | float | str] = {}
LAST_ENGINE_LOAD_ERROR: str | None = None
LAST_EFFECTIVE_SPEAKER: str | None = None
LAST_EFFECTIVE_VOICE_ALIAS: str | None = None
LAST_TEMPO_USED: float | None = None
LAST_SPEAKER_SUPPORTED = False
LAST_SPEAKERS_COUNT = 0

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
        .replace("–", "-")
    )
    sanitized = sanitized.replace("—", ", ").replace("--", ", ")
    sanitized = _NON_PRINTABLE_PATTERN.sub("", sanitized)
    sanitized = re.sub(r"\s*([.?!,;:])\s*", r"\1 ", sanitized)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    if len(sanitized) > 350:
        sanitized = re.sub(r"([.?!])\s+", r"\1\n", sanitized)
        sanitized = re.sub(r"\s+", " ", sanitized.replace("\n", " \n ")).strip()
        sanitized = re.sub(r"\s*\n\s*", "\n", sanitized)
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


def get_tts_atempo_default() -> float:
    raw_value = os.environ.get("TTS_ATEMPO")
    if raw_value is None or not raw_value.strip():
        return DEFAULT_TTS_ATEMPO
    normalized = raw_value.strip()
    try:
        tempo = float(normalized)
    except ValueError as exc:
        raise RuntimeError(f"Invalid TTS_ATEMPO='{raw_value}'. Expected float between 0.5 and 2.0") from exc
    if tempo < 0.5 or tempo > 2.0:
        raise RuntimeError(f"Invalid TTS_ATEMPO='{raw_value}'. Value must be between 0.5 and 2.0")
    return tempo


def get_pause_ms_env(name: str, default: int, *, min_value: int, max_value: int) -> int:
    raw_value = os.environ.get(name)
    if raw_value is None or not raw_value.strip():
        return default
    normalized = raw_value.strip()
    try:
        pause_ms = int(normalized)
    except ValueError as exc:
        raise RuntimeError(f"Invalid {name}='{raw_value}'. Expected integer {min_value}..{max_value}") from exc
    if pause_ms < min_value or pause_ms > max_value:
        raise RuntimeError(f"Invalid {name}='{raw_value}'. Value must be between {min_value} and {max_value}")
    return pause_ms


def get_sentence_pause_default_ms() -> int:
    return get_pause_ms_env(
        "TTS_SENTENCE_PAUSE_MS",
        DEFAULT_SENTENCE_PAUSE_MS,
        min_value=0,
        max_value=800,
    )


def get_clause_pause_default_ms() -> int:
    return get_pause_ms_env(
        "TTS_CLAUSE_PAUSE_MS",
        DEFAULT_CLAUSE_PAUSE_MS,
        min_value=0,
        max_value=400,
    )


def get_voice_pause_overrides() -> dict[str, dict[str, int]]:
    raw_value = os.environ.get("TTS_VOICE_PAUSE_JSON")
    if raw_value is None or not raw_value.strip():
        return DEFAULT_TTS_VOICE_PAUSE_OVERRIDES.copy()
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Invalid TTS_VOICE_PAUSE_JSON. Expected JSON object like "
            '{"se_leader":{"sentence":220,"clause":110}}'
        ) from exc
    if not isinstance(parsed, dict):
        raise RuntimeError(
            "Invalid TTS_VOICE_PAUSE_JSON. Expected a JSON object mapping voice names to pause configs"
        )

    result: dict[str, dict[str, int]] = {}
    for voice_name, pause_cfg in parsed.items():
        if not isinstance(voice_name, str) or not voice_name.strip():
            raise RuntimeError("Invalid TTS_VOICE_PAUSE_JSON key. Voice names must be non-empty strings")
        if not isinstance(pause_cfg, dict):
            raise RuntimeError(f"Invalid pause override for voice '{voice_name}'. Expected object")
        if "sentence" not in pause_cfg or "clause" not in pause_cfg:
            raise RuntimeError(
                f"Invalid pause override for voice '{voice_name}'. 'sentence' and 'clause' are required"
            )

        sentence_value = pause_cfg["sentence"]
        clause_value = pause_cfg["clause"]
        if isinstance(sentence_value, bool) or isinstance(clause_value, bool):
            raise RuntimeError(f"Invalid pause override for voice '{voice_name}'. Values must be integers")
        try:
            sentence_ms = int(sentence_value)
            clause_ms = int(clause_value)
        except (TypeError, ValueError) as exc:
            raise RuntimeError(f"Invalid pause override for voice '{voice_name}'. Values must be integers") from exc
        if sentence_ms < 0 or sentence_ms > 800:
            raise RuntimeError(
                f"Invalid sentence pause override for voice '{voice_name}'. Value must be between 0 and 800"
            )
        if clause_ms < 0 or clause_ms > 400:
            raise RuntimeError(
                f"Invalid clause pause override for voice '{voice_name}'. Value must be between 0 and 400"
            )
        result[voice_name.strip()] = {"sentence": sentence_ms, "clause": clause_ms}
    return result


def get_effective_pause_config(request_voice: str | None) -> tuple[int, int]:
    sentence_pause_ms = get_sentence_pause_default_ms()
    clause_pause_ms = get_clause_pause_default_ms()
    voice_overrides = get_voice_pause_overrides()
    if request_voice and request_voice in voice_overrides:
        voice_pause = voice_overrides[request_voice]
        sentence_pause_ms = voice_pause["sentence"]
        clause_pause_ms = voice_pause["clause"]
    return sentence_pause_ms, clause_pause_ms


def split_long_chunk(chunk_text: str, max_len: int = 220) -> list[str]:
    normalized = re.sub(r"\s+", " ", chunk_text).strip()
    if len(normalized) <= max_len:
        return [normalized] if normalized else []

    words = normalized.split(" ")
    split_chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for word in words:
        if not word:
            continue
        word_len = len(word)
        extra = word_len if current_len == 0 else word_len + 1
        if current and current_len + extra > max_len:
            split_chunks.append(" ".join(current).strip())
            current = [word]
            current_len = word_len
            continue
        current.append(word)
        current_len += extra
    if current:
        split_chunks.append(" ".join(current).strip())

    return [item for item in split_chunks if item]


def split_into_chunks(text: str, sentence_pause_ms: int, clause_pause_ms: int) -> list[tuple[str, int]]:
    normalized = re.sub(r"\s+", " ", text.replace("\n", " ")).strip()
    if not normalized:
        return []

    parts = re.split(r"([.?!,;:])", normalized)
    chunks_with_pauses: list[tuple[str, int]] = []

    for idx in range(0, len(parts), 2):
        base_text = (parts[idx] or "").strip()
        delimiter = parts[idx + 1] if idx + 1 < len(parts) else ""
        if delimiter:
            base_text = f"{base_text}{delimiter}".strip()

        if not base_text:
            continue

        pause_after = 0
        if delimiter in ".?!":
            pause_after = sentence_pause_ms
        elif delimiter in ",;:":
            pause_after = clause_pause_ms

        long_splits = split_long_chunk(base_text)
        if not long_splits:
            continue
        for split_idx, split_text in enumerate(long_splits):
            split_pause = clause_pause_ms if split_idx < len(long_splits) - 1 else pause_after
            chunks_with_pauses.append((split_text, split_pause))

    if chunks_with_pauses:
        last_text, _ = chunks_with_pauses[-1]
        chunks_with_pauses[-1] = (last_text, 0)
    return chunks_with_pauses


def get_voice_atempo_overrides() -> dict[str, float]:
    raw_value = os.environ.get("TTS_VOICE_ATEMPO_JSON")
    if raw_value is None or not raw_value.strip():
        return {}
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Invalid TTS_VOICE_ATEMPO_JSON. Expected JSON object like {{\"voice\":0.94}}: {exc}"
        ) from exc
    if not isinstance(parsed, dict):
        raise RuntimeError("Invalid TTS_VOICE_ATEMPO_JSON. Expected a JSON object mapping voice names to tempo")

    overrides: dict[str, float] = {}
    for voice_name, tempo_value in parsed.items():
        if not isinstance(voice_name, str) or not voice_name.strip():
            raise RuntimeError("Invalid TTS_VOICE_ATEMPO_JSON key. Voice names must be non-empty strings")
        if isinstance(tempo_value, bool):
            raise RuntimeError(
                f"Invalid tempo override for voice '{voice_name}'. Expected numeric value between 0.5 and 2.0"
            )
        try:
            tempo = float(tempo_value)
        except (TypeError, ValueError) as exc:
            raise RuntimeError(
                f"Invalid tempo override for voice '{voice_name}'. Expected numeric value between 0.5 and 2.0"
            ) from exc
        if tempo < 0.5 or tempo > 2.0:
            raise RuntimeError(
                f"Invalid tempo override for voice '{voice_name}'. Value must be between 0.5 and 2.0"
            )
        overrides[voice_name.strip()] = tempo
    return overrides




@lru_cache(maxsize=1)
def get_voice_speaker_map() -> dict[str, str]:
    raw_value = os.environ.get("TTS_VOICE_SPEAKER_JSON")
    if raw_value is None or not raw_value.strip():
        return {}
    try:
        parsed = json.loads(raw_value)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Invalid TTS_VOICE_SPEAKER_JSON. Expected JSON object like {\"se_leader\":\"p287\"}:"
            f" {exc}"
        ) from exc
    if not isinstance(parsed, dict):
        raise RuntimeError("Invalid TTS_VOICE_SPEAKER_JSON. Expected a JSON object mapping aliases to speakers")

    mapping: dict[str, str] = {}
    for alias_key, speaker_value in parsed.items():
        if not isinstance(alias_key, str) or not alias_key.strip():
            raise RuntimeError("Invalid TTS_VOICE_SPEAKER_JSON key. Alias names must be non-empty strings")
        if not isinstance(speaker_value, str) or not speaker_value.strip():
            raise RuntimeError(
                f"Invalid speaker mapping for alias '{alias_key}'. Speaker values must be non-empty strings"
            )
        mapping[alias_key.strip()] = speaker_value.strip()
    return mapping


def get_effective_tempo(request_voice: str | None) -> float:
    default_tempo = get_tts_atempo_default()
    overrides = get_voice_atempo_overrides()
    if request_voice and request_voice in overrides:
        return overrides[request_voice]
    return default_tempo


def get_effective_runtime_config() -> tuple[str, bool]:
    model_name = os.getenv("COQUI_MODEL_NAME", DEFAULT_COQUI_MODEL_NAME).strip()
    use_cuda = env_as_bool("COQUI_USE_CUDA", True)
    return model_name, use_cuda


def get_cuda_available() -> bool:
    try:
        return bool(torch.cuda.is_available())
    except Exception as exc:
        logger.warning("cuda_availability_check_failed: %s", exc)
        return False


def get_selected_device(use_cuda: bool, cuda_available: bool) -> str:
    return "cuda" if use_cuda and cuda_available else "cpu"


EFFECTIVE_MP3_BITRATE = get_bitrate_env("TTS_MP3_BITRATE", DEFAULT_MP3_BITRATE)


@app.on_event("startup")
def log_startup_config() -> None:
    model_name, use_cuda = get_effective_runtime_config()
    logger.info(
        "tts_config model=%s use_cuda=%s mp3_bitrate=%s sentence_pause_ms=%s clause_pause_ms=%s",
        model_name,
        use_cuda,
        EFFECTIVE_MP3_BITRATE,
        get_sentence_pause_default_ms(),
        get_clause_pause_default_ms(),
    )


@app.on_event("startup")
def warm_engine() -> None:
    model_name, use_cuda = get_effective_runtime_config()
    try:
        get_tts_engine(model_name, use_cuda)
        logger.info("coqui_engine_warm_complete model=%s use_cuda=%s", model_name, use_cuda)
    except Exception as exc:
        logger.error("coqui_engine_warm_failed: %s", exc)


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


def engine_preflight() -> tuple[bool, str | None]:
    model_name, use_cuda = get_effective_runtime_config()
    if not model_name:
        return False, "COQUI_MODEL_NAME is empty"
    if get_ffmpeg_version() is None:
        return False, "ffmpeg is unavailable in PATH"
    if use_cuda and not get_cuda_available():
        return (
            False,
            "CUDA requested but unavailable. Set COQUI_USE_CUDA=false or fix NVIDIA GPU passthrough.",
        )
    return True, None


@lru_cache(maxsize=4)
def get_tts_engine(model_name: str, use_cuda: bool) -> TTS:
    global LAST_ENGINE_LOAD_ERROR

    if not model_name:
        LAST_ENGINE_LOAD_ERROR = "COQUI_MODEL_NAME is empty"
        raise RuntimeError(LAST_ENGINE_LOAD_ERROR)

    cuda_available = get_cuda_available()
    if use_cuda and not cuda_available:
        LAST_ENGINE_LOAD_ERROR = (
            "CUDA requested but unavailable. Set COQUI_USE_CUDA=false or fix NVIDIA GPU passthrough."
        )
        raise RuntimeError(LAST_ENGINE_LOAD_ERROR)

    device = get_selected_device(use_cuda, cuda_available)
    logger.info("loading_coqui_model model=%s device=%s", model_name, device)

    try:
        engine = TTS(model_name=model_name)
        engine = engine.to(device)
    except Exception as exc:
        detail = truncate_error_detail(str(exc))
        if use_cuda:
            LAST_ENGINE_LOAD_ERROR = (
                "CUDA requested but unavailable. Set COQUI_USE_CUDA=false or fix NVIDIA GPU passthrough."
            )
            logger.exception("coqui_model_load_failed model=%s device=%s detail=%s", model_name, device, detail)
            raise RuntimeError(LAST_ENGINE_LOAD_ERROR) from exc
        LAST_ENGINE_LOAD_ERROR = f"Failed to load model '{model_name}' on {device}: {detail}"
        logger.exception("coqui_model_load_failed model=%s device=%s detail=%s", model_name, device, detail)
        raise RuntimeError(LAST_ENGINE_LOAD_ERROR) from exc

    LAST_ENGINE_LOAD_ERROR = None
    return engine


def get_output_sample_rate(engine: TTS) -> int:
    fallback_rate = 22050
    synthesizer = getattr(engine, "synthesizer", None)
    if synthesizer is None:
        logger.warning("sample_rate_fallback reason=missing_synthesizer fallback=%s", fallback_rate)
        return fallback_rate
    sample_rate = getattr(synthesizer, "output_sample_rate", None)
    if isinstance(sample_rate, int) and sample_rate > 0:
        return sample_rate
    tts_config = getattr(synthesizer, "tts_config", None)
    audio_cfg = getattr(tts_config, "audio", None)
    nested_rate = getattr(audio_cfg, "sample_rate", None)
    if isinstance(nested_rate, int) and nested_rate > 0:
        return nested_rate
    logger.warning("sample_rate_fallback reason=invalid_or_missing fallback=%s", fallback_rate)
    return fallback_rate


def get_speaker_inventory(engine: TTS) -> list[str]:
    speakers = getattr(engine, "speakers", None)
    if isinstance(speakers, list):
        return [str(s) for s in speakers]
    return []


def resolve_speaker(engine: TTS, requested_voice: str | None) -> tuple[str | None, bool, int]:
    configured_speaker = (os.environ.get("COQUI_SPEAKER") or "").strip() or None
    requested = (requested_voice or "").strip() or None
    voice_map = get_voice_speaker_map()

    speakers = sorted(get_speaker_inventory(engine))
    speaker_supported = len(speakers) > 0
    speakers_count = len(speakers)

    if not speaker_supported:
        logger.info("single_speaker_model_detected; ignoring voice override")
        if requested:
            logger.info("request_voice_ignored reason=no_multispeaker_support voice=%s", requested)
        if configured_speaker:
            logger.info(
                "coqui_speaker_ignored reason=no_multispeaker_support configured_speaker=%s",
                configured_speaker,
            )
        return None, False, 0

    effective_speaker = requested or configured_speaker
    if requested and requested in voice_map:
        mapped_speaker = voice_map[requested]
        effective_speaker = mapped_speaker
        if mapped_speaker not in speakers:
            raise HTTPException(
                status_code=500,
                detail=f"Configured speaker '{mapped_speaker}' for alias '{requested}' not found.",
            )

    if not effective_speaker:
        effective_speaker = speakers[0]
        logger.info("coqui_default_speaker_selected speaker=%s", effective_speaker)

    if effective_speaker not in speakers:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown voice '{effective_speaker}' for model '{os.getenv('COQUI_MODEL_NAME', DEFAULT_COQUI_MODEL_NAME)}'",
        )
    return effective_speaker, True, speakers_count


@app.get("/health")
def health() -> dict:
    preflight_ok, preflight_detail = engine_preflight()
    model_name, use_cuda = get_effective_runtime_config()
    cuda_available = get_cuda_available()
    return {
        "ok": True,
        "preflight_ok": preflight_ok,
        "preflight_detail": preflight_detail,
        "cuda_available": cuda_available,
        "device_selected": get_selected_device(use_cuda, cuda_available),
    }


@app.get("/debug/info")
def debug_info() -> dict:
    model_name, use_cuda = get_effective_runtime_config()
    configured_speaker = (os.environ.get("COQUI_SPEAKER") or "").strip() or None
    cuda_available = get_cuda_available()
    device_selected = get_selected_device(use_cuda, cuda_available)
    voice_atempo_raw = os.environ.get("TTS_VOICE_ATEMPO_JSON")
    voice_speaker_raw = os.environ.get("TTS_VOICE_SPEAKER_JSON")
    voice_pause_raw = os.environ.get("TTS_VOICE_PAUSE_JSON")
    voice_atempo_preview = None
    voice_speaker_preview = None
    voice_pause_preview = None
    atempo_config_error = None
    speaker_config_error = None
    pause_config_error = None
    try:
        tts_atempo_default = get_tts_atempo_default()
        voice_atempo_preview = get_voice_atempo_overrides()
    except RuntimeError as exc:
        tts_atempo_default = None
        atempo_config_error = str(exc)
    try:
        voice_speaker_preview = get_voice_speaker_map()
    except RuntimeError as exc:
        speaker_config_error = str(exc)
    try:
        sentence_pause_ms_default = get_sentence_pause_default_ms()
        clause_pause_ms_default = get_clause_pause_default_ms()
        voice_pause_preview = get_voice_pause_overrides()
    except RuntimeError as exc:
        sentence_pause_ms_default = None
        clause_pause_ms_default = None
        pause_config_error = str(exc)

    return {
        "ok": True,
        "engine": "coqui",
        "model_name": model_name,
        "use_cuda": use_cuda,
        "cuda_available": cuda_available,
        "device_selected": device_selected,
        "configured_speaker": configured_speaker,
        "voice_speaker_json": voice_speaker_raw,
        "voice_speaker_preview": voice_speaker_preview,
        "voice_aliases": sorted(list((voice_speaker_preview or {}).keys())),
        "voice_speaker_json_configured": bool(voice_speaker_raw and voice_speaker_raw.strip()),
        "voice_atempo_json_configured": bool(voice_atempo_raw and voice_atempo_raw.strip()),
        "voice_pause_json": voice_pause_raw,
        "voice_pause_preview": voice_pause_preview,
        "voice_pause_json_configured": bool(voice_pause_raw and voice_pause_raw.strip()),
        "effective_voice_alias_last": LAST_EFFECTIVE_VOICE_ALIAS,
        "effective_speaker": LAST_EFFECTIVE_SPEAKER,
        "tempo_used_last": LAST_TEMPO_USED,
        "speaker_supported": LAST_SPEAKER_SUPPORTED,
        "speakers_count": LAST_SPEAKERS_COUNT,
        "last_engine_load_error": LAST_ENGINE_LOAD_ERROR,
        "mp3_bitrate": EFFECTIVE_MP3_BITRATE,
        "tts_atempo_default": tts_atempo_default,
        "voice_atempo_json": voice_atempo_raw,
        "voice_atempo_preview": voice_atempo_preview,
        "atempo_config_error": atempo_config_error,
        "speaker_config_error": speaker_config_error,
        "pause_config_error": pause_config_error,
        "sentence_pause_ms_default": sentence_pause_ms_default,
        "clause_pause_ms_default": clause_pause_ms_default,
        "ffmpeg_version": get_ffmpeg_version(),
        "last_synth": LAST_SYNTH_METRICS or None,
    }


@app.post("/v1/audio/speech")
def speech(request: SpeechRequest):
    global LAST_EFFECTIVE_SPEAKER
    global LAST_EFFECTIVE_VOICE_ALIAS
    global LAST_TEMPO_USED
    global LAST_SPEAKER_SUPPORTED
    global LAST_SPEAKERS_COUNT

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
    model_name, use_cuda = get_effective_runtime_config()
    cache_hits_before = get_tts_engine.cache_info().hits
    try:
        engine = get_tts_engine(model_name, use_cuda)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=truncate_error_detail(str(exc)))
    if get_tts_engine.cache_info().hits > cache_hits_before:
        logger.info("coqui_engine_cache_hit model=%s use_cuda=%s", model_name, use_cuda)

    sample_rate = get_output_sample_rate(engine)
    try:
        speaker, speaker_supported, speakers_count = resolve_speaker(engine, voice)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=truncate_error_detail(str(exc)))
    LAST_EFFECTIVE_SPEAKER = speaker
    LAST_EFFECTIVE_VOICE_ALIAS = voice or None
    LAST_SPEAKER_SUPPORTED = speaker_supported
    LAST_SPEAKERS_COUNT = speakers_count

    mp3_path = None
    wav_tempo_path = None
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
        wav_path = wav_file.name

    try:
        try:
            tempo = get_effective_tempo(voice)
            sentence_pause_ms, clause_pause_ms = get_effective_pause_config(voice)
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=truncate_error_detail(str(exc)))
        LAST_TEMPO_USED = tempo

        total_start = time.monotonic()
        tts_start = time.monotonic()
        logger.info(
            "tts_request id=%s input_len=%s response_format=%s model_name=%s",
            request_id,
            len(sanitized_text),
            response_format,
            model_name,
        )

        chunks = split_into_chunks(sanitized_text, sentence_pause_ms, clause_pause_ms)
        if not chunks:
            raise HTTPException(status_code=500, detail="No TTS chunks generated from sanitized input")

        wav_segments: list[np.ndarray] = []
        for chunk_text, pause_ms_after in chunks:
            try:
                tts_kwargs = {"text": chunk_text}
                if speaker:
                    tts_kwargs["speaker"] = speaker
                wav_part = engine.tts(**tts_kwargs)
            except Exception as exc:
                detail = truncate_error_detail(str(exc))
                raise HTTPException(status_code=500, detail=f"coqui tts failed: {detail}")

            wav_part_array = np.array(wav_part, dtype=np.float32)
            if wav_part_array.size == 0:
                raise HTTPException(status_code=500, detail="coqui chunk output WAV was empty")
            wav_segments.append(wav_part_array)

            if pause_ms_after > 0:
                silence_samples = int(sample_rate * pause_ms_after / 1000.0)
                if silence_samples > 0:
                    wav_segments.append(np.zeros((silence_samples,), dtype=np.float32))

        wav_array = np.concatenate(wav_segments).astype(np.float32, copy=False)
        if wav_array.size == 0:
            raise HTTPException(status_code=500, detail="coqui output WAV was empty")

        sf.write(wav_path, wav_array, sample_rate)
        tts_ms = int((time.monotonic() - tts_start) * 1000)

        if not os.path.isfile(wav_path) or os.path.getsize(wav_path) == 0:
            raise HTTPException(status_code=500, detail="coqui output WAV was empty")

        ffmpeg_ms = 0
        wav_output_path = wav_path
        if response_format == "wav" and tempo != 1.0:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wav_tempo_file:
                wav_tempo_path = wav_tempo_file.name
            try:
                ffmpeg_start = time.monotonic()
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i",
                        wav_path,
                        "-filter:a",
                        f"atempo={tempo}",
                        wav_tempo_path,
                    ],
                    check=True,
                    capture_output=True,
                    text=True,
                )
                ffmpeg_ms = int((time.monotonic() - ffmpeg_start) * 1000)
            except FileNotFoundError:
                raise HTTPException(status_code=500, detail="ffmpeg binary not found in PATH")
            except subprocess.CalledProcessError as exc:
                stderr = truncate_error_detail((exc.stderr or "").strip())
                raise HTTPException(status_code=500, detail=f"ffmpeg failed: {stderr}")
            if not os.path.isfile(wav_tempo_path) or os.path.getsize(wav_tempo_path) == 0:
                raise HTTPException(status_code=500, detail="ffmpeg output WAV was empty")
            wav_output_path = wav_tempo_path

        if response_format == "wav":
            with open(wav_output_path, "rb") as wav_handle:
                wav_content = wav_handle.read()
            total_ms = int((time.monotonic() - total_start) * 1000)
            wav_bytes = len(wav_content)
            LAST_SYNTH_METRICS.update(
                {
                    "request_id": request_id,
                    "format": "wav",
                    "tts_ms": tts_ms,
                    "ffmpeg_ms": ffmpeg_ms,
                    "total_ms": total_ms,
                    "response_bytes": wav_bytes,
                    "tempo": tempo,
                    "tempo_used": tempo,
                    "chunks_count": len(chunks),
                    "sentence_pause_ms_used": sentence_pause_ms,
                    "clause_pause_ms_used": clause_pause_ms,
                }
            )
            logger.info(
                "tts_timing id=%s format=wav tempo=%s chunks=%s tts_ms=%s ffmpeg_ms=%s total_ms=%s input_len=%s response_bytes=%s",
                request_id,
                tempo,
                len(chunks),
                tts_ms,
                ffmpeg_ms,
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
                    "-filter:a",
                    f"atempo={tempo}",
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
                "tempo": tempo,
                "tempo_used": tempo,
                "chunks_count": len(chunks),
                "sentence_pause_ms_used": sentence_pause_ms,
                "clause_pause_ms_used": clause_pause_ms,
            }
        )
        logger.info(
            "tts_timing id=%s format=mp3 tempo=%s chunks=%s tts_ms=%s ffmpeg_ms=%s total_ms=%s input_len=%s response_bytes=%s",
            request_id,
            tempo,
            len(chunks),
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
        except Exception:
            pass
        if mp3_path:
            try:
                os.remove(mp3_path)
            except Exception:
                pass
        if wav_tempo_path:
            try:
                os.remove(wav_tempo_path)
            except Exception:
                pass
