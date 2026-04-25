/* ============================================================
   딱 필요한 만큼 — HTML/CSS 실습장
   ------------------------------------------------------------
   - 좌측 탭 (HTML / CSS / JS) 별로 별도 버퍼
   - 우측 sandbox iframe 에 srcdoc 으로 합성하여 미리보기
============================================================ */
(function () {
  const editor = document.getElementById("editor");
  const preview = document.getElementById("preview");
  const themeToggle = document.getElementById("themeToggle");
  const templateSelect = document.getElementById("templateSelect");
  const autoRun = document.getElementById("autoRun");

  const STORAGE_KEY = "just-htmlcss:doc";
  const ACTIVE_TAB_KEY = "just-htmlcss:tab";
  const AUTO_KEY = "just-htmlcss:auto";
  const THEME_KEY = "just:theme";

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

  /* ---------- Templates ---------- */
  const templates = {
    basic: {
      html: `<main>
  <h1>안녕, 바이브 코더</h1>
  <p>HTML로 뼈대를 잡고, CSS로 옷을 입힙니다. 좌측 탭에서 <strong>CSS</strong>를 눌러 스타일을 바꿔 보세요.</p>
  <button>버튼</button>
</main>`,
      css: `body {
  font-family: -apple-system, "Pretendard", system-ui, sans-serif;
  background: #f3f5fa;
  color: #121314;
  padding: 32px;
}
main {
  max-width: 480px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 24px 28px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
h1 { margin-top: 0; color: #2e6ff2; }
button {
  background: #2e6ff2;
  color: white;
  border: 0;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
button:hover { background: #145df0; }`,
      js: "",
    },
    flex: {
      html: `<div class="cards">
  <div class="card"><h3>마크다운</h3><p>AI와의 공용어</p></div>
  <div class="card"><h3>JSON</h3><p>응답을 읽는 눈</p></div>
  <div class="card"><h3>색상</h3><p>대비까지 한 번에</p></div>
  <div class="card"><h3>HTTP</h3><p>진짜 요청 보내기</p></div>
</div>`,
      css: `body {
  font-family: system-ui, sans-serif;
  background: #f3f5fa;
  padding: 32px;
}
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}
.card {
  flex: 1 1 180px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.card h3 { margin: 0 0 6px; color: #2e6ff2; }
.card p { margin: 0; color: #47494d; font-size: 14px; }`,
      js: "",
    },
    grid: {
      html: `<div class="layout">
  <header>헤더</header>
  <nav>네비</nav>
  <main>메인 — 콘텐츠가 여기 들어갑니다</main>
  <aside>사이드</aside>
  <footer>푸터</footer>
</div>`,
      css: `body { font-family: system-ui, sans-serif; margin: 0; }
.layout {
  display: grid;
  grid-template-areas:
    "header header"
    "nav    main"
    "nav    aside"
    "footer footer";
  grid-template-columns: 180px 1fr;
  grid-template-rows: 60px 1fr 120px 60px;
  min-height: 100vh;
  gap: 1px;
  background: #d9dbe0;
}
.layout > * {
  background: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
}
header { grid-area: header; background: #2e6ff2; color: white; font-weight: 700; }
nav    { grid-area: nav; background: #f3f5fa; }
main   { grid-area: main; }
aside  { grid-area: aside; background: #f3f5fa; }
footer { grid-area: footer; background: #121314; color: white; justify-content: center; }`,
      js: "",
    },
    form: {
      html: `<form id="signup">
  <h2>회원가입</h2>

  <label>
    이메일
    <input type="email" name="email" required placeholder="hong@example.com" />
  </label>

  <label>
    비밀번호
    <input type="password" name="password" required minlength="8" />
    <small>8자 이상</small>
  </label>

  <label class="check">
    <input type="checkbox" required />
    이용약관에 동의합니다
  </label>

  <button type="submit">가입</button>
  <p id="status" aria-live="polite"></p>
</form>`,
      css: `body { font-family: system-ui, sans-serif; background: #f3f5fa; padding: 32px; }
form {
  max-width: 360px;
  margin: 0 auto;
  background: white;
  padding: 24px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
h2 { margin: 0 0 4px; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #47494d; }
label.check { flex-direction: row; align-items: center; }
input[type="email"], input[type="password"] {
  font-size: 14px; padding: 8px 10px;
  border: 1px solid #d9dbe0; border-radius: 6px; outline: 0;
}
input:focus { border-color: #2e6ff2; }
small { color: #8d9299; font-size: 11px; }
button {
  background: #2e6ff2; color: white; border: 0; padding: 10px;
  border-radius: 8px; font-size: 14px; cursor: pointer;
}
#status { font-size: 13px; color: #15bf70; min-height: 1em; }`,
      js: `document.getElementById("signup").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  document.getElementById("status").textContent =
    "가입 완료 (시뮬레이션) · " + data.email;
});`,
    },
    hover: {
      html: `<div class="grid">
  <button class="btn">기본</button>
  <button class="btn lift">떠오르기</button>
  <button class="btn glow">반짝이기</button>
  <button class="btn tilt">기울이기</button>
</div>`,
      css: `body {
  font-family: system-ui, sans-serif;
  background: linear-gradient(135deg, #f3f5fa, #dee8ff);
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  margin: 0;
}
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.btn {
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 700;
  background: white;
  border: 1px solid #d9dbe0;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.btn.lift:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(46,111,242,0.18); }
.btn.glow:hover { box-shadow: 0 0 0 4px rgba(201,56,100,0.25); border-color: #c93864; color: #c93864; }
.btn.tilt:hover { transform: rotate(-3deg) scale(1.05); border-color: #15bf70; color: #15bf70; }`,
      js: "",
    },
    responsive: {
      html: `<div class="cards">
  <article class="card">모바일은 1열, 태블릿은 2열, 데스크톱은 3열</article>
  <article class="card">미리보기 영역의 너비를 늘렸다 줄였다 해 보세요</article>
  <article class="card">미디어 쿼리는 <code>@media (min-width: ...)</code></article>
</div>`,
      css: `body { font-family: system-ui, sans-serif; padding: 24px; background: #f3f5fa; }
.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.card {
  background: white;
  padding: 18px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
@media (min-width: 540px) {
  .cards { grid-template-columns: 1fr 1fr; }
}
@media (min-width: 860px) {
  .cards { grid-template-columns: 1fr 1fr 1fr; }
  .card { padding: 24px; }
}`,
      js: "",
    },
  };

  /* ---------- State ---------- */
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return {
            html: parsed.html || "",
            css: parsed.css || "",
            js: parsed.js || "",
          };
        }
      }
    } catch {}
    return { ...templates.basic };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let activeTab = localStorage.getItem(ACTIVE_TAB_KEY) || "html";
  if (!["html", "css", "js"].includes(activeTab)) activeTab = "html";

  let autoOn = localStorage.getItem(AUTO_KEY);
  autoOn = autoOn === null ? true : autoOn === "true";
  autoRun.checked = autoOn;

  /* ---------- Tab switching ---------- */
  function switchTab(name) {
    activeTab = name;
    localStorage.setItem(ACTIVE_TAB_KEY, name);
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === name);
    });
    editor.value = state[name];
    const placeholders = {
      html: "HTML 마크업을 여기에 적으세요.",
      css: "CSS 규칙을 여기에 적으세요.",
      js: "필요할 때만 JS 를 적으세요. (sandbox iframe 안에서만 실행)",
    };
    editor.placeholder = placeholders[name];
  }

  document.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => switchTab(t.dataset.tab));
  });

  /* ---------- Render ---------- */
  let renderTimer = null;

  function buildSrcDoc() {
    // Escape close-tags inside user code so they don't terminate our wrapper.
    const safeCss = state.css.replace(/<\/style>/gi, "<\\/style>");
    const safeJs = state.js.replace(/<\/script>/gi, "<\\/script>");
    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
${safeCss}
</style>
</head>
<body>
${state.html}
<script>
try {
${safeJs}
} catch (e) {
  document.body.insertAdjacentHTML("beforeend",
    "<pre style='color:#ff3440;background:#fff5f5;padding:12px;border-radius:8px;border:1px solid #fecaca;font:13px monospace;margin-top:16px;'>JS 오류: " +
    String(e.message || e).replace(/[<>&]/g, function(c){return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c]}) +
    "</pre>");
}
<\/script>
</body>
</html>`;
  }

  function render() {
    preview.srcdoc = buildSrcDoc();
  }

  function scheduleRender() {
    if (!autoOn) return;
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 250);
  }

  /* ---------- Editor wiring ---------- */
  editor.addEventListener("input", () => {
    state[activeTab] = editor.value;
    saveState();
    scheduleRender();
  });

  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.slice(0, start) + "  " + editor.value.slice(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      state[activeTab] = editor.value;
      saveState();
      scheduleRender();
    }
  });

  /* ---------- Actions ---------- */
  document.getElementById("runBtn").addEventListener("click", render);
  document.getElementById("reloadBtn").addEventListener("click", render);

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (!confirm("HTML / CSS / JS 모두 비울까요?")) return;
    state = { html: "", css: "", js: "" };
    saveState();
    editor.value = "";
    render();
  });

  autoRun.addEventListener("change", () => {
    autoOn = autoRun.checked;
    localStorage.setItem(AUTO_KEY, String(autoOn));
    if (autoOn) render();
  });

  templateSelect.addEventListener("change", (e) => {
    const key = e.target.value;
    if (!key) return;
    const tpl = templates[key];
    if (
      tpl &&
      (Object.values(state).every((v) => !v.trim()) ||
        confirm("현재 입력 내용을 예제로 교체할까요?"))
    ) {
      state = { ...tpl };
      saveState();
      switchTab(activeTab);
      render();
    }
    e.target.value = "";
  });

  /* ---------- Init ---------- */
  switchTab(activeTab);
  render();
})();
