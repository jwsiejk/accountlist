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
from typing import Any, NamedTuple

MODEL_ID = "google/medgemma-1.5-4b-it"
DEFAULT_MAX_NEW_TOKENS = 192
DEFAULT_INPUT_MODE = "chat_template_tokenize"
SUPPORTED_INPUT_MODES = {
    "auto",
    "text_processor",
    "chat_template_tokenize",
    "direct_text_processor",
}
DIRECT_PROMPT_TEXT = (
    "<image>\n"
    "Describe this image briefly. Include visible findings and red flags. "
    "Do not provide a diagnosis."
)
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


def env_flag(name: str, *, default: bool = False) -> bool:
    raw_value = os.environ.get(name)
    if raw_value is None or raw_value.strip() == "":
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def env_input_mode() -> str:
    raw_value = os.environ.get("MEDGEMMA_INPUT_MODE", DEFAULT_INPUT_MODE)
    input_mode = raw_value.strip().lower() if raw_value else DEFAULT_INPUT_MODE
    if input_mode in SUPPORTED_INPUT_MODES:
        return input_mode

    print(
        "Ignoring MEDGEMMA_INPUT_MODE because it is not one of "
        f"{', '.join(sorted(SUPPORTED_INPUT_MODES))}; using {DEFAULT_INPUT_MODE}.",
        file=sys.stderr,
        flush=True,
    )
    return DEFAULT_INPUT_MODE


def env_dtype(torch_module: Any, *, device: str) -> Any:
    default_dtype = torch_module.float16 if device == "cuda" else torch_module.float32
    raw_value = os.environ.get("MEDGEMMA_DTYPE")
    if raw_value is None or raw_value.strip() == "":
        return default_dtype

    dtype_name = raw_value.strip().lower()
    if dtype_name == "bfloat16":
        return torch_module.bfloat16
    if dtype_name == "float16":
        return torch_module.float16

    print(
        "Ignoring MEDGEMMA_DTYPE because it is not one of bfloat16, float16; "
        f"using {default_dtype}.",
        file=sys.stderr,
        flush=True,
    )
    return default_dtype


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


def decode_ids_with_processor_batch_decode(processor: Any, token_ids: Any) -> str:
    if getattr(token_ids, "ndim", 0) == 1:
        token_ids = token_ids.unsqueeze(0)
    return processor.batch_decode(token_ids, skip_special_tokens=True)[0].strip()


def decode_ids_with_processor_decode(processor: Any, token_ids: Any) -> str:
    if getattr(token_ids, "ndim", 0) > 1:
        token_ids = token_ids[0]
    return processor.decode(token_ids, skip_special_tokens=True).strip()


def decode_ids_with_tokenizer(processor: Any, token_ids: Any) -> str:
    tokenizer = getattr(processor, "tokenizer", None)
    if tokenizer is None:
        return ""
    if getattr(token_ids, "ndim", 0) > 1:
        token_ids = token_ids[0]
    return tokenizer.decode(token_ids, skip_special_tokens=True).strip()


def decode_ids(processor: Any, token_ids: Any) -> tuple[str, str]:
    """Decode with the safest available HF helpers and report which one won.

    MedGemma's official model card decodes generated IDs with
    ``processor.decode(..., skip_special_tokens=True)``. Older local runners used
    ``processor.batch_decode``. Try both, plus tokenizer.decode when available,
    and choose the first non-empty decode in that official-to-legacy order. The
    caller logs method names and lengths only; no prompt or raw token IDs leave
    the process.
    """

    attempts = [
        ("processor_decode", decode_ids_with_processor_decode),
        ("processor_batch_decode", decode_ids_with_processor_batch_decode),
        ("tokenizer_decode", decode_ids_with_tokenizer),
    ]
    last_method = "empty"
    last_text = ""
    for method, decoder in attempts:
        try:
            text = decoder(processor, token_ids)
        except Exception as exc:  # noqa: BLE001 - diagnostics must not break JSON stdout.
            print(
                f"Decode method {method} failed with {type(exc).__name__}.",
                file=sys.stderr,
                flush=True,
            )
            continue
        last_method = method
        last_text = text
        if text.strip():
            return text, method

    return last_text, last_method


def non_special_decoded_char_count(processor: Any, token_ids: Any) -> int:
    decoded, _method = decode_ids(processor, token_ids)
    return len(decoded)


def count_generated_special_tokens(processor: Any, token_ids: Any) -> int:
    tokenizer = getattr(processor, "tokenizer", None)
    all_special_ids = getattr(tokenizer, "all_special_ids", None)
    if not all_special_ids:
        return 0

    special_ids = {int(token_id) for token_id in all_special_ids if isinstance(token_id, int)}
    if not special_ids:
        return 0

    flattened = token_ids.reshape(-1) if hasattr(token_ids, "reshape") else token_ids
    special_count = 0
    for token_id in flattened:
        try:
            value = int(token_id.item())
        except AttributeError:
            value = int(token_id)
        if value in special_ids:
            special_count += 1
    return special_count


