declare const chrome: any;

import {
  detectApplyProviderFromUrl,
  getFieldValueForKey,
  matchBasicFieldKey,
  selectLocationValueFromCityState,
} from "../../lib/job-hunter/applyCompanion";
import type { ApplySessionPayload } from "../../lib/job-hunter/applySession";

type FillSummary = {
  filled: string[];
  manual: string[];
  uploads: string[];
};

const detectProvider = (): ReturnType<typeof detectApplyProviderFromUrl> =>
  detectApplyProviderFromUrl(window.location.href);

const getSignal = (el: HTMLInputElement | HTMLTextAreaElement): string => {
  const label = el.labels?.[0]?.textContent ?? "";
  return [el.id, el.name, el.placeholder, el.getAttribute("aria-label"), label].filter(Boolean).join(" ").toLowerCase();
};

const fieldValue = (session: ApplySessionPayload, key: Parameters<typeof getFieldValueForKey>[0], signal: string): string => {
  if (key === "location") {
    return selectLocationValueFromCityState(session.candidate.cityState, signal);
  }

  return getFieldValueForKey(key, session);
};

const fillBasicFields = (session: ApplySessionPayload): FillSummary => {
  const filled: string[] = [];
  const manual: string[] = [];
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"));
  const provider = detectProvider();

  for (const el of inputs) {
    if (el.disabled || el.readOnly) continue;

    const signal = getSignal(el);
    const key = matchBasicFieldKey(
      {
        tagName: el.tagName,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute("aria-label") ?? undefined,
        labelText: el.labels?.[0]?.textContent ?? undefined,
      },
      provider,
    );
    if (!key) continue;

    const value = fieldValue(session, key, signal);
    if (!value || value.trim() === "") {
      manual.push(`${key} (missing in session)`);
      continue;
    }

    if (el.value && el.value.trim()) {
      manual.push(`${key} (already filled)`);
      continue;
    }

    el.focus();
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    filled.push(key);
  }

  const uploads: string[] = [];
  const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  for (const fileInput of fileInputs) {
    fileInput.style.outline = "2px solid #f59e0b";
    const signal = getSignal(fileInput);
    if (signal.includes("cover")) {
      uploads.push(`Cover letter: ${session.artifacts.coverLetterDocxFileName || "cover letter docx"}`);
    } else {
      uploads.push(`Resume: ${session.artifacts.tailoredResumeDocxFileName || "tailored resume docx"}`);
    }
  }

  return { filled, manual, uploads };
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "job-hunter-detect-provider") {
    sendResponse({ provider: detectProvider() });
    return;
  }

  if (message?.type === "job-hunter-fill-basic-fields") {
    sendResponse(fillBasicFields(message.session));
  }
});
