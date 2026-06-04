import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_FACTORY_DEFAULT_OLLAMA_URL,
  getAiFactoryOllamaBaseUrl,
  normalizeOllamaModelNames,
  toSafeOllamaError,
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
