# Local MedGemma Image Review

The `/medgemma` page adds a local-only image review flow to the existing Next.js app. The browser uploads a JPG, PNG, or WebP image to a Next.js API route, the API route writes the file to an ignored temporary folder, and then it calls `scripts/medgemma_runner.py` with `child_process`. Images are not sent to a remote API by this implementation.

> Safety note: this tool is for image description and red-flag review only. It is not a diagnosis and does not replace a clinician. Do not deploy it as a public medical diagnostic service.

## Windows setup with NVIDIA RTX/CUDA

Run these commands from `ui/partner-hub` unless noted otherwise.

1. Create and activate a Python virtual environment:

   ```powershell
   py -3.11 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install CUDA-enabled PyTorch for CUDA 12.1:

   ```powershell
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   ```

3. Install the MedGemma runner dependencies:

   ```powershell
   pip install transformers accelerate pillow huggingface_hub sentencepiece
   ```

4. Log in to Hugging Face using the token configured for your local account:

   ```powershell
   huggingface-cli login
   ```

5. In a browser, accept the model terms for `google/medgemma-1.5-4b-it` on Hugging Face. The local token must have access before the first run can download the model.

6. Install Node dependencies and run the Next.js app:

   ```powershell
   npm install
   npm run dev
   ```

7. Open the app and navigate to `/medgemma` (or click **MedGemma Image Review** on the home page).

## Environment variables

- `MEDGEMMA_PYTHON_PATH`: Optional path to the Python interpreter that has the MedGemma dependencies installed. Example for PowerShell:

  ```powershell
  $env:MEDGEMMA_PYTHON_PATH = ".\.venv\Scripts\python.exe"
  npm run dev
  ```

- `MEDGEMMA_RUNNER_TIMEOUT_MS`: Optional API timeout in milliseconds. The default is 10 minutes, which allows for slower first-run model loading.

## Local files and caches

- Uploads are written under `.medgemma-uploads/` and removed after each API request completes.
- `.medgemma-uploads/`, `.medgemma-cache/`, and local Hugging Face cache folders are ignored by Git so uploaded images and model artifacts are not committed.
- Hugging Face Transformers may still use your normal user-level cache outside this repo, depending on your local Hugging Face configuration.
