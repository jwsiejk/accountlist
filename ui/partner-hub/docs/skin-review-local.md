# Local Skin Image Review

The `/skin-review` page replaces the previous MedGemma image-review flow with a dermatology-specific local ranking workflow. The browser uploads 1–5 JPG, PNG, or WebP images to a Next.js API route, the API route writes each file to an ignored temporary folder, and then it calls `scripts/skin_review_runner.py` with `child_process`. Images are not sent to a remote image API by this implementation.

The first target model is `redlessone/DermLIP_ViT-B-16`, loaded through `open_clip` as a CLIP-style dermatology vision-language model. It is used for zero-shot visual label ranking against a curated local prompt set. It is not a chat model and does not generate free-form medical judgments.

## Important interpretation limits

DermLIP returns visual similarity between the uploaded image and local dermatology label prompts. The displayed percentages are normalized, temperature-scaled ranking scores relative to the labels offered to the model; they are **not diagnosis confidence, probabilities of disease, or a substitute for a clinician**. A high displayed percentage only means that, among the local labels, the image looked more similar to that label's prompt variants after display scaling.

The runner uses multiple clinically distinct prompt variants per child label and max-pools those variants into one raw child-label score before ranking labels. The prompt set includes morphology and distribution concepts such as papules, pustules, vesicles/blisters, crusting/drainage, scaling/dryness, swelling, flat/diffuse rash, localized cheek/forehead/face findings, trunk/widespread patterns, and hands/feet/mouth patterns. Raw prompts are intentionally not exposed in the UI.

The runner also rolls child labels into broader parent visual categories. These parent categories keep related labels from splitting visual confidence across near-duplicate or clinically overlapping possibilities. For example, `neonatal acne / baby acne`, `infantile acne`, and `neonatal cephalic pustulosis` all roll up under `infant facial acne-like bumps`. The app can therefore show that the broader acne-like visual family is strong while still explaining that the subtype may be indistinguishable from image alone. Age, timing, symptoms, and course are needed to separate subtypes.

Each returned match includes display-safe scoring fields:

- `score` and `percent`: display-scaled relative ranking scores. These may look sharper or flatter depending on `SKIN_REVIEW_DISPLAY_TEMPERATURE`.
- `rawScore`: the rounded pooled model similarity/logit for that label after prompt-variant max pooling.
- `rawMarginFromTop`: the rounded raw gap between the top child label or parent category and that item.
- `topCategories`: display-ranked parent visual categories. Parent raw scores use the maximum child raw score in the category rather than summing child percentages, so categories with more children are not unfairly inflated.
- `childMatches`: the child labels under each returned parent category, sorted by raw score.
- `perImageCategoryMatches`: per-image parent visual categories used to show agreement or disagreement across uploaded views.

Raw scores are still model similarity signals, not medical probabilities. They are returned only as rounded ranking/debug metadata; the runner does not return raw embeddings, prompt text, local image paths, tokens, or environment secrets.

## Confidence labels and mixed evidence

Each successful runner response includes:

- `confidenceLabel`: `strong visual match`, `moderate visual match`, or `weak/mixed visual match`.
- `mixedEvidence`: true when rankings are close, image views disagree, the top condition appears in too few per-image rankings, or a high-consequence label is not strongly supported.
- `topRawMargin`: the raw pooled-score gap between the combined #1 and #2 labels. `topMargin` is retained as a compatibility alias for the same raw-margin value.
- `agreementSummary`: how often the combined #1 appeared as per-image #1 or in each image's top 3, plus the raw ranking separation from #2.
- `scoringMode`: currently `raw-margin-calibrated`.
- `displayTemperature`: the temperature used only to convert raw scores into display percentages.

These fields calibrate the UI language. Confidence labels are based on parent-category raw rank separation plus cross-image parent-category agreement, not on softmax-normalized display percentages alone. This means two images can still agree when their top child labels differ but share the same parent category, such as one image favoring neonatal acne and another favoring infantile acne inside `infant facial acne-like bumps`. Strong or moderate results still describe only a visual match, not a diagnosis. Weak/mixed results explicitly say the visual categories are close together or image views disagree and avoid leading with a diagnosis-like statement.

## Multi-image aggregation

For each image, the runner encodes the image and compares it with every prompt variant. Prompt variants are collapsed into raw child-label scores by max-pooling the best variant for each label. Child labels are then rolled up into parent categories using the maximum child raw score for each category. For multi-image reviews, raw child-label scores are averaged across images to create the combined child matches, then parent categories are computed from those averaged raw scores. Display percentages are computed separately for child labels and parent categories with the configured display temperature. Per-image child matches and per-image parent categories remain visible so reviewers can see whether disagreement is true category disagreement or only subtype-level overlap.

A practical example is neonatal acne versus infantile acne. These can be visually close in a single image, and neonatal cephalic pustulosis can also look acne-like on the newborn face or scalp. The parent rollup lets the app rank the broader `infant facial acne-like bumps` category higher when those child labels are clustered, while the plain-English review notes that age and timing are needed before leaning toward a subtype.

## High-consequence labels

Some labels are marked high-consequence because weak visual similarity should not be presented as the main likely impression without stronger support. Examples include herpes simplex / grouped vesicles, cellulitis / spreading bacterial skin infection, impetigo, allergic reaction / urticaria, viral exanthem, and hand-foot-mouth pattern.

