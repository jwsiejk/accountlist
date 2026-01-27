#!/usr/bin/env bash

set -u

: "${AI_INTERVIEW_APP_URL:=http://localhost:3000}"
: "${AI_INTERVIEW_SAMPLE_TEXT:=Hello from AI interview}"

base_url="${AI_INTERVIEW_APP_URL%/}"
failed=0

check_blank_voice() {
  local body_file code
  body_file=$(mktemp)
  code=$(curl -sS -o "$body_file" -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"${AI_INTERVIEW_SAMPLE_TEXT}\",\"voice\":\"\"}" \
    "${base_url}/api/ai-interview/tts" || true)

  if [[ "$code" == "400" ]]; then
    echo "PASS: blank voice returns 400"
  else
    echo "FAIL: blank voice (HTTP ${code})"
    cat "$body_file"
    failed=1
  fi

  rm -f "$body_file"
}

check_omitted_voice() {
  local body_file header_file code
  body_file=$(mktemp)
  header_file=$(mktemp)
  code=$(curl -sS -D "$header_file" -o "$body_file" -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"${AI_INTERVIEW_SAMPLE_TEXT}\"}" \
    "${base_url}/api/ai-interview/tts" || true)

  if [[ "$code" == "200" ]] && grep -qi "^content-type: audio/mpeg" "$header_file"; then
    echo "PASS: omitted voice returns audio"
  else
    echo "FAIL: omitted voice (HTTP ${code})"
    cat "$body_file"
    failed=1
  fi

  rm -f "$body_file" "$header_file"
}

check_upstream_400_passthrough() {
  local body_file code long_text
  body_file=$(mktemp)
  long_text=$(printf 'a%.0s' {1..2001})
  code=$(curl -sS -o "$body_file" -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"${long_text}\"}" \
    "${base_url}/api/ai-interview/tts" || true)

  if [[ "$code" == "400" ]]; then
    echo "PASS: upstream 400 passes through"
  else
    echo "FAIL: upstream 400 passthrough (HTTP ${code})"
    cat "$body_file"
    failed=1
  fi

  rm -f "$body_file"
}

check_blank_voice
check_omitted_voice
check_upstream_400_passthrough

exit "$failed"
