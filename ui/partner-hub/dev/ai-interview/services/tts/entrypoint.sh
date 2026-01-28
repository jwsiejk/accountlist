#!/usr/bin/env sh
set -eu

mkdir -p /models

if [ -n "${PIPER_MODEL_URL:-}" ]; then
  model_filename=$(basename "$PIPER_MODEL_URL")
  model_path="/models/$model_filename"
  echo "Downloading Piper model from $PIPER_MODEL_URL"
  curl -fsSL -o "$model_path" "$PIPER_MODEL_URL"
  if [ ! -s "$model_path" ]; then
    echo "Downloaded Piper model is empty: $model_path" >&2
    exit 1
  fi
  if [ -z "${PIPER_MODEL_PATH:-}" ]; then
    export PIPER_MODEL_PATH="$model_path"
  fi
fi

if [ -n "${PIPER_MODEL_JSON_URL:-}" ]; then
  json_filename=$(basename "$PIPER_MODEL_JSON_URL")
  json_path="/models/$json_filename"
  echo "Downloading Piper model config from $PIPER_MODEL_JSON_URL"
  curl -fsSL -o "$json_path" "$PIPER_MODEL_JSON_URL"
  if [ ! -s "$json_path" ]; then
    echo "Downloaded Piper model config is empty: $json_path" >&2
    exit 1
  fi
fi

exec "$@"
