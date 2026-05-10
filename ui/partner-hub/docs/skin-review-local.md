# Local Skin Image Review

The `/skin-review` page replaces the previous MedGemma image-review flow with a dermatology-specific local ranking workflow. The browser uploads a JPG, PNG, or WebP image to a Next.js API route, the API route writes the file to an ignored temporary folder, and then it calls `scripts/skin_review_runner.py` with `child_process`. Images are not sent to a remote image API by this implementation.

The first target model is `redlessone/DermLIP_ViT-B-16`, loaded through `open_clip` as a CLIP-style dermatology vision-language model. It is used for zero-shot visual label ranking against a curated local prompt set. It is not a chat model and does not generate free-form medical judgments.

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
- `SKIN_REVIEW_PYTHON_PATH`: Optional Python interpreter override. By default, the API route first uses `.venv-skin-review/Scripts/python.exe` on Windows or `.venv-skin-review/bin/python` on macOS/Linux, then falls back to `python`.
- `SKIN_REVIEW_RUNNER_TIMEOUT_MS`: Optional API timeout in milliseconds. The default is 10 minutes, which allows for slower first-run model loading.

## Runner behavior

The runner emits strict JSON on stdout and diagnostics or stages on stderr only. SSE-compatible stages are:

- `validating_image`
- `loading_model`
- `running_classification`
- `complete`

The API route may also emit upload-related stages while it validates the browser upload and writes the temporary local file. Temporary uploads are written under `.skin-review-uploads/` and removed after each API request completes.

The runner validates image decoding with Pillow, applies EXIF transposition, converts images to RGB, uses `torch.no_grad()`, normalizes image and text features, and returns display-safe scores for the top ranked label matches. It does not expose local image paths, Hugging Face tokens, environment secrets, raw embeddings, or raw prompt text in the UI.

A validation-only smoke check is available when you need to confirm local image validation and strict JSON stdout without downloading model weights:

```bash
python scripts/skin_review_runner.py --image path/to/local-image.png --smoke-validation-only
```

A full local model run uses:

```bash
python scripts/skin_review_runner.py --image path/to/local-image.png --max-matches 5
```

## Limitations

DermLIP is better aligned to dermatology images than the previous general medical-image flow, but this implementation still requires validation on representative images and clinical review before relying on it. The output is ranked visual similarity to curated text labels, not a confirmed diagnosis. Similar-looking rashes can have different causes, and important context such as age, symptoms, timing, exposures, fever, pain, itch, medications, vaccination status, and whether the child appears ill may not be visible in an image.

The UI intentionally presents top possibilities, reasons a category may fit, alternatives, red flags, conservative next steps, and a bottom disclaimer instead of presenting one overconfident diagnosis. A clinician should evaluate symptoms that are severe, worsening, persistent, near the eye, associated with fever or illness, or otherwise concerning.
