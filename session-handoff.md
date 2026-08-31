# Session Handoff

## Last Session: 2026-08-18 (feature-loop 하네스 실행 — optimization-pass, 9/9 완료)

### What Was Accomplished

- `optimization-pass`(priority 9, 마지막 feature) 구현 완료 — **9개 feature 전부
  `passing`**. Generate 3D 노드 렌더링이 최적화 적용 전보다 드로우콜/프레임 시간이
  개선된 상태로 동작한다.
- `docs/product-plan.md` 6번 섹션 체크리스트 중 적용한 항목:
  - **3번(불필요한 리렌더 방지 → 온디맨드 렌더링)**: `apps/frontend/src/three/modelScene.ts`의
    렌더 루프가 매 프레임 무조건 `render()`하던 것을, `OrbitControls`의 `change`
    이벤트와 모델 로드 완료 시에만 그리도록 변경.
  - **5번(프레임 측정)**: `ModelSceneHandle.getStats()`가 ticks/frames/drawCalls/renderMs를
    누적, 개발 모드 + `?three-stats` 쿼리일 때만 1초 간격 콘솔 로그.
  - **1번(텍스처 재사용/해제) 중 해제 부분**: `material.dispose()`가 텍스처는 지우지
    않는다는 사실을 발견해 `disposeMaterial()`이 머티리얼이 들고 있는 `Texture`까지
    dispose하도록 보완.
  - 4번(픽셀 비율 상한)은 `generate-3d-preview`에서 이미 적용돼 있었음(재확인만).
  - **2번(지오메트리/머티리얼 공유)은 미적용** — 노드마다 독립된 `<canvas>`/`WebGLRenderer`라
    GPU 리소스가 컨텍스트에 종속돼 공유가 원천적으로 불가능. 사유를
    `docs/product-plan.md` 6.1절에 기록.
- **측정치(전/후)**: `apps/frontend/src/three/__tests__/renderBudget.test.ts`(스텁
  렌더러로 실제 `render()` 호출/`renderer.info.render.calls`를 카운트)로 유휴 120틱
  기준 렌더 프레임/드로우콜 120 → 1(-99.2%), 카메라 조작 31틱은 전/후 모두
  31프레임(조작 품질 유지 확인).
- **번들 크기**(이전 세션에서 이관된 과제): `Generate3dNode`가 `ModelViewer`를
  `React.lazy`로 로드해 `three`를 초기 청크에서 분리 — 초기 청크
  1,160.77kB(gzip 328.79kB) → 531.41kB(gzip 167.70kB, **-49%**), `ModelViewer`
  청크(629.17kB, gzip 160.67kB)는 3D 결과가 실제로 생겼을 때만 로드.
- QA가 코드 대조(스텁 벤치마크가 실측 구조인지, 미적용 판단이 타당한지) +
  `pnpm turbo run build lint check-types test` 재실행(15/15) +
  **실브라우저 재검증**을 직접 수행: `pnpm dev` 기동, fetch를 패치해
  `/api/generate-image`·`/api/generate-3d`만 모킹하고 Khronos 공개 `Box.glb`를
  `modelUrl`로 응답시켜 실제 UI로 텍스트→이미지→3D 파이프라인을 실행. 결과: 콘솔
  `[three-stats]` 로그가 idle 시 `rendered frames/s 0.0`으로 떨어짐(실측),
  **5초 이상 idle에도 캔버스의 모델이 사라지거나 깜빡이지 않음**(온디맨드 렌더링의
  최대 리스크로 implementer가 지목했던 항목 해소), 드래그 회전이 매끄럽고 React
  Flow 캔버스는 팬되지 않음(nodrag/nowheel 격리 유지), 콘솔 에러 0건.
- `feature_list.json`의 `optimization-pass.status` → `passing`, evidence에
  implementer 초안 + QA 재검증 내역 모두 기록. **9/9 passing 도달**.
- 하네스 설정 변경(사용자 요청): `feature-implementer` 서브에이전트 모델도
  opus → sonnet으로 낮춤(`qa-verifier`는 이미 sonnet). 이제 둘 다 sonnet.
  `.claude/agents/feature-implementer.md`, `.claude/skills/feature-loop/SKILL.md`,
  `CLAUDE.md` 변경 이력에 반영, 별도 커밋으로 분리.

### What Remains

- **feature_list.json 관점에서는 남은 feature 없음** — 9/9 passing. `feature-loop`
  하네스 규칙에 따라 이번 세션에서 `feature-loop/remaining-features` → `main` PR을
  생성한다(아래 Next Steps 참고). PR 생성/병합은 완료가 아니라 "사람이 리뷰할 준비가
  됐다"는 뜻 — 실제 완료는 사용자가 PR을 리뷰·병합해야 확정된다.
