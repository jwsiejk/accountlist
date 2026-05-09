#!/usr/bin/env python3
"""Run a local MedGemma image review and emit one JSON object on stdout."""

from __future__ import annotations

import argparse
import contextlib
import json
import os
import re
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

MODEL_ID = "google/medgemma-1.5-4b-it"
DEFAULT_MAX_NEW_TOKENS = 192
MIN_TORCH_VERSION = (2, 6)
SUPPORTED_FALLBACK_FORMATS = {"JPEG", "PNG", "WEBP"}


def log_stage(stage: str) -> None:
    print(f"STAGE: {stage}", file=sys.stderr, flush=True)


class ImageDecodeFailure(Exception):
    """Raised when PIL cannot safely decode the uploaded image."""


class TorchVersionFailure(Exception):
    """Raised when the installed PyTorch version is too old for MedGemma."""


def emit(payload: dict[str, object], exit_code: int = 0) -> None:
    print(json.dumps(payload, ensure_ascii=False), flush=True)
    raise SystemExit(exit_code)


def positive_int(value: str) -> int:
    parsed_value = int(value)
    if parsed_value < 1:
        raise argparse.ArgumentTypeError("must be at least 1")
    return parsed_value


def env_max_new_tokens() -> int:
    raw_value = os.environ.get("MEDGEMMA_MAX_NEW_TOKENS")
    if raw_value is None or raw_value.strip() == "":
        return DEFAULT_MAX_NEW_TOKENS

    try:
        value = int(raw_value)
    except ValueError:
        print(
            "Ignoring MEDGEMMA_MAX_NEW_TOKENS because it is not an integer; "
            f"using {DEFAULT_MAX_NEW_TOKENS}.",
            file=sys.stderr,
            flush=True,
        )
        return DEFAULT_MAX_NEW_TOKENS

    if value < 1:
        print(
            "Ignoring MEDGEMMA_MAX_NEW_TOKENS because it must be at least 1; "
            f"using {DEFAULT_MAX_NEW_TOKENS}.",
            file=sys.stderr,
            flush=True,
        )
        return DEFAULT_MAX_NEW_TOKENS

    return value


