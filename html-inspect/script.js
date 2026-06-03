/* ============================================================
   딱 필요한 만큼 — HTML 뜯어보기 실습장
   ------------------------------------------------------------
   책 '바이브 코딩을 위한 HTML' 전용. 세 가지에 집중합니다.
     ① 화면 뜯어보기 : 렌더된 화면 ↔ HTML 소스(트리) 양방향 강조,
                        글자 더블클릭 인라인 수정 (개발자 도구 흉내)
     ② DOM 트리      : 화면이 어떤 나무 구조로 되어 있는지 읽기
     ③ 경로 해석기   : 파일 둘을 고르면 상대·절대경로를 계산
   코드를 '쓰는' 연습은 ../html-css/ 로 분리했습니다.
============================================================ */
(function () {
  "use strict";

  const THEME_KEY = "just:theme";

  /* ---------- Theme ---------- */
  const themeToggle = document.getElementById("themeToggle");
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (themeToggle) themeToggle.checked = theme === "dark";
    localStorage.setItem(THEME_KEY, theme);
  }
  applyTheme(
    localStorage.getItem(THEME_KEY) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
  if (themeToggle) {
    themeToggle.addEventListener("change", () =>
      applyTheme(themeToggle.checked ? "dark" : "light")
    );
  }

  /* ---------- Helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1900);
  }

  /* ---------- Jump chips ---------- */
  document.querySelectorAll(".chip-jump").forEach((chip) => {
    chip.addEventListener("click", () => {
      const target = document.getElementById(chip.dataset.jump);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ============================================================
     ① + ②  화면 뜯어보기 · DOM 트리
  ============================================================ */

  // AI가 만들어줬다고 가정하는 작은 블로그 화면.
  // 시맨틱 태그 + 목록 + 링크 + 버튼 + 인라인 SVG 로 구성해
  // 책 3장(요소)·7장(SVG)에서 본 태그들을 그대로 담았습니다.
  const SAMPLE = `
<header class="site-head">
  <svg class="logo" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle></svg>
  <h1>위니브 블로그</h1>
  <nav class="menu">
    <a href="#">홈</a>
    <a href="#">소개</a>
    <a href="#">글</a>
  </nav>
</header>
<main>
  <article class="post">
    <h2>화면은 전부 HTML이다</h2>
    <p>지금 보는 이 글자도 태그 안에 적힌 글자일 뿐입니다. 더블클릭해서 바꿔 보세요.</p>
    <ul class="tags">
      <li>읽기</li>
      <li>고치기</li>
      <li>공유</li>
    </ul>
    <button class="like">좋아요</button>
  </article>
</main>
<footer class="site-foot">
  <p>© WENIV</p>
</footer>`;

  const stage = document.getElementById("stage");
  const tree = document.getElementById("tree");
  const selBar = document.getElementById("selBar");
  const stageFrame = stage ? stage.closest(".stage-frame") : null;

  // 태그의 친근한 한국어 설명 (책 3장 기준)
  const TAG_INFO = {
    header: "머리말 영역 (로고·제목·메뉴)",
    nav: "메뉴 모음",
    main: "페이지의 핵심 본문",
    footer: "꼬리말 (저작권·연락처)",
    article: "하나의 글 덩어리",
    section: "하나의 구역",
    h1: "가장 큰 제목",
    h2: "중간 제목",
    h3: "작은 제목",
    p: "문단 (본문 글)",
    ul: "순서 없는 목록 (점)",
    ol: "순서 있는 목록 (번호)",
    li: "목록 안 항목 하나",
    a: "링크 (클릭하면 이동)",
    button: "누르는 버튼",
    span: "글자 일부 조각",
    div: "한 덩어리를 묶는 상자",
    img: "이미지",
    svg: "코드로 그린 그림 (7장 SVG)",
    strong: "굵게 강조한 글자",
  };

  const elByUid = {};
  const rowByUid = {};
  let uidSeq = 0;
  let hoverUid = null;
  let selUid = null;

  function isLeafText(el) {
    if (!el || el.children.length > 0) return false; // 자식 요소가 없어야 (svg 제외)
    return el.textContent.trim().length > 0;
  }

  function openTagString(el) {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? ` id="${el.id}"` : "";
    const cls = el.classList.length ? ` class="${[...el.classList].join(" ")}"` : "";
    return `<${tag}${id}${cls}>`;
  }

  /* ---------- 트리 + 무대 만들기 ---------- */
  function build() {
    uidSeq = 0;
    Object.keys(elByUid).forEach((k) => delete elByUid[k]);
    Object.keys(rowByUid).forEach((k) => delete rowByUid[k]);
    selUid = null;
    hoverUid = null;
    stage.innerHTML = SAMPLE;
    tree.innerHTML = "";
    [...stage.children].forEach((child) => walk(child, 0));
    clearSelBar();
  }

  function walk(el, depth) {
    const uid = ++uidSeq;
    el.dataset.uid = uid;
    elByUid[uid] = el;

    const row = document.createElement("div");
    row.className = "tree-row";
    row.dataset.uid = uid;
    row.style.paddingLeft = 10 + depth * 16 + "px";

    const tag = el.tagName.toLowerCase();
    let html = `<span class="t-tag">&lt;${tag}&gt;</span>`;
    if (el.id) html += `<span class="t-id">#${escapeHtml(el.id)}</span>`;
    el.classList.forEach((c) => {
      html += `<span class="t-class">.${escapeHtml(c)}</span>`;
    });
    if (isLeafText(el)) {
      html += `<span class="t-text">${escapeHtml(el.textContent.trim())}</span>`;
    }
    row.innerHTML = html;

    row.addEventListener("mouseenter", () => setHover(uid, "tree"));
    row.addEventListener("mouseleave", () => setHover(null));
    row.addEventListener("click", () => {
      setSelected(uid);
      const target = elByUid[uid];
      if (target && target.scrollIntoView) target.scrollIntoView({ block: "nearest" });
    });

    tree.appendChild(row);
    rowByUid[uid] = row;

    [...el.children].forEach((c) => walk(c, depth + 1));
  }

  /* ---------- 강조 동기화 ---------- */
  function setHover(uid, source) {
    if (hoverUid === uid) return;
    if (hoverUid != null) {
      elByUid[hoverUid] && elByUid[hoverUid].classList.remove("ins-hl");
      rowByUid[hoverUid] && rowByUid[hoverUid].classList.remove("hl");
    }
    hoverUid = uid;
    if (uid != null) {
      elByUid[uid] && elByUid[uid].classList.add("ins-hl");
      rowByUid[uid] && rowByUid[uid].classList.add("hl");
      // 트리에서 호버하면 무대의 요소가 보이도록
      if (source === "tree" && elByUid[uid] && elByUid[uid].scrollIntoView) {
        elByUid[uid].scrollIntoView({ block: "nearest" });
      }
      describe(uid);
    }
  }

  function setSelected(uid) {
    if (selUid != null) {
      elByUid[selUid] && elByUid[selUid].classList.remove("ins-sel");
      rowByUid[selUid] && rowByUid[selUid].classList.remove("sel");
    }
    selUid = uid;
    if (uid != null) {
      elByUid[uid] && elByUid[uid].classList.add("ins-sel");
      rowByUid[uid] && rowByUid[uid].classList.add("sel");
      describe(uid);
    }
  }

  function describe(uid) {
    const el = elByUid[uid];
    if (!el) return;
    const tag = el.tagName.toLowerCase();
    const meaning = TAG_INFO[tag] || "요소";
    const editable = isLeafText(el);
    selBar.innerHTML =
      `<code class="sel-code">${escapeHtml(openTagString(el))}</code>` +
      `<span class="sel-mean"><b>&lt;${tag}&gt;</b> — ${meaning}</span>` +
      (editable
        ? `<span class="sel-edit">✎ 더블클릭하면 이 글자를 고칠 수 있어요</span>`
        : "");
  }

  function clearSelBar() {
    selBar.innerHTML =
      `<span class="sel-empty">화면이나 트리 위에 마우스를 올려 보세요.</span>`;
  }

  /* ---------- 무대 이벤트 (위임) ---------- */
  if (stage) {
    stage.addEventListener("mouseover", (e) => {
      const el = e.target.closest("[data-uid]");
      if (el && stage.contains(el)) setHover(Number(el.dataset.uid), "stage");
    });
    stage.addEventListener("mouseleave", () => setHover(null));
    stage.addEventListener("click", (e) => {
      if (e.target.isContentEditable) return;
      const el = e.target.closest("[data-uid]");
      if (el && stage.contains(el)) setSelected(Number(el.dataset.uid));
    });

    // 더블클릭 → 인라인 편집 (로또 번호 바꾸기와 같은 동작)
    stage.addEventListener("dblclick", (e) => {
      const el = e.target.closest("[data-uid]");
      if (!el || !isLeafText(el)) return;
      el.setAttribute("contenteditable", "true");
      el.classList.add("editing");
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    stage.addEventListener("keydown", (e) => {
      if (e.target.isContentEditable && e.key === "Enter") {
        e.preventDefault();
        e.target.blur();
      }
    });

    stage.addEventListener(
      "blur",
      (e) => {
        const el = e.target;
        if (el.nodeType === 1 && el.getAttribute("contenteditable") === "true") {
          el.removeAttribute("contenteditable");
          el.classList.remove("editing");
          const uid = Number(el.dataset.uid);
          // 트리의 텍스트 미리보기도 갱신
          const row = rowByUid[uid];
          if (row) {
            const t = row.querySelector(".t-text");
            if (t) t.textContent = el.textContent.trim();
          }
          showToast("바뀐 건 내 브라우저뿐 — 새로고침하면 원래대로");
        }
      },
      true
    );
  }

  const resetStageBtn = document.getElementById("resetStageBtn");
  if (resetStageBtn) {
    resetStageBtn.addEventListener("click", () => {
      build();
      showToast("처음 상태로 되돌렸습니다");
    });
  }

  if (stage && tree) build();

  /* ============================================================
     ③  경로 해석기
  ============================================================ */

  // 책 5장과 같은 흔한 프로젝트 구조. 경로는 프로젝트 루트 기준.
  const FS = [
    { name: "index.html", type: "file" },
    { name: "about.html", type: "file" },
    {
      name: "css",
      type: "dir",
      children: [{ name: "style.css", type: "file" }],
    },
    {
      name: "js",
      type: "dir",
      children: [{ name: "app.js", type: "file" }],
    },
    {
      name: "images",
      type: "dir",
      children: [
        { name: "logo.png", type: "file" },
        { name: "hero.jpg", type: "file" },
      ],
    },
    {
      name: "pages",
      type: "dir",
      children: [
        { name: "contact.html", type: "file" },
        {
          name: "products",
          type: "dir",
          children: [{ name: "shoes.html", type: "file" }],
        },
      ],
    },
  ];

  const folderTree = document.getElementById("folderTree");
  const pathResult = document.getElementById("pathResult");
  const slotFromBtn = document.getElementById("slotFrom");
  const slotToBtn = document.getElementById("slotTo");
  const slotFromVal = document.getElementById("slotFromVal");
  const slotToVal = document.getElementById("slotToVal");

  let activeSlot = "from";
  let fromPath = null;
  let toPath = null;

  function renderFolderTree() {
    folderTree.innerHTML = "";
    const root = document.createElement("div");
    root.className = "f-row f-dir f-root";
    root.innerHTML = `<span class="f-ico">📁</span><span class="f-name">my-site</span>`;
    folderTree.appendChild(root);
    renderNodes(FS, 1, "");
  }

  function renderNodes(nodes, depth, prefix) {
    nodes.forEach((node) => {
      if (node.type === "dir") {
        const row = document.createElement("div");
        row.className = "f-row f-dir";
        row.style.paddingLeft = 10 + depth * 18 + "px";
        row.innerHTML = `<span class="f-ico">📁</span><span class="f-name">${escapeHtml(
          node.name
        )}</span>`;
        folderTree.appendChild(row);
        renderNodes(node.children, depth + 1, prefix + node.name + "/");
      } else {
        const path = prefix + node.name;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "f-row f-file";
        btn.dataset.path = path;
        btn.style.paddingLeft = 10 + depth * 18 + "px";
        btn.innerHTML = `<span class="f-ico">${fileIcon(node.name)}</span><span class="f-name">${escapeHtml(
          node.name
        )}</span>`;
        btn.addEventListener("click", () => pickFile(path));
        folderTree.appendChild(btn);
      }
    });
  }

  function fileIcon(name) {
    const ext = name.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return "🖼️";
    if (ext === "css") return "🎨";
    if (ext === "js") return "⚙️";
    if (ext === "html") return "📄";
    return "📄";
  }

  function setActiveSlot(slot) {
    activeSlot = slot;
    slotFromBtn.classList.toggle("active", slot === "from");
    slotToBtn.classList.toggle("active", slot === "to");
  }

  function pickFile(path) {
    if (activeSlot === "from") {
      fromPath = path;
      slotFromVal.textContent = path;
      setActiveSlot("to"); // 다음엔 자연스럽게 대상 고르기
    } else {
      toPath = path;
      slotToVal.textContent = path;
      setActiveSlot("from");
    }
    paintPicks();
    if (fromPath && toPath) renderResult();
  }

  function paintPicks() {
    folderTree.querySelectorAll(".f-file").forEach((b) => {
      b.classList.toggle("pick-from", b.dataset.path === fromPath);
      b.classList.toggle("pick-to", b.dataset.path === toPath);
    });
  }

  slotFromBtn.addEventListener("click", () => setActiveSlot("from"));
  slotToBtn.addEventListener("click", () => setActiveSlot("to"));

  /* ---------- 경로 계산 ---------- */
  function relative(from, to) {
    const fromDir = from.split("/");
    fromDir.pop(); // 파일명 제거 → 기준 파일이 있는 폴더
    const toSeg = to.split("/");
    let i = 0;
    while (i < fromDir.length && i < toSeg.length - 1 && fromDir[i] === toSeg[i]) i++;
    const ups = fromDir.length - i;
    const downs = toSeg.slice(i);
    const segs = [];
    for (let k = 0; k < ups; k++) segs.push("..");
    downs.forEach((d) => segs.push(d));
    return { ups, downs, str: segs.join("/"), fromDir };
  }

  function tagFor(path, ref) {
    const ext = path.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext))
      return `<img src="${ref}" alt="설명" />`;
    if (ext === "css") return `<link rel="stylesheet" href="${ref}" />`;
    if (ext === "js") return `<script src="${ref}"></` + `script>`;
    return `<a href="${ref}">링크</a>`;
  }

  function steps(rel, to) {
    const out = [];
    const fromFolder = rel.fromDir.length ? rel.fromDir.join("/") + "/" : "루트(my-site)";
    out.push(`기준 파일은 <b>${escapeHtml(fromFolder)}</b> 안에 있습니다.`);
    for (let k = 0; k < rel.ups; k++) {
      out.push(`<code>../</code> 한 단계 위 폴더로 나갑니다.`);
    }
    const downs = rel.downs;
    for (let k = 0; k < downs.length - 1; k++) {
      out.push(`<code>${escapeHtml(downs[k])}/</code> 폴더로 들어갑니다.`);
    }
    out.push(`대상 <b>${escapeHtml(downs[downs.length - 1])}</b> 에 도착했습니다.`);
    return out;
  }

  function renderResult() {
    if (fromPath === toPath) {
      pathResult.innerHTML = `<div class="empty-state">기준과 대상이 같은 파일이에요. 서로 다른 파일을 골라 주세요.</div>`;
      return;
    }
    const rel = relative(fromPath, toPath);
    const relStr = rel.str;
    const absStr = "/" + toPath;
    const relTag = tagFor(toPath, relStr);
    const absTag = tagFor(toPath, absStr);
    const dotPrefix = rel.ups === 0 ? "./" + relStr : null;

    const stepList = steps(rel, toPath)
      .map((s) => `<li>${s}</li>`)
      .join("");

    pathResult.innerHTML = `
      <div class="res-line">
        <span class="res-from"><b>${escapeHtml(fromPath)}</b> 안에서</span>
        <span class="res-arrow">→</span>
        <span class="res-to"><b>${escapeHtml(toPath)}</b> 를 가리키려면</span>
      </div>

      <div class="res-block">
        <div class="res-label">상대경로 <span class="res-sub">내 프로젝트 안 파일끼리 — 이걸 주로 씁니다</span></div>
        <code class="res-path big">${escapeHtml(relStr)}</code>
        ${
          dotPrefix
            ? `<div class="res-hint"><code>${escapeHtml(
                dotPrefix
              )}</code> 처럼 앞에 <code>./</code>(현재 폴더)를 붙여도 같습니다.</div>`
            : ""
        }
        <pre class="res-tag">${escapeHtml(relTag)}</pre>
      </div>

      <div class="res-block">
        <div class="res-label">절대경로 (루트 기준) <span class="res-sub">맨 꼭대기부터 — 외부 주소(https://…)도 절대경로</span></div>
        <code class="res-path">${escapeHtml(absStr)}</code>
        <pre class="res-tag">${escapeHtml(absTag)}</pre>
      </div>

      <div class="res-block">
        <div class="res-label">상대경로는 이렇게 길을 찾습니다</div>
        <ol class="res-steps">${stepList}</ol>
      </div>
    `;
  }

  if (folderTree) {
    renderFolderTree();
    setActiveSlot("from");
  }

  /* ============================================================
     ③  라이브 에디터 (이 책 전용 — 가벼운 한 파일 미리보기)
  ============================================================ */
  (function initEditor() {
    const area = document.getElementById("edArea");
    const preview = document.getElementById("edPreview");
    if (!area || !preview) return;

    const KEY = "just-inspect:doc";
    const TKEY = "just-inspect:tab";

    const seed = {
      html:
        '<header>\n  <h1>안녕, 바이브 코더</h1>\n  <nav>\n    <a href="#">홈</a> · <a href="#">소개</a>\n  </nav>\n</header>\n<main>\n  <p>왼쪽 글자를 바꾸면 오른쪽이 바로 바뀝니다.</p>\n  <ul>\n    <li>읽기</li>\n    <li>고치기</li>\n    <li>공유</li>\n  </ul>\n  <button>좋아요</button>\n</main>',
      css:
        "body { font-family: system-ui, sans-serif; padding: 20px; color: #121314; }\nh1 { color: #2e6ff2; margin: 0 0 6px; }\nnav a { color: #2e6ff2; text-decoration: none; }\nbutton {\n  background: #2e6ff2; color: #fff; border: 0;\n  padding: 8px 16px; border-radius: 8px; cursor: pointer;\n}",
      js: "",
    };

    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (p && typeof p === "object")
            return { html: p.html || "", css: p.css || "", js: p.js || "" };
        }
      } catch (e) {}
      return { ...seed };
    }

    let state = load();
    function save() {
      localStorage.setItem(KEY, JSON.stringify(state));
    }

    let tab = localStorage.getItem(TKEY) || "html";
    if (!["html", "css", "js"].includes(tab)) tab = "html";

    function buildDoc() {
      const css = state.css.replace(/<\/style>/gi, "<\\/style>");
      const js = state.js.replace(/<\/script>/gi, "<\\/script>");
      return (
        '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8" />' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
        "<style>" +
        css +
        "</style></head><body>" +
        state.html +
        "<script>try{" +
        js +
        '}catch(e){document.body.insertAdjacentHTML("beforeend",' +
        "\"<pre style='color:#ff3440;background:#fff5f5;padding:10px;border-radius:8px;font:13px monospace'>JS 오류: \"+" +
        'String(e.message||e).replace(/[<>&]/g,function(c){return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c]})+"</pre>");}<\\/script>' +
        "</body></html>"
      );
    }

    let timer = null;
    function render() {
      preview.srcdoc = buildDoc();
    }
    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(render, 250);
    }

    function switchTab(name) {
      tab = name;
      localStorage.setItem(TKEY, name);
      document
        .querySelectorAll(".ed-tab")
        .forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
      area.value = state[name];
      area.placeholder =
        name === "html"
          ? "HTML 마크업을 여기에 적으세요."
          : name === "css"
          ? "CSS 규칙을 여기에 적으세요."
          : "필요할 때만 JS 를 적으세요 (sandbox 안에서만 실행).";
    }

    document.querySelectorAll(".ed-tab").forEach((t) => {
      t.addEventListener("click", () => switchTab(t.dataset.tab));
    });

    area.addEventListener("input", () => {
      state[tab] = area.value;
      save();
      schedule();
    });

    area.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = area.selectionStart;
        const en = area.selectionEnd;
        area.value = area.value.slice(0, s) + "  " + area.value.slice(en);
        area.selectionStart = area.selectionEnd = s + 2;
        state[tab] = area.value;
        save();
        schedule();
      }
    });

    const reset = document.getElementById("edReset");
    if (reset) {
      reset.addEventListener("click", () => {
        if (!confirm("HTML / CSS / JS 를 모두 비울까요?")) return;
        state = { html: "", css: "", js: "" };
        save();
        switchTab(tab);
        render();
      });
    }

    switchTab(tab);
    render();
  })();
})();
