/* ============================================================
   허브 페이지 — 책 카드 렌더링 + 테마 토글
============================================================ */
(function () {
  const THEME_KEY = "just:theme";

  /* ---------- Theme ---------- */
  const themeToggle = document.getElementById("themeToggle");

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (themeToggle) themeToggle.checked = theme === "dark";
    localStorage.setItem(THEME_KEY, theme);
  }

  const savedTheme =
    localStorage.getItem(THEME_KEY) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("change", () => {
      applyTheme(themeToggle.checked ? "dark" : "light");
    });
  }

  /* ---------- Helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Soft accent: 12% mix between accent and white-ish for the icon background.
  // We use color-mix when available; otherwise fall back to the accent itself.
  function softenAccent(hex) {
    return `color-mix(in srgb, ${hex} 14%, transparent)`;
  }

  /* ---------- Render book grid ---------- */
  const grid = document.getElementById("bookGrid");
  if (grid && Array.isArray(window.JUST_BOOKS)) {
    grid.innerHTML = window.JUST_BOOKS.map(renderCard).join("");
  }

  function renderCard(book) {
    const status = window.JUST_STATUS_LABEL[book.status] || {
      text: book.status,
      className: "",
    };
    const disabled = book.status === "coming-soon";
    const accent = book.accent || "#2e6ff2";

    const practiceBtn = book.practiceUrl
      ? `<a class="primary" href="${escapeHtml(book.practiceUrl)}">실습 시작</a>`
      : `<a class="primary" aria-disabled="true" tabindex="-1">실습 준비중</a>`;

    const bookBtn = book.bookUrl
      ? `<a href="${escapeHtml(book.bookUrl)}" target="_blank" rel="noopener">책 보러가기</a>`
      : `<a aria-disabled="true" tabindex="-1">책 준비중</a>`;

    return `
      <article class="book-card${disabled ? " disabled" : ""}"
               style="--card-accent: ${escapeHtml(accent)}; --card-accent-soft: ${softenAccent(accent)};">
        <div class="card-thumb">
          <span class="card-thumb-icon">${escapeHtml(book.icon || book.slug.slice(0, 2).toUpperCase())}</span>
          <span class="card-status ${status.className}">${escapeHtml(status.text)}</span>
        </div>
        <div class="card-body">
          <h2 class="card-title">${escapeHtml(book.title)}</h2>
          <p class="card-tagline">${escapeHtml(book.tagline || "")}</p>
          <p class="card-desc">${escapeHtml(book.description || "")}</p>
          <div class="card-actions">
            ${practiceBtn}
            ${bookBtn}
          </div>
        </div>
      </article>
    `;
  }
})();
