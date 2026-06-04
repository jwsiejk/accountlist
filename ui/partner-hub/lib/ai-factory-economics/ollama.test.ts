import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_FACTORY_DEFAULT_OLLAMA_URL,
  AI_FACTORY_MODEL_MAX_LENGTH,
  AI_FACTORY_PROMPT_MAX_LENGTH,
  buildOllamaRunPayload,
  getAiFactoryOllamaBaseUrl,
  normalizeOllamaModelNames,
  toSafeOllamaError,
  validateAiFactoryRunRequest,
  normalizeOllamaGenerateChunk,
} from "./ollama";

test("getAiFactoryOllamaBaseUrl defaults and removes trailing slashes", () => {
  assert.equal(getAiFactoryOllamaBaseUrl(""), AI_FACTORY_DEFAULT_OLLAMA_URL);
  assert.equal(getAiFactoryOllamaBaseUrl("  http://127.0.0.1:11434/// "), "http://127.0.0.1:11434");
  assert.equal(getAiFactoryOllamaBaseUrl("http://localhost:11434/"), "http://localhost:11434");
});

test("normalizeOllamaModelNames returns unique sorted model names", () => {
  const models = normalizeOllamaModelNames({
    models: [
      { name: "llama3.2:3b" },
      { model: "mistral:latest" },
      { name: " llama3.2:3b " },
      { name: "" },
      { name: 123 },
    ],
  });

  assert.deepEqual(models, ["llama3.2:3b", "mistral:latest"]);
});

test("normalizeOllamaModelNames gracefully handles bad or missing response data", () => {
  assert.deepEqual(normalizeOllamaModelNames(null), []);
  assert.deepEqual(normalizeOllamaModelNames({}), []);
  assert.deepEqual(normalizeOllamaModelNames({ models: "not-an-array" }), []);
  assert.deepEqual(normalizeOllamaModelNames({ models: [null, {}, { name: "   " }] }), []);
});

test("toSafeOllamaError shapes safe UI errors without stack traces", () => {
  const timeoutError = new Error("operation aborted");
  timeoutError.name = "AbortError";
  assert.deepEqual(toSafeOllamaError(timeoutError), {
    code: "OLLAMA_TIMEOUT",
    message: "Local Ollama did not respond before the timeout.",
  });

  const unavailable = toSafeOllamaError(new Error("connect ECONNREFUSED 127.0.0.1:11434"));
  assert.equal(unavailable.code, "OLLAMA_UNAVAILABLE");
  assert.equal(unavailable.message, "Local Ollama is unavailable.");
  assert.equal(unavailable.detail, "connect ECONNREFUSED 127.0.0.1:11434");
  assert.equal("stack" in unavailable, false);
});


test("validateAiFactoryRunRequest accepts trimmed model and prompt", () => {
  const result = validateAiFactoryRunRequest({ model: " llama3.2:3b ", prompt: " hello local model " });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.request, { model: "llama3.2:3b", prompt: "hello local model" });
    assert.deepEqual(buildOllamaRunPayload(result.request), {
      model: "llama3.2:3b",
      prompt: "hello local model",
      stream: true,
    });
  }
});

test("validateAiFactoryRunRequest rejects missing or invalid model names", () => {
  const missing = validateAiFactoryRunRequest({ model: " ", prompt: "hello" });
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.status, 400);
    assert.equal(missing.error.code, "MODEL_REQUIRED");
  }

  const tooLong = validateAiFactoryRunRequest({ model: "a".repeat(AI_FACTORY_MODEL_MAX_LENGTH + 1), prompt: "hello" });
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) {
    assert.equal(tooLong.status, 400);
    assert.equal(tooLong.error.code, "MODEL_TOO_LONG");
  }

  const controlCharacter = validateAiFactoryRunRequest({ model: "llama\n3", prompt: "hello" });
  assert.equal(controlCharacter.ok, false);
  if (!controlCharacter.ok) {
    assert.equal(controlCharacter.error.code, "MODEL_INVALID");
  }
});

test("validateAiFactoryRunRequest rejects empty prompts and enforces length limit", () => {
  const empty = validateAiFactoryRunRequest({ model: "llama3.2:3b", prompt: "   " });
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.status, 400);
    assert.equal(empty.error.code, "PROMPT_REQUIRED");
  }

  const tooLong = validateAiFactoryRunRequest({ model: "llama3.2:3b", prompt: "x".repeat(AI_FACTORY_PROMPT_MAX_LENGTH + 1) });
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) {
    assert.equal(tooLong.status, 413);
    assert.equal(tooLong.error.code, "PROMPT_TOO_LONG");
  }
});

test("normalizeOllamaGenerateChunk parses safe streaming chunks", () => {
  assert.deepEqual(normalizeOllamaGenerateChunk('{"response":"hi","done":false}'), { response: "hi", done: false });
  assert.deepEqual(normalizeOllamaGenerateChunk('{"response":"","done":true}'), { response: "", done: true });
  assert.equal(normalizeOllamaGenerateChunk('not json'), null);
});
