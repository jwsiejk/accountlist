FROM python:3.11-slim

WORKDIR /app

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PIPER_MODEL_PATH=/models/en_US-amy-medium.onnx

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ARG PIPER_VERSION=1.2.0
ARG PIPER_TARBALL_SHA256=
ARG PIPER_MODEL_SHA256=
ARG PIPER_MODEL_JSON_SHA256=
RUN set -eux; \
    curl -L -o /tmp/piper.tar.gz "https://github.com/rhasspy/piper/releases/download/v${PIPER_VERSION}/piper_linux_x86_64.tar.gz"; \
    if [ -n "$PIPER_TARBALL_SHA256" ]; then echo "$PIPER_TARBALL_SHA256  /tmp/piper.tar.gz" | sha256sum -c -; fi; \
    tar -xzf /tmp/piper.tar.gz -C /tmp; \
    mv /tmp/piper/piper /usr/local/bin/piper; \
    chmod +x /usr/local/bin/piper; \
    rm -rf /tmp/piper /tmp/piper.tar.gz; \
    mkdir -p /models; \
    curl -L -o /models/en_US-amy-medium.onnx "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx"; \
    if [ -n "$PIPER_MODEL_SHA256" ]; then echo "$PIPER_MODEL_SHA256  /models/en_US-amy-medium.onnx" | sha256sum -c -; fi; \
    curl -L -o /models/en_US-amy-medium.onnx.json "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json"; \
    if [ -n "$PIPER_MODEL_JSON_SHA256" ]; then echo "$PIPER_MODEL_JSON_SHA256  /models/en_US-amy-medium.onnx.json" | sha256sum -c -; fi

RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
