/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ./lib/job-hunter/applyCompanion.js
const PROVIDER_PATTERNS = {
    greenhouse: [/greenhouse\.io/i],
    lever: [/lever\.co/i, /jobs\.lever\.co/i],
    ashby: [/ashbyhq\.com/i],
    smartrecruiters: [/smartrecruiters\.com/i],
};
const buildFieldSignal = (field) => [field.id, field.name, field.placeholder, field.ariaLabel, field.labelText].filter(Boolean).join(" ").toLowerCase();
const hasAnyToken = (value, tokens) => tokens.some((token) => value.includes(token));
const COMMON_FIELD_TOKENS = {
    fullName: ["full name", "fullname", "candidate name", "name"],
    firstName: ["first name", "firstname", "given name"],
    lastName: ["last name", "lastname", "family name", "surname"],
    email: ["email", "e-mail"],
    phone: ["phone", "mobile", "telephone"],
    location: ["city", "state", "location", "address"],
    linkedinUrl: ["linkedin"],
    websiteUrl: ["website", "portfolio", "github", "personal site", "url"],
    workAuthorizationNote: ["work authorization", "authorized", "sponsorship", "visa", "employment eligibility"],
    coverLetterText: ["cover letter", "why this role", "why do you want", "additional information"],
};
const PROVIDER_EXTRA_TOKENS = {
    greenhouse: {
        firstName: ["first_name"],
        lastName: ["last_name"],
        linkedinUrl: ["linkedin_url"],
    },
    lever: {
        fullName: ["name"],
        phone: ["phone number"],
    },
    ashby: {
        linkedinUrl: ["linkedin profile"],
    },
    smartrecruiters: {
        workAuthorizationNote: ["work permit", "authorized to work"],
    },
};
const selectLocationValueFromCityState = (cityState, signal) => {
    const source = String(cityState ?? "");
    const loweredSignal = String(signal ?? "").toLowerCase();
    const [city, stateRaw] = source.split(",");
    const state = stateRaw?.trim() ?? "";
    if (loweredSignal.includes("city") && !loweredSignal.includes("state")) {
        return city?.trim() || source;
    }
    if (loweredSignal.includes("state") && !loweredSignal.includes("city")) {
        return state || source;
    }
    return source;
};
const detectApplyProviderFromUrl = (url) => {
    for (const [provider, patterns] of Object.entries(PROVIDER_PATTERNS)) {
        if (patterns.some((pattern) => pattern.test(url))) {
            return provider;
        }
    }
    return null;
};
const getFieldValueForKey = (fieldKey, session) => {
    switch (fieldKey) {
        case "fullName":
            return session.candidate.fullName;
        case "firstName":
            return session.candidate.firstName;
        case "lastName":
            return session.candidate.lastName;
        case "email":
            return session.candidate.email;
        case "phone":
            return session.candidate.phone;
        case "location":
            return session.candidate.cityState;
        case "linkedinUrl":
            return session.candidate.linkedinUrl;
        case "websiteUrl":
            return session.candidate.websiteUrl;
        case "workAuthorizationNote":
            return session.candidate.workAuthorizationNote;
        case "coverLetterText":
            return session.tailored.coverLetterText;
    }
};
const matchBasicFieldKey = (field, provider) => {
    const signal = buildFieldSignal(field);
    if (!signal.trim()) {
        return null;
    }
    const isTextarea = field.tagName.toLowerCase() === "textarea";
    const rankedKeys = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "linkedinUrl",
        "websiteUrl",
        "workAuthorizationNote",
        "coverLetterText",
        "location",
        "fullName",
    ];
    for (const key of rankedKeys) {
        if (key === "coverLetterText" && !isTextarea) {
            continue;
        }
        const providerTokens = provider ? PROVIDER_EXTRA_TOKENS[provider]?.[key] ?? [] : [];
        const tokens = [...COMMON_FIELD_TOKENS[key], ...providerTokens];
        if (!hasAnyToken(signal, tokens)) {
            continue;
        }
        if (key === "fullName" && (signal.includes("first") || signal.includes("last"))) {
            continue;
        }
        if (key === "location" && signal.includes("relocation")) {
            continue;
        }
        return key;
    }
    return null;
};

;// ./extensions/job-hunter-apply-companion/content.js

const detectProvider = () => detectApplyProviderFromUrl(window.location.href);
const getSignal = (el) => {
    const label = el.labels?.[0]?.textContent ?? "";
    return [el.id, el.name, el.placeholder, el.getAttribute("aria-label"), label].filter(Boolean).join(" ").toLowerCase();
};
const fieldValue = (session, key, signal) => {
    if (key === "location") {
        return selectLocationValueFromCityState(session.candidate.cityState, signal);
    }
    return getFieldValueForKey(key, session);
};
const fillBasicFields = (session) => {
    const filled = [];
    const manual = [];
    const inputs = Array.from(document.querySelectorAll("input, textarea"));
    const provider = detectProvider();
    for (const el of inputs) {
        if (el.disabled || el.readOnly)
            continue;
        const signal = getSignal(el);
        const key = matchBasicFieldKey({
            tagName: el.tagName,
            id: el.id,
            name: el.name,
            placeholder: el.placeholder,
            ariaLabel: el.getAttribute("aria-label") ?? undefined,
            labelText: el.labels?.[0]?.textContent ?? undefined,
        }, provider);
        if (!key)
            continue;
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
    const uploads = [];
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    for (const fileInput of fileInputs) {
        fileInput.style.outline = "2px solid #f59e0b";
        const signal = getSignal(fileInput);
        if (signal.includes("cover")) {
            uploads.push(`Cover letter: ${session.artifacts.coverLetterDocxFileName || "cover letter docx"}`);
        }
        else {
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

/******/ })()
;