def build_medgemma_inputs(
    processor: Any,
    messages: list[dict[str, Any]],
    image: Any,
    input_mode: str,
) -> tuple[Any, str]:
    """Build MedGemma inputs for the requested runner mode."""

    if input_mode == "chat_template_tokenize":
        return (
            processor.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt",
            ),
            "chat_template_tokenize",
        )

    if input_mode == "direct_text_processor":
        return (
            processor(images=image, text=DIRECT_PROMPT_TEXT, return_tensors="pt"),
            "direct_text_processor",
        )

    if input_mode != "text_processor":
        raise ValueError(f"Unsupported MedGemma input mode: {input_mode}")

    chat_text = processor.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=False,
    )
    return processor(images=image, text=chat_text, return_tensors="pt"), "text_processor"


def input_modes_to_try(input_mode: str) -> list[str]:
    if input_mode != "auto":
        return [input_mode]

    # Auto is an explicit diagnostic/fallback mode only. The default remains the
    # official tokenize=True chat-template path and does not silently fall back to
    # alternate prompt formatting.
    return ["chat_template_tokenize", "text_processor", "direct_text_processor"]


def remove_optional_input_keys(inputs: Any, *, drop_token_type_ids: bool) -> list[str]:
    removed_input_keys: list[str] = []
    if drop_token_type_ids and "token_type_ids" in inputs:
        try:
            inputs.pop("token_type_ids")
        except AttributeError:
            del inputs["token_type_ids"]
        removed_input_keys.append("token_type_ids")
    return removed_input_keys


def build_generation_kwargs(max_new_tokens: int) -> dict[str, Any]:
    generation_kwargs: dict[str, Any] = {"max_new_tokens": max_new_tokens}
    if env_flag("MEDGEMMA_USE_DEFAULT_GENERATION_CONFIG", default=False):
        return generation_kwargs

    generation_kwargs["do_sample"] = False
    return generation_kwargs


class WrapperStripResult(NamedTuple):
    text: str
    wrapper_detected: bool


class OutputSelection(NamedTuple):
    result: str
    selected_output: str
    wrapper_detected: bool


ASSISTANT_ROLE_MARKER_PATTERN = re.compile(
    r"(?im)(?:^|\n)[ \t]*(?P<role>assistant|model)[ \t]*"
    r"(?:(?P<colon>:[ \t]*)(?P<same_line>[^\n]*))?(?=\n|$)"
)
USER_ROLE_MARKER_PATTERN = re.compile(
    r"(?im)(?:^|\n)[ \t]*user[ \t]*(?::[^\n]*)?(?=\n|$)"
)


def strip_obvious_chat_template_wrapper(text: str) -> WrapperStripResult:
    """Remove visible chat role wrappers without erasing valid model text.

    MedGemma/Gemma chat templates can decode full prompt+completion text as
    visible role-labeled content after special tokens are removed, for example
    "user\n...\nmodel\nresponse". In the empty-generation failure mode the
    decoded text can end at the final "model"/"assistant" marker. Treat that
    final marker with no suffix as empty assistant output instead of returning
    the prompt wrapper to the UI as a successful response.
    """
    stripped_text = text.strip()
    if not stripped_text:
        return WrapperStripResult("", False)

    matches = list(ASSISTANT_ROLE_MARKER_PATTERN.finditer(stripped_text))
    for match in reversed(matches):
        prefix = stripped_text[: match.start()]
        marker_at_start = prefix.strip() == ""
        prefix_has_user_marker = USER_ROLE_MARKER_PATTERN.search(prefix) is not None
        if not prefix_has_user_marker and not marker_at_start:
            continue

        same_line_content = match.group("same_line") if match.group("colon") else None
        if same_line_content and same_line_content.strip():
            suffix = f"{same_line_content}{stripped_text[match.end():]}"
        else:
            suffix = stripped_text[match.end() :]

        return WrapperStripResult(suffix.strip(), True)

    return WrapperStripResult(stripped_text, False)


