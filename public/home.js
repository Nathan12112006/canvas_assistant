document.addEventListener("DOMContentLoaded", () => {
  setupCountdowns();
  setupPreviewTabs();
  setupScrollReveal();
});

function setupCountdowns() {
  document.querySelectorAll("[data-countdown-seconds]").forEach(node => {
    let remaining = Number(node.getAttribute("data-countdown-seconds")) || 0;
    const tick = () => {
      node.textContent = formatDuration(remaining);
      remaining = remaining > 0 ? remaining - 1 : 5 * 60 * 60 + 17 * 60 + 7;
    };
    tick();
    window.setInterval(tick, 1000);
  });
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
}

function setupPreviewTabs() {
  document.querySelectorAll("[data-preview-root]").forEach(root => {
    const tabs = Array.from(root.querySelectorAll("[data-preview-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-preview-panel]"));

    const activate = tabName => {
      tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.previewTab === tabName));
      panels.forEach(panel => panel.classList.toggle("active", panel.dataset.previewPanel === tabName));
    };

    tabs.forEach(tab => {
      tab.addEventListener("click", () => activate(tab.dataset.previewTab));
    });
  });
}

function setupScrollReveal() {
  const items = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!items.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });

  items.forEach(item => observer.observe(item));
}
