# Session Handoff

## Last Session: 2026-07-10 (Session 011)

### What Was Accomplished

- `pipeline-canvas` feature(priority 3) 구현 완료 — React Flow 기반 노드 파이프라인
  캔버스: Text Prompt / Generate Image / Generate 3D 노드 추가·이동·삭제, `@repo/
  shared-types`의 `canConnect`로만 검증하는 엣지 연결(text-to-text, image-to-image),
  노드 삭제 시 연결 엣지 cascade 삭제.
- `apps/frontend`에 Tailwind v4 + shadcn/ui(Button/Textarea/Badge/Separator) +
  `@xyflow/react` 신규 설치, Figma 시안(fileKey `8iwrgRN75JQ7xDkVdEfTp8`, frame
  `1:312`) 기준으로 구현.
- 전역 상태(Zustand/Context) 없이 `usePipelineState` 로컬 훅 하나로 도메인 상태 관리.
- `pipeline-canvas.status` → `passing`(`feature_list.json` evidence 참고).
- 사용자가 보고한 버그 3건(드래그 깜빡임, 배경 dot 그리드 미표시, 타이핑 중 IME 포커스
  풀림) 처리 — 근본 원인은 전부 `PipelineCanvas`의 재조정 로직이 `useEffect` 기반이라
  생긴 지연된 두 번째 렌더 패스였음. React 공식 "렌더링 중 상태 조정" 패턴으로 교체.
- `claude-progress.md`를 learn-harness-engineering L05 가이드에 맞춰 슬림화(상태
  스냅샷 + 짧은 세션 로그), `CLAUDE.md`에 "불필요한 주석 금지" 규칙 추가.

### What Remains

- `rest-api`(priority 4) 시작 전 `docs/api-spec.md`(스텁) 채우기 필요 —
  `/api/generate-image`, `/api/upload`, `/uploads/:filename` 요청/응답 스키마 정의.
- `docs/acceptance-criteria.md`도 여전히 스텁 — `collab-canvas`/`ai-image-generation`/
  `generate-3d-preview`를 시작하기 전 재작성 필요.

### Decisions Made

- 전역 상태 최소화: `usePipelineState`를 컴포넌트 로컬 훅으로 유지, Zustand/Context는
  도입하지 않음(사용자 지시).
- React Flow 재조정은 `useEffect`가 아니라 렌더링 중 상태 조정(`useRef` + 조건부
  `setState`) 패턴으로 처리 — Effect 기반은 지연된 두 번째 렌더 패스를 만들어 드래그
  깜빡임과 IME 입력 버그의 근본 원인이 됐음(사용자 피드백: "useEffect는 side-effect
  용도로만, 명확한 이유가 있을 때만").
- Playwright는 이번 세션 검증에만 임시 사용, 프로젝트 정식 의존성으로는 아직 추가하지
  않음.
- 진행 로그 관리 방식: `claude-progress.md`는 상태 스냅샷 위주로 슬림화하고, "왜"
  판단은 별도 `DECISIONS.md`를 새로 만들지 않고 이 파일의 "Decisions Made"에 남기기로
  함(learn-harness-engineering L05 가이드 참고, 프로젝트 규모상 파일을 더 늘리는 것은
  과함).

### Files Modified

- `apps/frontend/package.json`(tailwindcss/@tailwindcss/vite/shadcn 관련
  패키지/@xyflow/react 추가), `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`,
  `components.json`(신규), `src/index.css`(신규), `src/lib/utils.ts`(신규)
- `src/main.tsx`, `src/App.tsx`
- `src/components/ui/{button,textarea,badge,separator}.tsx`(shadcn 신규)
- `src/components/pipeline/*`(PortHandle/NodeCardShell/TextPromptNode/GenerateImageNode/
  Generate3dNode/AddNodeToolbar/PipelineCanvas, 전부 신규)
- `src/pipeline/{usePipelineState,reactFlowAdapter}.ts`(신규) 및 각 `__tests__`
- `vitest.setup.ts`, `src/__tests__/App.test.tsx`
- `feature_list.json`, `claude-progress.md`, `CLAUDE.md`
- `pnpm-lock.yaml`

### Blockers

없음. 다만 커밋되지 않은 변경사항이 Session 007부터 계속 쌓여 있음(사용자 요청으로
보류 중) — 다음 세션 시작 시 `git status`로 먼저 확인할 것.

### Next Steps

1. `docs/api-spec.md` 스텁 채우기(`/api/generate-image`, `/api/upload`,
   `/uploads/:filename` 요청/응답 스키마).
2. `rest-api` feature(priority 4) 구현 — Supertest 통합 테스트, API 키 비노출 검증 포함.
