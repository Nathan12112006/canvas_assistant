// popup.js

const domainInput = document.getElementById("domain");
const canvasTokenInput = document.getElementById("canvasToken");
const proxyUrlInput = document.getElementById("proxyUrl");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const clearBtn = document.getElementById("clearBtn");

const DEFAULT_PROXY_URL = "http://localhost:8787";
const DRAFT_KEYS = ["draftCanvasDomain", "draftCanvasToken", "draftProxyUrl"];

chrome.storage.local.get(
  ["canvasDomain", "canvasToken", "proxyUrl", ...DRAFT_KEYS],
  data => {
    domainInput.value = data.draftCanvasDomain || data.canvasDomain || "";
    canvasTokenInput.value = data.draftCanvasToken || data.canvasToken || "";
    proxyUrlInput.value = data.draftProxyUrl || data.proxyUrl || DEFAULT_PROXY_URL;
  }
);

[domainInput, canvasTokenInput, proxyUrlInput].forEach(input => {
  input.addEventListener("input", persistDraft);
});

saveBtn.addEventListener("click", async () => {
  const domain = domainInput.value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const canvasToken = canvasTokenInput.value.trim();
  const proxyUrl = proxyUrlInput.value.trim().replace(/\/$/, "");

  if (!domain || !canvasToken || !proxyUrl) {
    showStatus("error", "Canvas domain, Canvas token, and proxy URL are required.");
    return;
  }

  saveBtn.textContent = "Verifying...";
  saveBtn.disabled = true;

  try {
    const canvasRes = await fetch(`https://${domain}/api/v1/courses?per_page=1&enrollment_state=active`, {
      headers: { Authorization: `Bearer ${canvasToken}` }
    });
    if (!canvasRes.ok) {
      showStatus("error", `Canvas returned ${canvasRes.status}. Check your domain and token.`);
      return;
    }

    const proxyRes = await fetch(`${proxyUrl}/health`);
    if (!proxyRes.ok) {
      showStatus("error", `Proxy returned ${proxyRes.status}. Check your proxy URL.`);
      return;
    }
  } catch (e) {
    showStatus("error", `Connection failed: ${e.message}`);
    return;
  } finally {
    saveBtn.textContent = "Save & Connect";
    saveBtn.disabled = false;
  }

  await chrome.storage.local.set({
    canvasDomain: domain,
    canvasToken,
    proxyUrl,
    cachedContext: null,
    cachedAt: null,
    draftCanvasDomain: domain,
    draftCanvasToken: canvasToken,
    draftProxyUrl: proxyUrl
  });

  showStatus("ok", "Connected! Open Canvas and click the assistant button.");

  chrome.tabs.query({ url: ["*://*.instructure.com/*", "*://*.canvas.com/*"] }, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: "SETTINGS_UPDATED" }).catch(() => {});
    });
  });
});

clearBtn.addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    domainInput.value = "";
    canvasTokenInput.value = "";
    proxyUrlInput.value = DEFAULT_PROXY_URL;
    showStatus("ok", "All data cleared.");
  });
});

function showStatus(type, msg) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = msg;
}

function persistDraft() {
  chrome.storage.local.set({
    draftCanvasDomain: domainInput.value,
    draftCanvasToken: canvasTokenInput.value,
    draftProxyUrl: proxyUrlInput.value
  });
}
