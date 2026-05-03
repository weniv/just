/* ============================================================
   웹 구조 도식 페이지 — 테마 토글 + 머메이드 렌더
============================================================ */
(function () {
  const THEME_KEY = "just:theme";
  const themeToggle = document.getElementById("themeToggle");

  /* ---------- Theme ---------- */
  function currentTheme() {
    return (
      localStorage.getItem(THEME_KEY) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (themeToggle) themeToggle.checked = theme === "dark";
    localStorage.setItem(THEME_KEY, theme);
  }

  applyTheme(currentTheme());

  /* ---------- Mermaid setup ---------- */
  // Cache the original source for each diagram so we can re-render
  // when the theme changes (mermaid replaces the inner content with SVG).
  const blocks = Array.from(document.querySelectorAll(".mermaid"));
  blocks.forEach((el) => {
    el.dataset.source = el.textContent.trim();
    el.textContent = el.dataset.source;
  });

  function mermaidThemeFor(theme) {
    return theme === "dark" ? "dark" : "default";
  }

  function initMermaid(theme) {
    if (!window.mermaid) return;
    window.mermaid.initialize({
      startOnLoad: false,
      theme: mermaidThemeFor(theme),
      securityLevel: "loose",
      fontFamily:
        '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", Roboto, sans-serif',
      flowchart: { htmlLabels: true, curve: "basis" },
      sequence: { useMaxWidth: true, mirrorActors: false },
    });
  }

  async function renderAll() {
    if (!window.mermaid) return;
    // Reset each block to its source and clear processed flag
    blocks.forEach((el) => {
      el.removeAttribute("data-processed");
      el.innerHTML = el.dataset.source;
    });
    try {
      await window.mermaid.run({ nodes: blocks, suppressErrors: false });
    } catch (err) {
      // mermaid logs to console; the per-block error rendering is enough
      // for the user. No-op here.
    }
  }

  function applyAndRender(theme) {
    applyTheme(theme);
    initMermaid(theme);
    renderAll();
  }

  // First paint
  initMermaid(currentTheme());
  // Defer to next tick so fonts/css are ready, reducing layout shift
  requestAnimationFrame(() => renderAll());

  if (themeToggle) {
    themeToggle.addEventListener("change", () => {
      applyAndRender(themeToggle.checked ? "dark" : "light");
    });
  }

  /* ---------- TOC active highlight on scroll ---------- */
  const tocLinks = Array.from(document.querySelectorAll(".toc-list a"));
  const targets = tocLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && targets.length) {
    const byId = new Map(tocLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const visible = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        });
        // Pick the first target (in document order) currently visible
        const firstVisible = targets.find((t) => visible.has(t.id));
        tocLinks.forEach((a) => a.classList.remove("active"));
        if (firstVisible) {
          const link = byId.get(firstVisible.id);
          if (link) link.classList.add("active");
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );

    targets.forEach((t) => observer.observe(t));
  }
})();
