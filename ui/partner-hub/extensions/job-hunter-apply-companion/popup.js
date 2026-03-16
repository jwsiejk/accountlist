const providerEl = document.getElementById("provider");
const inputEl = document.getElementById("sessionInput");
const statusEl = document.getElementById("status");
const fillButton = document.getElementById("fillButton");

const setStatus = (text) => {
  statusEl.textContent = text;
};

const withCurrentTab = async (callback) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("No active tab.");
    return;
  }
  return callback(tab);
};

withCurrentTab(async (tab) => {
  const response = await chrome.tabs.sendMessage(tab.id, { type: "job-hunter-detect-provider" }).catch(() => null);
  providerEl.textContent = `Provider: ${response?.provider ?? "unsupported / unknown"}`;
});

fillButton.addEventListener("click", () => {
  let session;
  try {
    session = JSON.parse(inputEl.value);
  } catch {
    setStatus("Invalid JSON. Paste a valid apply-session payload.");
    return;
  }

  withCurrentTab(async (tab) => {
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: "job-hunter-fill-basic-fields",
      session,
    }).catch(() => null);

    if (!result) {
      setStatus("Unable to reach page script. Refresh ATS tab and try again.");
      return;
    }

    const filled = result.filled?.length ? `Filled automatically:\n- ${result.filled.join("\n- ")}` : "Filled automatically:\n- none";
    const uploads = result.uploads?.length ? `\n\nNeeds upload:\n- ${result.uploads.join("\n- ")}` : "\n\nNeeds upload:\n- none detected";
    const manual = result.manual?.length ? `\n\nNeeds manual review:\n- ${result.manual.join("\n- ")}` : "\n\nNeeds manual review:\n- none";
    setStatus(`${filled}${uploads}${manual}`);
  });
});
