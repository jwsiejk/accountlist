#!/usr/bin/env sh
set -eu

mkdir -p /models

if [ -n "${PIPER_MODEL_URL:-}" ]; then
  model_filename=$(basename "$PIPER_MODEL_URL")
  model_path="/models/$model_filename"
  echo "Downloading Piper model from $PIPER_MODEL_URL"
  model_headers=$(mktemp)
  model_status=$(curl -fSL --retry 3 --retry-delay 1 --connect-timeout 10 --max-time 300 \
    -D "$model_headers" -o "$model_path" -w "%{http_code}" "$PIPER_MODEL_URL") || {
      echo "Failed to download Piper model from $PIPER_MODEL_URL (HTTP status: ${model_status:-unknown})" >&2
      rm -f "$model_headers"
      exit 1
    }
  model_content_type=$(awk -F': ' 'tolower($1)=="content-type"{print $2}' "$model_headers" | tail -n 1 | tr -d '\r')
  rm -f "$model_headers"
  echo "Piper model download url=$PIPER_MODEL_URL status=$model_status content-type=${model_content_type:-unknown} path=$model_path"
  if [ "$model_status" != "200" ]; then
    echo "Unexpected HTTP status for Piper model: $model_status" >&2
    exit 1
  fi
  if [ -n "$model_content_type" ] && printf '%s' "$model_content_type" | tr 'A-Z' 'a-z' | grep -q "text/html"; then
    echo "Unexpected content-type for Piper model: $model_content_type" >&2
    exit 1
  fi
  model_size=$(wc -c < "$model_path")
  if [ "$model_size" -lt 100000 ]; then
    echo "Downloaded Piper model is too small (${model_size} bytes): $model_path" >&2
    exit 1
  fi
  if [ -n "${PIPER_MODEL_SHA256:-}" ]; then
    echo "${PIPER_MODEL_SHA256}  $model_path" | sha256sum -c - >/dev/null 2>&1 || {
      echo "Piper model SHA256 verification failed: $model_path" >&2
      exit 1
    }
  fi
  if [ -z "${PIPER_MODEL_PATH:-}" ]; then
    export PIPER_MODEL_PATH="$model_path"
  fi
fi

if [ -n "${PIPER_MODEL_JSON_URL:-}" ]; then
  json_filename=$(basename "$PIPER_MODEL_JSON_URL")
  json_path="/models/$json_filename"
  echo "Downloading Piper model config from $PIPER_MODEL_JSON_URL"
  json_headers=$(mktemp)
  json_status=$(curl -fSL --retry 3 --retry-delay 1 --connect-timeout 10 --max-time 300 \
    -D "$json_headers" -o "$json_path" -w "%{http_code}" "$PIPER_MODEL_JSON_URL") || {
      echo "Failed to download Piper model config from $PIPER_MODEL_JSON_URL (HTTP status: ${json_status:-unknown})" >&2
      rm -f "$json_headers"
      exit 1
    }
  json_content_type=$(awk -F': ' 'tolower($1)=="content-type"{print $2}' "$json_headers" | tail -n 1 | tr -d '\r')
  rm -f "$json_headers"
  echo "Piper model config download url=$PIPER_MODEL_JSON_URL status=$json_status content-type=${json_content_type:-unknown} path=$json_path"
  if [ "$json_status" != "200" ]; then
    echo "Unexpected HTTP status for Piper model config: $json_status" >&2
    exit 1
  fi
  if [ -n "$json_content_type" ] && printf '%s' "$json_content_type" | tr 'A-Z' 'a-z' | grep -q "text/html"; then
    echo "Unexpected content-type for Piper model config: $json_content_type" >&2
    exit 1
  fi
  json_size=$(wc -c < "$json_path")
  if [ "$json_size" -lt 1000 ]; then
    echo "Downloaded Piper model config is too small (${json_size} bytes): $json_path" >&2
    exit 1
  fi
  if [ -n "${PIPER_MODEL_JSON_SHA256:-}" ]; then
    echo "${PIPER_MODEL_JSON_SHA256}  $json_path" | sha256sum -c - >/dev/null 2>&1 || {
      echo "Piper model config SHA256 verification failed: $json_path" >&2
      exit 1
    }
  fi
fi

exec "$@"
