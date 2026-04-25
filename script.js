/* 딱 필요한 만큼 — 마크다운 실습장 */
(function () {
  const editor = document.getElementById("editor");
  const preview = document.getElementById("preview");
  const charCount = document.getElementById("charCount");
  const lineCount = document.getElementById("lineCount");
  const themeToggle = document.getElementById("themeToggle");
  const templateSelect = document.getElementById("templateSelect");
  const hljsLight = document.getElementById("hljs-light");
  const hljsDark = document.getElementById("hljs-dark");

  const STORAGE_KEY = "just-markdown:doc";
  const THEME_KEY = "just-markdown:theme";

  /* ---------- Templates ---------- */
  const templates = {
    intro: `---
title: 자기소개
author: 홍길동
date: 2026-04-25
---

# 안녕하세요, 홍길동입니다

바이브 코딩에 입문한 지 6개월 차입니다. 이 문서로 마크다운 졸업 시험을 치릅니다.

## 지금 만지고 있는 것

- Claude Code로 사이드 프로젝트 만들기
- Cursor에서 React 따라 치기
- Notion에 매일 회고 쓰기

## 좋아하는 도구

| 도구 | 용도 | 만족도 |
|------|------|:------:|
| Claude | 코드/글쓰기 | ★★★★★ |
| Cursor | 에디터 | ★★★★☆ |
| Obsidian | 노트 | ★★★★★ |

## 올해 목표

- [x] 마크다운 익히기
- [ ] Git 기본기 다지기
- [ ] 첫 오픈소스 PR 보내기

> "도구를 익히는 30분이, 1년치 시간을 아껴준다."

연락처: <hello@example.com>
`,

    prompt: `## 역할
시니어 백엔드 개발자

## 작업
아래 함수에 대한 단위 테스트를 작성해줘.

## 코드
\`src/utils/math.py\`

\`\`\`python
def add(a, b):
    return a + b
\`\`\`

## 제약
- pytest 사용
- 엣지 케이스 포함 (음수, 0, 큰 수)
- 한 테스트 함수 = 한 케이스
`,

    readme: `# 프로젝트 이름

한 줄 소개. 이 프로젝트는 무엇을 하는가.

![build](https://img.shields.io/badge/build-passing-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

## 데모

스크린샷이나 실행 영상 자리.

## 설치

\`\`\`bash
npm install
\`\`\`

## 사용법

\`\`\`bash
npm run dev
\`\`\`

## 폴더 구조

\`\`\`text
my-project/
├── src/
│   ├── components/
│   └── pages/
├── public/
└── package.json
\`\`\`

## 기술 스택

- Next.js 13
- TailwindCSS
- TypeScript

## 라이선스

MIT
`,

    table: `# 표 — 정렬과 활용

기본 표:

| 도구 | 용도 | 가격 |
|------|------|------|
| Claude | 대화/코딩 | 유료/무료 |
| Cursor | IDE | 유료 |
| ChatGPT | 대화 | 유료/무료 |

정렬 (왼쪽 / 가운데 / 오른쪽):

| 왼쪽 정렬 | 가운데 정렬 | 오른쪽 정렬 |
|:----------|:-----------:|------------:|
| L         | C           | R           |
| 짧게      | 가운데      | 1,234,567   |
| longer    | 중간        | 99          |
`,

    checklist: `## 작업 목록

- [x] 로그인 폼 컴포넌트 작성
- [x] 유효성 검사 추가
- [ ] 에러 메시지 표시
- [ ] 단위 테스트
- [ ] 스토리북 등록

## AI에게 던질 때

> 아래 체크리스트 항목을 위에서부터 처리하면서, 끝낸 항목은 [x]로 바꿔서 다시 보여줘.
`,

    codeblock: `# 코드 블록 모음

## 인라인 vs 블록

\`console.log("hi")\` 처럼 한 줄은 백틱 하나.

여러 줄은:

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}\`);
}
\`\`\`

## 언어 표시

\`\`\`python
def add(a, b):
    return a + b
\`\`\`

\`\`\`bash
npm install && npm run dev
\`\`\`

## diff 블록

\`\`\`diff
- const name = "홍길동"
+ const name = "이호준"
  console.log(name)
\`\`\`
`,

    mermaid: `# 머메이드 다이어그램

## 흐름도

\`\`\`mermaid
graph LR
    A["내가 쓴 마크다운<br/>(프롬프트)"] --> B["AI"]
    B --> C["AI가 돌려준 마크다운<br/>(응답)"]
    C --> D["GitHub README<br/>Notion<br/>Slack<br/>블로그"]
\`\`\`

## 시퀀스 다이어그램

\`\`\`mermaid
sequenceDiagram
    participant U as 사용자
    participant A as AI
    participant G as GitHub
    U->>A: 마크다운으로 질문
    A-->>U: 마크다운으로 답변
    U->>G: 답변을 README에 붙여넣기
\`\`\`
`,

    alerts: `# GitHub 알림박스

> [!NOTE]
> 일반적인 안내 메시지입니다.

> [!TIP]
> 실전에서 유용한 팁.

> [!WARNING]
> 주의해야 할 내용.

> [!IMPORTANT]
> 꼭 알아야 할 핵심.

> [!CAUTION]
> 위험·치명적인 결과를 부를 수 있는 행위.
`,

    frontmatter: `---
chapter: 바이브 코딩을 위한 마크다운
title: "마크다운: 30분 코스"
date: 2026-04-25
tags: [markdown, ai, vibecoding]
draft: false
---

# 본문 시작

위 \`---\` 사이에 있는 것이 **프론트매터**입니다. Jekyll·Hugo·Astro·Next.js 블로그, Obsidian, 위니북스가 모두 이 방식을 씁니다.

## 핵심 규칙

- 문서의 가장 첫 줄이 \`---\`이어야 합니다
- 끝은 다시 \`---\`로 닫습니다
- 안쪽은 \`키: 값\` 형식의 YAML
- 들여쓰기는 공백만, 탭은 안 됩니다
`,
  };

  const defaultDoc = `# 마크다운 실습장

왼쪽에 입력하면 오른쪽에 바로 결과가 보입니다. 위쪽 **예제 불러오기**에서 시작 템플릿을 골라도 됩니다.

## 잠깐 연습

1. 위쪽 \`H2\` 버튼을 눌러 새 섹션을 만드세요
2. \`- \` 으로 목록을 시작해 보세요
3. \`\`\`로 코드 블록을 열어 \`console.log("hi")\`를 적어보세요

> 팁 — 책에 나온 모든 예제를 여기서 그대로 쳐 보세요.

\`\`\`javascript
function hello(name) {
  console.log(\`안녕, \${name}\`);
}
hello("바이브 코더");
\`\`\`

| 단계 | 내용 |
|:----:|------|
| 1 | 헤딩으로 뼈대 잡기 |
| 2 | 코드는 백틱으로 감싸기 |
| 3 | 표·체크리스트로 정돈 |

- [x] 입력해 보기
- [ ] 결과를 README에 옮겨 적기
`;

  /* ---------- Marked setup ---------- */
  const renderer = new marked.Renderer();
  const originalCode = renderer.code.bind(renderer);

  renderer.code = function (code, infoString, escaped) {
    const lang = (infoString || "").trim().split(/\s+/)[0].toLowerCase();
    if (lang === "mermaid") {
      // placeholder; replaced after rendering
      const id = "mmd-" + Math.random().toString(36).slice(2, 9);
      const safe = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<div class="mermaid-block" data-mermaid-id="${id}" data-mermaid-src="${encodeURIComponent(
        code
      )}"><pre style="display:none">${safe}</pre></div>`;
    }
    return originalCode(code, infoString, escaped);
  };

  // Task list rendering
  renderer.listitem = function (text, task, checked) {
    if (task) {
      return `<li class="task-list-item"><input type="checkbox" disabled${
        checked ? " checked" : ""
      }> ${text}</li>`;
    }
    return `<li>${text}</li>`;
  };
  renderer.list = function (body, ordered, start) {
    const tag = ordered ? "ol" : "ul";
    const isTask = body.includes('class="task-list-item"');
    const cls = isTask ? ' class="task-list"' : "";
    const startAttr = ordered && start && start !== 1 ? ` start="${start}"` : "";
    return `<${tag}${cls}${startAttr}>\n${body}</${tag}>\n`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: false,
    headerIds: true,
    mangle: false,
    highlight: function (code, lang) {
      if (window.hljs && lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (_) {}
      }
      if (window.hljs) {
        try {
          return hljs.highlightAuto(code).value;
        } catch (_) {}
      }
      return code;
    },
  });

  /* ---------- Mermaid setup ---------- */
  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: getTheme() === "dark" ? "dark" : "default",
      fontFamily: 'inherit',
    });
  }

  /* ---------- Helpers ---------- */
  function getTheme() {
    return document.documentElement.dataset.theme || "light";
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.checked = theme === "dark";
    if (theme === "dark") {
      hljsLight.disabled = true;
      hljsDark.disabled = false;
    } else {
      hljsLight.disabled = false;
      hljsDark.disabled = true;
    }
    if (window.mermaid) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: theme === "dark" ? "dark" : "default",
        fontFamily: 'inherit',
      });
    }
    localStorage.setItem(THEME_KEY, theme);
    render();
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Pull off YAML-ish frontmatter and return { fm: object|null, body: string }
  function extractFrontmatter(src) {
    const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { fm: null, body: src };
    const yaml = m[1];
    const fm = {};
    yaml.split(/\r?\n/).forEach((line) => {
      if (!line.trim() || line.trim().startsWith("#")) return;
      const idx = line.indexOf(":");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      fm[key] = value;
    });
    return { fm, body: src.slice(m[0].length) };
  }

  function renderFrontmatter(fm) {
    if (!fm || Object.keys(fm).length === 0) return "";
    const rows = Object.entries(fm)
      .map(
        ([k, v]) =>
          `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`
      )
      .join("");
    return `<aside class="frontmatter-card">
      <div class="fm-head">frontmatter</div>
      <dl>${rows}</dl>
    </aside>`;
  }

  // GitHub-style alerts: > [!NOTE] ...
  function transformAlerts(src) {
    const types = ["NOTE", "TIP", "WARNING", "IMPORTANT", "CAUTION"];
    const lines = src.split(/\r?\n/);
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const m = line.match(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*$/);
      if (m && types.includes(m[1])) {
        const type = m[1].toLowerCase();
        const content = [];
        i++;
        while (i < lines.length && /^>/.test(lines[i])) {
          content.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        const inner = marked.parse(content.join("\n"));
        const titleMap = {
          note: "노트",
          tip: "팁",
          warning: "주의",
          important: "중요",
          caution: "위험",
        };
        out.push(
          `<div class="markdown-alert ${type}"><p class="markdown-alert-title">[!${m[1]}] ${titleMap[type]}</p>${inner}</div>`
        );
      } else {
        out.push(line);
        i++;
      }
    }
    return out.join("\n");
  }

  /* ---------- Core render ---------- */
  let renderTimer = null;
  let mermaidCounter = 0;

  function render() {
    const raw = editor.value;
    charCount.textContent = raw.length.toLocaleString();
    lineCount.textContent = (raw.match(/\n/g) || []).length + 1;

    const { fm, body } = extractFrontmatter(raw);
    const transformed = transformAlerts(body);
    let html = marked.parse(transformed);
    html = renderFrontmatter(fm) + html;

    const safe = DOMPurify.sanitize(html, {
      ADD_TAGS: ["details", "summary"],
      ADD_ATTR: ["target", "open"],
    });
    preview.innerHTML = safe;

    // Render mermaid blocks
    const blocks = preview.querySelectorAll(".mermaid-block[data-mermaid-src]");
    blocks.forEach(async (el) => {
      const code = decodeURIComponent(el.dataset.mermaidSrc);
      const id = "mmd-render-" + ++mermaidCounter;
      try {
        const { svg } = await mermaid.render(id, code);
        el.innerHTML = svg;
      } catch (err) {
        el.innerHTML = `<pre class="mermaid-error">머메이드 문법 오류:\n${escapeHtml(
          err.message || String(err)
        )}</pre>`;
      }
    });

    localStorage.setItem(STORAGE_KEY, raw);
  }

  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 120);
  }

  /* ---------- Editor helpers ---------- */
  function insertAtCursor(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value =
      editor.value.slice(0, start) + text + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + text.length;
    editor.focus();
    scheduleRender();
  }

  function wrapSelection(wrapper) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.slice(start, end) || "텍스트";
    const newText = wrapper + selected + wrapper;
    editor.value =
      editor.value.slice(0, start) + newText + editor.value.slice(end);
    editor.selectionStart = start + wrapper.length;
    editor.selectionEnd = start + wrapper.length + selected.length;
    editor.focus();
    scheduleRender();
  }

  function prefixLine(prefix) {
    const start = editor.selectionStart;
    const value = editor.value;
    // Find start of current line
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    editor.value =
      value.slice(0, lineStart) + prefix + value.slice(lineStart);
    editor.selectionStart = editor.selectionEnd = start + prefix.length;
    editor.focus();
    scheduleRender();
  }

  function insertBlock(kind) {
    const blocks = {
      link: "[링크 텍스트](https://example.com)",
      image: "![대체 텍스트](https://example.com/image.png)",
      table: `\n| 헤더 1 | 헤더 2 | 헤더 3 |\n|--------|--------|--------|\n| 값 1   | 값 2   | 값 3   |\n| 값 4   | 값 5   | 값 6   |\n`,
      code: "\n```javascript\nconsole.log(\"hello\");\n```\n",
      quote: "\n> 인용할 내용을 적습니다.\n",
      mermaid: "\n```mermaid\ngraph LR\n    A[시작] --> B[끝]\n```\n",
    };
    const text = blocks[kind];
    if (text) insertAtCursor(text);
  }

  /* ---------- Toolbar wiring ---------- */
  document.querySelectorAll(".toolbar button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.md) prefixLine(btn.dataset.md);
      else if (btn.dataset.wrap) wrapSelection(btn.dataset.wrap);
      else if (btn.dataset.block) insertBlock(btn.dataset.block);
    });
  });

  /* ---------- Tab key indents ---------- */
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      insertAtCursor("  ");
    }
  });

  editor.addEventListener("input", scheduleRender);

  /* ---------- Top actions ---------- */
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

  document.getElementById("copyMd").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.value);
      toast("마크다운을 복사했습니다");
    } catch {
      toast("복사 실패 — 브라우저 권한을 확인해 주세요");
    }
  });

  document.getElementById("copyHtml").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(preview.innerHTML);
      toast("HTML을 복사했습니다");
    } catch {
      toast("복사 실패");
    }
  });

  document.getElementById("downloadMd").addEventListener("click", () => {
    const blob = new Blob([editor.value], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.md";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    if (!editor.value.trim() || confirm("입력 내용을 모두 비울까요?")) {
      editor.value = "";
      scheduleRender();
      editor.focus();
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
      scheduleRender();
    }
    e.target.value = "";
  });

  themeToggle.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "dark" : "light");
  });

  /* ---------- Init ---------- */
  const savedTheme =
    localStorage.getItem(THEME_KEY) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  applyTheme(savedTheme);

  const savedDoc = localStorage.getItem(STORAGE_KEY);
  editor.value = savedDoc != null ? savedDoc : defaultDoc;
  render();
})();
