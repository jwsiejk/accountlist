#!/usr/bin/env bash

set -u

: "${AI_INTERVIEW_APP_URL:=http://localhost:3000}"
: "${AI_INTERVIEW_SAMPLE_TEXT:=Hello from AI interview}"

command -v node >/dev/null 2>&1 || { echo "FAIL: node not found (required to generate WAV sample)."; exit 1; }

base_url="${AI_INTERVIEW_APP_URL%/}"

make_audio_sample() {
  local target="$1"
  node -e '
const fs = require("fs");
// When using -e, the first argument after the snippet is process.argv[1].
const path = process.argv[1];
const sampleRate = 16000;
const numChannels = 1;
const bitsPerSample = 16;
const numSamples = 1600;
const blockAlign = (numChannels * bitsPerSample) / 8;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);
let offset = 0;
buffer.write("RIFF", offset);
offset += 4;
buffer.writeUInt32LE(36 + dataSize, offset);
offset += 4;
buffer.write("WAVE", offset);
offset += 4;
buffer.write("fmt ", offset);
offset += 4;
buffer.writeUInt32LE(16, offset);
offset += 4;
buffer.writeUInt16LE(1, offset);
offset += 2;
buffer.writeUInt16LE(numChannels, offset);
offset += 2;
buffer.writeUInt32LE(sampleRate, offset);
offset += 4;
buffer.writeUInt32LE(byteRate, offset);
offset += 4;
buffer.writeUInt16LE(blockAlign, offset);
offset += 2;
buffer.writeUInt16LE(bitsPerSample, offset);
offset += 2;
buffer.write("data", offset);
offset += 4;
buffer.writeUInt32LE(dataSize, offset);
offset += 4;
fs.writeFileSync(path, buffer);
' "$target"
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
