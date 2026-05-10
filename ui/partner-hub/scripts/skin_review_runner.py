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
STRONG_MARGIN = 0.12
MODERATE_MARGIN = 0.05
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
    prompts: tuple[str, ...]
    plain_english: str
    what_supports: tuple[str, ...]
    what_argues_against: tuple[str, ...]
    red_flags: tuple[str, ...]
    high_consequence: bool = False


# Prompts intentionally include multiple morphology/distribution variants per label
# (papules, pustules, vesicles/blisters, crusting/drainage, scaling/dryness,
# swelling, flat/diffuse rash, facial vs trunk/widespread vs hands/feet/mouth).
# During scoring, each prompt variant is encoded, image-to-prompt similarities are
# computed, and variants are max-pooled into one label score. Max-pooling favors
# the best clinically distinct variant without displaying raw prompts to users.
LABELS: tuple[SkinLabel, ...] = (
    SkinLabel(
        id="neonatal_acne",
        label="neonatal acne / baby acne",
        prompts=(
            "a clinical skin image showing neonatal acne with small red papules on an infant face",
            "a clinical skin image showing baby acne with small pustules on the cheeks of a newborn",
            "a close-up infant face photo with scattered acne-like bumps on the cheeks",
        ),
        plain_english="Common baby acne can look like small red or white bumps on an infant's cheeks, forehead, or face.",
        what_supports=(
            "small facial papules or pustules",
            "localized cheek forehead or face distribution",
            "no obvious widespread trunk rash pattern",
        ),
        what_argues_against=(
            "honey-colored crusting or drainage",
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
        prompts=(
            "a clinical skin image showing infantile acne with comedones papules or pustules on a baby's face",
            "acne-like inflamed bumps and pustules on the cheeks forehead or chin of an infant",
            "comedone-like spots with facial papules after the newborn period",
        ),
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
        prompts=(
            "a clinical skin image showing milia with tiny white bumps on an infant face",
            "tiny firm white cyst-like bumps on a newborn nose cheeks or forehead",
            "uniform pearly white noninflamed papules on an infant face",
        ),
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
        prompts=(
            "a clinical skin image showing neonatal cephalic pustulosis with facial pustules on a newborn scalp or face",
            "newborn face scalp or neck with many small pustules and acne-like papules",
            "localized newborn head and neck pustular eruption without honey crusting",
        ),
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
        prompts=(
            "localized red irritated skin from rubbing saliva wipes detergent or skin products",
            "patchy irritated redness without blisters or honey crusting",
            "rough dry red localized rash in an area exposed to friction moisture or products",
        ),
        plain_english="Irritation from saliva, rubbing, wipes, products, or fabrics can cause localized redness and roughness.",
        what_supports=(
            "localized redness",
            "area exposed to rubbing saliva wipes products or fabrics",
            "irritated rough skin without blister clusters",
        ),
        what_argues_against=(
            "rapidly spreading warmth",
            "fever",
            "thick yellow crusting",
        ),
        red_flags=("skin breakdown", "drainage", "rapid spread", "swelling near the eye"),
    ),
    SkinLabel(
        id="atopic_dermatitis",
        label="atopic dermatitis / eczema",
        prompts=(
            "a clinical skin image showing atopic dermatitis or eczema with dry red scaly itchy patches",
            "rough scaling dryness and patchy redness on infant cheeks folds or body",
            "chronic itchy-looking inflamed skin plaques with scale and dryness",
        ),
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
        prompts=(
            "a clinical skin image showing seborrheic dermatitis or cradle cap with greasy scale and redness on infant scalp face or folds",
            "greasy yellow-white scale on scalp eyebrows forehead ears or skin folds of a baby",
            "flaky scaling cradle cap pattern with mild redness on infant head or face",
        ),
        plain_english="Cradle cap and seborrheic dermatitis can cause greasy scale with redness on the scalp, eyebrows, face, or skin folds.",
        what_supports=(
            "greasy yellow-white scale",
            "scalp eyebrow or fold involvement",
            "mild redness under scale",
        ),
        what_argues_against=("clear grouped blisters", "rapid spread", "marked swelling"),
        red_flags=("oozing", "bad smell", "fever", "baby acting ill"),
    ),
    SkinLabel(
        id="miliaria",
        label="heat rash / miliaria",
        prompts=(
            "a clinical skin image showing heat rash or miliaria with tiny red bumps in warm occluded skin areas",
            "many tiny red papules or vesicles on neck folds trunk or covered sweaty skin",
            "fine prickly heat rash bumps in areas of heat sweating or occlusion",
        ),
        plain_english="Heat rash can show many tiny bumps in warm, sweaty, or covered areas.",
        what_supports=("many tiny bumps", "warm or occluded area", "recent heat or sweating context"),
        what_argues_against=("yellow crusting", "localized eye swelling", "grouped blisters"),
        red_flags=("fever", "rapid spread", "painful swelling", "baby acting ill"),
    ),
    SkinLabel(
        id="impetigo",
        label="impetigo",
        prompts=(
            "honey-colored crusting or oozing superficial skin infection",
            "yellow crusted sores around the mouth nose or irritated skin",
            "drainage weeping erosions and golden crust on superficial skin lesions",
        ),
        plain_english="Impetigo is a contagious superficial skin infection that often has honey-yellow crusting, oozing, or drainage.",
        what_supports=("honey-colored crust", "oozing or drainage", "sores around nose mouth or irritated skin"),
        what_argues_against=("only dry non-crusted bumps", "uniform tiny white bumps", "no drainage or crust"),
        red_flags=("spreading redness", "fever", "swelling near the eye", "baby acting ill"),
        high_consequence=True,
    ),
    SkinLabel(
        id="folliculitis",
        label="folliculitis",
        prompts=(
            "a clinical skin image showing folliculitis with small pustules centered around hair follicles",
            "multiple small inflamed follicle-centered bumps or pustules on hair-bearing skin",
            "scattered pustules around hair follicles without diffuse flat rash",
        ),
        plain_english="Folliculitis can look like small inflamed bumps or pustules centered on hair follicles.",
        what_supports=("pustules around follicles", "hair-bearing area", "similar small inflamed bumps"),
        what_argues_against=("flat diffuse rash", "greasy scale", "grouped clear blisters"),
        red_flags=("painful boil", "spreading redness", "fever"),
    ),
    SkinLabel(
        id="viral_exanthem",
        label="viral exanthem",
        prompts=(
            "widespread red macules or papules on trunk and body with viral illness",
            "flat or slightly raised diffuse red rash over the trunk and body",
            "many similar red spots on widespread skin distribution with fever or viral symptoms",
        ),
        plain_english="A viral rash is usually considered when there is a more widespread pattern or illness symptoms along with the rash.",
        what_supports=("widespread trunk or body rash", "many similar red spots", "fever or viral symptoms if present"),
        what_argues_against=("single localized face patch", "only a few infant facial bumps", "yellow crusting"),
        red_flags=("fever in a young infant", "breathing trouble", "lethargy", "non-blanching purple spots"),
        high_consequence=True,
    ),
    SkinLabel(
        id="hand_foot_mouth",
        label="hand-foot-mouth pattern",
        prompts=(
            "vesicles or spots involving hands feet mouth or diaper area",
            "a clinical skin image showing hand foot and mouth disease pattern with vesicles on hands feet or around the mouth",
            "small blisters erosions or red spots on palms soles mouth area or diaper area",
        ),
        plain_english="Hand-foot-mouth pattern is more likely when spots or blisters involve the hands, feet, mouth, or diaper area with illness symptoms.",
        what_supports=("hands feet or mouth involvement", "small blisters or erosions", "compatible distribution"),
        what_argues_against=("only localized cheek bumps", "no hand foot or mouth distribution", "greasy scale"),
        red_flags=("dehydration", "breathing trouble", "lethargy", "fever in a young infant"),
        high_consequence=True,
    ),
    SkinLabel(
        id="herpes_simplex_grouped_vesicles",
        label="herpes simplex / grouped vesicles",
        prompts=(
            "grouped clear fluid-filled vesicles on red skin",
            "clustered blisters with erosions or crusting near the mouth or eye",
            "localized painful-looking grouped vesicles or punched-out erosions on infant skin",
        ),
        plain_english="Grouped clear blisters, especially near the eye or in a young infant, need prompt clinician review.",
        what_supports=("clustered clear blisters", "erosions after blisters", "localized painful-looking grouped lesions"),
        what_argues_against=("solid acne-like papules", "tiny uniform white bumps", "dry scale without blisters"),
        red_flags=("grouped clear blisters", "eye-area involvement", "fever", "poor feeding", "lethargy"),
        high_consequence=True,
    ),
    SkinLabel(
        id="cellulitis_spreading_bacterial_infection",
        label="cellulitis / spreading bacterial skin infection",
        prompts=(
            "spreading redness swelling warmth and tenderness suggesting bacterial skin infection",
            "a clinical skin image showing cellulitis with expanding red swollen skin",
            "diffuse hot tender swollen red skin area rather than tiny stable bumps",
        ),
        plain_english="Cellulitis is a deeper spreading infection pattern with expanding redness, warmth, swelling, pain, or fever.",
        what_supports=("spreading redness", "swelling", "warmth or tenderness if present"),
        what_argues_against=("stable tiny bumps", "no swelling", "dry scaly patch only"),
        red_flags=("rapidly spreading redness", "fever", "swelling near the eye", "baby acting ill"),
        high_consequence=True,
    ),
    SkinLabel(
        id="urticaria_allergic_reaction",
        label="allergic reaction / urticaria",
        prompts=(
            "a clinical skin image showing allergic reaction or urticaria with raised wheals or hives",
            "raised swollen welts hives or wheals with itching on the skin",
            "transient-looking puffy red plaques with face or lip swelling concern",
        ),
        plain_english="Hives are raised welts that often move around and can occur with allergic reactions or viral illnesses.",
        what_supports=("raised welts", "changing or migrating spots", "itchy-looking swelling"),
        what_argues_against=("fixed pustules", "yellow crusting", "tiny white bumps"),
        red_flags=("breathing trouble", "face or lip swelling", "vomiting with hives", "baby acting ill"),
        high_consequence=True,
    ),
    SkinLabel(
        id="insect_bites",
        label="insect bites",
        prompts=(
            "a clinical skin image showing insect bites with discrete itchy red papules possibly with central puncta",
            "separate red bumps on exposed skin with a central dot or punctum",
            "clustered but discrete itchy papules on arms legs face or other exposed areas",
        ),
        plain_english="Bites often appear as separate itchy red bumps and may have a central dot or occur in exposed areas.",
        what_supports=("discrete separated bumps", "central punctum if visible", "exposed skin distribution"),
        what_argues_against=("widespread viral pattern", "greasy scale", "uniform tiny white facial bumps"),
        red_flags=("rapid swelling", "spreading redness", "drainage", "fever"),
    ),
    SkinLabel(
        id="nonspecific_unclear_rash",
        label="nonspecific rash / unclear",
        prompts=(
            "a clinical skin image showing a nonspecific unclear rash without a definitive visual pattern",
            "subtle mixed skin findings that do not clearly match one dermatology pattern",
            "low detail or ambiguous rash image without clear papules pustules vesicles scale crusting or distribution",
        ),
        plain_english="Some images do not have enough distinctive visual information for a confident visual category.",
        what_supports=("mixed or subtle findings", "limited image context", "no single distinctive pattern"),
        what_argues_against=("classic honey crust", "classic grouped blisters", "classic tiny white milia"),
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
        "highConsequence": label.high_consequence,
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
    prompts = [prompt for label in LABELS for prompt in label.prompts]
    prompt_label_indices = [
        label_index
        for label_index, label in enumerate(LABELS)
        for _prompt in label.prompts
    ]
    all_scores: list[list[float]] = []

    with torch.no_grad():
        text_tokens = tokenizer(prompts).to(device)
        text_features = model.encode_text(text_tokens)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

        for image in images:
            image_tensor = preprocess(image).unsqueeze(0).to(device)
            image_features = model.encode_image(image_tensor)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            prompt_logits = (100.0 * image_features @ text_features.T)[0]

            # Collapse clinically distinct prompt variants into one score per label
            # by max-pooling the raw similarities, then softmax across labels for
            # display ranking. These normalized values are relative visual
            # similarities, not diagnosis probabilities.
            label_logits = []
            for label_index in range(len(LABELS)):
                variant_indices = [
                    prompt_index
                    for prompt_index, prompt_label_index in enumerate(prompt_label_indices)
                    if prompt_label_index == label_index
                ]
                label_logits.append(prompt_logits[variant_indices].max())

            label_scores = torch.stack(label_logits).softmax(dim=-1)
            all_scores.append(
                [float(score) for score in label_scores.detach().cpu().tolist()]
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


def per_image_agreement(
    top_id: str, per_image_matches: list[dict[str, Any]]
) -> tuple[int, int]:
    top1_count = 0
    top3_count = 0
    for image_result in per_image_matches:
        image_matches = image_result.get("topMatches", [])
        ids = [match.get("id") for match in image_matches]
        if ids[:1] == [top_id]:
            top1_count += 1
        if top_id in ids[:PER_IMAGE_MATCHES]:
            top3_count += 1
    return top1_count, top3_count


def calibration_summary(
    matches: list[dict[str, Any]], per_image_matches: list[dict[str, Any]]
) -> dict[str, Any]:
    top = matches[0]
    second_score = float(matches[1]["score"]) if len(matches) > 1 else 0.0
    top_margin = round(max(0.0, float(top["score"]) - second_score), 4)
    image_count = max(1, len(per_image_matches))
    top1_count, top3_count = per_image_agreement(top["id"], per_image_matches)
    most_images_threshold = image_count if image_count <= 2 else image_count - 1
    half_images_threshold = (image_count + 1) // 2
    top_labels = {
        image_result["topMatches"][0]["id"]
        for image_result in per_image_matches
        if image_result.get("topMatches")
    }

    # Simple calibration constants for relative visual-similarity output:
    # strong requires the combined #1 to appear in the top 3 for most/all images
    # and clear separation from #2; moderate requires at least half agreement and
    # non-tiny separation. High-consequence labels are downgraded unless strongly
    # supported because weak CLIP-style similarity should not read like a diagnosis.
    strong_agreement = top3_count >= most_images_threshold and top_margin >= STRONG_MARGIN
    moderate_agreement = top3_count >= half_images_threshold and top_margin >= MODERATE_MARGIN
    weak_reasons = [
        top_margin < MODERATE_MARGIN,
        top3_count < half_images_threshold,
        image_count > 1 and top1_count <= 1,
        len(top_labels) > 1 and top3_count < most_images_threshold,
        bool(top.get("highConsequence")) and not strong_agreement,
    ]

    if strong_agreement:
        confidence_label = "strong visual match"
    elif moderate_agreement and not (
        bool(top.get("highConsequence")) and top3_count < most_images_threshold
    ):
        confidence_label = "moderate visual match"
    else:
        confidence_label = "weak/mixed visual match"

    mixed_evidence = confidence_label == "weak/mixed visual match" or any(weak_reasons)
    image_word = "image" if image_count == 1 else "images"
    agreement_summary = (
        f"Combined #1 appeared as the per-image #1 in {top1_count}/{image_count} "
        f"{image_word} and within the per-image top 3 in {top3_count}/{image_count}; "
        f"margin over #2 was {top_margin:.4f}."
    )

    return {
        "confidenceLabel": confidence_label,
        "mixedEvidence": mixed_evidence,
        "topMargin": top_margin,
        "agreementSummary": agreement_summary,
    }


def high_consequence_concerns(matches: list[dict[str, Any]]) -> list[str]:
    concerns = []
    for match in matches:
        if match.get("highConsequence"):
            supports = ", ".join(match["whatSupports"][:2])
            concerns.append(
                f"This would be more concerning for {match['label']} if there are {supports}."
            )
    return concerns


def build_review_text(
    matches: list[dict[str, Any]],
    image_count: int,
    per_image_matches: list[dict[str, Any]],
    calibration: dict[str, Any],
) -> str:
    top = matches[0]
    alternatives = matches[1:4]
    confidence_label = calibration["confidenceLabel"]
    mixed_evidence = bool(calibration["mixedEvidence"])
    support_text = "; ".join(top["whatSupports"][:3])
    high_consequence_weak = (
        bool(top.get("highConsequence"))
        and confidence_label != "strong visual match"
    )
    image_word = "image" if image_count == 1 else "images"

    if mixed_evidence:
        impression = (
            f"The visual evidence is mixed. Based on {image_count} {image_word}, "
            f"{top['label']} is the highest relative visual-similarity ranking, "
            "but this is a weak visual match rather than a diagnosis-like conclusion."
        )
    elif high_consequence_weak:
        impression = (
            f"Based on {image_count} {image_word}, {top['label']} ranked highest, "
            "but because this category can be higher consequence and is not strongly supported, "
            "treat it as a concern to check for rather than the main likely impression."
        )
    else:
        impression = (
            f"Based on {image_count} {image_word}, the combined top visual match is "
            f"{top['label']}. This is a {confidence_label}, not a confirmed diagnosis."
        )

    alternative_text = " ".join(
        f"{match['label']} would be more likely with {', '.join(match['whatSupports'][:2])}."
        for match in alternatives
    ) or "No additional ranked alternatives were returned."

    concern_texts = high_consequence_concerns(
        matches[:4] if mixed_evidence else alternatives
    )
    red_flags = list(dict.fromkeys([*top.get("redFlags", []), *GENERAL_RED_FLAGS]))
    if concern_texts:
        concerns = (
            " ".join(concern_texts)
            + " Seek prompt clinical advice for "
            + ", ".join(red_flags)
            + "."
        )
    else:
        concerns = "Seek prompt clinical advice for " + ", ".join(red_flags) + "."

    return "\n\n".join(
        [
            "Most likely visual match / combined impression:\n"
            + impression
            + " Scores are relative visual-similarity rankings against curated local labels, not diagnosis confidence.",
            "Confidence / agreement:\n"
            + f"{confidence_label}. {calibration['agreementSummary']}",
            "Why it may fit:\n"
            + f"{top['plainEnglish']} Visual features that can support this category include {support_text}.",
            "Other possibilities:\n" + alternative_text,
            "Concerns / red flags:\n" + concerns,
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
    calibration = calibration_summary(matches, per_image_matches)
    return {
        "ok": True,
        "model": selected_model_id,
        "imageCount": image_count,
        "topMatches": matches,
        "perImageMatches": per_image_matches,
        "confidenceLabel": calibration["confidenceLabel"],
        "mixedEvidence": calibration["mixedEvidence"],
        "topMargin": calibration["topMargin"],
        "agreementSummary": calibration["agreementSummary"],
        "reviewText": build_review_text(
            matches, image_count, per_image_matches, calibration
        ),
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