When a high-consequence child label ranks highly, its parent category preserves `highConsequence: true` if any child inside the parent is high-consequence. If that parent category is weakly supported, the plain-English review treats it as a red-flag concern to check for rather than a likely diagnosis. The combined ranking remains visible for transparency, but the narrative says what findings would make that category more concerning.

## Windows setup

Run setup from `ui/partner-hub` so the Python environment is self-contained inside this app directory.

1. Create or update the local environment:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/setup-skin-review.ps1
   ```

   The helper creates `.venv-skin-review`, upgrades pip, installs or upgrades CUDA-enabled PyTorch from the CUDA 12.4 wheel index with `torch>=2.6`, installs `torchvision`, and installs the DermLIP runner dependencies: `open_clip_torch`, `pillow`, `huggingface_hub`, and `safetensors`.

2. Activate the repo-local environment when running smoke checks manually:

   ```powershell
   .\.venv-skin-review\Scripts\Activate.ps1
   ```

3. Start the Next.js app:

   ```powershell
   npm run dev
   ```

4. Open `/skin-review` or click **Skin Image Review** on the home page.

## macOS/Linux setup

From `ui/partner-hub`, create a repo-local environment named `.venv-skin-review` and install the same runner dependencies:

```bash
python -m venv .venv-skin-review
source .venv-skin-review/bin/activate
python -m pip install --upgrade pip
python -m pip install --upgrade --index-url https://download.pytorch.org/whl/cu124 'torch>=2.6' torchvision
python -m pip install --upgrade open_clip_torch pillow huggingface_hub safetensors
npm run dev
```

## Environment variables

- `SKIN_REVIEW_MODEL_ID`: Optional Hugging Face model ID. Defaults to `redlessone/DermLIP_ViT-B-16`.
- `SKIN_REVIEW_DEVICE`: Optional device selection. Use `auto`, `cuda`, or `cpu`. Defaults to `auto`, which uses CUDA when PyTorch reports that CUDA is available and otherwise uses CPU.
- `SKIN_REVIEW_MAX_MATCHES`: Optional number of ranked matches returned to the UI. Defaults to `5`; values are clamped to a safe range.
- `SKIN_REVIEW_DISPLAY_TEMPERATURE`: Optional display-only softmax temperature for percentages. Defaults to `0.7`; valid values are `0.1` to `5.0`. Lower values make visible percentage differences sharper, while higher values make percentages flatter. This does not change raw ranking margins, confidence labels, or agreement calibration. Invalid values fall back to the default and write a safe stderr diagnostic.
- `SKIN_REVIEW_PYTHON_PATH`: Optional Python interpreter override. By default, the API route first uses `.venv-skin-review/Scripts/python.exe` on Windows or `.venv-skin-review/bin/python` on macOS/Linux, then falls back to `python`.
- `SKIN_REVIEW_RUNNER_TIMEOUT_MS`: Optional API timeout in milliseconds. The default is 10 minutes, which allows for slower first-run model loading.

## Runner behavior

The runner emits strict JSON on stdout and diagnostics or stages on stderr only. SSE-compatible stages are:

- `validating_image`
- `loading_model`
- `running_classification`
- `complete`

The API route may also emit upload-related stages while it validates the browser upload and writes the temporary local file. Temporary uploads are written under `.skin-review-uploads/` and removed after each API request completes.

The runner validates image decoding with Pillow, applies EXIF transposition, converts images to RGB, uses `torch.no_grad()`, normalizes image and text features, and returns display-safe scores for the top ranked child-label matches and parent visual-category rollups. It does not expose local image paths, Hugging Face tokens, environment secrets, raw embeddings, or raw prompt text in the UI.

A validation-only smoke check is available when you need to confirm local image validation and strict JSON stdout without downloading model weights:

```bash
python scripts/skin_review_runner.py --image path/to/local-image.png --smoke-validation-only
```

A full local model run uses one or more `--image` arguments:

```bash
python scripts/skin_review_runner.py --image path/to/local-image-1.png --image path/to/local-image-2.jpg --max-matches 5
```

## Manual validation with private local images

Do not commit private medical images. For local validation, create an ignored folder at the repo root:

```bash
mkdir -p .skin-review-test-images
```

Place known private test images in `.skin-review-test-images/` only on your machine. Then run from `ui/partner-hub` using relative paths back to the ignored folder:

```bash
python scripts/skin_review_runner.py --image ../../.skin-review-test-images/example-1.png --smoke-validation-only
python scripts/skin_review_runner.py --image ../../.skin-review-test-images/example-1.png --image ../../.skin-review-test-images/example-2.jpg --max-matches 5
```

Review the combined parent categories (`topCategories`), child-label matches (`topMatches`), per-image category matches, per-image child matches, confidence label, mixed-evidence flag, raw top margin (`topRawMargin`), display temperature, agreement summary, and red-flag language. Keep the images private and remove them when no longer needed.

## Limitations

DermLIP is better aligned to dermatology images than the previous general medical-image flow, but this implementation still requires validation on representative images and clinical review before relying on it. Similar-looking rashes can have different causes, and important context such as age, symptoms, timing, exposures, fever, pain, itch, medications, vaccination status, and whether the child appears ill may not be visible in an image.

The UI intentionally presents top possibilities, confidence/agreement context, reasons a category may fit, alternatives, red flags, conservative next steps, and a bottom disclaimer instead of presenting one overconfident diagnosis. A clinician should evaluate symptoms that are severe, worsening, persistent, near the eye, associated with fever or illness, or otherwise concerning.
