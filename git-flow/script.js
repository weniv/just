/* ============================================================
   깃 흐름 실습장 — 5명령어 시뮬레이터
   ------------------------------------------------------------
   파일 카드가 work → stage → commit → remote 사이를
   FLIP 애니메이션으로 이동합니다.
============================================================ */
(function () {
  /* ---------- Theme ---------- */
  const THEME_KEY = "just:theme";
  const themeToggle = document.getElementById("themeToggle");

  function currentTheme() {
    return (
      localStorage.getItem(THEME_KEY) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    if (themeToggle) themeToggle.checked = theme === "dark";
    localStorage.setItem(THEME_KEY, theme);
  }

  applyTheme(currentTheme());

  /* ---------- Mermaid ---------- */
  const blocks = Array.from(document.querySelectorAll(".mermaid"));
  blocks.forEach((el) => {
    el.dataset.source = el.textContent.trim();
    el.textContent = el.dataset.source;
  });

  function initMermaid(theme) {
    if (!window.mermaid) return;
    window.mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
      securityLevel: "loose",
      fontFamily:
        '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", Roboto, sans-serif',
      flowchart: { htmlLabels: true, curve: "basis" },
    });
  }

  async function renderMermaid() {
    if (!window.mermaid) return;
    blocks.forEach((el) => {
      el.removeAttribute("data-processed");
      el.innerHTML = el.dataset.source;
    });
    try {
      await window.mermaid.run({ nodes: blocks, suppressErrors: false });
    } catch (err) {
      /* mermaid prints its own error UI */
    }
  }

  initMermaid(currentTheme());
  requestAnimationFrame(() => renderMermaid());

  if (themeToggle) {
    themeToggle.addEventListener("change", () => {
      const t = themeToggle.checked ? "dark" : "light";
      applyTheme(t);
      initMermaid(t);
      renderMermaid();
    });
  }

  /* ============================================================
     Simulator
  ============================================================ */
  const areas = {
    remote: document.querySelector('[data-area="remote"]'),
    work: document.querySelector('[data-area="work"]'),
    stage: document.querySelector('[data-area="stage"]'),
    commit: document.querySelector('[data-area="commit"]'),
  };
  const zones = {
    remote: document.querySelector(".zone-remote"),
    work: document.querySelector(".zone-work"),
    stage: document.querySelector(".zone-stage"),
    commit: document.querySelector(".zone-commit"),
  };
  const cmdButtons = {
    clone: document.querySelector('[data-cmd="clone"]'),
    add: document.querySelector('[data-cmd="add"]'),
    commit: document.querySelector('[data-cmd="commit"]'),
    push: document.querySelector('[data-cmd="push"]'),
    pull: document.querySelector('[data-cmd="pull"]'),
  };
  const editBtn = document.getElementById("editBtn");
  const resetBtn = document.getElementById("resetBtn");
  const remoteEditBtn = document.getElementById("remoteEditBtn");
  const statusStep = document.getElementById("statusStep");
  const statusText = document.getElementById("statusText");

  // 파일 카드 모델
  //   { id, name, status: 'new'|'staged'|'committed'|'remote', zone: 'work'|'stage'|'commit'|'remote' }
  let files = [];
  let nextId = 1;
  let editCounter = 0;
  let teammateCounter = 0;
  let pendingPull = []; // 깃허브에 있는데 로컬에 아직 안 가져온 파일 이름들
  let cloned = false;

  const EMPTY_HINT = {
    remote: "비어 있음",
    work: "clone 또는 파일 수정으로 채워집니다",
    stage: "add 로 채워집니다",
    commit: "commit 으로 채워집니다",
  };

  /* ---------- Render with FLIP animation ---------- */
  function render() {
    // 1) FIRST: 현재 모든 카드의 위치 캡처
    const allCards = document.querySelectorAll(".file-card");
    const firstRects = new Map();
    allCards.forEach((c) => firstRects.set(c.dataset.id, c.getBoundingClientRect()));

    // 2) 모델대로 DOM 재배치
    //    Pass A: 모든 파일을 자기 영역으로 이동/생성 (이동이 먼저)
    //    Pass B: 모델에 없는 고아 카드를 제거 (삭제는 나중)
    const byZone = { remote: [], work: [], stage: [], commit: [] };
    files.forEach((f) => byZone[f.zone].push(f));

    // Pass A
    const liveIds = new Set();
    for (const z of ["remote", "work", "stage", "commit"]) {
      const area = areas[z];
      area.querySelectorAll(".empty-hint").forEach((h) => h.remove());

      for (const f of byZone[z]) {
        liveIds.add(f.id);
        let card = document.querySelector(`.file-card[data-id="${f.id}"]`);
        if (!card) {
          card = document.createElement("div");
          card.className = "file-card is-entering";
          card.dataset.id = f.id;
          card.innerHTML = '<span class="file-icon"></span><span class="file-name"></span>';
        }
        card.querySelector(".file-name").textContent = f.name;
        card.classList.remove("is-new", "is-staged", "is-committed", "is-remote");
        card.classList.add(`is-${f.status}`);
        area.appendChild(card); // appendChild는 노드를 옮깁니다
      }
    }

    // Pass B: 모델에 더 이상 없는 카드는 진짜 삭제
    document.querySelectorAll(".file-card").forEach((card) => {
      if (!liveIds.has(card.dataset.id)) {
        card.classList.add("is-leaving");
        setTimeout(() => card.remove(), 300);
      }
    });

    // Pass C: 비어 있는 영역에 힌트
    for (const z of ["remote", "work", "stage", "commit"]) {
      if (byZone[z].length === 0) {
        const hint = document.createElement("span");
        hint.className = "empty-hint";
        hint.textContent = EMPTY_HINT[z];
        areas[z].appendChild(hint);
      }
    }

    // 3) LAST → INVERT → PLAY
    requestAnimationFrame(() => {
      document.querySelectorAll(".file-card").forEach((card) => {
        const id = card.dataset.id;
        const first = firstRects.get(id);
        const last = card.getBoundingClientRect();

        if (first) {
          const dx = first.left - last.left;
          const dy = first.top - last.top;
          if (dx !== 0 || dy !== 0) {
            card.style.transition = "none";
            card.style.transform = `translate(${dx}px, ${dy}px)`;
            requestAnimationFrame(() => {
              card.style.transition = "";
              card.style.transform = "";
            });
          }
        } else if (card.classList.contains("is-entering")) {
          requestAnimationFrame(() => card.classList.remove("is-entering"));
        }
      });
    });

    updateButtons();
  }

  function flashZone(zone) {
    const el = zones[zone];
    if (!el) return;
    el.classList.add("is-flashing");
    setTimeout(() => el.classList.remove("is-flashing"), 700);
  }

  function setStatus(kind, html) {
    const labels = { idle: "대기 중", success: "완료", error: "오류", info: "안내" };
    statusStep.textContent = labels[kind] || "대기 중";
    statusStep.className = "status-step";
    if (kind === "error") statusStep.classList.add("is-error");
    if (kind === "success") statusStep.classList.add("is-success");
    statusText.innerHTML = html;
  }

  function updateButtons() {
    const hasNew = files.some((f) => f.zone === "work" && f.status === "new");
    const hasStaged = files.some((f) => f.zone === "stage");
    const hasCommit = files.some((f) => f.zone === "commit");

    cmdButtons.clone.disabled = cloned;
    cmdButtons.add.disabled = !hasNew;
    cmdButtons.commit.disabled = !hasStaged;
    cmdButtons.push.disabled = !hasCommit;
    cmdButtons.pull.disabled = !cloned || pendingPull.length === 0;
    editBtn.disabled = !cloned;
    remoteEditBtn.disabled = !cloned;
  }

  /* ---------- Commands ---------- */
  function cmdClone() {
    if (cloned) {
      setStatus("error", "<b>clone</b>은 한 레파지토리에 한 번만 합니다. 이미 클론된 상태예요.");
      return;
    }
    // 깃허브의 모든 파일을 작업 폴더로 복제 (카드를 새로 만들어 둘 다 보이게)
    const remoteFiles = files.filter((f) => f.zone === "remote");
    remoteFiles.forEach((rf) => {
      files.push({
        id: String(nextId++),
        name: rf.name,
        status: "committed",
        zone: "work",
      });
    });
    cloned = true;
    setStatus(
      "success",
      "<b>clone</b>: 깃허브의 파일을 내 컴퓨터로 통째로 복사했습니다. 이제 <b>+ 파일 수정</b>으로 변경을 만들어 보세요."
    );
    flashZone("work");
    render();
  }

  function cmdAdd() {
    const modified = files.filter((f) => f.zone === "work" && f.status === "new");
    if (modified.length === 0) {
      setStatus("error", "<b>add</b>할 새 파일이 없습니다. 먼저 <b>+ 파일 수정</b>으로 변경을 만드세요.");
      return;
    }
    modified.forEach((f) => {
      f.zone = "stage";
      f.status = "staged";
    });
    setStatus("success", `<b>add</b>: ${modified.length}개 파일을 이번 버전에 포함시킬 목록으로 모았습니다.`);
    flashZone("stage");
    render();
  }

  function cmdCommit() {
    const staged = files.filter((f) => f.zone === "stage");
    if (staged.length === 0) {
      setStatus("error", "<b>commit</b>할 파일이 없습니다. 먼저 <b>add</b>로 파일을 모으세요.");
      return;
    }
    staged.forEach((f) => {
      f.zone = "commit";
      f.status = "committed";
    });
    setStatus(
      "success",
      `<b>commit</b>: ${staged.length}개 파일을 묶어 버전 하나를 만들었습니다. 이제 <b>push</b>로 깃허브에 올릴 수 있어요.`
    );
    flashZone("commit");
    render();
  }

  function cmdPush() {
    const committed = files.filter((f) => f.zone === "commit");
    if (committed.length === 0) {
      setStatus("error", "<b>push</b>할 버전이 없습니다. 먼저 <b>commit</b>으로 버전을 만드세요.");
      return;
    }
    committed.forEach((f) => {
      f.zone = "remote";
      f.status = "remote";
    });
    setStatus(
      "success",
      `<b>push</b>: 깃허브에 ${committed.length}개 파일을 올렸습니다. 이제 다른 사람도 볼 수 있어요.`
    );
    flashZone("remote");
    render();
  }

  function cmdPull() {
    if (!cloned) {
      setStatus("error", "<b>pull</b>은 먼저 <b>clone</b>한 뒤에 쓸 수 있습니다.");
      return;
    }
    if (pendingPull.length === 0) {
      setStatus(
        "info",
        '<b>pull</b>: 깃허브에 새 변경이 없습니다. 아래의 <b>“다른 사람이 깃허브에 새 파일을 올림”</b> 버튼을 눌러 상황을 만들어 보세요.'
      );
      return;
    }
    const names = pendingPull.slice();
    pendingPull.length = 0;
    names.forEach((name) => {
      files.push({ id: String(nextId++), name, status: "committed", zone: "work" });
    });
    setStatus(
      "success",
      `<b>pull</b>: 깃허브의 최신 변경 ${names.length}개를 내 컴퓨터로 가져왔습니다.`
    );
    flashZone("work");
    render();
  }

  function cmdEdit() {
    if (!cloned) {
      setStatus("error", "아직 작업 폴더가 비어 있습니다. 먼저 <b>clone</b>을 누르세요.");
      return;
    }
    editCounter++;
    const name = `new-${editCounter}.txt`;
    files.push({ id: String(nextId++), name, status: "new", zone: "work" });
    setStatus(
      "info",
      `작업 폴더에 <b>${name}</b>을 만들었습니다. (실제로는 AI가 파일을 수정하는 상황) 이제 <b>add</b>로 모아보세요.`
    );
    flashZone("work");
    render();
  }

  function cmdRemoteEdit() {
    if (!cloned) {
      setStatus("error", "아직 clone 전입니다. 먼저 <b>clone</b>을 누르세요.");
      return;
    }
    teammateCounter++;
    const name = `teammate-${teammateCounter}.md`;
    files.push({ id: String(nextId++), name, status: "remote", zone: "remote" });
    pendingPull.push(name);
    setStatus(
      "info",
      `다른 사람이 깃허브에 <b>${name}</b>을 올렸습니다. 이제 <b>pull</b>로 내 컴퓨터에 가져오세요.`
    );
    flashZone("remote");
    render();
  }

  function reset() {
    files = [];
    cloned = false;
    editCounter = 0;
    teammateCounter = 0;
    pendingPull = [];
    nextId = 1;
    // 깃허브에 기본으로 README가 들어있다고 가정 (위니북스 01-2에서 만든 상태)
    files.push({ id: String(nextId++), name: "README.md", status: "remote", zone: "remote" });
    setStatus("idle", "먼저 <b>clone</b>을 눌러 레파지토리를 내 컴퓨터로 가져오세요.");
    render();
  }

  /* ---------- Wire up ---------- */
  cmdButtons.clone.addEventListener("click", cmdClone);
  cmdButtons.add.addEventListener("click", cmdAdd);
  cmdButtons.commit.addEventListener("click", cmdCommit);
  cmdButtons.push.addEventListener("click", cmdPush);
  cmdButtons.pull.addEventListener("click", cmdPull);
  editBtn.addEventListener("click", cmdEdit);
  resetBtn.addEventListener("click", reset);
  remoteEditBtn.addEventListener("click", cmdRemoteEdit);

  reset();
})();
