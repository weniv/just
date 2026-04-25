/* ============================================================
   딱 필요한 만큼 — HTTP 실습장
   ------------------------------------------------------------
   - 메서드 + URL + 헤더 + 바디 빌더
   - 위니브 eduAPI 인증/블로그 프리셋
   - 응답: 상태·시간·크기 + JSON 트리 + 헤더 + 원문
   - 토큰 자동 캡처(LocalStorage) → "토큰 사용" 으로 헤더 주입
============================================================ */
(function () {
  const themeToggle = document.getElementById("themeToggle");
  const presetSelect = document.getElementById("presetSelect");
  const methodEl = document.getElementById("method");
  const urlEl = document.getElementById("url");
  const sendBtn = document.getElementById("sendBtn");
  const headersList = document.getElementById("headersList");
  const headerCount = document.getElementById("headerCount");
  const addHeaderBtn = document.getElementById("addHeaderBtn");
  const bodyEl = document.getElementById("body");
  const formatBodyBtn = document.getElementById("formatBodyBtn");
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");
  const responseBody = document.getElementById("responseBody");
  const responseHeaders = document.getElementById("responseHeaders");
  const responseRaw = document.getElementById("responseRaw");
  const useTokenBtn = document.getElementById("useTokenBtn");
  const clearTokenBtn = document.getElementById("clearTokenBtn");
  const authStatus = document.getElementById("authStatus");
  const authText = document.getElementById("authText");
  const infoCard = document.getElementById("infoCard");

  const STATE_KEY = "just-http:state";
  const TOKEN_KEY = "just-http:token";
  const THEME_KEY = "just:theme";

  const BASE = "https://dev.wenivops.co.kr/services/fastapi-crud";

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

  /* ---------- Presets (위니브 eduAPI 기준) ---------- */
  const presets = {
    signup: {
      method: "POST",
      url: `${BASE}/1/signup`,
      headers: [["Content-Type", "application/json"]],
      body: JSON.stringify({ username: "test_user", password: "test1234" }, null, 2),
      desc: `<p><strong>회원가입</strong> · 새 사용자를 등록합니다.</p>
        <p>요청 후 <code>{ "message": "User created successfully" }</code> 가 오면 성공.
        같은 username 으로 다시 보내면 <code>"User already exists"</code> 가 옵니다.</p>`,
    },
    login: {
      method: "POST",
      url: `${BASE}/1/login`,
      headers: [["Content-Type", "application/json"]],
      body: JSON.stringify({ username: "test_user", password: "test1234" }, null, 2),
      desc: `<p><strong>로그인</strong> · 응답에 <code>access_token</code> 이 포함되면 자동 저장됩니다. 이후 다른 요청에서 <strong>토큰 사용</strong> 버튼으로 <code>Authorization: Bearer ...</code> 헤더를 한 번에 채울 수 있습니다.</p>`,
    },
    loginConfirm: {
      method: "POST",
      url: `${BASE}/login_confirm`,
      headers: [["Authorization", "Bearer "]],
      body: "",
      desc: `<p><strong>토큰 확인</strong> · <code>Authorization</code> 헤더의 토큰이 유효한지 확인합니다. 위쪽 <strong>토큰 사용</strong> 버튼을 누르면 저장된 토큰이 채워집니다.</p>`,
    },
    loginUserInfo: {
      method: "GET",
      url: `${BASE}/1/login_user_info`,
      headers: [],
      body: "",
      desc: `<p><strong>사용자 목록</strong> · 가입된 모든 사용자의 username/password 가 배열로 옵니다. 학습용 API 라서 평문이 그대로 나오니 실서비스에서는 절대 이렇게 만들면 안 됩니다.</p>`,
    },
    blogList: {
      method: "GET",
      url: `${BASE}/1/blog`,
      headers: [],
      body: "",
      desc: `<p><strong>글 목록</strong> · 블로그 글 배열이 반환됩니다. 각 항목에는 <code>_id, title, content, author, date, ...</code> 등이 들어 있습니다.</p>`,
    },
    blogGet: {
      method: "GET",
      url: `${BASE}/1/blog/1`,
      headers: [],
      body: "",
      desc: `<p><strong>글 상세</strong> · URL 끝의 숫자가 글 id 입니다. 존재하지 않으면 <code>{ "detail": "Blog data not found" }</code> 가 옵니다.</p>`,
    },
    blogCreate: {
      method: "POST",
      url: `${BASE}/1/blog`,
      headers: [["Content-Type", "application/json"]],
      body: JSON.stringify({ title: "예시 글", content: "본문" }, null, 2),
      desc: `<p><strong>글 작성</strong> · 필수값은 <code>title</code> 과 <code>content</code>. 누락되면 응답에 <code>detail</code> 배열로 어떤 필드가 빠졌는지 알려 줍니다.</p>`,
    },
    blogUpdate: {
      method: "PUT",
      url: `${BASE}/1/blog/1`,
      headers: [["Content-Type", "application/json"]],
      body: JSON.stringify({ title: "수정된 제목", content: "수정된 본문" }, null, 2),
      desc: `<p><strong>글 수정</strong> · URL 의 id 에 해당하는 글을 통째로 교체합니다. 부분 수정이 필요하면 <code>PATCH</code> 가 의미상 더 맞지만 이 API 는 PUT 만 지원합니다.</p>`,
    },
    blogDelete: {
      method: "DELETE",
      url: `${BASE}/1/blog/1`,
      headers: [],
      body: "",
      desc: `<p><strong>글 삭제</strong> · URL 의 id 에 해당하는 글을 지웁니다. 성공 시 <code>{ "message": "Blog deleted successfully" }</code>.</p>`,
    },
  };

  /* ---------- State ---------- */
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      if (s && typeof s === "object") return s;
    } catch {}
    return {};
  }
  function saveState() {
    const headers = readHeaders();
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        method: methodEl.value,
        url: urlEl.value,
        headers,
        body: bodyEl.value,
      })
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

  /* ---------- Header rows ---------- */
  function renderHeaders(rows) {
    headersList.innerHTML = "";
    (rows || []).forEach(([k, v]) => addHeaderRow(k, v));
    if (!rows || rows.length === 0) addHeaderRow("", "");
    updateHeaderCount();
  }
  function addHeaderRow(k = "", v = "") {
    const row = document.createElement("div");
    row.className = "header-row";
    row.innerHTML = `
      <input class="key" type="text" placeholder="이름 (예: Authorization)" value="${escapeHtml(k)}" spellcheck="false" />
      <input class="value" type="text" placeholder="값" value="${escapeHtml(v)}" spellcheck="false" />
      <button class="remove" type="button" title="삭제">✕</button>
    `;
    row.querySelector(".remove").addEventListener("click", () => {
      row.remove();
      updateHeaderCount();
      saveState();
    });
    row.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("input", () => { updateHeaderCount(); saveState(); });
    });
    headersList.appendChild(row);
  }
  function readHeaders() {
    return [...headersList.querySelectorAll(".header-row")]
      .map((r) => [r.querySelector(".key").value, r.querySelector(".value").value])
      .filter(([k]) => k.trim());
  }
  function updateHeaderCount() {
    headerCount.textContent = String(readHeaders().length);
  }
  addHeaderBtn.addEventListener("click", () => { addHeaderRow(); saveState(); });

  /* ---------- Token ---------- */
  function loadToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }
  function saveToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    refreshAuthStatus();
  }
  function refreshAuthStatus() {
    const token = loadToken();
    if (token) {
      authStatus.classList.add("has-token");
      authText.textContent = `토큰 저장됨 · ${token.slice(0, 12)}…${token.slice(-6)}`;
    } else {
      authStatus.classList.remove("has-token");
      authText.textContent = "저장된 토큰 없음";
    }
  }

  useTokenBtn.addEventListener("click", () => {
    const token = loadToken();
    if (!token) {
      toast("저장된 토큰이 없습니다 — 먼저 로그인을 보내 보세요");
      return;
    }
    // Find or add Authorization header.
    const rows = [...headersList.querySelectorAll(".header-row")];
    let target = rows.find(
      (r) => r.querySelector(".key").value.trim().toLowerCase() === "authorization"
    );
    if (!target) {
      addHeaderRow("Authorization", `Bearer ${token}`);
    } else {
      target.querySelector(".value").value = `Bearer ${token}`;
    }
    updateHeaderCount();
    saveState();
    toast("Authorization 헤더에 토큰을 채웠습니다");
  });

  clearTokenBtn.addEventListener("click", () => {
    saveToken("");
    toast("토큰을 지웠습니다");
  });

  /* ---------- Tabs ---------- */
  document.querySelectorAll(".tabs .tab").forEach((t) => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".tabs .tab").forEach((x) => x.classList.toggle("active", x === t));
      document.querySelectorAll(".tab-panel").forEach((p) => {
        p.classList.toggle("active", p.dataset.panel === t.dataset.tab);
      });
    });
  });

  document.querySelectorAll(".resp-tab").forEach((t) => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".resp-tab").forEach((x) => x.classList.toggle("active", x === t));
      document.querySelectorAll(".resp-panel").forEach((p) => {
        p.classList.toggle("active", p.dataset.respPanel === t.dataset.resp);
      });
    });
  });

  /* ---------- Format body (JSON) ---------- */
  formatBodyBtn.addEventListener("click", () => {
    if (!bodyEl.value.trim()) return;
    try {
      const parsed = JSON.parse(bodyEl.value);
      bodyEl.value = JSON.stringify(parsed, null, 2);
      saveState();
      toast("JSON 정렬");
    } catch {
      toast("JSON 문법 오류 — 정렬할 수 없습니다");
    }
  });

  /* ---------- Send request ---------- */
  sendBtn.addEventListener("click", async () => {
    const method = methodEl.value;
    const url = urlEl.value.trim();
    if (!url) { toast("URL 을 입력해 주세요"); return; }

    const headers = {};
    readHeaders().forEach(([k, v]) => { headers[k.trim()] = v; });

    const init = { method, headers };
    const hasBody = !["GET", "HEAD"].includes(method);
    if (hasBody && bodyEl.value.trim()) {
      init.body = bodyEl.value;
    }

    statusEl.className = "status";
    statusEl.textContent = "보내는 중…";
    metaEl.textContent = "";
    sendBtn.disabled = true;

    const start = performance.now();
    try {
      const resp = await fetch(url, init);
      const elapsed = Math.round(performance.now() - start);
      const text = await resp.text();

      // Capture token if returned (login flow).
      maybeCaptureToken(text);

      renderResponse(resp, text, elapsed);
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      statusEl.textContent = "에러";
      statusEl.className = "status serror";
      metaEl.textContent = `${elapsed}ms`;
      responseBody.innerHTML = `<div class="empty-state" style="color:var(--danger)">네트워크 / CORS 오류: ${escapeHtml(
        err.message || String(err)
      )}</div>`;
      responseHeaders.textContent = "—";
      responseRaw.textContent = String(err.message || err);
    } finally {
      sendBtn.disabled = false;
      saveState();
    }
  });

  function maybeCaptureToken(text) {
    try {
      const data = JSON.parse(text);
      if (data && typeof data.access_token === "string") {
        saveToken(data.access_token);
        toast("access_token 을 저장했습니다");
      }
    } catch {}
  }

  function renderResponse(resp, text, elapsed) {
    const cls = `s${Math.floor(resp.status / 100)}xx`;
    statusEl.textContent = `${resp.status} ${resp.statusText || ""}`.trim();
    statusEl.className = `status ${cls}`;
    const size = new Blob([text]).size;
    metaEl.textContent = `${elapsed}ms · ${size.toLocaleString()} bytes`;

    // Headers
    const lines = [];
    resp.headers.forEach((v, k) => lines.push(`${k}: ${v}`));
    responseHeaders.textContent = lines.length ? lines.join("\n") : "—";

    // Raw
    responseRaw.textContent = text || "—";

    // Body — JSON if possible
    responseBody.innerHTML = "";
    if (!text) {
      responseBody.innerHTML = '<div class="empty-state">응답 본문이 없습니다.</div>';
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const tree = document.createElement("div");
      tree.className = "json-mini";
      tree.appendChild(renderJson(parsed));
      responseBody.appendChild(tree);
      // Click on toggles to collapse/expand.
      tree.addEventListener("click", (e) => {
        const tog = e.target.closest(".toggle");
        if (!tog) return;
        const row = tog.closest(".row");
        if (!row) return;
        const next = row.nextElementSibling;
        if (next && next.classList.contains("children")) {
          row.classList.toggle("collapsed");
        }
      });
    } catch {
      responseBody.textContent = text;
    }
  }

  function typeOf(v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v;
  }

  function renderJson(value, key) {
    const frag = document.createDocumentFragment();
    const row = document.createElement("div");
    row.className = "row";
    const t = typeOf(value);
    const isContainer = t === "object" || t === "array";
    const hasKids =
      isContainer && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0);

    if (isContainer && hasKids) {
      const tog = document.createElement("span");
      tog.className = "toggle";
      tog.textContent = "▾";
      row.appendChild(tog);
    } else {
      const sp = document.createElement("span");
      sp.className = "toggle";
      sp.style.visibility = "hidden";
      sp.textContent = "▾";
      row.appendChild(sp);
    }

    if (key !== undefined) {
      const isIndex = typeof key === "number";
      const lab = document.createElement("span");
      lab.className = isIndex ? "index" : "key";
      lab.textContent = isIndex ? key : `"${key}"`;
      row.appendChild(lab);
    }

    if (isContainer) {
      const open = document.createElement("span");
      open.className = "punct";
      open.textContent = t === "array" ? "[" : "{";
      row.appendChild(open);

      const sum = document.createElement("span");
      sum.className = "summary";
      const count = t === "array" ? value.length : Object.keys(value).length;
      sum.textContent = count === 0
        ? (t === "array" ? "]" : "}")
        : `${count} ${t === "array" ? "items" : "keys"} ${t === "array" ? "]" : "}"}`;
      row.appendChild(sum);
    } else {
      const v = document.createElement("span");
      v.className = `v-${t}`;
      v.textContent = t === "string" ? JSON.stringify(value) : String(value);
      row.appendChild(v);
    }

    frag.appendChild(row);

    if (isContainer && hasKids) {
      const children = document.createElement("div");
      children.className = "children";
      if (t === "array") {
        value.forEach((item, i) => children.appendChild(renderJson(item, i)));
      } else {
        Object.keys(value).forEach((k) => children.appendChild(renderJson(value[k], k)));
      }
      frag.appendChild(children);
    }

    return frag;
  }

  /* ---------- Preset selection ---------- */
  presetSelect.addEventListener("change", (e) => {
    const key = e.target.value;
    if (!key) return;
    const p = presets[key];
    if (!p) return;
    methodEl.value = p.method;
    urlEl.value = p.url;
    bodyEl.value = p.body;
    renderHeaders(p.headers);
    if (infoCard) infoCard.innerHTML = p.desc;
    saveState();
    e.target.value = "";
  });

  /* ---------- Save on edits ---------- */
  [methodEl, urlEl, bodyEl].forEach((el) => {
    el.addEventListener("input", saveState);
    el.addEventListener("change", saveState);
  });

  /* ---------- Init ---------- */
  refreshAuthStatus();
  const saved = loadState();
  methodEl.value = saved.method || "GET";
  urlEl.value = saved.url || `${BASE}/1/blog`;
  bodyEl.value = saved.body || "";
  renderHeaders(saved.headers || []);
})();
