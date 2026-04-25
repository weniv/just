/* ============================================================
   딱 필요한 만큼 — 타임스탬프 실습장
   ------------------------------------------------------------
   - Unix 초 / Unix 밀리초 / ISO 8601 / 사람 형식 양방향
   - 시간대 비교 (서울·도쿄·뉴욕·런던·UTC 등)
   - 지금과의 차이 (상대 시간)
   - 자주 쓰는 형식 (RFC, 파일명, 한국어 등)
============================================================ */
(function () {
  const STORAGE_KEY = "just-time:ms";
  const THEME_KEY = "just:theme";

  const themeToggle = document.getElementById("themeToggle");
  const epochSec = document.getElementById("epochSec");
  const epochMs = document.getElementById("epochMs");
  const isoInput = document.getElementById("iso");
  const humanInput = document.getElementById("human");
  const diagnostic = document.getElementById("diagnostic");
  const zonesEl = document.getElementById("zones");
  const relativeEl = document.getElementById("relative");
  const partsEl = document.getElementById("parts");
  const formatsGrid = document.getElementById("formatsGrid");

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

  /* ---------- Zones ---------- */
  const zones = [
    { name: "서울 · KST", tz: "Asia/Seoul" },
    { name: "도쿄 · JST", tz: "Asia/Tokyo" },
    { name: "런던 · GMT/BST", tz: "Europe/London" },
    { name: "뉴욕 · ET", tz: "America/New_York" },
    { name: "샌프란시스코 · PT", tz: "America/Los_Angeles" },
    { name: "UTC", tz: "UTC" },
  ];

  // Build zone DOM
  zonesEl.innerHTML = zones
    .map(
      (z, i) => `
        <div class="zone" data-tz="${z.tz}">
          <span class="zone-name">${z.name}</span>
          <input type="text" data-zone-input="${i}" spellcheck="false" />
        </div>
      `
    )
    .join("");

  /* ---------- Helpers ---------- */
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

  // Pad number with leading zeros.
  const pad = (n, w = 2) => String(n).padStart(w, "0");

  // Get parts of a Date in a given timezone using Intl.DateTimeFormat.
  function partsInZone(date, tz) {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short",
    });
    const out = {};
    for (const p of f.formatToParts(date)) {
      if (p.type !== "literal") out[p.type] = p.value;
    }
    if (out.hour === "24") out.hour = "00";
    return out;
  }

  function zoneOffsetMinutes(date, tz) {
    // Returns the offset (minutes) of date in tz from UTC.
    const p = partsInZone(date, tz);
    const utc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((utc - date.getTime()) / 60000);
  }

  function offsetString(minutes) {
    if (minutes === 0) return "Z";
    const sign = minutes >= 0 ? "+" : "-";
    const m = Math.abs(minutes);
    return `${sign}${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  }

  function formatZoneInput(date, tz) {
    const p = partsInZone(date, tz);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
  }

  // Parse "YYYY-MM-DD HH:MM:SS" (or with T) interpreted in a given timezone.
  // Strategy: build a UTC date with the parts, then subtract the zone offset.
  function parseInZone(text, tz) {
    const m = text.trim().match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
    );
    if (!m) return null;
    const [, y, mo, d, h, mi, s] = m;
    const naiveUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0));
    // Adjust by the offset of that wall clock in the target zone.
    const probe = new Date(naiveUtc);
    const off = zoneOffsetMinutes(probe, tz);
    return new Date(naiveUtc - off * 60000);
  }

  function parseHuman(text) {
    const t = text.trim();
    if (!t) return null;
    // Accept lots of forms; rely on Date for ISO-like, fallback to KST naive.
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(t)) {
      // Without timezone? assume Seoul.
      if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(t)) {
        return parseInZone(t, "Asia/Seoul");
      }
    }
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }

  /* ---------- Formats ---------- */
  function buildFormats(date) {
    const seoul = partsInZone(date, "Asia/Seoul");
    const offMin = zoneOffsetMinutes(date, "Asia/Seoul");
    const off = offsetString(offMin);
    const krWeekday = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      weekday: "long",
    }).format(date);

    return [
      { label: "ISO 8601 (UTC)", value: date.toISOString() },
      {
        label: "ISO 8601 (Seoul)",
        value: `${seoul.year}-${seoul.month}-${seoul.day}T${seoul.hour}:${seoul.minute}:${seoul.second}${off}`,
      },
      {
        label: "RFC 2822",
        value: date.toUTCString(),
      },
      {
        label: "한국어 (Seoul)",
        value: `${seoul.year}년 ${+seoul.month}월 ${+seoul.day}일 ${krWeekday} ${+seoul.hour}시 ${+seoul.minute}분`,
      },
      {
        label: "파일명용",
        value: `${seoul.year}${seoul.month}${seoul.day}_${seoul.hour}${seoul.minute}${seoul.second}`,
      },
      {
        label: "epoch 초",
        value: String(Math.floor(date.getTime() / 1000)),
      },
      {
        label: "epoch 밀리초",
        value: String(date.getTime()),
      },
      {
        label: "JS Date 생성자",
        value: `new Date(${date.getTime()})`,
      },
    ];
  }

  function renderFormats(date) {
    const formats = buildFormats(date);
    formatsGrid.innerHTML = formats
      .map(
        (f) => `
          <button class="format-tile" data-value="${escapeAttr(f.value)}">
            <span class="label">${escapeHtml(f.label)}</span>
            <span class="value">${escapeHtml(f.value)}</span>
          </button>
        `
      )
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  /* ---------- Relative + parts ---------- */
  function renderRelative(date) {
    const diffMs = date.getTime() - Date.now();
    const future = diffMs >= 0;
    const absMs = Math.abs(diffMs);
    const sec = Math.round(absMs / 1000);
    const min = Math.round(sec / 60);
    const hr = Math.round(min / 60);
    const day = Math.round(hr / 24);

    const direction = future ? "후" : "전";
    let summary;
    if (sec < 60) summary = `${sec}초 ${direction}`;
    else if (min < 60) summary = `${min}분 ${direction}`;
    else if (hr < 48) summary = `${hr}시간 ${direction}`;
    else summary = `${day}일 ${direction}`;

    relativeEl.innerHTML = `
      <dt>요약</dt><dd>${summary}</dd>
      <dt>차이 (초)</dt><dd>${(diffMs / 1000).toLocaleString()} 초</dd>
      <dt>차이 (밀리초)</dt><dd>${diffMs.toLocaleString()} ms</dd>
      <dt>방향</dt><dd>${future ? "미래" : "과거"}</dd>
    `;
  }

  function renderParts(date) {
    const p = partsInZone(date, "Asia/Seoul");
    const off = offsetString(zoneOffsetMinutes(date, "Asia/Seoul"));
    const dayOfYear = (() => {
      const start = Date.UTC(+p.year, 0, 1);
      const cur = Date.UTC(+p.year, +p.month - 1, +p.day);
      return Math.floor((cur - start) / 86400000) + 1;
    })();
    const weekKR = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      weekday: "long",
    }).format(date);
    partsEl.innerHTML = `
      <dt>연 / 월 / 일 (Seoul)</dt><dd>${+p.year} / ${+p.month} / ${+p.day}</dd>
      <dt>시 / 분 / 초 (Seoul)</dt><dd>${+p.hour} / ${+p.minute} / ${+p.second}</dd>
      <dt>요일</dt><dd>${weekKR}</dd>
      <dt>해의 며칠째</dt><dd>${dayOfYear} 일째</dd>
      <dt>UTC 오프셋 (Seoul)</dt><dd>${off}</dd>
    `;
  }

  /* ---------- Sync ---------- */
  let current = new Date();
  let suppress = false;

  function setDate(date, source) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return;
    current = date;
    localStorage.setItem(STORAGE_KEY, String(date.getTime()));

    suppress = true;
    if (source !== "epochSec") epochSec.value = String(Math.floor(date.getTime() / 1000));
    if (source !== "epochMs") epochMs.value = String(date.getTime());
    if (source !== "iso") isoInput.value = date.toISOString();
    if (source !== "human") {
      const p = partsInZone(date, "Asia/Seoul");
      humanInput.value = `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
    }
    epochSec.classList.remove("bad");
    epochMs.classList.remove("bad");
    isoInput.classList.remove("bad");
    humanInput.classList.remove("bad");

    document.querySelectorAll("[data-zone-input]").forEach((input) => {
      const zone = zones[+input.dataset.zoneInput];
      input.value = formatZoneInput(date, zone.tz);
      input.classList.remove("bad");
    });
    suppress = false;

    diagnostic.textContent = `유효한 시각 · ${date.toISOString()} (UTC)`;
    diagnostic.className = "diagnostic ok";

    renderFormats(date);
    renderRelative(date);
    renderParts(date);
  }

  /* ---------- Listeners ---------- */
  epochSec.addEventListener("input", () => {
    if (suppress) return;
    const n = Number(epochSec.value.trim());
    if (Number.isFinite(n)) setDate(new Date(n * 1000), "epochSec");
    else { epochSec.classList.add("bad"); markBad("epoch 초가 숫자가 아닙니다"); }
  });

  epochMs.addEventListener("input", () => {
    if (suppress) return;
    const n = Number(epochMs.value.trim());
    if (Number.isFinite(n)) setDate(new Date(n), "epochMs");
    else { epochMs.classList.add("bad"); markBad("epoch 밀리초가 숫자가 아닙니다"); }
  });

  isoInput.addEventListener("input", () => {
    if (suppress) return;
    const d = new Date(isoInput.value.trim());
    if (!isNaN(d.getTime())) setDate(d, "iso");
    else { isoInput.classList.add("bad"); markBad("ISO 8601 형식이 아닙니다"); }
  });

  humanInput.addEventListener("input", () => {
    if (suppress) return;
    const d = parseHuman(humanInput.value);
    if (d) setDate(d, "human");
    else { humanInput.classList.add("bad"); markBad("YYYY-MM-DD HH:MM:SS 형식으로 입력하세요"); }
  });

  zonesEl.addEventListener("input", (e) => {
    if (suppress) return;
    const input = e.target.closest("input[data-zone-input]");
    if (!input) return;
    const zone = zones[+input.dataset.zoneInput];
    const d = parseInZone(input.value, zone.tz);
    if (d) setDate(d, null);
    else { input.classList.add("bad"); markBad("YYYY-MM-DD HH:MM:SS 형식으로 입력하세요"); }
  });

  function markBad(msg) {
    diagnostic.textContent = msg;
    diagnostic.className = "diagnostic error";
  }

  document.getElementById("nowBtn").addEventListener("click", () => {
    setDate(new Date(), null);
  });

  document.getElementById("copyEpochBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(String(Math.floor(current.getTime() / 1000)));
      toast("Unix 초를 복사했습니다");
    } catch { toast("복사 실패"); }
  });
  document.getElementById("copyIsoBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(current.toISOString());
      toast("ISO를 복사했습니다");
    } catch { toast("복사 실패"); }
  });

  formatsGrid.addEventListener("click", async (e) => {
    const tile = e.target.closest(".format-tile");
    if (!tile) return;
    try {
      await navigator.clipboard.writeText(tile.dataset.value);
      toast("복사했습니다");
    } catch { toast("복사 실패"); }
  });

  /* ---------- Init ---------- */
  const saved = localStorage.getItem(STORAGE_KEY);
  const initial = saved && Number.isFinite(+saved) ? new Date(+saved) : new Date();
  setDate(initial, null);
})();
