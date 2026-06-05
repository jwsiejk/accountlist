# AI Factory Economics quickstart

Canonical plan and guardrails: [`../../../docs/AI_FACTORY_ECONOMICS_MODULE.md`](../../../docs/AI_FACTORY_ECONOMICS_MODULE.md).

## 1. Start Partner Hub

```bash
cd ui/partner-hub
npm install
npm run dev
```

Open `http://localhost:3000/partner-hub/ai-factory-economics`.

## 2. Start Ollama

```bash
ollama serve
ollama pull llama3.2:3b
curl http://127.0.0.1:11434/api/tags
```

Refresh the Ollama cards on the page. You can also enter a local model name manually.

## 3. Optional NVIDIA snapshot telemetry

```bash
nvidia-smi
```

If unavailable, the GPU panel should fail gracefully and the prompt runner still works.

## 4. Run a prompt safely

Choose a local model, enter a prompt, and click **Run local prompt**. Prompt and response content are not persisted; history is sanitized browser memory only and clears on reload.

## 5. Verify changes

```bash
npm run typecheck
npm test
npm run lint
```
