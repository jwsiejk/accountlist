(() => {
  const heuristics = globalThis.JobHunterApplyCompanionHeuristics;

  const detectProvider = () => heuristics?.detectProviderFromUrl(window.location.href) ?? null;

  const fieldValue = (session, key, signal) => {
    if (key === "coverLetterText") return session?.tailored?.coverLetterText || "";
    if (key === "location") {
      return heuristics?.selectLocationValue({ cityState: session?.candidate?.cityState || "", signal }) || "";
    }
    return session?.candidate?.[key] || "";
  };

  const getSignal = (el) => {
    const label = el.labels?.[0]?.textContent || "";
    return [el.id, el.name, el.placeholder, el.getAttribute("aria-label"), label].filter(Boolean).join(" ").toLowerCase();
  };

  const matchKey = (el, provider) =>
    heuristics?.matchKeyFromSignal({ signal: getSignal(el), tagName: el.tagName, provider }) ?? null;

  const fillBasicFields = (session) => {
    const filled = [];
    const manual = [];
    const inputs = Array.from(document.querySelectorAll("input, textarea"));
    const provider = detectProvider();

    for (const el of inputs) {
      if (el.disabled || el.readOnly) continue;
      const signal = getSignal(el);
      const key = matchKey(el, provider);
      if (!key) continue;
      const value = fieldValue(session, key, signal);
      if (!value || String(value).trim() === "") {
        manual.push(`${key} (missing in session)`);
        continue;
      }
      if (el.value && el.value.trim()) {
        manual.push(`${key} (already filled)`);
        continue;
      }

      el.focus();
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      filled.push(key);
    }

    const uploads = [];
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    for (const fileInput of fileInputs) {
      fileInput.style.outline = "2px solid #f59e0b";
      const signal = getSignal(fileInput);
      if (signal.includes("cover")) {
        uploads.push(`Cover letter: ${session?.artifacts?.coverLetterDocxFileName || "cover letter docx"}`);
      } else {
        uploads.push(`Resume: ${session?.artifacts?.tailoredResumeDocxFileName || "tailored resume docx"}`);
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
})();
