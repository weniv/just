/* ============================================================
   딱 필요한 만큼 — 색상 실습장
   ------------------------------------------------------------
   - hex / rgb / hsl 동기화
   - HSL 슬라이더, 명도 단계, 자동 팔레트 (보색·삼각·유사)
   - WCAG 명도 대비 체크
============================================================ */
(function () {
  const STORAGE_KEY = "just-color:hex";
  const STORAGE_FG = "just-color:fg";
  const THEME_KEY = "just:theme";

  const themeToggle = document.getElementById("themeToggle");
  const picker = document.getElementById("picker");
  const swatch = document.getElementById("swatch");
  const swatchLabel = document.getElementById("swatchLabel");
  const hexInput = document.getElementById("hexInput");
  const rgbInput = document.getElementById("rgbInput");
  const hslInput = document.getElementById("hslInput");
  const cssVarInput = document.getElementById("cssVarInput");
  const hSlider = document.getElementById("hSlider");
  const sSlider = document.getElementById("sSlider");
  const lSlider = document.getElementById("lSlider");
  const hLabel = document.getElementById("hLabel");
  const sLabel = document.getElementById("sLabel");
  const lLabel = document.getElementById("lLabel");
  const lightnessPalette = document.getElementById("lightnessPalette");
  const schemePalette = document.getElementById("schemePalette");
  const fgPicker = document.getElementById("fgPicker");
  const fgHex = document.getElementById("fgHex");
  const contrastPreview = document.getElementById("contrastPreview");
  const contrastResult = document.getElementById("contrastResult");
  const presetSelect = document.getElementById("presetSelect");

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

  /* ---------- Color math ---------- */
  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  function hexToRgb(hex) {
    let h = hex.trim().replace(/^#/, "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function rgbToHex({ r, g, b }) {
    const to2 = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return `#${to2(r)}${to2(g)}${to2(b)}`;
  }

  function rgbToHsl({ r, g, b }) {
    const rN = r / 255, gN = g / 255, bN = b / 255;
    const max = Math.max(rN, gN, bN);
    const min = Math.min(rN, gN, bN);
    let h, s;
    const l = (max + min) / 2;
    if (max === min) {
      h = 0;
      s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
        case gN: h = (bN - rN) / d + 2; break;
        default: h = (rN - gN) / d + 4;
      }
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToRgb({ h, s, l }) {
    h = ((h % 360) + 360) % 360;
    const sN = clamp(s, 0, 100) / 100;
    const lN = clamp(l, 0, 100) / 100;
    if (sN === 0) {
      const v = Math.round(lN * 255);
      return { r: v, g: v, b: v };
    }
    const hue = h / 360;
    const q = lN < 0.5 ? lN * (1 + sN) : lN + sN - lN * sN;
    const p = 2 * lN - q;
    function hueToRgb(t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return {
      r: Math.round(hueToRgb(hue + 1 / 3) * 255),
      g: Math.round(hueToRgb(hue) * 255),
      b: Math.round(hueToRgb(hue - 1 / 3) * 255),
    };
  }

  function relativeLuminance({ r, g, b }) {
    const ch = (c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  }

  function contrastRatio(rgb1, rgb2) {
    const l1 = relativeLuminance(rgb1);
    const l2 = relativeLuminance(rgb2);
    const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (a + 0.05) / (b + 0.05);
  }

  function pickReadableText(rgb) {
    return relativeLuminance(rgb) > 0.5 ? "#111111" : "#ffffff";
  }

  /* ---------- Parsers (lenient input) ---------- */
  function parseHex(input) {
    const m = input.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return `#${h.toLowerCase()}`;
  }

  function parseRgb(input) {
    const m = input.trim().match(/^rgb\s*\(?\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*\)?$/i);
    if (!m) return null;
    const r = +m[1], g = +m[2], b = +m[3];
    if ([r, g, b].some((v) => v < 0 || v > 255)) return null;
    return { r, g, b };
  }

  function parseHsl(input) {
    const m = input.trim().match(/^hsl\s*\(?\s*(\d+)\s*[,\s]?\s*(\d+)\s*%?\s*[,\s]?\s*(\d+)\s*%?\s*\)?$/i);
    if (!m) return null;
    const h = +m[1], s = +m[2], l = +m[3];
    if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;
    return { h, s, l };
  }

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

  /* ---------- State sync ---------- */
  let currentHex = "#2e6ff2";
  let currentFgHex = "#ffffff";
  let suppressInput = false;

  function setColor(hex, source) {
    currentHex = hex;
    localStorage.setItem(STORAGE_KEY, hex);

    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb);

    suppressInput = true;
    if (source !== "picker") picker.value = hex;
    if (source !== "hex") {
      hexInput.value = hex;
      hexInput.classList.remove("bad");
    }
    if (source !== "rgb") {
      rgbInput.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      rgbInput.classList.remove("bad");
    }
    if (source !== "hsl") {
      hslInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      hslInput.classList.remove("bad");
    }
    if (source !== "slider") {
      hSlider.value = hsl.h;
      sSlider.value = hsl.s;
      lSlider.value = hsl.l;
    }
    hLabel.textContent = `${hsl.h}°`;
    sLabel.textContent = `${hsl.s}%`;
    lLabel.textContent = `${hsl.l}%`;
    cssVarInput.value = `--brand: ${hex};`;

    swatch.style.background = hex;
    swatchLabel.textContent = hex;
    swatchLabel.style.color = pickReadableText(rgb);
    swatchLabel.style.background = pickReadableText(rgb) === "#ffffff"
      ? "rgba(0,0,0,0.45)"
      : "rgba(255,255,255,0.85)";

    suppressInput = false;

    renderLightnessPalette(hsl);
    renderSchemePalette(hsl);
    updateContrast();
  }

  /* ---------- Palettes ---------- */
  function renderLightnessPalette(baseHsl) {
    const stops = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    lightnessPalette.innerHTML = stops
      .map((l) => {
        const rgb = hslToRgb({ h: baseHsl.h, s: baseHsl.s, l });
        const hex = rgbToHex(rgb);
        return `<button class="swatch-tile" data-hex="${hex}" title="${hex}" style="background:${hex}">
          <span>${l}%</span>
        </button>`;
      })
      .join("");
  }

  function renderSchemePalette(baseHsl) {
    const schemes = [
      { role: "기준", h: baseHsl.h },
      { role: "유사 +30°", h: baseHsl.h + 30 },
      { role: "유사 -30°", h: baseHsl.h - 30 },
      { role: "삼각 +120°", h: baseHsl.h + 120 },
      { role: "삼각 -120°", h: baseHsl.h - 120 },
      { role: "보색 180°", h: baseHsl.h + 180 },
    ];
    schemePalette.innerHTML = schemes
      .map(({ role, h }) => {
        const rgb = hslToRgb({ h, s: baseHsl.s, l: baseHsl.l });
        const hex = rgbToHex(rgb);
        return `<button class="swatch-tile" data-hex="${hex}" title="${role} · ${hex}" style="background:${hex}">
          <span class="role">${role}</span>
          <span>${hex}</span>
        </button>`;
      })
      .join("");
  }

  // Click any palette tile → make it the new current color.
  function paletteClickHandler(container) {
    container.addEventListener("click", (e) => {
      const tile = e.target.closest(".swatch-tile");
      if (!tile) return;
      setColor(tile.dataset.hex, null);
    });
  }
  paletteClickHandler(lightnessPalette);
  paletteClickHandler(schemePalette);

  /* ---------- Contrast ---------- */
  function updateContrast() {
    const bgRgb = hexToRgb(currentHex);
    const fgRgb = hexToRgb(currentFgHex);
    if (!bgRgb || !fgRgb) return;

    const ratio = contrastRatio(bgRgb, fgRgb);
    contrastPreview.style.background = currentHex;
    contrastPreview.style.color = currentFgHex;
    contrastPreview.style.borderColor = currentFgHex;

    const passNormalAA = ratio >= 4.5;
    const passLargeAA = ratio >= 3;
    const passNormalAAA = ratio >= 7;
    const passLargeAAA = ratio >= 4.5;

    const row = (label, ok) =>
      `<dt>${label}</dt><dd></dd><dd><span class="badge ${ok ? "pass" : "fail"}">${
        ok ? "통과" : "미달"
      }</span></dd>`;

    contrastResult.innerHTML = `
      <dt>대비비</dt>
      <dd class="ratio">${ratio.toFixed(2)} : 1</dd>
      <dd></dd>
      ${row("AA · 본문 (4.5)", passNormalAA)}
      ${row("AA · 큰 글씨 (3.0)", passLargeAA)}
      ${row("AAA · 본문 (7.0)", passNormalAAA)}
      ${row("AAA · 큰 글씨 (4.5)", passLargeAAA)}
    `;
  }

  /* ---------- Listeners ---------- */
  picker.addEventListener("input", () => setColor(picker.value, "picker"));

  hexInput.addEventListener("input", () => {
    if (suppressInput) return;
    const hex = parseHex(hexInput.value);
    if (hex) setColor(hex, "hex");
    else hexInput.classList.add("bad");
  });

  rgbInput.addEventListener("input", () => {
    if (suppressInput) return;
    const rgb = parseRgb(rgbInput.value);
    if (rgb) setColor(rgbToHex(rgb), "rgb");
    else rgbInput.classList.add("bad");
  });

  hslInput.addEventListener("input", () => {
    if (suppressInput) return;
    const hsl = parseHsl(hslInput.value);
    if (hsl) setColor(rgbToHex(hslToRgb(hsl)), "hsl");
    else hslInput.classList.add("bad");
  });

  function onSlider() {
    const h = +hSlider.value;
    const s = +sSlider.value;
    const l = +lSlider.value;
    setColor(rgbToHex(hslToRgb({ h, s, l })), "slider");
  }
  hSlider.addEventListener("input", onSlider);
  sSlider.addEventListener("input", onSlider);
  lSlider.addEventListener("input", onSlider);

  fgPicker.addEventListener("input", () => {
    currentFgHex = fgPicker.value;
    fgHex.value = currentFgHex;
    localStorage.setItem(STORAGE_FG, currentFgHex);
    updateContrast();
  });
  fgHex.addEventListener("input", () => {
    const hex = parseHex(fgHex.value);
    if (hex) {
      currentFgHex = hex;
      fgPicker.value = hex;
      localStorage.setItem(STORAGE_FG, hex);
      updateContrast();
    }
  });

  presetSelect.addEventListener("change", (e) => {
    if (!e.target.value) return;
    setColor(e.target.value, null);
    e.target.value = "";
  });

  document.getElementById("randomBtn").addEventListener("click", () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    setColor(rgbToHex({ r, g, b }), null);
  });

  document.getElementById("copyAllBtn").addEventListener("click", async () => {
    const text = [hexInput.value, rgbInput.value, hslInput.value, cssVarInput.value].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("모든 표기를 복사했습니다");
    } catch {
      toast("복사 실패");
    }
  });

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = document.getElementById(btn.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.value);
        toast("복사했습니다");
      } catch {
        toast("복사 실패");
      }
    });
  });

  /* ---------- Init ---------- */
  const savedFg = localStorage.getItem(STORAGE_FG);
  if (savedFg && parseHex(savedFg)) {
    currentFgHex = savedFg;
    fgPicker.value = savedFg;
    fgHex.value = savedFg;
  }

  const savedHex = localStorage.getItem(STORAGE_KEY);
  setColor(savedHex && parseHex(savedHex) ? savedHex : "#2e6ff2", null);
})();
