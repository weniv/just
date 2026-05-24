/* ============================================================
   딱 필요한 만큼 — 취약점 시연 실습장
   ------------------------------------------------------------
   모든 공격은 이 페이지 안에서만 흉내냅니다.
   실제 네트워크 요청은 일어나지 않습니다.
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
  applyTheme(
    localStorage.getItem(THEME_KEY) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
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
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function $(id) { return document.getElementById(id); }

  /* ---------- Anchor jump chips ---------- */
  document.querySelectorAll(".chip-jump").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.jump);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ============================================================
     1) SQL Injection demo — 로그인 창
  ============================================================ */
  const SQL_USERS = [
    { id: "admin",  pw: "1234",      name: "사장님",  role: "관리자" },
    { id: "minsu",  pw: "minsu0303", name: "민수",   role: "직원" },
    { id: "jisoo",  pw: "qwer1234",  name: "지수",   role: "직원" },
  ];

  const sqliId = $("sqliId");
  const sqliPw = $("sqliPw");
  const sqliQueryBad = $("sqliQueryBad");
  const sqliQueryOk = $("sqliQueryOk");
  const sqliResultBad = $("sqliResultBad");
  const sqliResultOk = $("sqliResultOk");

  function renderSqli() {
    const id = sqliId.value;
    const pw = sqliPw.value;

    // Bad: literal string concat into SQL.
    sqliQueryBad.textContent =
      `SELECT * FROM users WHERE id = '${id}' AND pw = '${pw}'`;

    // Ok: parameter binding.
    sqliQueryOk.textContent =
      `SELECT * FROM users WHERE id = ? AND pw = ?\n-- 값: [${JSON.stringify(id)}, ${JSON.stringify(pw)}]`;

    // --- Bad result simulation ---
    let badHtml = "";

    if (/;\s*DROP\s+TABLE/i.test(id) || /;\s*DROP\s+TABLE/i.test(pw)) {
      badHtml = `<div class="destroy-line">⚠ DROP TABLE users 실행됨. 회원 테이블이 통째로 삭제됐습니다.</div>
        <div class="ok-empty" style="margin-top:8px">다음 사용자부터는 아무도 로그인할 수 없습니다.</div>`;
    } else if (/'\s*--/.test(id) || /'\s*OR\s+/i.test(id) || /'\s*OR\s+/i.test(pw)) {
      // 주석으로 PW 검사 잘림 또는 OR 우회 → 첫 번째 회원으로 로그인 성공
      // (admin'-- 인 경우 admin 으로 로그인, ' OR '1'='1 인 경우 첫 번째 회원)
      let bypassed;
      const idHead = id.replace(/'.*$/, "");
      const matchHead = SQL_USERS.find((u) => u.id === idHead);
      bypassed = matchHead || SQL_USERS[0];
      badHtml = `<div class="bypass-line">로그인 성공. <strong>비밀번호 검사가 통째로 무시됐습니다.</strong></div>
        <div class="login-card">
          <div class="login-card-row"><span class="login-card-key">환영합니다</span><span class="login-card-val">${escapeHtml(bypassed.name)} (${escapeHtml(bypassed.role)})</span></div>
          <div class="login-card-row"><span class="login-card-key">로그인 ID</span><span class="login-card-val">${escapeHtml(bypassed.id)}</span></div>
        </div>`;
    } else if (id.includes("'") && !id.includes("--")) {
      badHtml = `<div class="err-line">sqlite3.OperationalError:\n  unrecognized token near "${escapeHtml(id)}"\n  at app/auth/login.py line 23</div>
        <div class="ok-empty" style="margin-top:8px">에러 메시지가 그대로 노출됩니다 — 공격자는 여기서 DB 종류와 코드 경로까지 알아냅니다.</div>`;
    } else {
      const match = SQL_USERS.find((u) => u.id === id && u.pw === pw);
      if (match) {
        badHtml = `<div class="bypass-line ok-tone">로그인 성공 (정상적인 ID·비밀번호 일치).</div>
          <div class="login-card">
            <div class="login-card-row"><span class="login-card-key">환영합니다</span><span class="login-card-val">${escapeHtml(match.name)} (${escapeHtml(match.role)})</span></div>
            <div class="login-card-row"><span class="login-card-key">로그인 ID</span><span class="login-card-val">${escapeHtml(match.id)}</span></div>
          </div>`;
      } else {
        badHtml = `<div class="ok-empty">로그인 실패: ID 또는 비밀번호가 일치하지 않습니다.</div>`;
      }
    }
    sqliResultBad.innerHTML = badHtml;

    // --- Ok result simulation (input is data only) ---
    const matchOk = SQL_USERS.find((u) => u.id === id && u.pw === pw);
    if (matchOk) {
      sqliResultOk.innerHTML = `<div class="bypass-line ok-tone">로그인 성공 (정상적인 ID·비밀번호 일치).</div>
        <div class="login-card">
          <div class="login-card-row"><span class="login-card-key">환영합니다</span><span class="login-card-val">${escapeHtml(matchOk.name)} (${escapeHtml(matchOk.role)})</span></div>
          <div class="login-card-row"><span class="login-card-key">로그인 ID</span><span class="login-card-val">${escapeHtml(matchOk.id)}</span></div>
        </div>`;
    } else {
      sqliResultOk.innerHTML =
        `<div class="ok-empty">로그인 실패: ID 또는 비밀번호가 일치하지 않습니다.<br />
        (입력에 따옴표나 SQL 키워드가 있어도 글자 그대로 처리되어 비교됩니다.)</div>`;
    }
  }

  sqliId.addEventListener("input", renderSqli);
  sqliPw.addEventListener("input", renderSqli);
  document.querySelectorAll("#sqliPresets button").forEach((btn) => {
    btn.addEventListener("click", () => {
      sqliId.value = btn.dataset.id;
      sqliPw.value = btn.dataset.pw;
      renderSqli();
    });
  });
  renderSqli();

  /* ============================================================
     2) XSS demo — 게시판 댓글창
  ============================================================ */
  const xssInput = $("xssInput");
  const xssFrameBad = $("xssFrameBad");
  const xssFrameOk = $("xssFrameOk");
  const xssLeak = document.getElementById("xss-leak");

  // 기존 댓글 (양쪽 사이트에 모두 보이는 정상 댓글)
  const XSS_BASE_COMMENTS = [
    { user: "minsu",  text: "저도 김치찌개 좋아해요" },
    { user: "jisoo",  text: "그 집 깍두기가 진짜 맛있더라구요" },
  ];

  function buildCommentList(newComment, mode) {
    // base 댓글은 안전한 평문, 새 댓글은 mode 에 따라 처리
    let html = "";
    XSS_BASE_COMMENTS.forEach((c) => {
      html += `<div class="comment-item"><span class="comment-user">${c.user}</span><span class="comment-text">${c.text}</span></div>`;
    });
    if (mode === "bad") {
      // 취약: innerHTML 로 그대로 박음 → 스크립트도 실행
      html += `<div class="comment-item new"><span class="comment-user">you</span><span class="comment-text">${newComment}</span></div>`;
    } else {
      // 안전: 엔티티로 변환해 글자로만 박음
      const safe = newComment
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      html += `<div class="comment-item new"><span class="comment-user">you</span><span class="comment-text">${safe}</span></div>`;
    }
    return html;
  }

  function frameDoc(rawComment, mode) {
    const head = `
<style>
  html, body { overflow: hidden; }
  body { font: 13px Pretendard, -apple-system, sans-serif; padding: 12px 14px; margin: 0; color: #121314; background: #fff; }
  .post-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
  .post-body { color: #4a5058; font-size: 12.5px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #d8dde3; }
  .comments-head { font-size: 11px; color: #8d9299; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 6px; }
  .comment-item { display: flex; gap: 10px; padding: 7px 0; border-top: 1px solid #eef1f6; font-size: 12.5px; line-height: 1.55; }
  .comment-item:first-of-type { border-top: 0; }
  .comment-user { color: #2e6ff2; font-weight: 700; min-width: 56px; }
  .comment-text { color: #121314; word-break: break-word; }
  .comment-item.new .comment-user { color: #c93864; }
  @media (prefers-color-scheme: dark) {
    body { color: #f3f5fa; background: #1f2123; }
    .post-body { color: #b8bcc5; border-bottom-color: #3a3d42; }
    .comments-head { color: #8d9299; }
    .comment-item { border-top-color: #2a2c2f; color: #f3f5fa; }
    .comment-text { color: #f3f5fa; }
  }
</style>`;

    const postBlock = `
      <div class="post-title">오늘 점심 추천</div>
      <div class="post-body">회사 앞 김치찌개 집이 새로 생겼어요. 다 같이 가실래요?</div>
      <div class="comments-head">댓글 3</div>`;

    if (mode === "bad") {
      // alert / fetch / cookie 가로채서 부모로 보냄
      return `<!doctype html><html><head>${head}<script>
        (function(){
          window.alert = function(msg){
            parent.postMessage({ type:'xss-alert', msg: String(msg) }, '*');
          };
          try { Object.defineProperty(document, 'cookie', {
            get(){ return 'sessionId=abc123; user=victim'; },
            configurable: true
          }); } catch(e){}
          window.fetch = function(url){
            parent.postMessage({ type:'xss-fetch', url: String(url) }, '*');
            return new Promise(function(){});
          };
        })();
      <\/script></head><body>
        ${postBlock}
        ${buildCommentList(rawComment, "bad")}
      </body></html>`;
    } else {
      return `<!doctype html><html><head>${head}</head><body>
        ${postBlock}
        ${buildCommentList(rawComment, "ok")}
      </body></html>`;
    }
  }

  function renderXss() {
    const raw = xssInput.value;
    xssLeak.textContent = "";
    xssFrameBad.srcdoc = frameDoc(raw, "bad");
    xssFrameOk.srcdoc = frameDoc(raw, "ok");
  }

  window.addEventListener("message", (ev) => {
    const d = ev.data;
    if (!d || typeof d !== "object") return;
    if (d.type === "xss-alert") {
      xssLeak.textContent = `alert() 호출됨 → "${d.msg}"  (sandbox 로 막혀 실제 팝업은 안 뜸)`;
    } else if (d.type === "xss-fetch") {
      xssLeak.textContent = `fetch("${d.url}") 호출됨 → 공격자 서버로 쿠키 전송 시도`;
    }
  });

  xssInput.addEventListener("input", renderXss);
  document.querySelectorAll("#xssPresets button").forEach((btn) => {
    btn.addEventListener("click", () => {
      xssInput.value = btn.dataset.payload;
      renderXss();
    });
  });
  renderXss();

  /* ============================================================
     3) CSRF demo — 단계마다 설명 박스
  ============================================================ */
  const csrfState = {
    loggedIn: false,
    badPw: "MyPassword!2026",
    okPw: "MyPassword!2026",
    attackerOpened: false,
  };
  const csrfShopBadBody = $("csrfShopBadBody");
  const csrfShopOkBody = $("csrfShopOkBody");
  const csrfReset = $("csrfReset");
  const csrfPrev = $("csrfPrev");
  const csrfNext = $("csrfNext");
  const csrfStepCount = $("csrfStepCount");
  const csrfStepTitle = $("csrfStepTitle");
  const csrfAttackerWrap = $("csrfAttackerWrap");
  const csrfAttackerLog = $("csrfAttackerLog");
  const csrfExplain1 = $("csrfExplain1");
  const csrfExplain2 = $("csrfExplain2");
  const csrfExplain3 = $("csrfExplain3");

  const CSRF_STEPS = [
    { count: "0 / 3", title: "다음을 눌러 시작하세요",   next: "쇼핑몰에 로그인" },
    { count: "1 / 3", title: "쇼핑몰에 로그인됨",         next: "친구가 보낸 링크 클릭" },
    { count: "2 / 3", title: "친구가 보낸 링크 클릭됨",   next: "쇼핑몰에 다시 가보기" },
    { count: "3 / 3", title: "결과 확인",                 next: null },
  ];
  let csrfStep = 0;

  function renderShop() {
    if (!csrfState.loggedIn) {
      csrfShopBadBody.innerHTML = `로그인 전 상태입니다.`;
      csrfShopOkBody.innerHTML = `로그인 전 상태입니다.`;
      return;
    }
    const badChanged = csrfState.badPw !== "MyPassword!2026";
    const okChanged = csrfState.okPw !== "MyPassword!2026";
    const okBlocked = csrfState.attackerOpened;

    csrfShopBadBody.innerHTML = `
      <div>회원: <strong>victim@example.com</strong> (로그인됨)</div>
      <div class="pw-line ${badChanged ? "pw-changed" : ""}">현재 비밀번호: ${escapeHtml(csrfState.badPw)}${
      badChanged ? "  ← 공격자가 바꿔놓음" : ""
    }</div>
    `;
    csrfShopOkBody.innerHTML = `
      <div>회원: <strong>victim@example.com</strong> (로그인됨)</div>
      <div class="pw-line ${okChanged ? "pw-changed" : "pw-safe"}">현재 비밀번호: ${escapeHtml(csrfState.okPw)}</div>
      ${okBlocked ? `<div class="blocked">CSRF 토큰 검증 실패 → 비밀번호 변경 요청이 차단됨</div>` : ""}
    `;
  }

  function appendLog(msg, cls) {
    const span = document.createElement("div");
    span.textContent = msg;
    if (cls) span.className = cls;
    csrfAttackerLog.appendChild(span);
  }

  function renderCsrf() {
    const info = CSRF_STEPS[csrfStep];
    csrfStepCount.textContent = info.count;
    csrfStepTitle.textContent = info.title;

    // step 으로부터 상태 도출 (이전/다음 자유롭게 왕복해도 일관성 유지)
    csrfState.loggedIn = csrfStep >= 1;
    csrfState.attackerOpened = csrfStep >= 2;
    csrfState.badPw = csrfStep >= 2 ? "hacked123" : "MyPassword!2026";
    csrfState.okPw = "MyPassword!2026";

    renderShop();

    csrfAttackerWrap.hidden = csrfStep < 2;
    csrfAttackerLog.innerHTML = "";
    if (csrfStep >= 2) {
      appendLog("페이지 로드", "log-info");
      appendLog("→ GET https://shop.example.com/change-password?pw=hacked123", "log-bad");
      appendLog("   (브라우저가 shop.example.com 쿠키를 자동으로 같이 전송)", "log-info");
      appendLog("→ GET https://safe-shop.example.com/change-password?pw=hacked123", "log-bad");
      appendLog("   (SameSite=Lax → 쿠키 미전송, 서버에서 토큰 검증 실패 → 403)", "log-ok");
    }

    // 현재 단계의 explain 박스 하나만 보이게
    csrfExplain1.hidden = csrfStep !== 1;
    csrfExplain2.hidden = csrfStep !== 2;
    csrfExplain3.hidden = csrfStep !== 3;

    csrfPrev.disabled = csrfStep === 0;
    csrfNext.disabled = !info.next;
    csrfNext.textContent = info.next ? `다음: ${info.next} →` : "끝까지 봤습니다";
  }

  csrfPrev.addEventListener("click", () => {
    if (csrfStep > 0) {
      csrfStep--;
      renderCsrf();
    }
  });
  csrfNext.addEventListener("click", () => {
    if (csrfStep < CSRF_STEPS.length - 1) {
      csrfStep++;
      renderCsrf();
    }
  });
  csrfReset.addEventListener("click", () => {
    csrfStep = 0;
    renderCsrf();
  });

  renderCsrf();

  /* ============================================================
     4) IDOR demo (mock posts)
  ============================================================ */
  const POSTS = {
    1: { title: "회사 비전 공유", author: "admin (사장)",   ownerId: 1, content: "올해 우리 회사의 방향성은…" },
    2: { title: "분기 매출 보고", author: "sales (영업팀)", ownerId: 2, content: "Q1 매출은 작년 대비 18% 상승…" },
    3: { title: "오늘 점심 추천", author: "me (나)",         ownerId: 3, content: "회사 앞 김치찌개 집이 새로 생겼어요." },
  };
  const ME_USER_ID = 3;

  const idorId = $("idorId");
  const idorGo = $("idorGo");
  const idorUrlBad = $("idorUrlBad");
  const idorUrlOk = $("idorUrlOk");
  const idorBodyBad = $("idorBodyBad");
  const idorBodyOk = $("idorBodyOk");

  function renderIdor() {
    const id = String(idorId.value || "").trim();
    const post = POSTS[id];

    idorUrlBad.textContent = `https://board.example.com/posts/${id}/edit`;
    idorUrlOk.textContent = `https://safe-board.example.com/posts/${id}/edit`;

    if (!post) {
      const empty = `<div class="ok-empty" style="padding:8px 0">글 ${escapeHtml(id)} 번 없음</div>`;
      idorBodyBad.innerHTML = empty;
      idorBodyOk.innerHTML = empty;
      return;
    }

    const cardHtml = `
      <div class="post-card">
        <div class="post-title">${escapeHtml(post.title)}</div>
        <div class="post-meta">작성자: ${escapeHtml(post.author)}</div>
      </div>
      <div style="font-size:12.5px;color:var(--text-soft);margin-top:4px">본문: ${escapeHtml(post.content)}</div>
    `;

    const isMine = post.ownerId === ME_USER_ID;
    idorBodyBad.innerHTML = `
      ${cardHtml}
      <div class="post-edit-area ${isMine ? "" : "warn"}">
        ${
          isMine
            ? "내 글입니다. 수정 폼이 정상적으로 열립니다."
            : "내 글이 아닌데도 수정 폼이 그대로 열립니다 → 저장하면 그대로 덮어쓰기 가능"
        }
      </div>
    `;

    idorBodyOk.innerHTML = `
      ${cardHtml}
      <div class="post-edit-area ${isMine ? "" : "warn"}">
        ${
          isMine
            ? "내 글입니다. 수정 폼이 열립니다."
            : "HTTP 403 권한 없음 — 본인 글이 아니라서 서버가 거부했습니다."
        }
      </div>
    `;
  }

  idorId.addEventListener("input", renderIdor);
  idorGo.addEventListener("click", renderIdor);
  renderIdor();

  /* ============================================================
     5) Audit prompt
  ============================================================ */
  const AUDIT_PROMPT = `아래 5가지 항목으로 이 프로젝트의 웹 보안 취약점을 점검해줘.
각 항목마다 (1) 발견된 위치(파일·줄 번호) (2) 왜 위험한지 한 줄 (3) 수정 코드 제안 을 묶어서 보고해줘.
하나도 발견되지 않으면 "해당 없음" 으로 명확히 표시해줘.

1) SQL 인젝션
   - DB 를 다루는 모든 자리(쿼리 실행, ORM 의 raw 쿼리 포함)에서 사용자 입력이
     문자열 결합/템플릿 리터럴로 SQL 안에 글자로 끼어들어가는 자리를 찾아줘.
   - 로그인 폼처럼 ID·비밀번호를 동시에 다루는 자리는 우선순위 ↑.
   - 발견 시 파라미터 바인딩(?, :name, Prepared Statement)으로 바꾸는 코드를 제안.

2) XSS (저장형/반사형 모두)
   - 사용자 입력 또는 외부 API 응답을 HTML 로 박는 자리:
     React 의 dangerouslySetInnerHTML, Vue 의 v-html, Svelte 의 {@html},
     바닐라 JS 의 .innerHTML / document.write 모두 포함.
   - 각 자리마다 데이터 출처(상수 / DB / 사용자 입력 / 외부 응답)를 같이 보고.
   - 사용자 입력이 들어가는 자리는 DOMPurify 또는 textContent 사용으로 바꾸는 제안.

3) CSRF
   - 상태를 변경하는 모든 엔드포인트(POST / PUT / PATCH / DELETE,
     그리고 데이터를 바꾸는 GET 요청)에 대해 다음을 점검:
     · HTTP 메서드 (GET 으로 상태 변경하면 위험)
     · 쿠키의 SameSite 속성
     · CSRF 토큰 검증 여부
     · Origin / Referer 헤더 검사 여부
   - 비밀번호 변경, 결제, 주소 변경 같은 영향이 큰 엔드포인트는 우선순위 ↑.

4) IDOR (남의 데이터를 자기 것처럼 조작)
   - 사용자별로 다른 데이터를 다루는 API 를 모두 찾아줘.
     예: 글 수정/삭제, 주문 조회, 결제 내역, 개인 메시지, 프로필 편집.
   - 각 API 에서 "로그인 검사" 만 하고 끝나는지,
     "이 사용자가 이 데이터의 주인인지" 까지 검사하는지 확인.
   - 빠진 곳은 ownerId 비교 + 403 반환 코드 제안.

5) 의존성
   - package.json / requirements.txt / pyproject.toml 등에 등록된 패키지 중
     알려진 취약점이 있는 옛 버전이 있는지 점검.
   - npm audit / pip-audit 명령어 실행 결과를 기준으로 보고.
   - 사용 중인데 1년 이상 업데이트가 없는 패키지도 함께 표시.

마지막에 우선순위 표 한 줄로 정리: [Critical / High / Medium / Low] 별로 몇 개씩 나왔는지.`;

  const promptBox = $("auditPrompt");
  const copyBtn = $("copyPromptBtn");
  const copyMsg = $("copyPromptMsg");
  promptBox.textContent = AUDIT_PROMPT;

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(AUDIT_PROMPT);
      copyMsg.textContent = "복사됨. AI 에게 그대로 붙여넣으세요.";
      copyMsg.classList.add("show");
      setTimeout(() => copyMsg.classList.remove("show"), 2200);
    } catch {
      copyMsg.textContent = "복사 실패 — 박스에서 직접 선택해 주세요.";
      copyMsg.classList.add("show");
      setTimeout(() => copyMsg.classList.remove("show"), 2200);
    }
  });
})();
