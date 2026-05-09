#!/usr/bin/env python3
"""Run a local MedGemma image review and emit one JSON object on stdout."""

from __future__ import annotations

import argparse
import contextlib
import json
import sys
from pathlib import Path

MODEL_ID = "google/medgemma-1.5-4b-it"
DEFAULT_MAX_NEW_TOKENS = 512


def emit(payload: dict[str, object], exit_code: int = 0) -> None:
    print(json.dumps(payload, ensure_ascii=False), flush=True)
    raise SystemExit(exit_code)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local MedGemma image review.")
    parser.add_argument("--image", required=True, help="Path to a local JPG, PNG, or WebP image.")
    parser.add_argument("--prompt", required=True, help="Prompt to send with the image.")
    parser.add_argument(
        "--max-new-tokens",
        type=int,
        default=DEFAULT_MAX_NEW_TOKENS,
        help=f"Maximum response tokens to generate (default: {DEFAULT_MAX_NEW_TOKENS}).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    image_path = Path(args.image).expanduser().resolve()

    if not image_path.is_file():
        emit({"ok": False, "error": f"Image file not found: {image_path}"}, 2)

    try:
        with contextlib.redirect_stdout(sys.stderr):
            import torch
            from PIL import Image
            from transformers import AutoModelForImageTextToText, AutoProcessor

            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.bfloat16 if device == "cuda" else torch.float32

            print(f"Loading {MODEL_ID} on {device}...", file=sys.stderr, flush=True)
            processor = AutoProcessor.from_pretrained(MODEL_ID)
            model = AutoModelForImageTextToText.from_pretrained(
                MODEL_ID,
                torch_dtype=dtype,
                device_map="auto" if device == "cuda" else None,
            )
            if device != "cuda":
                model = model.to(device)

            image = Image.open(image_path).convert("RGB")
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": args.prompt},
                    ],
                }
            ]

            inputs = processor.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt",
            )
            if device == "cuda":
                inputs = inputs.to(model.device, dtype=dtype)
            else:
                inputs = inputs.to(model.device)
            input_token_count = inputs["input_ids"].shape[-1]

            with torch.inference_mode():
                generated_ids = model.generate(**inputs, max_new_tokens=args.max_new_tokens)

            generated_ids = generated_ids[:, input_token_count:]
            result = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()

        emit({"ok": True, "result": result})
    except Exception as exc:  # noqa: BLE001 - CLI must convert all failures to JSON for the API route.
        print(f"MedGemma runner failed: {exc}", file=sys.stderr, flush=True)
        emit({"ok": False, "error": str(exc)}, 1)


if __name__ == "__main__":
    main()
