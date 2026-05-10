#!/usr/bin/env python3
"""Run local DermLIP skin-image ranking and emit one JSON object on stdout."""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_MODEL_ID = "redlessone/DermLIP_ViT-B-16"
DEFAULT_MAX_MATCHES = 5
PER_IMAGE_MATCHES = 3
MAX_IMAGE_COUNT = 5
MAX_IMAGE_PIXELS = 40_000_000
GENERAL_RED_FLAGS = [
    "fever",
    "rapidly spreading redness",
    "swelling near the eye",
    "drainage or honey-colored crusting",
    "grouped clear blisters",
    "poor feeding",
    "lethargy or unusual sleepiness",
    "breathing trouble",
    "baby acting ill",
]
DISCLAIMER = (
    "This is an AI image review, not a confirmed diagnosis. A clinician should "
    "evaluate symptoms that are severe, worsening, persistent, or concerning."
)


@dataclass(frozen=True)
class SkinLabel:
    id: str
    label: str
    prompt: str
    plain_english: str
    what_supports: tuple[str, ...]
    what_argues_against: tuple[str, ...]
    red_flags: tuple[str, ...]


LABELS: tuple[SkinLabel, ...] = (
    SkinLabel(
        id="neonatal_acne",
        label="neonatal acne / baby acne",
        prompt="a clinical skin image showing neonatal acne or baby acne with small papules or pustules on an infant face",
        plain_english="Common baby acne can look like small red or white bumps on an infant's cheeks, forehead, or face.",
        what_supports=(
            "small facial papules or pustules",
            "localized infant facial distribution",
            "no obvious widespread rash pattern",
        ),
        what_argues_against=(
            "honey-colored crusting",
            "grouped clear blisters",
            "rapid spreading swelling or warmth",
        ),
        red_flags=(
            "fever",
            "poor feeding",
            "baby acting ill",
            "rapidly spreading redness",
        ),
    ),
    SkinLabel(
        id="infantile_acne",
        label="infantile acne",
        prompt="a clinical skin image showing infantile acne with comedones papules or pustules on a baby's face",
        plain_english="Infantile acne can show acne-like bumps on the face after the newborn period.",
        what_supports=(
            "acne-like bumps",
            "face-centered pattern",
            "comedone-like spots if visible",
        ),
        what_argues_against=(
            "diffuse body rash",
            "yellow crusting",
            "clear grouped blisters",
        ),
        red_flags=("painful swelling", "rapid worsening", "fever"),
    ),
    SkinLabel(
        id="milia",
        label="milia",
        prompt="a clinical skin image showing milia with tiny white bumps on an infant face",
        plain_english="Milia are tiny white bumps that are common on infant faces and often look uniform and non-inflamed.",
        what_supports=(
            "tiny white bumps",
            "minimal surrounding redness",
            "nose cheek or forehead distribution",
        ),
        what_argues_against=("pus drainage", "marked redness", "spreading rash"),
        red_flags=("rapid redness", "swelling near the eye", "drainage or crusting"),
    ),
    SkinLabel(
        id="neonatal_cephalic_pustulosis",
        label="neonatal cephalic pustulosis",
        prompt="a clinical skin image showing neonatal cephalic pustulosis with facial pustules on a newborn scalp or face",
        plain_english="This newborn facial or scalp pattern can resemble baby acne with small pustules concentrated on the head or face.",
        what_supports=(
            "newborn face or scalp involvement",
            "small pustules",
            "localized head and neck pattern",
        ),
        what_argues_against=(
            "widespread trunk involvement",
            "honey crusting",
            "grouped vesicles",
        ),
        red_flags=("fever", "poor feeding", "baby acting ill"),
    ),
    SkinLabel(
        id="irritant_contact_dermatitis",
        label="irritant contact dermatitis",
        prompt="a clinical skin image showing irritant contact dermatitis with localized redness and irritation",
        plain_english="Irritation from saliva, rubbing, wipes, products, or fabrics can cause localized redness and roughness.",
        what_supports=(
            "localized redness",
            "area exposed to rubbing or products",
            "irritated rather than blistering pattern",
        ),
        what_argues_against=(
            "rapidly spreading warmth",
            "fever",
            "thick yellow crusting",
        ),
        red_flags=(
            "skin breakdown",
            "drainage",
            "rapid spread",
            "swelling near the eye",
        ),
    ),
    SkinLabel(
        id="atopic_dermatitis",
        label="atopic dermatitis / eczema",
        prompt="a clinical skin image showing atopic dermatitis or eczema with dry red scaly itchy patches",
        plain_english="Eczema often appears as dry, itchy, red, rough, or scaly patches that may come and go.",
        what_supports=(
            "dry or scaly patches",
            "itchy-looking irritated skin",
            "recurrent patchy redness",
        ),
        what_argues_against=(
            "localized pustules only",
            "grouped blisters",
            "rapidly spreading painful swelling",
        ),
        red_flags=("weeping or crusting", "pain", "fever", "rapid worsening"),
    ),
    SkinLabel(
        id="seborrheic_dermatitis",
        label="seborrheic dermatitis / cradle cap",
        prompt="a clinical skin image showing seborrheic dermatitis or cradle cap with greasy scale and redness on infant scalp face or folds",
        plain_english="Cradle cap and seborrheic dermatitis can cause greasy scale with redness on the scalp, eyebrows, face, or skin folds.",
        what_supports=(
            "greasy yellow-white scale",
            "scalp eyebrow or fold involvement",
            "mild redness under scale",
        ),
        what_argues_against=(
            "clear grouped blisters",
            "rapid spread",
            "marked swelling",
        ),
        red_flags=("oozing", "bad smell", "fever", "baby acting ill"),
    ),
    SkinLabel(
        id="miliaria",
        label="heat rash / miliaria",
        prompt="a clinical skin image showing heat rash or miliaria with tiny red bumps in warm occluded skin areas",
        plain_english="Heat rash can show many tiny bumps in warm, sweaty, or covered areas.",
        what_supports=(
            "many tiny bumps",
            "warm or occluded area",
            "recent heat or sweating context",
        ),
        what_argues_against=(
            "yellow crusting",
            "localized eye swelling",
            "grouped blisters",
        ),
        red_flags=("fever", "rapid spread", "painful swelling", "baby acting ill"),
    ),
    SkinLabel(
        id="impetigo",
        label="impetigo",
        prompt="a clinical skin image showing impetigo with yellow crusting or drainage",
        plain_english="Impetigo is a contagious superficial skin infection that often has honey-yellow crusting, oozing, or drainage.",
        what_supports=(
            "honey-colored crust",
            "oozing or drainage",
            "sores around nose mouth or irritated skin",
        ),
        what_argues_against=(
            "only dry non-crusted bumps",
            "uniform tiny white bumps",
            "no drainage or crust",
        ),
        red_flags=(
            "spreading redness",
            "fever",
            "swelling near the eye",
            "baby acting ill",
        ),
    ),
    SkinLabel(
        id="folliculitis",
        label="folliculitis",
        prompt="a clinical skin image showing folliculitis with small pustules centered around hair follicles",
        plain_english="Folliculitis can look like small inflamed bumps or pustules centered on hair follicles.",
        what_supports=(
            "pustules around follicles",
            "hair-bearing area",
            "similar small inflamed bumps",
        ),
        what_argues_against=(
            "flat diffuse rash",
            "greasy scale",
            "grouped clear blisters",
        ),
        red_flags=("painful boil", "spreading redness", "fever"),
    ),
    SkinLabel(
        id="viral_exanthem",
        label="viral exanthem",
        prompt="a clinical skin image showing viral exanthem with widespread red macules or papules on the body",
        plain_english="A viral rash is usually considered when there is a more widespread pattern or illness symptoms along with the rash.",
        what_supports=(
            "widespread trunk or body rash",
            "many similar red spots",
            "fever or viral symptoms if present",
        ),
        what_argues_against=(
            "single localized face patch",
            "only a few infant facial bumps",
            "yellow crusting",
        ),
        red_flags=(
            "fever in a young infant",
            "breathing trouble",
            "lethargy",
            "non-blanching purple spots",
        ),
    ),
    SkinLabel(
        id="hand_foot_mouth",
        label="hand-foot-mouth pattern",
        prompt="a clinical skin image showing hand foot and mouth disease pattern with vesicles on hands feet or around the mouth",
        plain_english="Hand-foot-mouth pattern is more likely when spots or blisters involve the hands, feet, mouth, or diaper area with illness symptoms.",
        what_supports=(
            "hands feet or mouth involvement",
            "small blisters or erosions",
            "compatible distribution",
        ),
        what_argues_against=(
            "only localized cheek bumps",
            "no hand foot or mouth distribution",
            "greasy scale",
        ),
        red_flags=(
            "dehydration",
            "breathing trouble",
            "lethargy",
            "fever in a young infant",
        ),
    ),
    SkinLabel(
        id="herpes_simplex_grouped_vesicles",
        label="herpes simplex / grouped vesicles",
        prompt="a clinical skin image showing grouped vesicles consistent with herpes simplex",
        plain_english="Grouped clear blisters, especially near the eye or in a young infant, need prompt clinician review.",
        what_supports=(
            "clustered clear blisters",
            "erosions after blisters",
            "localized painful-looking grouped lesions",
        ),
        what_argues_against=(
            "solid acne-like papules",
            "tiny uniform white bumps",
            "dry scale without blisters",
        ),
        red_flags=(
            "grouped clear blisters",
            "eye-area involvement",
            "fever",
            "poor feeding",
            "lethargy",
        ),
    ),
    SkinLabel(
        id="cellulitis_spreading_bacterial_infection",
        label="cellulitis / spreading bacterial skin infection",
        prompt="a clinical skin image showing cellulitis with spreading redness and swelling",
        plain_english="Cellulitis is a deeper spreading infection pattern with expanding redness, warmth, swelling, pain, or fever.",
        what_supports=(
            "spreading redness",
            "swelling",
            "warmth or tenderness if present",
        ),
        what_argues_against=(
            "stable tiny bumps",
            "no swelling",
            "dry scaly patch only",
        ),
        red_flags=(
            "rapidly spreading redness",
            "fever",
            "swelling near the eye",
            "baby acting ill",
        ),
    ),
    SkinLabel(
        id="urticaria_allergic_reaction",
        label="allergic reaction / urticaria",
        prompt="a clinical skin image showing allergic reaction or urticaria with raised wheals or hives",
        plain_english="Hives are raised welts that often move around and can occur with allergic reactions or viral illnesses.",
        what_supports=(
            "raised welts",
            "changing or migrating spots",
            "itchy-looking swelling",
        ),
        what_argues_against=("fixed pustules", "yellow crusting", "tiny white bumps"),
        red_flags=(
            "breathing trouble",
            "face or lip swelling",
            "vomiting with hives",
            "baby acting ill",
        ),
    ),
    SkinLabel(
        id="insect_bites",
        label="insect bites",
        prompt="a clinical skin image showing insect bites with discrete itchy red papules possibly with central puncta",
        plain_english="Bites often appear as separate itchy red bumps and may have a central dot or occur in exposed areas.",
        what_supports=(
            "discrete separated bumps",
            "central punctum if visible",
            "exposed skin distribution",
        ),
        what_argues_against=(
            "widespread viral pattern",
            "greasy scale",
            "uniform tiny white facial bumps",
        ),
        red_flags=("rapid swelling", "spreading redness", "drainage", "fever"),
    ),
    SkinLabel(
        id="nonspecific_unclear_rash",
        label="nonspecific rash / unclear",
        prompt="a clinical skin image showing a nonspecific unclear rash without a definitive visual pattern",
        plain_english="Some images do not have enough distinctive visual information for a confident visual category.",
        what_supports=(
            "mixed or subtle findings",
            "limited image context",
            "no single distinctive pattern",
        ),
        what_argues_against=(
            "classic honey crust",
            "classic grouped blisters",
            "classic tiny white milia",
        ),
        red_flags=tuple(GENERAL_RED_FLAGS),
    ),
)


