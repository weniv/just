/* ============================================================
   딱 필요한 만큼 — 정규식 실습장
   ------------------------------------------------------------
   - 패턴 + 플래그 입력 → 즉시 매치 하이라이트
   - 캡처 그룹과 인덱스를 표로 나열
   - 자주 쓰는 패턴 8종 프리셋
============================================================ */
(function () {
  const PATTERN_KEY = "just-regex:pattern";
  const FLAGS_KEY = "just-regex:flags";
  const TEST_KEY = "just-regex:test";
  const THEME_KEY = "just:theme";

  const themeToggle = document.getElementById("themeToggle");
  const patternInput = document.getElementById("patternInput");
  const flagsInput = document.getElementById("flagsInput");
  const testInput = document.getElementById("testInput");
  const testPreview = document.getElementById("testPreview");
  const diagnostic = document.getElementById("diagnostic");
  const matchSummary = document.getElementById("matchSummary");
  const matchList = document.getElementById("matchList");
  const inputRow = document.querySelector(".re-input-row");
  const flagToggles = document.querySelectorAll(".flags-toggles input[data-flag]");
  const presetsEl = document.getElementById("presets");
  const copyBtn = document.getElementById("copyBtn");

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.checked = theme === "dark";
    localStorage.setItem(THEME_KEY, theme);
  }
  applyTheme(
    localStorage.getItem(THEME_KEY) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
  themeToggle.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "dark" : "light");
  });

  /* ---------- Helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 1600);
  }

  /* ---------- Build regex ---------- */
  function buildRegex(pattern, flagsRaw) {
    // Deduplicate flags, keep only valid ones.
    const allowed = new Set(["g", "i", "m", "s", "u", "y"]);
    const flags = [];
    for (const ch of (flagsRaw || "")) {
      if (allowed.has(ch) && !flags.includes(ch)) flags.push(ch);
    }
    return new RegExp(pattern, flags.join(""));
  }

  /* ---------- Find all matches ---------- */
  function findMatches(re, text) {
    const matches = [];
    if (re.flags.includes("g")) {
      // Use matchAll for global.
      let m;
      const iter = text.matchAll(re);
      for (m of iter) {
        if (m[0] === "" ) {
          // Avoid infinite loop on zero-width matches; break after first.
          matches.push({ index: m.index, full: m[0], groups: m.slice(1), named: m.groups });
          break;
        }
        matches.push({ index: m.index, full: m[0], groups: m.slice(1), named: m.groups });
        if (matches.length > 5000) break;
      }
    } else {
      const m = re.exec(text);
      if (m) matches.push({ index: m.index, full: m[0], groups: m.slice(1), named: m.groups });
    }
    return matches;
  }

  /* ---------- Render highlighted preview ---------- */
  function renderPreview(text, matches) {
    if (matches.length === 0) {
      testPreview.textContent = text;
      return;
    }
    let out = "";
    let cursor = 0;
    matches.forEach((m, i) => {
      const start = m.index;
      const end = m.index + m.full.length;
      if (start < cursor) return; // overlapping (shouldn't with global)
      out += escapeHtml(text.slice(cursor, start));
      const cls = i % 2 === 0 ? "" : "alt";
      out += `<mark${cls ? ` class="${cls}"` : ""}>${escapeHtml(text.slice(start, end))}</mark>`;
      cursor = end;
    });
    out += escapeHtml(text.slice(cursor));
    testPreview.innerHTML = out;
  }

  /* ---------- Render match list ---------- */
  function renderMatchList(matches) {
    if (matches.length === 0) {
      matchSummary.innerHTML = "매치 없음";
      matchList.innerHTML = `<div class="empty">테스트 문자열에서 매칭되는 부분이 없습니다</div>`;
      return;
    }
    matchSummary.innerHTML = `총 <strong>${matches.length}</strong>개 매치`;
    matchList.innerHTML = matches
      .slice(0, 200)
      .map((m, i) => {
        const start = m.index;
        const end = m.index + m.full.length;
        const groupRows = m.groups.length
          ? m.groups
              .map(
                (g, gi) =>
                  `<dt>$${gi + 1}</dt><dd>${g === undefined ? "<em style='color:var(--text-mute)'>(매치 안 됨)</em>" : escapeHtml(g)}</dd>`
              )
              .join("")
          : "";
        const namedRows = m.named
          ? Object.entries(m.named)
              .map(
                ([k, v]) =>
                  `<dt>?&lt;${escapeHtml(k)}&gt;</dt><dd>${v === undefined ? "<em style='color:var(--text-mute)'>(매치 안 됨)</em>" : escapeHtml(v)}</dd>`
              )
              .join("")
          : "";
        const groupBlock =
          groupRows || namedRows
            ? `<dl class="groups">${groupRows}${namedRows}</dl>`
            : "";
        return `
          <div class="match-tile">
            <div class="midx">${i + 1}</div>
            <div class="mbody">
              <div class="mhead">
                <span class="mtext">${escapeHtml(m.full) || "<em>(빈 문자열)</em>"}</span>
                <span class="mpos">[${start}, ${end})</span>
              </div>
              ${groupBlock}
            </div>
          </div>
        `;
      })
      .join("") +
      (matches.length > 200
        ? `<div class="empty">앞 200개만 표시했습니다 (총 ${matches.length}개)</div>`
        : "");
  }

  /* ---------- Sync flags input <-> toggles ---------- */
  function syncFlagsToToggles() {
    const set = new Set(flagsInput.value);
    flagToggles.forEach((cb) => {
      cb.checked = set.has(cb.dataset.flag);
    });
  }
  function syncTogglesToFlags() {
    let f = "";
    flagToggles.forEach((cb) => {
      if (cb.checked) f += cb.dataset.flag;
    });
    flagsInput.value = f;
  }
  flagToggles.forEach((cb) => {
    cb.addEventListener("change", () => {
      syncTogglesToFlags();
      update();
    });
  });

  /* ---------- Mirror textarea scroll to preview ---------- */
  function syncScroll() {
    testPreview.style.transform = `translateY(${-testInput.scrollTop}px)`;
  }
  testInput.addEventListener("scroll", syncScroll);

  /* ---------- Update ---------- */
  function update() {
    const pattern = patternInput.value;
    const flags = flagsInput.value;
    const text = testInput.value;

    localStorage.setItem(PATTERN_KEY, pattern);
    localStorage.setItem(FLAGS_KEY, flags);
    localStorage.setItem(TEST_KEY, text);

    if (!pattern) {
      inputRow.classList.remove("bad");
      diagnostic.textContent = "패턴을 입력하세요";
      diagnostic.className = "diagnostic";
      testPreview.textContent = text;
      matchSummary.innerHTML = "";
      matchList.innerHTML = "";
      return;
    }

    let re;
    try {
      re = buildRegex(pattern, flags);
    } catch (e) {
      inputRow.classList.add("bad");
      diagnostic.textContent = `정규식 오류: ${e.message}`;
      diagnostic.className = "diagnostic error";
      testPreview.textContent = text;
      matchSummary.innerHTML = "";
      matchList.innerHTML = "";
      return;
    }

    inputRow.classList.remove("bad");
    let matches;
    try {
      matches = findMatches(re, text);
    } catch (e) {
      diagnostic.textContent = `실행 오류: ${e.message}`;
      diagnostic.className = "diagnostic error";
      return;
    }

    diagnostic.textContent = `유효 · /${re.source}/${re.flags} · ${matches.length}개 매치`;
    diagnostic.className = "diagnostic ok";

    renderPreview(text, matches);
    renderMatchList(matches);
    syncScroll();
  }

  patternInput.addEventListener("input", () => update());
  flagsInput.addEventListener("input", () => {
    syncFlagsToToggles();
    update();
  });
  testInput.addEventListener("input", () => update());

  copyBtn.addEventListener("click", async () => {
    const expr = `/${patternInput.value}/${flagsInput.value}`;
    try {
      await navigator.clipboard.writeText(expr);
      toast("복사했습니다");
    } catch { toast("복사 실패"); }
  });

  /* ---------- Presets ---------- */
  const PRESETS = [
    {
      pattern: String.raw`\b\w+@\w+\.\w+\b`,
      flags: "g",
      desc: "이메일 주소 (단순)",
    },
    {
      pattern: String.raw`https?://[^\s)]+`,
      flags: "g",
      desc: "URL (http/https)",
    },
    {
      pattern: String.raw`\b01[0-9]-?\d{3,4}-?\d{4}\b`,
      flags: "g",
      desc: "한국 휴대폰 번호",
    },
    {
      pattern: String.raw`\b\d{4}-\d{2}-\d{2}\b`,
      flags: "g",
      desc: "ISO 날짜 (YYYY-MM-DD)",
    },
    {
      pattern: String.raw`\b(?:\d{1,3}\.){3}\d{1,3}\b`,
      flags: "g",
      desc: "IPv4 주소",
    },
    {
      pattern: String.raw`#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b`,
      flags: "g",
      desc: "Hex 컬러 (#RGB / #RRGGBB)",
    },
    {
      pattern: String.raw`[가-힣]+`,
      flags: "g",
      desc: "한글 단어",
    },
    {
      pattern: String.raw`(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})`,
      flags: "g",
      desc: "이름 있는 캡처 (year/month/day)",
    },
  ];

  presetsEl.innerHTML = PRESETS.map(
    (p) => `
      <button class="preset-tile" type="button"
              data-pattern="${escapeHtml(p.pattern)}"
              data-flags="${escapeHtml(p.flags)}">
        <span class="preset-pat">/${escapeHtml(p.pattern)}/${escapeHtml(p.flags)}</span>
        <span class="preset-desc">${escapeHtml(p.desc)}</span>
      </button>
    `
  ).join("");

  presetsEl.addEventListener("click", (e) => {
    const tile = e.target.closest(".preset-tile");
    if (!tile) return;
    patternInput.value = tile.dataset.pattern;
    flagsInput.value = tile.dataset.flags;
    syncFlagsToToggles();
    update();
  });

  /* ---------- Init ---------- */
  const savedPattern = localStorage.getItem(PATTERN_KEY);
  const savedFlags = localStorage.getItem(FLAGS_KEY);
  const savedTest = localStorage.getItem(TEST_KEY);
  if (savedPattern !== null) patternInput.value = savedPattern;
  if (savedFlags !== null) flagsInput.value = savedFlags;
  if (savedTest !== null) testInput.value = savedTest;
  syncFlagsToToggles();
  update();
})();
