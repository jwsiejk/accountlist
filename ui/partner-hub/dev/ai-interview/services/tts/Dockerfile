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

COPY vendor/ /tmp/vendor/

RUN set -eux; \
    if [ ! -f /tmp/vendor/piper_linux_x86_64.tar.gz ]; then \
      echo "Missing vendor/piper_linux_x86_64.tar.gz. Place the Piper tarball in services/tts/vendor/."; \
      exit 1; \
    fi; \
    if [ ! -f /tmp/vendor/en_US-amy-medium.onnx ] || [ ! -f /tmp/vendor/en_US-amy-medium.onnx.json ]; then \
      echo "Missing default Piper model files in services/tts/vendor (en_US-amy-medium.onnx + .json)."; \
      exit 1; \
    fi; \
    cp /tmp/vendor/piper_linux_x86_64.tar.gz /tmp/piper.tar.gz; \
    if [ -n "$PIPER_TARBALL_SHA256" ]; then echo "$PIPER_TARBALL_SHA256  /tmp/piper.tar.gz" | sha256sum -c -; fi; \
    tar -xzf /tmp/piper.tar.gz -C /tmp; \
    mv /tmp/piper/piper /usr/local/bin/piper; \
    chmod +x /usr/local/bin/piper; \
    rm -rf /tmp/piper /tmp/piper.tar.gz; \
    mkdir -p /models; \
    cp /tmp/vendor/en_US-amy-medium.onnx /models/en_US-amy-medium.onnx; \
    if [ -n "$PIPER_MODEL_SHA256" ]; then echo "$PIPER_MODEL_SHA256  /models/en_US-amy-medium.onnx" | sha256sum -c -; fi; \
    cp /tmp/vendor/en_US-amy-medium.onnx.json /models/en_US-amy-medium.onnx.json; \
    if [ -n "$PIPER_MODEL_JSON_SHA256" ]; then echo "$PIPER_MODEL_JSON_SHA256  /models/en_US-amy-medium.onnx.json" | sha256sum -c -; fi; \
    rm -rf /tmp/vendor

RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app.py /app/app.py
COPY entrypoint.sh /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
