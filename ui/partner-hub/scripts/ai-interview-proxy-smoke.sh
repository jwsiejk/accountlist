#!/usr/bin/env bash

set -u

: "${AI_INTERVIEW_APP_URL:=http://localhost:3000}"
: "${AI_INTERVIEW_SAMPLE_TEXT:=Hello from AI interview}"

base_url="${AI_INTERVIEW_APP_URL%/}"

make_audio_sample() {
  local target="$1"
  python - "$target" <<'PY'
import sys
import wave

path = sys.argv[1]
with wave.open(path, "wb") as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(16000)
    wav.writeframes(b"\x00\x00" * 1600)
PY
}

check_chat() {
  local body_file code
  body_file=$(mktemp)
  code=$(curl -sS -o "$body_file" -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\":\"${AI_INTERVIEW_SAMPLE_TEXT}\"}" \
    "${base_url}/api/ai-interview/chat" || true)

  if [[ "$code" == "200" ]]; then
    echo "PASS: chat"
  else
    echo "FAIL: chat (HTTP ${code})"
    cat "$body_file"
    failed=1
  fi

  rm -f "$body_file"
}

check_stt() {
  local body_file code
  body_file=$(mktemp)
  code=$(curl -sS -o "$body_file" -w "%{http_code}" \
    -F "file=@${audio_file};type=audio/wav" \
    "${base_url}/api/ai-interview/stt" || true)

  if [[ "$code" == "200" ]]; then
    echo "PASS: stt"
  else
    echo "FAIL: stt (HTTP ${code})"
    cat "$body_file"
    failed=1
  fi

  rm -f "$body_file"
}

check_tts() {
  local body_file header_file code
  body_file=$(mktemp)
  header_file=$(mktemp)
  code=$(curl -sS -D "$header_file" -o "$body_file" -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"${AI_INTERVIEW_SAMPLE_TEXT}\"}" \
    "${base_url}/api/ai-interview/tts" || true)

  if [[ "$code" == "200" ]] && grep -qi "^content-type: audio/mpeg" "$header_file"; then
    echo "PASS: tts"
  else
    echo "FAIL: tts (HTTP ${code})"
    cat "$body_file"
    failed=1
  fi

  rm -f "$body_file" "$header_file"
}

failed=0

audio_file=$(mktemp --suffix=.wav)
make_audio_sample "$audio_file"

check_chat
check_stt
check_tts

rm -f "$audio_file"

exit "$failed"