def select_decoded_output(
    *, decoded_full_output: str, decoded_sliced_output: str
) -> OutputSelection:
    if decoded_sliced_output.strip():
        sliced = strip_obvious_chat_template_wrapper(decoded_sliced_output)
        if sliced.text.strip():
            return OutputSelection(sliced.text, "sliced", sliced.wrapper_detected)
        if sliced.wrapper_detected:
            return OutputSelection("", "sliced_empty_wrapper", True)

    if decoded_full_output.strip():
        full = strip_obvious_chat_template_wrapper(decoded_full_output)
        if full.text.strip():
            return OutputSelection(full.text, "full", full.wrapper_detected)
        if full.wrapper_detected:
            return OutputSelection("", "full_empty_wrapper", True)

    return OutputSelection("", "empty", False)


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
    input_flow: str,
    removed_input_keys: list[str],
    dtype_name: str,
    raw_output_shape: tuple[int, ...],
    output_token_count: int,
    generated_token_count: int,
    generated_special_token_count: int,
    generated_non_special_decoded_char_count: int,
    decoded_full_output_length: int,
    decoded_sliced_output_length: int,
    decoded_full_method: str,
    decoded_sliced_method: str,
    used_sliced_output: bool,
    selected_output: str,
    wrapper_detected: bool,
    prompt_prefixed_output: bool,
    final_response_length: int,
    eos_returned_immediately: bool,
) -> None:
    print(
        "GENERATION_DEBUG: "
        f"input_keys={','.join(input_keys)} "
        f"removed_input_keys={','.join(removed_input_keys) if removed_input_keys else 'none'} "
        f"input_flow={input_flow} "
        f"dtype={dtype_name} "
        f"input_token_count={input_token_count} "
        f"raw_output_shape={raw_output_shape} "
        f"output_token_count={output_token_count} "
        f"generated_token_count={generated_token_count} "
        f"generated_special_token_count={generated_special_token_count} "
        f"generated_non_special_decoded_char_count={generated_non_special_decoded_char_count} "
        f"decoded_full_output_length={decoded_full_output_length} "
        f"decoded_sliced_output_length={decoded_sliced_output_length} "
        f"decoded_full_method={decoded_full_method} "
        f"decoded_sliced_method={decoded_sliced_method} "
        f"used_sliced_output={str(used_sliced_output).lower()} "
        f"selected_output={selected_output} "
        f"wrapper_detected={str(wrapper_detected).lower()} "
        f"prompt_prefixed_output={str(prompt_prefixed_output).lower()} "
        f"chat_template_add_generation_prompt=true "
        f"final_response_length={final_response_length} "
        f"eos_returned_immediately={str(eos_returned_immediately).lower()}",
        file=sys.stderr,
        flush=True,
    )


def safe_generation_diagnostics(
    *,
    input_flow: str,
    removed_input_keys: list[str],
    dtype_name: str,
    generated_token_count: int,
    generated_special_token_count: int,
    generated_non_special_decoded_char_count: int,
    decoded_full_output_length: int,
    decoded_sliced_output_length: int,
    selected_output: str,
    final_response_length: int,
) -> str:
    return (
        f"input_flow={input_flow}; "
        f"removed_input_keys={','.join(removed_input_keys) if removed_input_keys else 'none'}; "
        f"dtype={dtype_name}; "
        f"generated_token_count={generated_token_count}; "
        f"generated_special_token_count={generated_special_token_count}; "
        f"generated_non_special_decoded_char_count={generated_non_special_decoded_char_count}; "
        f"decoded_full_output_length={decoded_full_output_length}; "
        f"decoded_sliced_output_length={decoded_sliced_output_length}; "
        f"selected_output={selected_output}; "
        f"final_response_length={final_response_length}"
    )


