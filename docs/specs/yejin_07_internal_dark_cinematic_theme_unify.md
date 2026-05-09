## 목표
internal 전체(메인 hero, Code Insight, Dashboard, Upload, Visualization, Login/Signup 등)가 하나의 **“RE:FACTORY analysis system”**으로 느껴지도록 **visual system/theme/interactions**를 통일한다.

중요:
- “전체 리디자인”이 아니라 **기존 레이아웃/기능 구조 유지**가 최우선
- external과 명확히 구분되는 **dark cinematic developer tool** 톤
- neon cyberpunk / pure white / pastel card / bright SaaS 톤 금지

---

## 새 컬러 시스템 (Design Tokens)
- **Base Background**: `#202931`
- **Surface**: `rgba(255,255,255,0.03)`
- **Elevated Surface**: `rgba(255,255,255,0.05)`
- **Border**: `rgba(235,245,251,0.10 ~ 0.16)`
- **Primary Text**: `#EBF5FB`
- **Secondary Text**: `rgba(235,245,251,0.62)`
- **Muted Text**: `rgba(235,245,251,0.32)`
- **Accent**: `#9FE7F0`
- **Danger**: `rgba(255,120,120,0.85)`
- **Success**: `rgba(120,255,180,0.85)`

---

## 기술 스택/제약
- React + TypeScript + (CSS / CSS Modules 혼재) 유지
- 기존 컴포넌트 구조/클래스명은 가능한 유지
- spotlight/GSAP 기반 hero 인터랙션은 유지 (필요 시 불변)
- 전역 body/background 강제 변경은 최소화 (white flash 방지 목적 제외)

---

## 구현 단계 (Phases)

### Phase 1 — Global theme tokens & base surface
- `src/index.css` 또는 공통 CSS에 internal 토큰을 CSS 변수로 정의
- `body`, `html`, root 컨테이너에 dark base 적용 (페이지 전환 시 white flash 방지)
- 공통 타이포/링크/selection/scrollbar(선택) 등 최소 레벨 정리

**검증 기준**
- internal 어떤 라우트에서도 `#E9F5FD`/white 배경 플래시가 보이지 않는다.
- 텍스트 대비가 충분하고(Primary/Secondary/Mute) 읽기 가능하다.

### Phase 2 — Shared UI primitives styling (cards/buttons/inputs)
- Cards: glass surface + border + blur + shadow
- Buttons: dark glass + subtle glow hover + focus-visible cyan accent (파란 outline 금지)
- Inputs/Textareas: dark surface + muted border + subtle focus glow
- Tabs/Dropdown/Modals/Upload area: 동일 톤으로 통일

**검증 기준**
- internal 전반에서 버튼/인풋/카드가 동일한 제품 톤으로 보인다.
- hover/focus가 과하지 않으며 neon/bright outline이 없다.

### Phase 3 — Page-level CSS cleanup & unification
대상 파일(예상):
- `src/pages/CodeInsight/**` (Upload/GitHubConnect/Dashboard 등)
- `src/pages/DashboardPage/**`
- `src/pages/VisualizationPage/**`
- `src/components/AuthPanel/**` (Login/Signup)
- 기타 internal에서 사용하는 밝은 테마 CSS들

작업:
- 밝은 배경/white-heavy 스타일 제거
- 카드/패널/테이블/그래프 영역을 surface 토큰으로 교체

**검증 기준**
- 주요 페이지들에서 pastel/white card UI가 사라지고 dark cinematic workspace로 통일된다.

### Phase 4 — Transition/motion tone
- 라우트 전환/패널 오픈 시 subtle fade/blur(가능 범위) 적용
- animation easing 통일(`power3.out`/`expo.out`)

**검증 기준**
- 페이지 이동 시 abrupt flash가 없고, internal “한 시스템 내 이동” 느낌이 난다.

---

## 수동 체크리스트 (Acceptance Criteria)
- [ ] internal 모든 페이지가 같은 제품(세계관)으로 보인다.
- [ ] 메인 hero와 자연스럽게 연결된다.
- [ ] external과 분위기가 명확히 구분된다.
- [ ] bright SaaS/pastel/white-heavy UI 흔적이 없다.
- [ ] neon cyberpunk/게임 HUD 느낌이 없다.
- [ ] 기존 기능/레이아웃 구조가 유지된다.