class ImageDecodeError(Exception):
    """Raised when PIL cannot safely decode the uploaded image."""


class RunnerFailure(Exception):
    """Raised for local model or classification failures."""


def emit_stage(stage: str) -> None:
    print(f"STAGE: {stage}", file=sys.stderr, flush=True)


def default_max_matches_from_env() -> int:
    raw_value = os.environ.get("SKIN_REVIEW_MAX_MATCHES")
    if not raw_value:
        return DEFAULT_MAX_MATCHES
    try:
        return int(raw_value)
    except ValueError:
        print(
            "Ignoring SKIN_REVIEW_MAX_MATCHES because it is not an integer.",
            file=sys.stderr,
            flush=True,
        )
        return DEFAULT_MAX_MATCHES


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run local DermLIP skin image ranking."
    )
    parser.add_argument(
        "--image",
        action="append",
        required=True,
        help="Path to a local JPG, PNG, or WebP image. Repeat for multiple images.",
    )
    parser.add_argument(
        "--max-matches",
        type=int,
        default=default_max_matches_from_env(),
        help="Number of ranked matches to return.",
    )
    parser.add_argument(
        "--smoke-validation-only",
        action="store_true",
        help="Validate image handling and JSON output without loading the model.",
    )
    return parser.parse_args()


def requested_device() -> str:
    value = os.environ.get("SKIN_REVIEW_DEVICE", "auto").strip().lower()
    if value not in {"auto", "cuda", "cpu"}:
        print(
            "Ignoring SKIN_REVIEW_DEVICE because it is not auto, cuda, or cpu.",
            file=sys.stderr,
            flush=True,
        )
        return "auto"
    return value


