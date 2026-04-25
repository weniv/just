/* ============================================================
   딱 필요한 만큼 — JWT / 인증 실습장
   ------------------------------------------------------------
   - JWT 분해 (헤더 / 페이로드 / 서명)
   - exp / iat / nbf 사람 시간 + 만료 여부
   - Base64 ↔ Base64URL ↔ 평문 양방향
   - URL 인코딩
============================================================ */
(function () {
  const themeToggle = document.getElementById("themeToggle");
  const presetSelect = document.getElementById("presetSelect");
  const jwtInput = document.getElementById("jwtInput");
  const jwtDiagnostic = document.getElementById("jwtDiagnostic");
  const jwtHeader = document.getElementById("jwtHeader");
  const jwtPayload = document.getElementById("jwtPayload");
  const jwtSignature = document.getElementById("jwtSignature");
  const jwtSummary = document.getElementById("jwtSummary");
  const useStoredBtn = document.getElementById("useStoredBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");

  const plainText = document.getElementById("plainText");
  const b64Text = document.getElementById("b64Text");
  const b64UrlText = document.getElementById("b64UrlText");
  const urlPlain = document.getElementById("urlPlain");
  const urlEncoded = document.getElementById("urlEncoded");

  const STORAGE_KEY = "just-auth:jwt";
  const HTTP_TOKEN_KEY = "just-http:token";
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

  // Base64URL → bytes via atob with padding fix.
  function b64UrlToBytes(input) {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return atob(s);
  }
  function bytesToUtf8(bytes) {
    // Use TextDecoder over Uint8Array to handle Korean / unicode properly.
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: false }).decode(arr);
  }
  function utf8ToBytes(str) {
    return new TextEncoder().encode(str);
  }
  function bytesToBinaryString(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }
  function toBase64(str) {
    return btoa(bytesToBinaryString(utf8ToBytes(str)));
  }
  function toBase64Url(str) {
    return toBase64(str).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function fromBase64(input) {
    return bytesToUtf8(atob(input));
  }
  function fromBase64Url(input) {
    return bytesToUtf8(b64UrlToBytes(input));
  }

  /* ---------- JWT ---------- */
  function decodeJwt(raw) {
    const token = raw.trim();
    if (!token) return { ok: false, message: "대기 중", level: "" };
    const parts = token.split(".");
    if (parts.length < 2 || parts.length > 3) {
      return {
        ok: false,
        message: `JWT 는 2~3 덩어리(점으로 구분)여야 합니다 — 현재 ${parts.length} 개`,
        level: "error",
      };
    }
    let header, payload;
    try {
      header = JSON.parse(fromBase64Url(parts[0]));
    } catch (e) {
      return { ok: false, message: `헤더 디코드 실패: ${e.message}`, level: "error" };
    }
    try {
      payload = JSON.parse(fromBase64Url(parts[1]));
    } catch (e) {
      return { ok: false, message: `페이로드 디코드 실패: ${e.message}`, level: "error" };
    }
    return {
      ok: true,
      header,
      payload,
      signature: parts[2] || "",
      message: "유효한 JWT 형식 (서명은 서버가 검증)",
      level: "ok",
    };
  }

  function fmtTime(sec) {
    if (typeof sec !== "number" || !Number.isFinite(sec)) return null;
    const d = new Date(sec * 1000);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function relTime(date) {
    const diff = date.getTime() - Date.now();
    const abs = Math.abs(diff);
    const future = diff >= 0;
    let unit = "초", n = Math.round(abs / 1000);
    if (n >= 60) { n = Math.round(n / 60); unit = "분"; }
    else return `${n}초 ${future ? "후" : "전"}`;
    if (n >= 60) { n = Math.round(n / 60); unit = "시간"; }
    if (unit === "시간" && n >= 48) { n = Math.round(n / 24); unit = "일"; }
    return `${n}${unit} ${future ? "후" : "전"}`;
  }

  function renderJwt() {
    const raw = jwtInput.value;
    localStorage.setItem(STORAGE_KEY, raw);
    const r = decodeJwt(raw);

    jwtDiagnostic.textContent = r.message;
    jwtDiagnostic.className = "diagnostic" + (r.level ? ` ${r.level}` : "");
    jwtInput.classList.toggle("bad", r.level === "error");

    if (!r.ok) {
      jwtHeader.textContent = "—";
      jwtPayload.textContent = "—";
      jwtSignature.textContent = "—";
      jwtSummary.innerHTML = "";
      return;
    }

    jwtHeader.textContent = JSON.stringify(r.header, null, 2);
    jwtPayload.textContent = JSON.stringify(r.payload, null, 2);
    jwtSignature.textContent = r.signature || "(서명 없음 — 서명되지 않은 토큰)";

    // Summary
    const rows = [];
    const pushBadge = (label, value, badgeText, badgeClass) => {
      rows.push(
        `<dt>${escapeHtml(label)}</dt>` +
          `<dd>${escapeHtml(value)}</dd>` +
          `<dd>${badgeText ? `<span class="badge ${badgeClass}">${escapeHtml(badgeText)}</span>` : ""}</dd>`
      );
    };

    if (r.header.alg) pushBadge("알고리즘", r.header.alg, "", "");
    if (r.header.typ) pushBadge("토큰 타입", r.header.typ, "", "");
    if (r.payload.iss) pushBadge("발급자 (iss)", r.payload.iss, "", "");
    if (r.payload.sub) pushBadge("주체 (sub)", String(r.payload.sub), "", "");
    if (r.payload.aud) pushBadge("수신자 (aud)", String(r.payload.aud), "", "");

    const iat = fmtTime(r.payload.iat);
    if (iat) pushBadge("발급 시각 (iat)", `${iat.toISOString()} · ${relTime(iat)}`, "", "");

    const nbf = fmtTime(r.payload.nbf);
    if (nbf) {
      const notYet = nbf.getTime() > Date.now();
      pushBadge(
        "유효 시작 (nbf)",
        `${nbf.toISOString()} · ${relTime(nbf)}`,
        notYet ? "아직 유효 X" : "유효",
        notYet ? "warn" : "ok"
      );
    }

    const exp = fmtTime(r.payload.exp);
    if (exp) {
      const expired = exp.getTime() < Date.now();
      pushBadge(
        "만료 시각 (exp)",
        `${exp.toISOString()} · ${relTime(exp)}`,
        expired ? "만료됨" : "유효",
        expired ? "bad" : "ok"
      );
    } else if (r.payload.exp === undefined) {
      pushBadge("만료 시각 (exp)", "없음", "무기한", "warn");
    }

    if (!r.signature) pushBadge("서명", "없음", "검증 불가", "warn");

    jwtSummary.innerHTML = rows.join("");
  }

  /* ---------- Presets ---------- */
  // Build a sample JWT (HS256 alg, signature is a placeholder string).
  function makeJwt(header, payload, sig) {
    const h = toBase64Url(JSON.stringify(header));
    const p = toBase64Url(JSON.stringify(payload));
    return `${h}.${p}.${sig}`;
  }
  const presets = {
    standard: () =>
      makeJwt(
        { alg: "HS256", typ: "JWT" },
        {
          sub: "1234567890",
          name: "홍길동",
          email: "hong@example.com",
          iat: Math.floor(Date.now() / 1000) - 60,
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: "weniv.co.kr",
        },
        "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
      ),
    rs256: () =>
      makeJwt(
        { alg: "RS256", typ: "JWT", kid: "key-2026-01" },
        {
          sub: "user-7afe11",
          name: "Vibe Coder",
          scope: "read:posts write:posts",
          iat: Math.floor(Date.now() / 1000) - 120,
          exp: Math.floor(Date.now() / 1000) + 7200,
          iss: "https://auth.example.com",
          aud: "https://api.example.com",
        },
        "k3Ja7MoZk8mWv5y2EqxJzj4mC0sH2rO8FRJ7L9Q4lTtLkxyNd5C7Vr1qzPpDfHcXgYvBwJq2Le3nA8RuMxKpZbQfHj4ydNvLkO9aBcEf"
      ),
    expired: () =>
      makeJwt(
        { alg: "HS256", typ: "JWT" },
        {
          sub: "expired-user",
          name: "오래된 토큰",
          iat: Math.floor(Date.now() / 1000) - 86400 * 7,
          exp: Math.floor(Date.now() / 1000) - 3600,
        },
        "doesNotMatterForVisualPurposes"
      ),
    oauth: () =>
      makeJwt(
        { alg: "HS256", typ: "JWT" },
        {
          iss: "https://accounts.example.com",
          sub: "115028",
          aud: "blog-app",
          azp: "blog-app",
          scope: "openid profile email",
          email_verified: true,
          name: "Sample User",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        "abc123signaturepart"
      ),
  };

  presetSelect.addEventListener("change", (e) => {
    const key = e.target.value;
    if (!key) return;
    const fn = presets[key];
    if (fn) {
      jwtInput.value = fn();
      renderJwt();
    }
    e.target.value = "";
  });

  /* ---------- Use stored token ---------- */
  useStoredBtn.addEventListener("click", () => {
    const token = localStorage.getItem(HTTP_TOKEN_KEY);
    if (!token) {
      toast("HTTP 실습장에 저장된 토큰이 없습니다");
      return;
    }
    jwtInput.value = token;
    renderJwt();
    toast("HTTP 실습장의 토큰을 가져왔습니다");
  });

  copyBtn.addEventListener("click", async () => {
    if (!jwtInput.value.trim()) { toast("복사할 토큰이 없습니다"); return; }
    try {
      await navigator.clipboard.writeText(jwtInput.value);
      toast("JWT 를 복사했습니다");
    } catch { toast("복사 실패"); }
  });

  clearBtn.addEventListener("click", () => {
    if (!jwtInput.value.trim() || confirm("토큰을 비울까요?")) {
      jwtInput.value = "";
      renderJwt();
    }
  });

  jwtInput.addEventListener("input", renderJwt);

  /* ---------- Base64 / Base64URL sync ---------- */
  let b64Lock = false;
  function syncFromPlain() {
    if (b64Lock) return;
    b64Lock = true;
    try {
      const s = plainText.value;
      b64Text.value = s ? toBase64(s) : "";
      b64UrlText.value = s ? toBase64Url(s) : "";
      b64Text.classList.remove("bad");
      b64UrlText.classList.remove("bad");
    } finally { b64Lock = false; }
  }
  function syncFromB64() {
    if (b64Lock) return;
    b64Lock = true;
    try {
      const s = b64Text.value.trim();
      if (!s) { plainText.value = ""; b64UrlText.value = ""; }
      else {
        try {
          const txt = fromBase64(s);
          plainText.value = txt;
          b64UrlText.value = toBase64Url(txt);
          b64Text.classList.remove("bad");
        } catch { b64Text.classList.add("bad"); }
      }
    } finally { b64Lock = false; }
  }
  function syncFromB64Url() {
    if (b64Lock) return;
    b64Lock = true;
    try {
      const s = b64UrlText.value.trim();
      if (!s) { plainText.value = ""; b64Text.value = ""; }
      else {
        try {
          const txt = fromBase64Url(s);
          plainText.value = txt;
          b64Text.value = toBase64(txt);
          b64UrlText.classList.remove("bad");
        } catch { b64UrlText.classList.add("bad"); }
      }
    } finally { b64Lock = false; }
  }
  plainText.addEventListener("input", syncFromPlain);
  b64Text.addEventListener("input", syncFromB64);
  b64UrlText.addEventListener("input", syncFromB64Url);

  /* ---------- URL encoding ---------- */
  let urlLock = false;
  urlPlain.addEventListener("input", () => {
    if (urlLock) return;
    urlLock = true;
    try { urlEncoded.value = encodeURIComponent(urlPlain.value); }
    finally { urlLock = false; }
  });
  urlEncoded.addEventListener("input", () => {
    if (urlLock) return;
    urlLock = true;
    try {
      try {
        urlPlain.value = decodeURIComponent(urlEncoded.value);
        urlEncoded.classList.remove("bad");
      } catch { urlEncoded.classList.add("bad"); }
    }
    finally { urlLock = false; }
  });

  /* ---------- Init ---------- */
  jwtInput.value = localStorage.getItem(STORAGE_KEY) || presets.standard();
  renderJwt();

  // Seed Base64 demo.
  plainText.value = "안녕, 바이브 코더";
  syncFromPlain();
  urlPlain.value = "검색어=바이브 코딩&page=1";
  urlEncoded.value = encodeURIComponent(urlPlain.value);
})();
