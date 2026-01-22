#!/usr/bin/env bash

set -u

: "${AI_INTERVIEW_OLLAMA_URL:=http://127.0.0.1:11434}"
: "${AI_INTERVIEW_STT_URL:=http://127.0.0.1:9000}"
: "${AI_INTERVIEW_TTS_URL:=http://127.0.0.1:8000}"

check_url() {
  local name="$1"
  local url="$2"
  local code
  if code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 2 "$url"); then
    if [[ "$code" != "000" ]]; then
      echo "PASS: ${name} (${url}) [HTTP ${code}]"
      return 0
    fi
  fi
  echo "FAIL: ${name} (${url})"
  return 1
}

check_url "Ollama" "${AI_INTERVIEW_OLLAMA_URL%/}/api/tags"
check_url "STT" "${AI_INTERVIEW_STT_URL%/}/"
check_url "TTS" "${AI_INTERVIEW_TTS_URL%/}/"