def parse_args() -> argparse.Namespace:
    default_max_new_tokens = env_max_new_tokens()
    parser = argparse.ArgumentParser(description="Run local MedGemma image review.")
    parser.add_argument("--image", required=True, help="Path to a local JPG, PNG, or WebP image.")
    parser.add_argument("--prompt", required=True, help="Prompt to send with the image.")
    parser.add_argument(
        "--max-new-tokens",
        type=positive_int,
        default=default_max_new_tokens,
        help=(
            "Maximum response tokens to generate "
            f"(default: MEDGEMMA_MAX_NEW_TOKENS or {DEFAULT_MAX_NEW_TOKENS})."
        ),
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
    log_stage("validating_image")
    print("Validating uploaded image file...", file=sys.stderr, flush=True)

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


def as_token_id_set(token_id: Any) -> set[int]:
    if token_id is None:
        return set()
    if isinstance(token_id, int):
        return {token_id}
    if isinstance(token_id, (list, tuple, set)):
        return {item for item in token_id if isinstance(item, int)}
    return set()


def move_inputs_to_model_device(inputs: Any, *, device: Any, dtype: Any) -> Any:
    # Hugging Face's BatchFeature.to() mirrors Tensor.to(): passing dtype casts
    # only floating tensors such as pixel_values while leaving token IDs as ints.
    # This keeps MedGemma's vision inputs aligned with the model dtype used for
    # local inference.
    try:
        return inputs.to(device, dtype=dtype)
    except TypeError:
        return inputs.to(device)


def decode_ids(processor: Any, token_ids: Any) -> str:
    if getattr(token_ids, "ndim", 0) == 1:
        token_ids = token_ids.unsqueeze(0)
    return processor.batch_decode(token_ids, skip_special_tokens=True)[0].strip()


def strip_obvious_chat_template_wrapper(text: str) -> str:
    """Remove visible chat role wrappers without erasing valid model text."""
    stripped_text = text.strip()
    if not stripped_text:
        return ""

    # Some tokenizers decode a full prompt+completion as role-labeled text after
    # special-token removal, for example: "user\n...\nmodel\nresponse".
    # Only strip when a role marker is obvious and the extracted suffix remains
    # non-empty; otherwise preserve the decoded model content exactly.
    role_marker_pattern = re.compile(
        r"(?im)(?:^|\n)\s*(?:assistant|model)\s*(?P<separator>:|\n)"
    )
    user_marker_pattern = re.compile(r"(?im)(?:^|\n)\s*user\s*(?::|\n)")
    matches = list(role_marker_pattern.finditer(stripped_text))
    for match in reversed(matches):
        candidate = stripped_text[match.end() :].strip()
        if not candidate:
            continue

        prefix = stripped_text[: match.start()]
        marker_at_start = prefix.strip() == ""
        marker_uses_role_line = match.group("separator") == "\n"
        if user_marker_pattern.search(prefix) or (
            marker_at_start and marker_uses_role_line
        ):
            return candidate

    return stripped_text


def select_decoded_output(
    *, decoded_full_output: str, decoded_sliced_output: str
) -> tuple[str, str]:
    if decoded_sliced_output.strip():
        return decoded_sliced_output, "sliced"
    if decoded_full_output.strip():
        return strip_obvious_chat_template_wrapper(decoded_full_output), "full"
    return "", "empty"


def first_token_is_eos(token_ids: Any, eos_token_ids: set[int]) -> bool:
    if not eos_token_ids or token_ids.shape[-1] <= 0:
        return False
    first_token = (
        token_ids[0]
        if getattr(token_ids, "ndim", 0) == 1
        else token_ids[0][0]
    )
    return int(first_token.item()) in eos_token_ids


def log_generation_debug(
    *,
    input_keys: list[str],
    input_token_count: int,
    raw_output_shape: tuple[int, ...],
    output_token_count: int,
    generated_token_count: int,
    decoded_full_output_length: int,
    decoded_sliced_output_length: int,
    used_sliced_output: bool,
    selected_output: str,
    eos_returned_immediately: bool,
) -> None:
    print(
        "GENERATION_DEBUG: "
        f"input_keys={','.join(input_keys)} "
        f"input_token_count={input_token_count} "
        f"raw_output_shape={raw_output_shape} "
        f"output_token_count={output_token_count} "
        f"generated_token_count={generated_token_count} "
        f"decoded_full_output_length={decoded_full_output_length} "
        f"decoded_sliced_output_length={decoded_sliced_output_length} "
        f"used_sliced_output={str(used_sliced_output).lower()} "
        f"selected_output={selected_output} "
        f"eos_returned_immediately={str(eos_returned_immediately).lower()}",
        file=sys.stderr,
        flush=True,
    )


def main() -> None:
    args = parse_args()
    image_path = Path(args.image).expanduser().resolve()

    if not image_path.is_file():
        emit(
            {
                "ok": False,
                "errorType": "image_decode_failed",
                "error": "Image file not found.",
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
            dtype = torch.float16 if device == "cuda" else torch.float32
            model_kwargs: dict[str, Any] = {
                "torch_dtype": dtype,
                "low_cpu_mem_usage": True,
            }
            if device == "cuda":
                model_kwargs["device_map"] = "auto"
                model_kwargs["attn_implementation"] = "sdpa"

            log_stage("loading_model")
            print(
                f"Loading {MODEL_ID} on {device} with {dtype} and max_new_tokens={args.max_new_tokens}...",
                file=sys.stderr,
                flush=True,
            )
            processor = AutoProcessor.from_pretrained(MODEL_ID)
            model = AutoModelForImageTextToText.from_pretrained(
                MODEL_ID,
                **model_kwargs,
            )
            if device != "cuda":
                model = model.to(device)

            # MedGemma 1.5's model card uses the chat-template path with the
            # PIL image embedded in the image content item. The processor handles
            # image extraction/tokenization when tokenize=True and return_dict=True.
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
            input_keys = sorted(str(key) for key in inputs.keys())
            inputs = move_inputs_to_model_device(
                inputs,
                device=model.device,
                dtype=dtype,
            )
            input_token_count = inputs["input_ids"].shape[-1]

            tokenizer = getattr(processor, "tokenizer", None)
            eos_token_id = getattr(model.generation_config, "eos_token_id", None)
            if eos_token_id is None:
                eos_token_id = getattr(model.config, "eos_token_id", None)
            pad_token_id = getattr(model.generation_config, "pad_token_id", None)
            if pad_token_id is None:
                pad_token_id = getattr(tokenizer, "pad_token_id", None)
            if pad_token_id is None and isinstance(eos_token_id, int):
                pad_token_id = eos_token_id
            elif (
                pad_token_id is None
                and isinstance(eos_token_id, (list, tuple))
                and eos_token_id
            ):
                pad_token_id = eos_token_id[0]

            generation_kwargs: dict[str, Any] = {
                "max_new_tokens": args.max_new_tokens,
                "do_sample": False,
            }
            if pad_token_id is not None:
                generation_kwargs["pad_token_id"] = pad_token_id
            if eos_token_id is not None:
                generation_kwargs["eos_token_id"] = eos_token_id

            log_stage("generating")
            with torch.inference_mode():
                generated_ids = model.generate(**inputs, **generation_kwargs)

            raw_output_shape = tuple(generated_ids.shape)
            output_token_count = generated_ids.shape[-1]
            prompt_prefixed_output = (
                output_token_count > input_token_count
                and torch.equal(
                    generated_ids[0, :input_token_count],
                    inputs["input_ids"][0],
                )
            )
            if prompt_prefixed_output:
                # Decoder-only Gemma-family model outputs usually contain
                # prompt+completion. Slice only when the returned sequence is
                # longer than and starts with the prompt; some Transformers/model
                # combinations can return generated tokens only, and slicing those
                # would incorrectly erase the response.
                output_ids = generated_ids[:, input_token_count:]
            else:
                output_ids = generated_ids

            generated_token_count = output_ids.shape[-1]
            eos_token_ids = as_token_id_set(eos_token_id)
            eos_returned_immediately = first_token_is_eos(output_ids, eos_token_ids)
            decoded_full_output = decode_ids(processor, generated_ids)
            decoded_sliced_output = (
                decode_ids(processor, generated_ids[:, input_token_count:])
                if prompt_prefixed_output
                else ""
            )
            result, selected_output = select_decoded_output(
                decoded_full_output=decoded_full_output,
                decoded_sliced_output=decoded_sliced_output,
            )
            log_generation_debug(
                input_keys=input_keys,
                input_token_count=input_token_count,
                raw_output_shape=raw_output_shape,
                output_token_count=output_token_count,
                generated_token_count=generated_token_count,
                decoded_full_output_length=len(decoded_full_output),
                decoded_sliced_output_length=len(decoded_sliced_output),
                used_sliced_output=selected_output == "sliced",
                selected_output=selected_output,
                eos_returned_immediately=eos_returned_immediately,
            )

        if not result.strip():
            emit(
                {
                    "ok": False,
                    "errorType": "runner_failed",
                    "error": (
                        "MedGemma generated no decodable response text. "
                        "The runner completed generation, but the decoded output was empty; "
                        "check server stderr for safe generation metadata."
                    ),
                },
                1,
            )

        log_stage("complete")
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
