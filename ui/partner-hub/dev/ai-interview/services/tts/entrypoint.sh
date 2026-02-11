#!/usr/bin/env bash
set -euo pipefail

mkdir -p /root/.local/share/tts /root/.cache/tts

exec "$@"
