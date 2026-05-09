#!/usr/bin/env python3
"""Run a local MedGemma image review and emit one JSON object on stdout."""

from __future__ import annotations

import argparse
import contextlib
import json
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

MODEL_ID = "google/medgemma-1.5-4b-it"
DEFAULT_MAX_NEW_TOKENS = 512
MIN_TORCH_VERSION = (2, 6)
SUPPORTED_FALLBACK_FORMATS = {"JPEG", "PNG", "WEBP"}


class ImageDecodeFailure(Exception):
    """Raised when PIL cannot safely decode the uploaded image."""


class TorchVersionFailure(Exception):
    """Raised when the installed PyTorch version is too old for MedGemma."""


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


def parse_torch_version(version: str) -> tuple[int, ...]:
    release = version.split("+", 1)[0]
    parts: list[int] = []
    for part in release.split("."):
        digits = ""
        for char in part:
            if not char.isdigit():
                break
            digits += char
        if digits == "":
            break
        parts.append(int(digits))
    return tuple(parts)


def ensure_supported_torch_version(torch_module: Any) -> None:
    installed_version = getattr(torch_module, "__version__", "unknown")
    parsed_version = parse_torch_version(installed_version)
    if parsed_version < MIN_TORCH_VERSION:
        min_version = ".".join(str(part) for part in MIN_TORCH_VERSION)
        raise TorchVersionFailure(
            f"PyTorch {installed_version} is installed, but MedGemma requires torch>={min_version}. "
            "Rerun scripts/setup-medgemma.ps1 from ui/partner-hub to upgrade the repo-local "
            ".venv-medgemma environment with a compatible CUDA PyTorch build."
        )


def is_truncated_image_error(exc: BaseException) -> bool:
    message = str(exc).lower()
    return any(
        fragment in message
        for fragment in (
            "truncated",
            "broken data stream",
            "image file is incomplete",
            "unexpected end of file",
        )
    )


@contextlib.contextmanager
def allow_truncated_images_temporarily(image_file: Any) -> Iterator[None]:
    previous = image_file.LOAD_TRUNCATED_IMAGES
    # This is deliberately scoped to a single fallback read after Image.verify()
    # has accepted the file container. Some valid mobile/screenshot images fail
    # a strict pixel load because of trailing/ancillary chunk quirks, but keeping
    # the PIL flag local prevents later reads from silently accepting corrupt
    # uploads that did not pass the initial validation step.
    image_file.LOAD_TRUNCATED_IMAGES = True
    try:
        yield
    finally:
        image_file.LOAD_TRUNCATED_IMAGES = previous


def decode_error(message: str, exc: BaseException | None = None) -> ImageDecodeFailure:
    if exc is None:
        return ImageDecodeFailure(message)
    return ImageDecodeFailure(f"{message} ({exc})")


def load_verified_rgb_image(
    image_path: Path,
    image_module: Any,
    image_ops: Any,
    image_file: Any,
    unidentified_error: type[Exception],
) -> Any:
    print(f"Validating image file {image_path}...", file=sys.stderr, flush=True)

    image_format = "unknown"
    try:
        with image_module.open(image_path) as image:
            image_format = image.format or "unknown"
            image.verify()
    except unidentified_error as exc:
        raise decode_error(
            "PIL could not identify the uploaded image. Upload a valid JPG, PNG, or WebP file.",
            exc,
        ) from exc
    except OSError as exc:
        hint = (
            "The uploaded image appears to be corrupt or truncated. "
            "Try opening it locally and re-exporting it as a new PNG or JPG."
        )
        raise decode_error(f"PIL could not verify the uploaded image. {hint}", exc) from exc

    try:
        with image_module.open(image_path) as image:
            image = image_ops.exif_transpose(image)
            image.load()
            return image.convert("RGB")
    except unidentified_error as exc:
        raise decode_error(
            "PIL could not identify the uploaded image after verification. "
            "Upload a valid JPG, PNG, or WebP file.",
            exc,
        ) from exc
    except OSError as exc:
        if image_format not in SUPPORTED_FALLBACK_FORMATS or not is_truncated_image_error(exc):
            raise decode_error(
                "PIL verified the uploaded image container but could not decode the image pixels. "
                "Try re-exporting the file as a new PNG or JPG.",
                exc,
            ) from exc

        print(
            "Strict PIL image load failed after verification; attempting scoped fallback decode.",
            file=sys.stderr,
            flush=True,
        )
        try:
            with allow_truncated_images_temporarily(image_file):
                with image_module.open(image_path) as image:
                    image = image_ops.exif_transpose(image)
                    image.load()
                    fallback_image = image.convert("RGB")
        except (unidentified_error, OSError) as fallback_exc:
            raise decode_error(
                "PIL could not fully decode the uploaded image. It appears to be corrupt "
                "or truncated; try re-exporting it as a new PNG or JPG before uploading again.",
                fallback_exc,
            ) from fallback_exc

        if fallback_image.width <= 0 or fallback_image.height <= 0:
            raise decode_error("PIL decoded an invalid image with empty dimensions.")

        print("Scoped fallback image decode succeeded.", file=sys.stderr, flush=True)
        return fallback_image


def main() -> None:
    args = parse_args()
    image_path = Path(args.image).expanduser().resolve()

    if not image_path.is_file():
        emit(
            {
                "ok": False,
                "errorType": "image_decode_failed",
                "error": f"Image file not found: {image_path}",
            },
            2,
        )

    try:
        with contextlib.redirect_stdout(sys.stderr):
            from PIL import Image, ImageFile, ImageOps, UnidentifiedImageError

            image = load_verified_rgb_image(
                image_path,
                Image,
                ImageOps,
                ImageFile,
                UnidentifiedImageError,
            )

            import torch

            ensure_supported_torch_version(torch)

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
    except ImageDecodeFailure as exc:
        print(f"MedGemma image decode failed: {exc}", file=sys.stderr, flush=True)
        emit({"ok": False, "errorType": "image_decode_failed", "error": str(exc)}, 1)
    except TorchVersionFailure as exc:
        print(f"MedGemma runner failed: {exc}", file=sys.stderr, flush=True)
        emit({"ok": False, "errorType": "runner_failed", "error": str(exc)}, 1)
    # CLI must convert all failures to JSON for the API route.
    except Exception as exc:  # noqa: BLE001
        print(f"MedGemma runner failed: {exc}", file=sys.stderr, flush=True)
        emit({"ok": False, "errorType": "runner_failed", "error": str(exc)}, 1)


if __name__ == "__main__":
    main()
