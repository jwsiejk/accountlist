(() => {
  const providerPatterns = {
    greenhouse: [/greenhouse\.io/i],
    lever: [/lever\.co/i, /jobs\.lever\.co/i],
    ashby: [/ashbyhq\.com/i],
    smartrecruiters: [/smartrecruiters\.com/i],
  };

  const commonTokensByKey = {
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

  const providerExtraTokensByKey = {
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

  const rank = [
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

  const detectProviderFromUrl = (url) => {
    for (const [provider, patterns] of Object.entries(providerPatterns)) {
      if (patterns.some((pattern) => pattern.test(url))) {
        return provider;
      }
    }
    return null;
  };

  const matchKeyFromSignal = ({ signal, tagName, provider }) => {
    const loweredSignal = String(signal || "").toLowerCase();
    if (!loweredSignal.trim()) return null;

    const isTextarea = String(tagName || "").toLowerCase() === "textarea";

    for (const key of rank) {
      if (key === "coverLetterText" && !isTextarea) continue;

      const providerTokens = provider ? providerExtraTokensByKey[provider]?.[key] || [] : [];
      const tokens = [...commonTokensByKey[key], ...providerTokens];

      if (!tokens.some((token) => loweredSignal.includes(token))) continue;
      if (key === "fullName" && (loweredSignal.includes("first") || loweredSignal.includes("last"))) continue;
      if (key === "location" && loweredSignal.includes("relocation")) continue;

      return key;
    }

    return null;
  };

  const selectLocationValue = ({ cityState, signal }) => {
    const source = String(cityState || "");
    const loweredSignal = String(signal || "").toLowerCase();
    const [city, stateRaw] = source.split(",");
    const state = stateRaw?.trim() || "";

    if (loweredSignal.includes("city") && !loweredSignal.includes("state")) {
      return city?.trim() || source;
    }

    if (loweredSignal.includes("state") && !loweredSignal.includes("city")) {
      return state || source;
    }

    return source;
  };

  globalThis.JobHunterApplyCompanionHeuristics = {
    detectProviderFromUrl,
    matchKeyFromSignal,
    selectLocationValue,
  };
})();
