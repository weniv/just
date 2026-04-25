/* ============================================================
   딱 필요한 만큼 — JSON 실습장
   ------------------------------------------------------------
   - 좌측: JSON 입력 + 검증 / 에러 메시지
   - 우측: 트리 시각화 (펼치기·접기, 타입별 색상, 클릭 시 경로)
============================================================ */
(function () {
  const editor = document.getElementById("editor");
  const tree = document.getElementById("tree");
  const diagnostic = document.getElementById("diagnostic");
  const byteCount = document.getElementById("byteCount");
  const themeToggle = document.getElementById("themeToggle");
  const templateSelect = document.getElementById("templateSelect");
  const pathBar = document.getElementById("pathBar");
  const pathValue = document.getElementById("pathValue");
  const copyPath = document.getElementById("copyPath");

  const STORAGE_KEY = "just-json:doc";
  const THEME_KEY = "just:theme";

  /* ---------- Templates ---------- */
  const templates = {
    api: `{
  "id": 17,
  "title": "딱 필요한 만큼 — 마크다운 실습 후기",
  "author": {
    "id": 3,
    "name": "홍길동",
    "email": "hong@example.com"
  },
  "tags": ["markdown", "vibecoding", "weniv"],
  "published": true,
  "viewCount": 1284,
  "createdAt": "2026-04-25T09:30:00Z"
}`,
    user: `{
  "userId": "u_2bX9",
  "name": "이호준",
  "age": 32,
  "active": true,
  "address": {
    "city": "서울",
    "district": "강남구",
    "zipcode": "06236"
  },
  "phones": [
    { "type": "mobile", "number": "010-1234-5678" },
    { "type": "office", "number": "02-555-0001" }
  ],
  "lastLogin": null
}`,
    config: `{
  "$schema": "https://json.schemastore.org/package",
  "name": "just-markdown",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "python -m http.server 8000",
    "build": "echo no build"
  },
  "dependencies": {
    "marked": "^12.0.2",
    "dompurify": "^3.1.5",
    "highlight.js": "^11.9.0"
  }
}`,
    nested: `{
  "matrix": [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ],
  "tree": {
    "root": {
      "left": { "value": "L", "left": null, "right": null },
      "right": {
        "value": "R",
        "left": { "value": "RL", "left": null, "right": null },
        "right": null
      }
    }
  }
}`,
    mixed: `{
  "string": "텍스트",
  "number": 3.14,
  "integer": 42,
  "boolean": true,
  "null": null,
  "emptyArray": [],
  "emptyObject": {},
  "unicode": "한글 / 日本語 / 🎉",
  "escaped": "줄바꿈\\n탭\\t따옴표\\""
}`,
  };

  const defaultDoc = templates.api;

  /* ---------- Helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.checked = theme === "dark";
    localStorage.setItem(THEME_KEY, theme);
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

  // Convert JSON.parse error message position to line/column.
  function describeError(err, src) {
    const msg = err && err.message ? err.message : "JSON 파싱 실패";
    const m = msg.match(/position\s+(\d+)/i);
    if (!m) return msg;
    const pos = Number(m[1]);
    let line = 1;
    let col = 1;
    for (let i = 0; i < pos && i < src.length; i++) {
      if (src[i] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
    }
    return `${msg}\n→ ${line}행 ${col}열 부근`;
  }

  // Build a JSONPath-like dot/bracket notation.
  function joinPath(parent, segment, isIndex) {
    if (parent === "$" && !isIndex) {
      // identifier-safe?
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) return `$.${segment}`;
      return `$["${segment.replace(/"/g, '\\"')}"]`;
    }
    if (isIndex) return `${parent}[${segment}]`;
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) return `${parent}.${segment}`;
    return `${parent}["${segment.replace(/"/g, '\\"')}"]`;
  }

  function typeOf(v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v;
  }

  /* ---------- Tree rendering ---------- */
  // Each row is a wrapper <div class="row"> + optional sibling <div class="children">.
  // Top-level container: this.tree element.

  function renderTree(value) {
    tree.innerHTML = "";
    const root = renderNode(null, value, "$", 0);
    tree.appendChild(root);
  }

  // Build a fragment for one node. Returns a DocumentFragment containing
  // a row and (if container) a children block.
  function renderNode(key, value, path, depth) {
    const frag = document.createDocumentFragment();
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.path = path;

    const t = typeOf(value);
    const isContainer = t === "object" || t === "array";

    // Toggle arrow
    const toggle = document.createElement("span");
    toggle.className = "toggle";
    if (isContainer && hasChildren(value)) {
      toggle.textContent = "▾";
    } else {
      toggle.textContent = "▾";
      toggle.classList.add("empty");
    }
    row.appendChild(toggle);

    // Key / index label
    if (key !== null) {
      const isIndex = typeof key === "number";
      const label = document.createElement("span");
      label.className = isIndex ? "index" : "key";
      label.textContent = isIndex ? key : `"${key}"`;
      row.appendChild(label);
    }

    // Value preview
    if (isContainer) {
      const open = document.createElement("span");
      open.className = "punct";
      open.textContent = t === "array" ? "[" : "{";
      row.appendChild(open);

      const summary = document.createElement("span");
      summary.className = "summary";
      const count = t === "array" ? value.length : Object.keys(value).length;
      summary.textContent = count === 0
        ? (t === "array" ? "]" : "}")
        : `${count} ${t === "array" ? "items" : "keys"} ${t === "array" ? "]" : "}"}`;
      row.appendChild(summary);
    } else {
      const v = document.createElement("span");
      v.className = `v-${t}`;
      v.textContent = formatPrimitive(value, t);
      row.appendChild(v);

      const badge = document.createElement("span");
      badge.className = "type-badge";
      badge.textContent = t;
      row.appendChild(badge);
    }

    frag.appendChild(row);

    // Children
    if (isContainer && hasChildren(value)) {
      const children = document.createElement("div");
      children.className = "children";

      if (t === "array") {
        value.forEach((item, idx) => {
          const childPath = joinPath(path, idx, true);
          children.appendChild(renderNode(idx, item, childPath, depth + 1));
        });
      } else {
        Object.keys(value).forEach((k) => {
          const childPath = joinPath(path, k, false);
          children.appendChild(renderNode(k, value[k], childPath, depth + 1));
        });
      }

      frag.appendChild(children);

      // Auto-collapse very deep nodes for sanity
      if (depth >= 4) row.classList.add("collapsed");
    }

    return frag;
  }

  function hasChildren(v) {
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v).length > 0;
    return false;
  }

  function formatPrimitive(v, t) {
    if (t === "string") return JSON.stringify(v);
    if (t === "null") return "null";
    return String(v);
  }

  /* ---------- Validate & render ---------- */
  let renderTimer = null;

  function process() {
    const raw = editor.value;
    byteCount.textContent = new Blob([raw]).size.toLocaleString();
    localStorage.setItem(STORAGE_KEY, raw);

    if (!raw.trim()) {
      diagnostic.textContent = "대기 중";
      diagnostic.className = "diagnostic";
      tree.innerHTML = '<div class="empty-state">JSON을 입력하면 여기에 트리로 보여 드립니다.</div>';
      hidePath();
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      diagnostic.textContent = `유효한 JSON · ${describeRoot(parsed)}`;
      diagnostic.className = "diagnostic ok";
      renderTree(parsed);
    } catch (err) {
      diagnostic.textContent = describeError(err, raw);
      diagnostic.className = "diagnostic error";
      tree.innerHTML = '<div class="empty-state">JSON 문법 오류가 있습니다. 좌측 메시지를 확인하세요.</div>';
      hidePath();
    }
  }

  function describeRoot(v) {
    const t = typeOf(v);
    if (t === "array") return `배열 (${v.length} items)`;
    if (t === "object") return `객체 (${Object.keys(v).length} keys)`;
    return `${t} 값`;
  }

  function scheduleProcess() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(process, 150);
  }

  /* ---------- Path bar ---------- */
  function showPath(path) {
    pathBar.hidden = false;
    pathValue.textContent = path;
  }
  function hidePath() {
    pathBar.hidden = true;
    pathValue.textContent = "";
  }

  /* ---------- Tree interactions ---------- */
  tree.addEventListener("click", (e) => {
    const row = e.target.closest(".row");
    if (!row || !tree.contains(row)) return;

    // Toggle if toggle clicked, OR if row is a container row
    const toggle = e.target.closest(".toggle");
    const next = row.nextElementSibling;
    const isContainerRow = next && next.classList.contains("children");

    if (toggle && isContainerRow && !toggle.classList.contains("empty")) {
      row.classList.toggle("collapsed");
    }

    // Always update path bar
    if (row.dataset.path) {
      showPath(row.dataset.path);
      tree.querySelectorAll(".row.selected").forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
    }
  });

  /* ---------- Expand / collapse all ---------- */
  document.getElementById("expandAll").addEventListener("click", () => {
    tree.querySelectorAll(".row.collapsed").forEach((r) => r.classList.remove("collapsed"));
  });
  document.getElementById("collapseAll").addEventListener("click", () => {
    tree.querySelectorAll(".row").forEach((r) => {
      const next = r.nextElementSibling;
      if (next && next.classList.contains("children") && r !== tree.firstElementChild) {
        r.classList.add("collapsed");
      }
    });
  });

  /* ---------- Format / minify / copy / clear ---------- */
  document.getElementById("formatBtn").addEventListener("click", () => {
    try {
      const parsed = JSON.parse(editor.value);
      editor.value = JSON.stringify(parsed, null, 2);
      process();
      toast("정렬했습니다");
    } catch {
      toast("JSON 문법 오류 — 정렬할 수 없습니다");
    }
  });

  document.getElementById("minifyBtn").addEventListener("click", () => {
    try {
      const parsed = JSON.parse(editor.value);
      editor.value = JSON.stringify(parsed);
      process();
      toast("압축했습니다");
    } catch {
      toast("JSON 문법 오류 — 압축할 수 없습니다");
    }
  });

  document.getElementById("copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.value);
      toast("JSON을 복사했습니다");
    } catch {
      toast("복사 실패");
    }
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    if (!editor.value.trim() || confirm("입력 내용을 모두 비울까요?")) {
      editor.value = "";
      process();
      editor.focus();
    }
  });

  copyPath.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pathValue.textContent);
      toast("경로를 복사했습니다");
    } catch {
      toast("복사 실패");
    }
  });

  templateSelect.addEventListener("change", (e) => {
    const key = e.target.value;
    if (!key) return;
    const tpl = templates[key];
    if (
      tpl &&
      (!editor.value.trim() ||
        confirm("현재 입력 내용을 예제로 교체할까요?"))
    ) {
      editor.value = tpl;
      process();
    }
    e.target.value = "";
  });

  themeToggle.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "dark" : "light");
  });

  /* ---------- Tab key indents ---------- */
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.slice(0, start) + "  " + editor.value.slice(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
    }
  });

  editor.addEventListener("input", scheduleProcess);

  /* ---------- Init ---------- */
  const savedTheme =
    localStorage.getItem(THEME_KEY) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);

  const savedDoc = localStorage.getItem(STORAGE_KEY);
  editor.value = savedDoc != null ? savedDoc : defaultDoc;
  process();
})();
