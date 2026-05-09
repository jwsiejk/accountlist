# Local MedGemma Image Review

The `/medgemma` page adds a local-only image review flow to the existing Next.js app. The browser uploads a JPG, PNG, or WebP image to a Next.js API route, the API route writes the file to an ignored temporary folder, and then it calls `scripts/medgemma_runner.py` with `child_process`. Images are not sent to a remote API by this implementation.

> Safety note: this tool is for image description and red-flag review only. It is not a diagnosis and does not replace a clinician. Do not deploy it as a public medical diagnostic service.

## Preferred repo-local setup

Run MedGemma setup from `ui/partner-hub` so the Python environment is self-contained inside this app directory.

### Windows with NVIDIA RTX/CUDA

1. From `ui/partner-hub`, run the setup helper:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/setup-medgemma.ps1
   ```

   The helper creates `.venv-medgemma`, upgrades pip, installs or upgrades CUDA-enabled PyTorch from the CUDA 12.4 wheel index with `torch>=2.6`, and installs the MedGemma runner dependencies.

2. Activate the repo-local MedGemma environment:

   ```powershell
   .\.venv-medgemma\Scripts\Activate.ps1
   ```

3. Log in to Hugging Face using the token configured for your local account:

   ```powershell
   hf auth login
   ```

4. In a browser, accept the model terms for `google/medgemma-1.5-4b-it` on Hugging Face. The local token must have access before the first run can download the model.

5. Install Node dependencies and run the Next.js app:

   ```powershell
   npm install
   npm run dev
   ```

6. Open the app and navigate to `/medgemma` (or click **MedGemma Image Review** on the home page).

### Manual macOS/Linux setup

From `ui/partner-hub`, create a repo-local environment named `.venv-medgemma` and install the same runner dependencies:

```bash
python -m venv .venv-medgemma
source .venv-medgemma/bin/activate
python -m pip install --upgrade pip
pip install --upgrade "torch>=2.6" torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
pip install transformers accelerate pillow huggingface_hub sentencepiece
hf auth login
npm install
npm run dev
```

Accept the Hugging Face model terms for `google/medgemma-1.5-4b-it` before the first run.

## Environment variables

- `MEDGEMMA_PYTHON_PATH`: Optional override only. By default, the API route first uses the repo-local `.venv-medgemma` interpreter for the current platform (`.venv-medgemma/Scripts/python.exe` on Windows or `.venv-medgemma/bin/python` on macOS/Linux) and falls back to `python` when that interpreter is not present. Set this only if you intentionally want to use a different Python interpreter with the MedGemma dependencies installed. Example for PowerShell:

  ```powershell
  $env:MEDGEMMA_PYTHON_PATH = ".\.venv-medgemma\Scripts\python.exe"
  npm run dev
  ```

- `MEDGEMMA_RUNNER_TIMEOUT_MS`: Optional API timeout in milliseconds. The default is 10 minutes, which allows for slower first-run model loading.

- `MEDGEMMA_MAX_NEW_TOKENS`: Optional response length override for local generation. The default is 192 tokens so a typical cached run stays practical on a 6 GB RTX 4050 laptop GPU. Increase this only when you need longer detail and can tolerate slower generation. Example for PowerShell:

  ```powershell
  $env:MEDGEMMA_MAX_NEW_TOKENS = "256"
  npm run dev
  ```

## Runtime notes

- The first run can be noticeably slower because Hugging Face downloads gated model files and Transformers loads them into local CPU/GPU memory. After the model is downloaded and cached, generation should not take 10 minutes for a typical image review.
- CUDA runs prefer `torch.float16`, `low_cpu_mem_usage=True`, and PyTorch SDPA attention to better fit 6 GB laptop GPUs. The default prompt asks for concise bullets to reduce generation time while preserving cautious no-diagnosis language.

## Local files and caches

- The preferred setup creates `.venv-medgemma/` under `ui/partner-hub` for MedGemma Python dependencies.
- Uploads are written under `.medgemma-uploads/` and removed after each API request completes.
- `.venv-medgemma/`, `.medgemma-uploads/`, `.medgemma-cache/`, and local Hugging Face cache folders are ignored by Git so uploaded images, dependencies, and model artifacts are not committed.
- Hugging Face Transformers may still use your normal user-level cache outside this repo, depending on your local Hugging Face configuration.