- 실 API 키 종단 검증 미완료(둘 다 mock 기반 상태 전이까지만 검증됨, 여러 세션에
  걸쳐 반복 기록된 남은 과제):
  - `ai-image-generation`: 실 `OPENAI_API_KEY` 종단 성공 경로(200 응답 + 실제 이미지)
  - `generate-3d-preview`: 실 `MESHY_API_KEY` 종단 성공 경로(200 응답 + 실제 .glb)
- `docs/api-spec.md`의 `response_format: "b64_json"` 서술 오류(코드가 맞고 문서가
  낡음, `rest-api` feature에서 넘어온 것) — 여전히 미정리, 우선순위 낮음.
- vite 빌드에 500kB 청크 경고가 여전히 뜬다 — 대상이 `three`(`ModelViewer` 청크,
  지연 로드라 초기 로드에는 영향 없음)에서 앱 본체 청크(531kB)로 바뀐 상태.
  기능 문제는 아니라 추가 조치는 후속 과제로 남김.
- 온디막드 렌더링의 알려진 한계: 캔버스 크기/DPR이 바뀌는 상황(노드 카드 리사이즈,
  모니터 간 이동)에서는 재도색 트리거가 없다 — 현재 노드 카드가 고정 크기(`w-80`
  + `aspect-square`)라 실제로는 발생하지 않지만, 카드 크기가 가변으로 바뀌면
  ResizeObserver 등으로 트리거를 추가해야 한다.

### Decisions Made

- **온디맨드 렌더링을 텍스처/지오메트리 공유보다 우선** — 노드별 독립 캔버스 구조상
  지오메트리/머티리얼 공유는 애초에 불가능하지만(GPU 리소스가 WebGL 컨텍스트에
  종속), 온디맨드 렌더링은 구조 변경 없이 유휴 상태의 드로우콜을 99% 이상 줄이는
  가장 비용 대비 효과가 큰 최적화였다.
- **체크리스트 전부가 아니라 실제로 의미 있는 항목만 적용** — `docs/product-plan.md`가
  명시한 대로 1~2개만 적용해도 벤치마크 비교가 가능하다는 원칙을 따름. 미적용
  항목(지오메트리/머티리얼 공유)은 "왜 미적용인지"를 거짓 없이 문서에 남기는 것을
  "억지로 적용"보다 우선.
- **QA가 jsdom 한계로 자동화 못 하는 항목은 QA/리더가 실브라우저로 직접 메꾼다** —
  `generate-3d-preview`에서 리더가 먼저 이 패턴을 썼고, 이번엔 QA가 스스로 같은
  패턴(fetch 모킹 + 공개 샘플 glTF)으로 실브라우저 검증까지 수행. 이후 feature에서도
  Three.js/UI 관련 QA 갭이 남으면 이 방식을 재사용할 것.
- (이전 세션 결정, 유효함) `main` 직접 커밋 중단, `feature-loop/remaining-features`에서
  작업 후 9/9 passing 시 PR 1개로 통합. fan-in 정렬은 캔버스 좌표 기준. pending 실행
  소유권은 awareness+타임아웃. Three.js는 래퍼 없이 직접 배관.

### Files Modified

- `apps/frontend/src/three/modelScene.ts`(온디맨드 렌더링, 텍스처 dispose 보완,
  계측 API) + `__tests__/modelScene.test.ts`
- `apps/frontend/src/three/__tests__/renderBudget.test.ts`(신규 — 전/후 벤치마크)
- `apps/frontend/src/components/pipeline/Generate3dNode.tsx`(`ModelViewer`
  `React.lazy` 로드)
- `docs/product-plan.md`(6.1절 신규 — 미적용 항목 사유 기록)
- `.claude/agents/feature-implementer.md`(model: sonnet 추가),
  `.claude/skills/feature-loop/SKILL.md`(두 서브에이전트 모두 sonnet으로 갱신),
  `CLAUDE.md`(변경 이력)
- `feature_list.json`(`optimization-pass` 항목 `passing` 전환, 9/9 달성),
  `session-handoff.md`, `claude-progress.md`, `.claude/observability/feature-loop.jsonl`

### Blockers

없음.

### Next Steps

1. **9/9 passing 도달** — 하네스 규칙에 따라 `feature-loop/remaining-features`를
   원격에 push하고 `main`으로 향하는 PR을 생성한다(`.github/PULL_REQUEST_TEMPLATE.md`
   사용, "리뷰어가 특히 봐야 할 곳"에 두 API 키 미검증 항목을 반드시 포함).
2. PR 생성 후에는 **병합하지 않는다** — 사용자가 직접 리뷰 후 병합.
3. PR 병합 후 후속 과제(우선순위 낮음, 새 feature 아님): 실 API 키 종단 검증 2건,
   `docs/api-spec.md` 서술 오류 정리.
