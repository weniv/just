/* ============================================================
   딱 필요한 만큼 — Cron 실습장
   ------------------------------------------------------------
   - 5필드 cron 표현식 분해 (분/시/일/월/요일)
   - 사람 말로 풀이
   - 선택한 시간대 기준으로 다음 실행 시각 5개 계산
   - 자주 쓰는 프리셋 9종
============================================================ */
(function () {
  const STORAGE_KEY = "just-cron:expr";
  const ZONE_KEY = "just-cron:zone";
  const THEME_KEY = "just:theme";

  const themeToggle = document.getElementById("themeToggle");
  const cronInput = document.getElementById("cronInput");
  const zoneSelect = document.getElementById("zoneSelect");
  const diagnostic = document.getElementById("diagnostic");
  const humanText = document.getElementById("humanText");
  const fieldsGrid = document.getElementById("fieldsGrid");
  const nextRuns = document.getElementById("nextRuns");
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

  /* ---------- Cron field specs ---------- */
  const FIELDS = [
    { name: "분", min: 0, max: 59, kind: "minute" },
    { name: "시", min: 0, max: 23, kind: "hour" },
    { name: "일", min: 1, max: 31, kind: "dom" },
    { name: "월", min: 1, max: 12, kind: "month", aliases: {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    } },
    { name: "요일", min: 0, max: 6, kind: "dow", aliases: {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
    } },
  ];

  const MACROS = {
    "@yearly":  "0 0 1 1 *",
    "@annually": "0 0 1 1 *",
    "@monthly": "0 0 1 * *",
    "@weekly":  "0 0 * * 0",
    "@daily":   "0 0 * * *",
    "@midnight": "0 0 * * *",
    "@hourly":  "0 * * * *",
  };

  /* ---------- Parse one field token ---------- */
  function parseField(token, spec) {
    const values = new Set();
    const parts = token.split(",");
    for (const part of parts) {
      const seg = parseSegment(part.trim(), spec);
      for (const v of seg) values.add(v);
    }
    if (values.size === 0) {
      throw new Error(`'${token}' 에서 매칭할 값이 없습니다`);
    }
    return values;
  }

  function resolveAlias(text, spec) {
    if (!spec.aliases) return text;
    const k = text.toLowerCase();
    if (k in spec.aliases) return String(spec.aliases[k]);
    return text;
  }

  function parseSegment(seg, spec) {
    if (seg === "" || seg === "?") {
      throw new Error("빈 토큰입니다");
    }

    // Step part: a/s where a is "*", "n", or "n-m"
    let stepPart = null;
    let basePart = seg;
    if (seg.includes("/")) {
      const idx = seg.indexOf("/");
      basePart = seg.slice(0, idx);
      stepPart = seg.slice(idx + 1);
    }
    const step = stepPart === null ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step <= 0) {
      throw new Error(`'${seg}' 의 step '${stepPart}' 가 올바르지 않습니다`);
    }

    let lo, hi;
    if (basePart === "*" || basePart === "") {
      lo = spec.min;
      hi = spec.max;
    } else if (basePart.includes("-")) {
      const dash = basePart.indexOf("-");
      const a = resolveAlias(basePart.slice(0, dash), spec);
      const b = resolveAlias(basePart.slice(dash + 1), spec);
      lo = Number(a);
      hi = Number(b);
      if (!Number.isInteger(lo) || !Number.isInteger(hi)) {
        throw new Error(`'${basePart}' 가 숫자 범위가 아닙니다`);
      }
    } else {
      const v = resolveAlias(basePart, spec);
      const n = Number(v);
      if (!Number.isInteger(n)) {
        throw new Error(`'${basePart}' 를 숫자로 해석할 수 없습니다`);
      }
      // Single value: with step, "n/s" treated as "n-max/s"
      if (stepPart !== null) {
        lo = n;
        hi = spec.max;
      } else {
        lo = hi = n;
      }
    }

    // DOW special: allow 7 as Sunday
    if (spec.kind === "dow") {
      if (lo === 7) lo = 0;
      if (hi === 7) hi = 0;
    }

    if (lo < spec.min || hi > spec.max) {
      throw new Error(`${spec.name} 필드의 '${basePart}' 가 ${spec.min}~${spec.max} 범위를 벗어납니다`);
    }
    if (hi < lo) {
      throw new Error(`'${basePart}' 의 범위가 거꾸로입니다`);
    }

    const out = [];
    for (let v = lo; v <= hi; v += step) out.push(v);
    return out;
  }

  /* ---------- Parse full expression ---------- */
  function parseCron(input) {
    const trimmed = input.trim();
    if (!trimmed) throw new Error("표현식을 입력하세요");

    let expanded = trimmed;
    if (trimmed.startsWith("@")) {
      const macro = MACROS[trimmed.toLowerCase()];
      if (!macro) throw new Error(`알 수 없는 매크로 '${trimmed}'`);
      expanded = macro;
    }

    const tokens = expanded.split(/\s+/);
    if (tokens.length !== 5) {
      throw new Error(`5개 필드가 필요합니다 (현재 ${tokens.length}개)`);
    }

    const fields = tokens.map((tok, i) => ({
      raw: tok,
      values: parseField(tok, FIELDS[i]),
      isStar: tok === "*",
    }));

    return { tokens, fields, expanded };
  }

  /* ---------- Human description (KR) ---------- */
  function setLabel(values, spec) {
    // If covers full range, "every"
    const all = spec.max - spec.min + 1;
    if (values.size === all) return null;
    return [...values].sort((a, b) => a - b);
  }

  function listKR(arr, suffix) {
    if (arr.length === 1) return `${arr[0]}${suffix}`;
    if (arr.length <= 4) return `${arr.join(", ")}${suffix}`;
    return `${arr.slice(0, 3).join(", ")}, ... (${arr.length}개)${suffix}`;
  }

  const DOW_KR = ["일", "월", "화", "수", "목", "금", "토"];

  function humanize(parsed) {
    const [minF, hourF, domF, monF, dowF] = parsed.fields;

    // Time-of-day component
    let timePart;
    const minSet = setLabel(minF.values, FIELDS[0]);
    const hourSet = setLabel(hourF.values, FIELDS[1]);

    if (minSet === null && hourSet === null) {
      timePart = "매분 (매시간)";
    } else if (hourSet === null && minSet) {
      timePart = `매시 ${listKR(minSet, "분")}`;
    } else if (minSet === null && hourSet) {
      timePart = `${listKR(hourSet, "시")}대 매분`;
    } else if (minSet.length === 1 && hourSet.length === 1) {
      timePart = `${hourSet[0].toString().padStart(2, "0")}:${minSet[0].toString().padStart(2, "0")}`;
    } else {
      const hStr = listKR(hourSet, "시");
      const mStr = listKR(minSet, "분");
      timePart = `${hStr} ${mStr}`;
    }

    // Day component (DOM, Month, DOW)
    const domSet = setLabel(domF.values, FIELDS[2]);
    const monSet = setLabel(monF.values, FIELDS[3]);
    const dowSet = setLabel(dowF.values, FIELDS[4]);

    let dayPart = [];
    if (monSet) {
      dayPart.push(listKR(monSet, "월"));
    }
    if (domSet) {
      dayPart.push(listKR(domSet, "일"));
    }
    if (dowSet) {
      const days = dowSet.map((d) => `${DOW_KR[d]}요일`).join(", ");
      // Preserve OR semantic when DOM is also set
      if (domSet) {
        dayPart.push(`또는 ${days}`);
      } else {
        dayPart.push(days);
      }
    }

    const when = dayPart.length === 0 ? "매일" : dayPart.join(" ");
    return `${when} ${timePart}에 실행`;
  }

  /* ---------- Next run computation ---------- */
  function partsInZone(date, tz) {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, weekday: "short",
    });
    const out = {};
    for (const p of f.formatToParts(date)) {
      if (p.type !== "literal") out[p.type] = p.value;
    }
    if (out.hour === "24") out.hour = "00";
    const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      y: +out.year, mo: +out.month, d: +out.day,
      h: +out.hour, mi: +out.minute, s: +out.second,
      dow: wd[out.weekday],
    };
  }

  function zoneOffsetMinutes(date, tz) {
    const p = partsInZone(date, tz);
    const utc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    return Math.round((utc - date.getTime()) / 60000);
  }

  // Given a wall clock (y,mo,d,h,mi) in tz, return its UTC Date.
  function zoneDate(y, mo, d, h, mi, tz) {
    const naiveUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
    const probe = new Date(naiveUtc);
    const off = zoneOffsetMinutes(probe, tz);
    return new Date(naiveUtc - off * 60000);
  }

  function matchesCron(parsed, p) {
    const [minF, hourF, domF, monF, dowF] = parsed.fields;
    if (!minF.values.has(p.mi)) return false;
    if (!hourF.values.has(p.h)) return false;
    if (!monF.values.has(p.mo)) return false;
    // Standard cron OR semantic: if both DOM and DOW restricted, fire if either matches.
    const domStar = domF.isStar;
    const dowStar = dowF.isStar;
    const domHit = domF.values.has(p.d);
    const dowHit = dowF.values.has(p.dow);
    if (domStar && dowStar) {
      // both wildcards
    } else if (domStar) {
      if (!dowHit) return false;
    } else if (dowStar) {
      if (!domHit) return false;
    } else {
      if (!domHit && !dowHit) return false;
    }
    return true;
  }

  function nextRunsOf(parsed, tz, count, from) {
    const out = [];
    // Step minute by minute starting at next minute boundary in tz.
    const startP = partsInZone(from, tz);
    let cursor = zoneDate(startP.y, startP.mo, startP.d, startP.h, startP.mi + 1, tz);
    // Cap iteration: 366 days in minutes
    const cap = 366 * 24 * 60;
    for (let i = 0; i < cap && out.length < count; i++) {
      const p = partsInZone(cursor, tz);
      if (matchesCron(parsed, p)) {
        out.push({ date: new Date(cursor.getTime()), parts: p });
      }
      cursor = new Date(cursor.getTime() + 60000);
    }
    return out;
  }

  /* ---------- Render ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function valuesPreview(values, spec) {
    const arr = [...values].sort((a, b) => a - b);
    const all = spec.max - spec.min + 1;
    if (arr.length === all) return "전체 (매번)";
    if (spec.kind === "dow") {
      return arr.map((d) => `${d} (${DOW_KR[d]})`).join(", ");
    }
    if (arr.length <= 12) return arr.join(", ");
    return `${arr.slice(0, 10).join(", ")}, … (${arr.length}개)`;
  }

  function renderFields(parsed) {
    fieldsGrid.innerHTML = parsed.fields
      .map((f, i) => {
        const spec = FIELDS[i];
        return `
          <div class="field-tile">
            <span class="field-name">${escapeHtml(spec.name)}</span>
            <span class="field-raw">${escapeHtml(f.raw)}</span>
            <span class="field-values">${escapeHtml(valuesPreview(f.values, spec))}</span>
          </div>
        `;
      })
      .join("");
  }

  function pad(n, w = 2) { return String(n).padStart(w, "0"); }

  function relText(date) {
    const diff = date.getTime() - Date.now();
    const sec = Math.round(diff / 1000);
    const min = Math.round(sec / 60);
    const hr = Math.round(min / 60);
    const day = Math.round(hr / 24);
    if (sec < 60) return `${sec}초 후`;
    if (min < 60) return `${min}분 후`;
    if (hr < 48) return `${hr}시간 후`;
    return `${day}일 후`;
  }

  function renderRuns(parsed, tz) {
    const runs = nextRunsOf(parsed, tz, 5, new Date());
    if (runs.length === 0) {
      nextRuns.innerHTML = `<li class="empty">1년 안에 실행되지 않습니다</li>`;
      return;
    }
    nextRuns.innerHTML = runs
      .map((r, i) => {
        const p = r.parts;
        const when = `${p.y}-${pad(p.mo)}-${pad(p.d)} (${DOW_KR[p.dow]}) ${pad(p.h)}:${pad(p.mi)}`;
        return `
          <li>
            <span class="idx">${i + 1}</span>
            <span class="when">${escapeHtml(when)}</span>
            <span class="rel">${escapeHtml(relText(r.date))}</span>
          </li>
        `;
      })
      .join("");
  }

  /* ---------- Presets ---------- */
  const PRESETS = [
    { expr: "* * * * *", desc: "매분" },
    { expr: "*/5 * * * *", desc: "5분마다" },
    { expr: "0 * * * *", desc: "매시 정각" },
    { expr: "0 0 * * *", desc: "매일 자정" },
    { expr: "0 9 * * 1-5", desc: "평일 오전 9시" },
    { expr: "0 0 * * 0", desc: "매주 일요일 자정" },
    { expr: "0 0 1 * *", desc: "매월 1일 자정" },
    { expr: "0 0 1 1 *", desc: "매년 1월 1일 자정" },
    { expr: "*/30 9-18 * * 1-5", desc: "평일 9~18시 30분마다" },
  ];

  presetsEl.innerHTML = PRESETS.map(
    (p) => `
      <button class="preset-tile" type="button" data-expr="${escapeHtml(p.expr)}">
        <span class="preset-expr">${escapeHtml(p.expr)}</span>
        <span class="preset-desc">${escapeHtml(p.desc)}</span>
      </button>
    `
  ).join("");

  presetsEl.addEventListener("click", (e) => {
    const tile = e.target.closest(".preset-tile");
    if (!tile) return;
    cronInput.value = tile.dataset.expr;
    update();
  });

  /* ---------- Toast ---------- */
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

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cronInput.value);
      toast("복사했습니다");
    } catch { toast("복사 실패"); }
  });

  /* ---------- Update ---------- */
  function update() {
    const expr = cronInput.value;
    const tz = zoneSelect.value;
    localStorage.setItem(STORAGE_KEY, expr);
    localStorage.setItem(ZONE_KEY, tz);

    let parsed;
    try {
      parsed = parseCron(expr);
    } catch (e) {
      cronInput.classList.add("bad");
      diagnostic.textContent = `오류: ${e.message}`;
      diagnostic.className = "diagnostic error";
      humanText.textContent = "—";
      fieldsGrid.innerHTML = "";
      nextRuns.innerHTML = "";
      return;
    }

    cronInput.classList.remove("bad");
    diagnostic.textContent = `유효한 표현식 · 5필드 인식됨`;
    diagnostic.className = "diagnostic ok";

    humanText.textContent = humanize(parsed);
    renderFields(parsed);
    renderRuns(parsed, tz);
  }

  cronInput.addEventListener("input", update);
  zoneSelect.addEventListener("change", update);

  /* ---------- Init ---------- */
  const savedExpr = localStorage.getItem(STORAGE_KEY);
  if (savedExpr) cronInput.value = savedExpr;
  const savedZone = localStorage.getItem(ZONE_KEY);
  if (savedZone) zoneSelect.value = savedZone;
  update();
})();
