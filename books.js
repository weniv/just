/* ============================================================
   딱 필요한 만큼 — 책 메타데이터
   ------------------------------------------------------------
   허브 페이지에서 카드를 그릴 때 사용하는 단일 진실 소스입니다.
   새 책을 추가할 때는 이 파일에 한 항목만 더하면 됩니다.

   accent 색은 위니브 디자인 시스템의 코드 컬러 팔레트
   (pink / purple / blue / green / orange / logo green / error)
   를 따릅니다.
============================================================ */

window.JUST_BOOKS = [
  {
    slug: "markdown",
    title: "마크다운",
    tagline: "AI와의 공용어, 30분이면 충분합니다",
    description:
      "헤딩·목록·표·코드블록·체크리스트·프론트매터. 좌측에 입력하면 우측에 결과가 즉시 렌더링됩니다.",
    practiceUrl: "./markdown/",
    bookUrl: "https://www.books.weniv.co.kr/just-markdown",
    icon: "MD",
    accent: "#2e6ff2",
    status: "released",
  },
  {
    slug: "json",
    title: "JSON",
    tagline: "AI 응답·API·설정 파일을 읽는 시야",
    description:
      "JSON을 트리로 시각화하고 포맷·검증·경로 추출까지. 깊게 중첩된 구조도 한눈에 들어옵니다.",
    practiceUrl: "./json/",
    bookUrl: null,
    icon: "JSON",
    accent: "#2e5dd6",
    status: "practice-only",
  },
  {
    slug: "color",
    title: "색상",
    tagline: "hex·rgb·hsl과 명도 대비를 한 화면에",
    description:
      "컬러 피커, 포맷 변환, WCAG 명도 대비 검증. AI에게 색을 요청하기 전에 감을 잡는 도구입니다.",
    practiceUrl: "./color/",
    bookUrl: null,
    icon: "COLOR",
    accent: "#c93864",
    status: "practice-only",
  },
  {
    slug: "time",
    title: "타임스탬프",
    tagline: "Unix·ISO·사람이 읽는 시간을 자유롭게",
    description:
      "Unix 초 ↔ ISO 8601 ↔ 사람 시간을 양방향 동기화. 시간대 변환과 상대 시간 계산까지 한자리에서.",
    practiceUrl: "./time/",
    bookUrl: null,
    icon: "TIME",
    accent: "#e37c00",
    status: "practice-only",
  },
  {
    slug: "html-css",
    title: "HTML / CSS",
    tagline: "AI가 만든 화면을 직접 만져 보기",
    description:
      "HTML·CSS·JS 탭 입력에 sandbox iframe 라이브 미리보기. 플렉스·그리드·반응형 예제 6종 제공.",
    practiceUrl: "./html-css/",
    bookUrl: null,
    icon: "HTML",
    accent: "#328026",
    status: "practice-only",
  },
  {
    slug: "csv",
    title: "CSV",
    tagline: "표 데이터를 시각적으로 다루기",
    description:
      "구분자 자동 감지, 타입 추론, 정렬 가능한 표, 그룹·집계 기반 막대 차트까지 한자리에서.",
    practiceUrl: "./csv/",
    bookUrl: null,
    icon: "CSV",
    accent: "#964dd1",
    status: "practice-only",
  },
  {
    slug: "http",
    title: "HTTP",
    tagline: "위니브 eduAPI로 직접 요청 보내기",
    description:
      "메서드·헤더·바디 빌더에 응답 트리 시각화. 인증·블로그 CRUD 9개 프리셋과 토큰 자동 캡처를 지원합니다.",
    practiceUrl: "./http/",
    bookUrl: null,
    icon: "HTTP",
    accent: "#15bf70",
    status: "practice-only",
  },
  {
    slug: "auth",
    title: "JWT / 인증",
    tagline: "토큰 안에 무엇이 들어 있는지 보기",
    description:
      "JWT 헤더·페이로드·서명 분해, 만료·발급 시각, Base64·Base64URL·URL 인코딩 변환을 한 화면에서.",
    practiceUrl: "./auth/",
    bookUrl: null,
    icon: "JWT",
    accent: "#ff3440",
    status: "practice-only",
  },
  {
    slug: "cron",
    title: "Cron",
    tagline: "5필드 표현식이 정확히 언제 도는지 보기",
    description:
      "분·시·일·월·요일을 분해해 사람 말로 풀고, 다음 실행 시각을 시간대별로 계산. 매일 자정·매주 월요일 같은 프리셋 9종을 클릭 한 번으로.",
    practiceUrl: "./cron/",
    bookUrl: null,
    icon: "CRON",
    accent: "#ffc533",
    status: "practice-only",
  },
  {
    slug: "regex",
    title: "정규식",
    tagline: "AI가 만든 패턴이 진짜 매칭하는지 확인",
    description:
      "정규식과 테스트 문자열을 한 화면에. 매치 하이라이트, 캡처 그룹, g/i/m/s/u 플래그, 자주 쓰는 패턴 8종을 즉시 시도해 봅니다.",
    practiceUrl: "./regex/",
    bookUrl: null,
    icon: "REGEX",
    accent: "#964dd1",
    status: "practice-only",
  },
];

window.JUST_STATUS_LABEL = {
  released: { text: "출간", className: "status-released" },
  "practice-only": { text: "실습 가능", className: "status-practice" },
  "coming-soon": { text: "준비중", className: "status-soon" },
};