def is_special_token_only_generation(
    *,
    generated_token_count: int,
    generated_special_token_count: int,
    generated_non_special_decoded_char_count: int,
) -> bool:
    return (
        generated_token_count > 0
        and generated_special_token_count == generated_token_count
        and generated_non_special_decoded_char_count == 0
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
            dtype = env_dtype(torch, device=device)
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

            # The default input flow mirrors the official MedGemma example:
            # apply_chat_template(..., tokenize=True) with add_generation_prompt.
            # Alternate flows are available only when MEDGEMMA_INPUT_MODE is set.
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": args.prompt},
                    ],
                }
            ]

            input_mode = env_input_mode()
            drop_token_type_ids = env_flag("MEDGEMMA_DROP_TOKEN_TYPE_IDS", default=False)
            use_default_generation_config = env_flag(
                "MEDGEMMA_USE_DEFAULT_GENERATION_CONFIG",
                default=False,
            )
            generation_kwargs = build_generation_kwargs(args.max_new_tokens)
            eos_token_id = getattr(model.generation_config, "eos_token_id", None)
            if eos_token_id is None:
                eos_token_id = getattr(model.config, "eos_token_id", None)

            result = ""
            selected_output = "empty"
            dtype_name = str(dtype).replace("torch.", "")
            last_safe_diagnostics = "none"
            saw_special_token_only_generation = False
            attempted_modes = input_modes_to_try(input_mode)
            for attempted_mode in attempted_modes:
                log_stage(f"generating:{attempted_mode}")
                print(
                    "Running MedGemma generation with "
                    f"input_mode={attempted_mode}, "
                    f"drop_token_type_ids={str(drop_token_type_ids).lower()}, "
                    "use_default_generation_config="
                    f"{str(use_default_generation_config).lower()}...",
                    file=sys.stderr,
                    flush=True,
                )
                try:
                    inputs, input_flow = build_medgemma_inputs(
                        processor,
                        messages,
                        image,
                        attempted_mode,
                    )
                except Exception as exc:  # noqa: BLE001 - auto mode should try fallbacks.
                    if input_mode != "auto":
                        raise
                    print(
                        "MedGemma input mode failed before generation; "
                        f"input_mode={attempted_mode}, error={type(exc).__name__}.",
                        file=sys.stderr,
                        flush=True,
                    )
                    continue
                input_keys = sorted(str(key) for key in inputs.keys())
                removed_input_keys = remove_optional_input_keys(
                    inputs,
                    drop_token_type_ids=drop_token_type_ids,
                )
                inputs = move_inputs_to_model_device(
                    inputs,
                    device=model.device,
                    dtype=dtype,
                )
                input_token_count = inputs["input_ids"].shape[-1]

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
                generated_special_token_count = count_generated_special_tokens(
                    processor,
                    output_ids,
                )
                generated_non_special_decoded_char_count = non_special_decoded_char_count(
                    processor,
                    output_ids,
                )
                decoded_full_output, decoded_full_method = decode_ids(processor, generated_ids)
                if prompt_prefixed_output:
                    decoded_sliced_output, decoded_sliced_method = decode_ids(
                        processor,
                        generated_ids[:, input_token_count:],
                    )
                else:
                    decoded_sliced_output = ""
                    decoded_sliced_method = "not_prompt_prefixed"
                output_selection = select_decoded_output(
                    decoded_full_output=decoded_full_output,
                    decoded_sliced_output=decoded_sliced_output,
                )
                result = output_selection.result
                selected_output = output_selection.selected_output
                final_response_length = len(result)
                last_safe_diagnostics = safe_generation_diagnostics(
                    input_flow=input_flow,
                    removed_input_keys=removed_input_keys,
                    dtype_name=dtype_name,
                    generated_token_count=generated_token_count,
                    generated_special_token_count=generated_special_token_count,
                    generated_non_special_decoded_char_count=(
                        generated_non_special_decoded_char_count
                    ),
                    decoded_full_output_length=len(decoded_full_output),
                    decoded_sliced_output_length=len(decoded_sliced_output),
                    selected_output=selected_output,
                    final_response_length=final_response_length,
                )
                saw_special_token_only_generation = (
                    saw_special_token_only_generation
                    or is_special_token_only_generation(
                        generated_token_count=generated_token_count,
                        generated_special_token_count=generated_special_token_count,
                        generated_non_special_decoded_char_count=(
                            generated_non_special_decoded_char_count
                        ),
                    )
                )
                log_generation_debug(
                    input_keys=input_keys,
                    input_token_count=input_token_count,
                    input_flow=input_flow,
                    removed_input_keys=removed_input_keys,
                    dtype_name=dtype_name,
                    raw_output_shape=raw_output_shape,
                    output_token_count=output_token_count,
                    generated_token_count=generated_token_count,
                    generated_special_token_count=generated_special_token_count,
                    generated_non_special_decoded_char_count=(
                        generated_non_special_decoded_char_count
                    ),
                    decoded_full_output_length=len(decoded_full_output),
                    decoded_sliced_output_length=len(decoded_sliced_output),
                    decoded_full_method=decoded_full_method,
                    decoded_sliced_method=decoded_sliced_method,
                    used_sliced_output=selected_output == "sliced",
                    selected_output=selected_output,
                    wrapper_detected=output_selection.wrapper_detected,
                    prompt_prefixed_output=prompt_prefixed_output,
                    final_response_length=final_response_length,
                    eos_returned_immediately=eos_returned_immediately,
                )
                if result.strip():
                    break

                print(
                    "MedGemma mode produced no displayable assistant text; "
                    f"input_mode={attempted_mode}, selected_output={selected_output}.",
                    file=sys.stderr,
                    flush=True,
                )

        if not result.strip():
            if saw_special_token_only_generation:
                error_message = (
                    "MedGemma generated only special/control tokens. "
                    f"Diagnostics: {last_safe_diagnostics}."
                )
            else:
                error_message = (
                    "MedGemma generated no decodable assistant text in the configured "
                    "local input mode(s). The runner completed generation, but the "
                    "decoded output was empty or only chat-template wrappers. "
                    f"Diagnostics: {last_safe_diagnostics}."
                )

            emit(
                {
                    "ok": False,
                    "errorType": "runner_failed",
                    "error": error_message,
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