def model_id() -> str:
    return (
        os.environ.get("SKIN_REVIEW_MODEL_ID", DEFAULT_MODEL_ID).strip()
        or DEFAULT_MODEL_ID
    )


def clamp_max_matches(value: int) -> int:
    if value < 1:
        return DEFAULT_MAX_MATCHES
    return min(value, len(LABELS), 10)


def load_image(image_path: str):
    from PIL import Image, ImageOps

    path = Path(image_path)
    if not path.is_file():
        raise ImageDecodeError("Image file was not found.")

    try:
        with Image.open(path) as probe:
            probe.verify()
        with Image.open(path) as image:
            if image.width <= 0 or image.height <= 0:
                raise ImageDecodeError("Image dimensions are invalid.")
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise ImageDecodeError("Image is too large to decode safely.")
            return ImageOps.exif_transpose(image).convert("RGB")
    except ImageDecodeError:
        raise
    except Exception as exc:  # noqa: BLE001 - converted to safe JSON error.
        raise ImageDecodeError(
            "PIL could not decode the uploaded image safely."
        ) from exc


def validate_image_signature_for_smoke(image_path: str) -> None:
    path = Path(image_path)
    if not path.is_file():
        raise ImageDecodeError("Image file was not found.")
    data = path.read_bytes()[:32]
    is_jpeg = len(data) >= 3 and data[:3] == b"\xff\xd8\xff"
    is_png = len(data) >= 8 and data[:8] == b"\x89PNG\r\n\x1a\n"
    is_webp = len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    if not (is_jpeg or is_png or is_webp):
        raise ImageDecodeError(
            "Image file did not look like a JPG, PNG, or WebP image."
        )


