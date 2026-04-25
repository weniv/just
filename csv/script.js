/* ============================================================
   딱 필요한 만큼 — CSV 실습장
   ------------------------------------------------------------
   - RFC 4180 호환 미니 CSV 파서 (따옴표·이스케이프 포함)
   - 자동 구분자 감지 (쉼표 / 탭 / 세미콜론 / 파이프)
   - 컬럼 타입 추론 (number / boolean / date / string)
   - 헤더 클릭 정렬 (asc / desc / none)
   - 차트 뷰: X 범주 + Y 숫자 + 집계 (sum/avg/count/max/min)
============================================================ */
(function () {
  const editor = document.getElementById("editor");
  const themeToggle = document.getElementById("themeToggle");
  const templateSelect = document.getElementById("templateSelect");
  const delimiterSel = document.getElementById("delimiter");
  const hasHeaderInput = document.getElementById("hasHeader");
  const dataTable = document.getElementById("dataTable");
  const diagnostic = document.getElementById("diagnostic");
  const rowCount = document.getElementById("rowCount");
  const colCount = document.getElementById("colCount");
  const xAxis = document.getElementById("xAxis");
  const yAxis = document.getElementById("yAxis");
  const aggregate = document.getElementById("aggregate");
  const chart = document.getElementById("chart");
  const tableView = document.getElementById("tableView");
  const chartView = document.getElementById("chartView");
  const viewLabel = document.getElementById("viewLabel");

  const STORAGE_KEY = "just-csv:doc";
  const SETTINGS_KEY = "just-csv:settings";
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
    attendance: `이름,학번,출석일,점수,통과
홍길동,2026001,2026-04-01,95,true
김철수,2026002,2026-04-01,82,true
이영희,2026003,2026-04-02,67,false
박민수,2026004,2026-04-02,88,true
정수진,2026005,2026-04-03,73,true
최지훈,2026006,2026-04-03,91,true
강서연,2026007,2026-04-04,55,false
윤재호,2026008,2026-04-04,79,true`,
    sales: `월,카테고리,매출,비용
2026-01,식품,12500000,7800000
2026-01,의류,8400000,5100000
2026-01,가전,15800000,9200000
2026-02,식품,13100000,8000000
2026-02,의류,9700000,5600000
2026-02,가전,14200000,8500000
2026-03,식품,14800000,9100000
2026-03,의류,11200000,6300000
2026-03,가전,18900000,11000000`,
    cities: `도시,인구,면적_km2,GDP_조원
서울,9411000,605,512
부산,3349000,770,98
인천,2954000,1063,98
대구,2389000,884,77
대전,1452000,539,42
광주,1431000,501,40
울산,1117000,1062,75
수원,1184000,121,40`,
    books: `제목,저자,분류,판매부수,평점
"채식주의자",한강,소설,1240000,4.3
"파친코",이민진,소설,890000,4.5
"역행자",자청,자기계발,750000,4.1
"세이노의 가르침",세이노,자기계발,1350000,4.6
"트렌드 코리아 2026",김난도,경제,420000,4.2
"불변의 법칙",모건 하우절,경제,310000,4.4
"이처럼 사소한 것들",클레어 키건,소설,180000,4.5`,
  };

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

  /* ---------- CSV parser (handles "..." and "" escape) ---------- */
  function detectDelimiter(text) {
    const sample = text.split("\n").slice(0, 5).join("\n");
    const counts = { ",": 0, "\t": 0, ";": 0, "|": 0 };
    for (const ch of sample) if (counts[ch] !== undefined) counts[ch]++;
    let best = ",";
    let bestCount = 0;
    for (const [d, c] of Object.entries(counts)) {
      if (c > bestCount) {
        best = d;
        bestCount = c;
      }
    }
    return bestCount === 0 ? "," : best;
  }

  function parseCsv(text, delimiter) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }

      if (ch === '"' && field === "") {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === delimiter) {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (ch === "\r") { i++; continue; }
      if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      field += ch;
      i++;
    }
    if (field !== "" || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    // Drop completely empty trailing rows (e.g., trailing newline produced [""]).
    while (rows.length && rows[rows.length - 1].every((v) => v === "")) rows.pop();
    return rows;
  }

  /* ---------- Type inference ---------- */
  const NUMBER_RE = /^-?\d+(\.\d+)?$/;
  const BOOL_RE = /^(true|false|TRUE|FALSE)$/;
  const DATE_RE = /^\d{4}-\d{1,2}(-\d{1,2})?(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:?\d{2})?)?$/;

  function inferType(values) {
    if (values.every((v) => v === "")) return "string";
    const non = values.filter((v) => v !== "");
    if (non.every((v) => NUMBER_RE.test(v.replace(/,/g, "")))) return "number";
    if (non.every((v) => BOOL_RE.test(v))) return "boolean";
    if (non.every((v) => DATE_RE.test(v))) return "date";
    return "string";
  }

  function castValue(raw, type) {
    if (raw === "") return null;
    if (type === "number") return Number(raw.replace(/,/g, ""));
    if (type === "boolean") return /^true$/i.test(raw);
    return raw;
  }

  /* ---------- State ---------- */
  let parsed = { headers: [], types: [], rows: [] }; // typed rows: array of arrays (parallel to headers)
  let sortState = { col: -1, dir: 0 }; // dir: 0=none, 1=asc, -1=desc
  let viewMode = "table";

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      if (s.delimiter) delimiterSel.value = s.delimiter;
      if (typeof s.hasHeader === "boolean") hasHeaderInput.checked = s.hasHeader;
      if (s.viewMode === "chart") setView("chart");
    } catch {}
  }
  function saveSettings() {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        delimiter: delimiterSel.value,
        hasHeader: hasHeaderInput.checked,
        viewMode,
      })
    );
  }

  /* ---------- Render ---------- */
  function process() {
    const raw = editor.value;
    localStorage.setItem(STORAGE_KEY, raw);

    if (!raw.trim()) {
      parsed = { headers: [], types: [], rows: [] };
      diagnostic.textContent = "대기 중";
      diagnostic.className = "diagnostic";
      rowCount.textContent = "0";
      colCount.textContent = "0";
      dataTable.innerHTML = '<tbody><tr><td class="empty-state">CSV를 입력하면 표로 보여 드립니다.</td></tr></tbody>';
      chart.innerHTML = '<div class="chart-empty">데이터가 없습니다.</div>';
      return;
    }

    let delim = delimiterSel.value;
    if (delim === "auto") delim = detectDelimiter(raw);
    if (delim === "\\t") delim = "\t";

    const rawRows = parseCsv(raw, delim);
    if (!rawRows.length) {
      diagnostic.textContent = "행이 없습니다";
      diagnostic.className = "diagnostic error";
      return;
    }

    // Normalize all rows to the widest column count.
    const cols = Math.max(...rawRows.map((r) => r.length));
    rawRows.forEach((r) => {
      while (r.length < cols) r.push("");
    });

    let headers, dataRows;
    if (hasHeaderInput.checked) {
      headers = rawRows[0].map((h, i) => h.trim() || `col_${i + 1}`);
      dataRows = rawRows.slice(1);
    } else {
      headers = Array.from({ length: cols }, (_, i) => `col_${i + 1}`);
      dataRows = rawRows;
    }

    // Per-column type inference + cast
    const types = headers.map((_, c) => inferType(dataRows.map((r) => r[c] ?? "")));
    const typedRows = dataRows.map((r) => r.map((v, c) => castValue(v, types[c])));

    parsed = { headers, types, rows: typedRows };
    sortState = { col: -1, dir: 0 };

    diagnostic.textContent = `유효한 CSV · 구분자 ${describeDelim(delim)} · ${dataRows.length}행 × ${cols}열`;
    diagnostic.className = "diagnostic ok";
    rowCount.textContent = String(dataRows.length);
    colCount.textContent = String(cols);

    renderTable();
    renderAxisOptions();
    renderChart();
  }

  function describeDelim(d) {
    if (d === ",") return "쉼표";
    if (d === "\t") return "탭";
    if (d === ";") return "세미콜론";
    if (d === "|") return "파이프";
    return JSON.stringify(d);
  }

  function renderTable() {
    const { headers, types, rows } = parsed;
    if (!headers.length) {
      dataTable.innerHTML = "";
      return;
    }

    // Apply sort
    let displayRows = rows.map((r, i) => ({ row: r, originalIndex: i }));
    if (sortState.col >= 0 && sortState.dir !== 0) {
      const col = sortState.col;
      const t = types[col];
      displayRows.sort((a, b) => compareCell(a.row[col], b.row[col], t) * sortState.dir);
    }

    let html = "<thead><tr><th class='row-num'>#</th>";
    headers.forEach((h, c) => {
      const arrow = sortState.col === c
        ? (sortState.dir === 1 ? "<span class='sort-arrow'>▲</span>" : "<span class='sort-arrow'>▼</span>")
        : "";
      html += `<th data-col="${c}">${escapeHtml(h)}<span class="type-tag">${types[c]}</span>${arrow}</th>`;
    });
    html += "</tr></thead><tbody>";

    displayRows.forEach((d, i) => {
      html += `<tr><td class="row-num">${d.originalIndex + 1}</td>`;
      d.row.forEach((v, c) => {
        const t = types[c];
        let cls = `t-${t}`;
        let display;
        if (v === null || v === undefined || v === "") {
          cls += " t-empty";
          display = "—";
        } else if (t === "number") {
          display = Number(v).toLocaleString("ko-KR", { maximumFractionDigits: 6 });
        } else {
          display = escapeHtml(String(v));
        }
        html += `<td class="${cls}">${display}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody>";
    dataTable.innerHTML = html;
  }

  function compareCell(a, b, type) {
    const aN = a === null || a === undefined || a === "";
    const bN = b === null || b === undefined || b === "";
    if (aN && bN) return 0;
    if (aN) return 1;
    if (bN) return -1;
    if (type === "number") return a - b;
    if (type === "boolean") return (a === b) ? 0 : (a ? -1 : 1);
    return String(a).localeCompare(String(b), "ko");
  }

  /* ---------- Sort wiring ---------- */
  dataTable.addEventListener("click", (e) => {
    const th = e.target.closest("th[data-col]");
    if (!th) return;
    const col = +th.dataset.col;
    if (sortState.col !== col) {
      sortState = { col, dir: 1 };
    } else {
      sortState.dir = sortState.dir === 1 ? -1 : sortState.dir === -1 ? 0 : 1;
      if (sortState.dir === 0) sortState.col = -1;
    }
    renderTable();
  });

  /* ---------- Chart ---------- */
  function renderAxisOptions() {
    const { headers, types } = parsed;
    if (!headers.length) {
      xAxis.innerHTML = "";
      yAxis.innerHTML = "";
      return;
    }
    const prevX = xAxis.value;
    const prevY = yAxis.value;

    xAxis.innerHTML = headers
      .map((h, i) => `<option value="${i}">${escapeHtml(h)} (${types[i]})</option>`)
      .join("");
    yAxis.innerHTML = headers
      .map((h, i) => `<option value="${i}"${types[i] === "number" ? "" : " disabled"}>${escapeHtml(h)} (${types[i]})</option>`)
      .join("");

    // Try to keep previous selection or pick sensible defaults.
    if (prevX && +prevX < headers.length) xAxis.value = prevX;
    else {
      const firstStr = types.findIndex((t) => t === "string" || t === "date");
      xAxis.value = String(firstStr >= 0 ? firstStr : 0);
    }
    if (prevY && +prevY < headers.length && types[+prevY] === "number") yAxis.value = prevY;
    else {
      const firstNum = types.findIndex((t) => t === "number");
      yAxis.value = firstNum >= 0 ? String(firstNum) : "";
    }
  }

  function renderChart() {
    const { headers, types, rows } = parsed;
    if (!headers.length || !rows.length) {
      chart.innerHTML = '<div class="chart-empty">데이터가 없습니다.</div>';
      return;
    }
    const xi = +xAxis.value;
    const yi = +yAxis.value;
    const agg = aggregate.value;

    if (Number.isNaN(xi)) {
      chart.innerHTML = '<div class="chart-empty">X축을 선택하세요.</div>';
      return;
    }
    if (agg !== "count" && (Number.isNaN(yi) || types[yi] !== "number")) {
      chart.innerHTML = '<div class="chart-empty">Y축에는 숫자 컬럼을 골라야 합니다. (또는 집계를 "개수" 로)</div>';
      return;
    }

    // Group rows by x value.
    const groups = new Map();
    rows.forEach((r) => {
      const key = formatKey(r[xi], types[xi]);
      const list = groups.get(key) || [];
      const v = agg === "count" ? 1 : (typeof r[yi] === "number" ? r[yi] : null);
      if (v !== null) list.push(v);
      groups.set(key, list);
    });

    const aggregated = [...groups.entries()].map(([key, vals]) => {
      let out;
      if (agg === "count") out = vals.length;
      else if (agg === "sum") out = vals.reduce((a, b) => a + b, 0);
      else if (agg === "avg") out = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      else if (agg === "max") out = vals.length ? Math.max(...vals) : 0;
      else if (agg === "min") out = vals.length ? Math.min(...vals) : 0;
      return { key, value: out };
    });

    if (!aggregated.length) {
      chart.innerHTML = '<div class="chart-empty">집계할 값이 없습니다.</div>';
      return;
    }

    drawBarChart(aggregated);
  }

  function formatKey(v, type) {
    if (v === null || v === undefined || v === "") return "(빈 값)";
    if (type === "number") return v.toLocaleString("ko-KR");
    return String(v);
  }

  function drawBarChart(items) {
    const w = Math.max(items.length * 64, chart.clientWidth - 40);
    const padTop = 24, padBottom = 80, padLeft = 56, padRight = 16;
    const h = 320;
    const innerW = w - padLeft - padRight;
    const innerH = h - padTop - padBottom;

    const max = Math.max(...items.map((d) => d.value));
    const min = Math.min(0, ...items.map((d) => d.value));
    const range = max - min || 1;
    const scale = (v) => innerH - ((v - min) / range) * innerH;

    const barWidth = innerW / items.length * 0.7;
    const gap = innerW / items.length * 0.3;

    let bars = "";
    let labels = "";
    let values = "";

    items.forEach((d, i) => {
      const x = padLeft + i * (barWidth + gap) + gap / 2;
      const yBase = padTop + scale(0);
      const yTop = padTop + scale(d.value);
      const barH = Math.abs(yBase - yTop);
      const yRect = Math.min(yBase, yTop);

      bars += `<rect class="bar" x="${x.toFixed(1)}" y="${yRect.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="3"></rect>`;
      values += `<text class="value" x="${(x + barWidth / 2).toFixed(1)}" y="${(yTop - 4).toFixed(1)}" text-anchor="middle">${formatNum(d.value)}</text>`;

      const labelX = x + barWidth / 2;
      const labelY = h - padBottom + 16;
      labels += `<text class="label" x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="end" transform="rotate(-30 ${labelX.toFixed(1)} ${labelY.toFixed(1)})">${escapeHtml(truncate(d.key, 16))}</text>`;
    });

    // Y axis: 5 ticks
    let yTicks = "";
    for (let i = 0; i <= 4; i++) {
      const v = min + (range * i) / 4;
      const y = padTop + scale(v);
      yTicks += `<line class="axis" x1="${padLeft}" x2="${w - padRight}" y1="${y}" y2="${y}"></line>`;
      yTicks += `<text class="label" x="${padLeft - 8}" y="${y + 3}" text-anchor="end">${formatNum(v)}</text>`;
    }

    chart.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      ${yTicks}
      ${bars}
      ${values}
      ${labels}
    </svg>`;
  }

  function formatNum(n) {
    if (!Number.isFinite(n)) return String(n);
    if (Math.abs(n) >= 1e7) return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(0) + "k";
    if (Number.isInteger(n)) return n.toLocaleString("ko-KR");
    return n.toFixed(2);
  }

  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  /* ---------- View toggle ---------- */
  function setView(mode) {
    viewMode = mode;
    tableView.classList.toggle("active", mode === "table");
    chartView.classList.toggle("active", mode === "chart");
    document.querySelectorAll(".view-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === mode);
    });
    viewLabel.textContent = mode === "table" ? "표" : "차트";
    saveSettings();
    if (mode === "chart") renderChart();
  }
  document.querySelectorAll(".view-btn").forEach((b) => {
    b.addEventListener("click", () => setView(b.dataset.view));
  });

  /* ---------- Listeners ---------- */
  let renderTimer = null;
  editor.addEventListener("input", () => {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(process, 150);
  });

  delimiterSel.addEventListener("change", () => { saveSettings(); process(); });
  hasHeaderInput.addEventListener("change", () => { saveSettings(); process(); });

  xAxis.addEventListener("change", renderChart);
  yAxis.addEventListener("change", renderChart);
  aggregate.addEventListener("change", renderChart);

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

  document.getElementById("downloadBtn").addEventListener("click", () => {
    const blob = new Blob([editor.value], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.value);
      toast("CSV를 복사했습니다");
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

  /* ---------- Init ---------- */
  loadSettings();

  const saved = localStorage.getItem(STORAGE_KEY);
  editor.value = saved != null ? saved : templates.attendance;
  process();
})();
