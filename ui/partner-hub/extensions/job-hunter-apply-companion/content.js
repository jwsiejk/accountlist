(() => {
  const detectProvider = () => {
    const url = window.location.href;
    if (/greenhouse\.io/i.test(url)) return "greenhouse";
    if (/lever\.co/i.test(url)) return "lever";
    if (/ashbyhq\.com/i.test(url)) return "ashby";
    if (/smartrecruiters\.com/i.test(url)) return "smartrecruiters";
    return null;
  };

  const tokensByKey = {
    fullName: ["full name", "fullname", "candidate name", "name"],
    firstName: ["first name", "firstname", "given name", "first_name"],
    lastName: ["last name", "lastname", "family name", "surname", "last_name"],
    email: ["email", "e-mail"],
    phone: ["phone", "mobile", "telephone"],
    location: ["city", "state", "location", "address"],
    linkedinUrl: ["linkedin"],
    websiteUrl: ["website", "portfolio", "github", "personal site", "url"],
    workAuthorizationNote: ["work authorization", "authorized", "sponsorship", "visa", "employment eligibility"],
    coverLetterText: ["cover letter", "why this role", "additional information"]
  };

  const fieldValue = (session, key) => {
    if (key === "coverLetterText") return session?.tailored?.coverLetterText || "";
    if (key === "location") return session?.candidate?.cityState || "";
    return session?.candidate?.[key] || "";
  };

  const getSignal = (el) => {
    const label = el.labels?.[0]?.textContent || "";
    return [el.id, el.name, el.placeholder, el.getAttribute("aria-label"), label].filter(Boolean).join(" ").toLowerCase();
  };

  const matchKey = (el) => {
    const signal = getSignal(el);
    if (!signal.trim()) return null;

    const rank = ["firstName", "lastName", "email", "phone", "linkedinUrl", "websiteUrl", "workAuthorizationNote", "coverLetterText", "location", "fullName"];
    for (const key of rank) {
      if (key === "coverLetterText" && el.tagName.toLowerCase() !== "textarea") continue;
      if (tokensByKey[key].some((token) => signal.includes(token))) {
        if (key === "fullName" && (signal.includes("first") || signal.includes("last"))) continue;
        if (key === "location" && signal.includes("relocation")) continue;
        return key;
      }
    }
    return null;
  };

  const fillBasicFields = (session) => {
    const filled = [];
    const manual = [];
    const inputs = Array.from(document.querySelectorAll("input, textarea"));

    for (const el of inputs) {
      if (el.disabled || el.readOnly) continue;
      const key = matchKey(el);
      if (!key) continue;
      const value = fieldValue(session, key);
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