def choose_device(torch_module: Any) -> str:
    request = requested_device()
    if request == "cpu":
        return "cpu"
    if request == "cuda":
        if not torch_module.cuda.is_available():
            raise RunnerFailure(
                "SKIN_REVIEW_DEVICE=cuda was requested, but CUDA is not available."
            )
        return "cuda"
    return "cuda" if torch_module.cuda.is_available() else "cpu"


def match_from_score(index: int, score: float) -> dict[str, Any]:
    label = LABELS[index]
    percent = round(float(score) * 100.0, 1)
    return {
        "id": label.id,
        "label": label.label,
        "score": round(float(score), 4),
        "percent": percent,
        "plainEnglish": label.plain_english,
        "whatSupports": list(label.what_supports),
        "whatArguesAgainst": list(label.what_argues_against),
        "redFlags": list(dict.fromkeys([*label.red_flags, *GENERAL_RED_FLAGS])),
    }


def top_matches_from_scores(
    scores: list[float], max_matches: int
) -> list[dict[str, Any]]:
    ranked_indices = sorted(
        range(len(scores)), key=lambda index: scores[index], reverse=True
    )[:max_matches]
    return [match_from_score(index, scores[index]) for index in ranked_indices]


def classify_images(
    images: list[Any], max_matches: int
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    emit_stage("loading_model")
    try:
        import open_clip
        import torch
    except Exception as exc:  # noqa: BLE001 - dependency error reported as safe JSON.
        raise RunnerFailure(
            "Missing local skin review dependencies. Run scripts/setup-skin-review.ps1 from ui/partner-hub."
        ) from exc

    selected_model_id = model_id()
    device = choose_device(torch)

    try:
        model, _, preprocess = open_clip.create_model_and_transforms(
            f"hf-hub:{selected_model_id}"
        )
        tokenizer = open_clip.get_tokenizer(f"hf-hub:{selected_model_id}")
    except Exception as exc:  # noqa: BLE001 - avoid leaking cache paths/tokens.
        raise RunnerFailure(
            "Could not load the local DermLIP model from the configured Hugging Face model ID."
        ) from exc

    model = model.to(device)
    model.eval()

    emit_stage("running_classification")
    prompts = [label.prompt for label in LABELS]
    all_scores: list[list[float]] = []

    with torch.no_grad():
        text_tokens = tokenizer(prompts).to(device)
        text_features = model.encode_text(text_tokens)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

        for image in images:
            image_tensor = preprocess(image).unsqueeze(0).to(device)
            image_features = model.encode_image(image_tensor)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            similarities = (100.0 * image_features @ text_features.T).softmax(dim=-1)[0]
            all_scores.append(
                [float(score) for score in similarities.detach().cpu().tolist()]
            )

    average_scores = [
        sum(image_scores[label_index] for image_scores in all_scores) / len(all_scores)
        for label_index in range(len(LABELS))
    ]
    combined_matches = top_matches_from_scores(average_scores, max_matches)
    per_image_matches = [
        {
            "imageIndex": image_index + 1,
            "topMatches": top_matches_from_scores(
                image_scores, min(PER_IMAGE_MATCHES, max_matches)
            ),
        }
        for image_index, image_scores in enumerate(all_scores)
    ]
    return combined_matches, per_image_matches


def smoke_matches(max_matches: int) -> list[dict[str, Any]]:
    scores = [0.0 for _ in LABELS]
    return top_matches_from_scores(scores, max_matches)


def smoke_per_image_matches(image_count: int, max_matches: int) -> list[dict[str, Any]]:
    top_matches = top_matches_from_scores(
        [0.0 for _ in LABELS], min(PER_IMAGE_MATCHES, max_matches)
    )
    return [
        {"imageIndex": image_index + 1, "topMatches": top_matches}
        for image_index in range(image_count)
    ]


def has_mixed_per_image_evidence(per_image_matches: list[dict[str, Any]]) -> bool:
    top_labels = {
        image_result["topMatches"][0]["id"]
        for image_result in per_image_matches
        if image_result.get("topMatches")
    }
    return len(top_labels) > 1


def build_review_text(
    matches: list[dict[str, Any]],
    image_count: int,
    per_image_matches: list[dict[str, Any]],
) -> str:
    top = matches[0]
    alternatives = matches[1:4]
    support_text = "; ".join(top["whatSupports"][:3])
    argues_text = []
    for match in alternatives:
        argues_text.append(
            f"{match['label']} would be more likely with {', '.join(match['whatSupports'][:2])}."
        )
    red_flags = list(dict.fromkeys([*top.get("redFlags", []), *GENERAL_RED_FLAGS]))
    mixed_evidence = has_mixed_per_image_evidence(per_image_matches)
    image_word = "image" if image_count == 1 else "images"
    mixed_text = (
        " The per-image top labels differ, so the visual evidence is mixed/inconsistent across the submitted views."
        if mixed_evidence
        else ""
    )

    return "\n\n".join(
        [
            "Most likely matches:\n"
            + "\n".join(
                f"- {match['label']} ({match['percent']:.1f}%)" for match in matches
            ),
            "Plain-English read:\n"
            + f"Based on {image_count} {image_word}, the combined top visual match is {top['label']}. Scores are averaged visual similarity rankings across the submitted image(s), not diagnosis confidence.{mixed_text}",
            "Why it may fit:\n"
            + f"{top['plainEnglish']} Visual features that can support this category include {support_text}.",
            "Other possibilities:\n"
            + (
                " ".join(argues_text)
                if argues_text
                else "No additional ranked alternatives were returned."
            ),
            "Concerns / red flags:\nSeek prompt clinical advice for "
            + ", ".join(red_flags)
            + ".",
            "What to do:\nUse gentle skin care, avoid new irritants or fragranced products, do not squeeze or pick bumps, and monitor whether the area spreads, drains, swells, or the child seems unwell. Contact a pediatrician or clinician when symptoms are severe, worsening, persistent, near the eye, or concerning.",
            "Disclaimer:\n" + DISCLAIMER,
        ]
    )


def success_payload(
    matches: list[dict[str, Any]],
    selected_model_id: str,
    image_count: int,
    per_image_matches: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "ok": True,
        "model": selected_model_id,
        "imageCount": image_count,
        "topMatches": matches,
        "perImageMatches": per_image_matches,
        "reviewText": build_review_text(matches, image_count, per_image_matches),
    }


def error_payload(error: str, error_type: str = "runner_failed") -> dict[str, Any]:
    return {"ok": False, "error": error, "errorType": error_type}


def main() -> int:
    args = parse_args()
    max_matches = clamp_max_matches(args.max_matches)
    image_paths = args.image or []

    try:
        emit_stage("validating_image")
        if not image_paths:
            raise ImageDecodeError("At least one image file is required.")
        if len(image_paths) > MAX_IMAGE_COUNT:
            raise ImageDecodeError(
                "No more than 5 image files can be reviewed at once."
            )

        if args.smoke_validation_only:
            for image_path in image_paths:
                validate_image_signature_for_smoke(image_path)
            matches = smoke_matches(max_matches)
            per_image_matches = smoke_per_image_matches(len(image_paths), max_matches)
            emit_stage("running_classification")
            emit_stage("complete")
            print(
                json.dumps(
                    success_payload(
                        matches,
                        "smoke-validation-only",
                        len(image_paths),
                        per_image_matches,
                    ),
                    separators=(",", ":"),
                ),
                flush=True,
            )
            return 0

        images = [load_image(image_path) for image_path in image_paths]
        matches, per_image_matches = classify_images(images, max_matches)
        emit_stage("complete")
        print(
            json.dumps(
                success_payload(matches, model_id(), len(images), per_image_matches),
                separators=(",", ":"),
            ),
            flush=True,
        )
        return 0
    except ImageDecodeError as exc:
        print(f"Skin review image decode failed: {exc}", file=sys.stderr, flush=True)
        print(
            json.dumps(
                error_payload(str(exc), "image_decode_failed"), separators=(",", ":")
            ),
            flush=True,
        )
        return 1
    except Exception as exc:  # noqa: BLE001 - strict JSON error for the API route.
        print(f"Skin review runner failed: {exc}", file=sys.stderr, flush=True)
        print(
            json.dumps(error_payload(str(exc), "runner_failed"), separators=(",", ":")),
            flush=True,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
