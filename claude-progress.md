# Progress Log

## Current State

- 9개 feature 전부 `passing` (9/9) — `feature_list.json` 완료.
  `feature-loop/remaining-features` → `main` PR 생성 대상.
- `optimization-pass`: Generate 3D 노드의 `apps/frontend/src/three/modelScene.ts`에
  온디맨드 렌더링(OrbitControls `change` 이벤트 + 모델 로드 시에만 `render()`)을
  적용해 유휴 상태 렌더 프레임/드로우콜을 120→1(-99.2%)로 줄였다. 머티리얼이 들고
  있던 Texture를 `dispose()`가 놓치던 문제를 `disposeMaterial()`로 보완, 프레임
  계측(`getStats()` + `?three-stats` 콘솔 로그)을 추가. 지오메트리/머티리얼 공유는
  노드마다 독립 WebGL 컨텍스트라 원천적으로 불가능해 미적용(사유 기록). 번들:
  `Generate3dNode`가 `ModelViewer`를 `React.lazy`로 로드해 초기 청크를
  328.79kB→167.70kB(gzip, -49%)로 줄임. QA가 실브라우저로 idle 시 렌더 정지·5초+
  무깜빡임·드래그 회전 매끄러움을 실측 재확인.
- `generate-3d-preview`: image fan-in 선택 규칙(여러 `generateImage` → 하나의
  `generate3d`, 캔버스 좌표 정렬 후 첫 `ready` 이미지 사용)을 확정하고
  `apps/frontend/src/pipeline/fanIn.ts`로 텍스트/이미지 fan-in 정렬 로직을
  공용화. `apps/frontend/src/three/modelScene.ts` + `ModelViewer.tsx`가
  `GLTFLoader`+`OrbitControls`로 Generate 3D 노드 카드 안에 `.glb` 모델을
  렌더링(`nodrag nowheel`로 React Flow 제스처와 격리). 리더가 Chrome으로 직접
  브라우저 검증(공개 샘플 glTF를 modelUrl로 모킹)해 실제 WebGL 렌더링과
  OrbitControls 회전, React Flow 팬 미간섭을 확인.
- `ai-image-generation`: `apps/frontend/src/pipeline/{promptComposition,runState,
  useNodeExecution}.ts` + `src/api/`로 fan-in 프롬프트 조합·실행 상태·API 호출을
  구현. 실행 상태(`pending`/`ready`/`error`)는 Y.Doc에만 기록되어 협업 중인 모든
  피어에게 실시간으로 보인다. pending 실행은 소유자 `clientId`+`startedAt`을 함께
  기록해, 소유자가 awareness에서 사라지거나 타임아웃(2분)을 넘기면 다른 피어가
  회수해 재실행할 수 있다. `apps/backend/src/index.ts`가 `.env`를 로드하도록 배선
  (`process.loadEnvFile`, `.env.example` 추가) — 이전엔 실 키가 있어도 로드되지
  않던 결함이었음.
- **브랜치 전략(2026-08-17부터)**: `main`에 직접 커밋하지 않는다. 남은 feature는
  전부 `feature-loop/remaining-features` 브랜치에서 작업하고, 9/9 passing이 되면
  그 브랜치를 `main`으로 향하는 PR 1개로 올린다(사용자가 리뷰 후 merge). PR 본문은
  `.github/PULL_REQUEST_TEMPLATE.md` 기준으로 채운다.
- `ws-protocol`: `apps/backend/src/ws-server.ts`가 room별 Y.Doc 릴레이로 구현됨
  (SyncStep1/2 핸드셰이크, Update/Awareness 브로드캐스트, `y-protocols`/`lib0`만 사용).
- `collab-canvas`: `apps/frontend/src/collab/`에 커스텀 Yjs WS 클라이언트(y-websocket
  미사용)와 awareness 공유 구현. `usePipelineState`는 이제 Y.Doc이 유일한 진실 소스.
- 외부 AI API 확정: 이미지 생성 OpenAI Images API, 3D 생성 Meshy AI(image-to-3D,
  서버가 호출) — `docs/architecture.md`/`docs/api-spec.md`/`packages/shared-types`
  (`Generate3dNode.modelUrl`) 전부 이 결정에 맞춰 갱신됨.
- `apps/backend`에 `POST /api/generate-image`, `POST /api/generate-3d`,
  `POST /api/upload`, `GET /uploads/:filename`이 구현됨(`GET /health`는 기존).
  외부 API 클라이언트(`openaiClient`/`meshyClient`)는 테스트에서 전부 mock 처리 —
  실제 키를 쓴 성공 경로는 이 환경에서 미검증.
- `docs/acceptance-criteria.md`는 협업 시나리오 1~5 + 생성 시나리오 6, 7, 8, 10, 11
  작성 완료. 3D 시나리오(9)만 TODO(`generate-3d-preview` 범위).
- `apps/frontend`는 Tailwind v4 + shadcn/ui + `@xyflow/react` 세팅 완료
  (`components.json`, `src/lib/utils.ts`, `@/*` 경로 별칭).
- 표준 검증: `./init.sh` (`pnpm install` → `pnpm turbo run build lint check-types test`).

## Known Issues

- `usePipelineState`의 노드 삭제는 헤더 X 버튼으로만 가능(React Flow 키보드 삭제는
  엣지에만 적용) — 의도된 제약, UX 피드백에 따라 바뀔 수 있음.
- Figma 프레임 `1:312`의 상단 네브바/협업자 아바타/하단 상태바는 `pipeline-canvas`
  범위에서 의도적으로 제외 — `collab-canvas` 등 이후 feature에서 다룰 것.
- Playwright는 `pipeline-canvas` 검증에만 임시 사용, 프로젝트 정식 의존성으로는
  추가하지 않음 — E2E 도구로 도입할지는 미정.
- `rest-api`의 외부 API 성공 경로(실제 OpenAI/Meshy 키로 200 응답)는 이 세션 환경에
  키가 없어 미검증 — 실제 키가 주입된 환경에서 수동 확인 필요.
- `/api/generate-3d`는 이미지 하나만 받는 계약 — fan-in(여러 Generate Image 노드가
  한 Generate 3D 노드에 연결)일 때 조합 방식은 `ai-image-generation`/
  `generate-3d-preview` feature에서 확정해야 함(`docs/architecture.md` "열린 질문").
- `ai-image-generation`의 실 API 키 종단 성공 경로(실제 200 + 이미지 표시)는
  이 세션에서 사용한 OpenAI 계정이 billing hard limit 상태라 미검증(키 로딩·요청
  도달 자체는 확인됨) — 크레딧이 있는 환경에서 수동 확인 필요.
- `docs/api-spec.md`가 OpenAI 호출에 `response_format: "b64_json"`을 명시하지만
  `openaiClient.ts`는 이 파라미터를 보내지 않음(`gpt-image-1`은 b64가 기본이라 코드가
  맞고 문서가 낡음, `rest-api` feature에서 넘어온 서술) — 후속 정리 필요.

## Session Log

### Session 001 (2026-07-06~07)

harness 구조 세팅(`CLAUDE.md`/`feature_list.json`/`init.sh` 등) + 공유 config 패키지
(eslint/prettier/typescript-config) turbo build 그래프 구성. Commit: `fc6c332`.

### Session 002 (2026-07-07)

`monorepo-setup` 완료 — frontend(vite)/backend(express+ws) 스캐폴딩, Vitest+Supertest,
`turbo.json` lint/`^build` 의존성 버그 수정. `monorepo-setup` → `passing`. Commit: `a24418d`.

### Session 003 (2026-07-07)

루트 `pnpm test` 스크립트 추가, `docs/data-model.md` 작성(Y.Doc 스키마). Commit: `4607229`.

### Session 004 (2026-07-07)

`docs/ws-protocol.md` 작성(envelope, SyncStep 핸드셰이크, 중계 규칙, room 생명주기).
Commit: `7162dd2`.

### Session 005 (2026-07-08)

`shared-types` feature 구현(옛 스키마: `CanvasObject`/`GraphNode`/`GraphEdge`).
`shared-types` → `passing`. Commit: `b91f527`.

### Session 006 (2026-07-08)

`canvas-crud`(자유배치 캔버스) 구현 — Session 007의 제품 방향 전환으로 되돌려짐.
커밋 후 `git reset`으로 되돌아가 현재 히스토리엔 없음.

### Session 007 (2026-07-09)

제품 방향 전환: 3패널 구조 → 단일 노드 파이프라인 캔버스. `docs/product-plan.md`
재작성, 옛 `canvas-crud` 코드 삭제. 커밋 보류(사용자 검토 예정).

### Session 008 (2026-07-09)

`docs/architecture.md`, `docs/data-model.md`를 노드 파이프라인 구조로 재작성. 커밋 보류.

### Session 009 (2026-07-09)

`feature_list.json`을 노드 파이프라인 구조로 재정리(옛 `canvas-crud`+`node-graph` →
`pipeline-canvas` 통합, `preview-3d` → `generate-3d-preview`). `shared-types`를
`passing` → `not_started`로 되돌림(스키마 폐기 예정 표시). 커밋 보류.

### Session 010 (2026-07-09)

`shared-types`를 새 노드 파이프라인 스키마로 재구현(`NodeType`/`PipelineNode`/
`NODE_PORTS`/`canConnect` 등). `shared-types` → `passing`. 커밋 보류.

### Session 011 (2026-07-10)

`pipeline-canvas` feature 구현 — React Flow + Tailwind v4 + shadcn/ui, Figma 시안
기반, 전역 상태 없이 로컬 훅(`usePipelineState`)으로만 구현. `pipeline-canvas` →
`passing`. 이어서 사용자가 보고한 버그 3건 처리(드래그 깜빡임, 배경 dot 그리드
미표시, 타이핑 중 IME 포커스 풀림) — 세 문제 모두 `PipelineCanvas`의 도메인→React Flow
재조정을 `useEffect`로 처리해 생긴 지연된 두 번째 렌더 패스가 근본 원인이었고, React
공식 "렌더링 중 상태 조정" 패턴으로 교체해 해결(불필요한 `useEffect` 2개 제거). 상세
변경 내역과 검증 증거는 `feature_list.json`의 `pipeline-canvas.evidence` 참고, 결정
배경은 `session-handoff.md`의 "Decisions Made" 참고. `claude-progress.md`를 이 세션
안에서 상태 스냅샷 위주로 슬림화(learn-harness-engineering L05 가이드 참고). 커밋
`4a1214a`(pipeline-canvas 구현), `b658a83`(진행 로그/주석 규칙 문서 정리).

이어서 `rest-api` feature(priority 4) 준비: `docs/architecture.md`의 "열린 질문" 중
Generate 3D 노드 동작 방식을 사용자와 확정(서버가 Meshy AI 호출, 이미지 생성은 OpenAI
Images API) — `Generate3dNode.resultUrl` → `modelUrl`로 rename(`packages/shared-types`
+ `apps/frontend` + 테스트 전부 갱신). `docs/api-spec.md` 작성(5개 엔드포인트:
`POST /api/generate-image`, `POST /api/generate-3d`, `POST /api/upload`,
`GET /uploads/:filename`, `GET /health` — 요청/응답 스키마, 에러 케이스 포함).

이어서 같은 세션에 `rest-api` feature 구현까지 완료(GraphQL 검토 후 REST 유지로
확정한 뒤 바로 진행). `apps/backend/src/lib/{storage,externalApiError,openaiClient,
meshyClient}.ts` + `src/routes/{generateImage,generate3d,upload,uploads}.ts` 신규
작성, `multer` 추가(메모리 스토리지 + 10MB 제한 + MIME 허용목록), 외부 API 호출은
Node 22 내장 `fetch`만 사용. 생성 결과는 항상 우리 서버의 `/uploads/:filename`
상대 URL로만 응답(OpenAI/Meshy의 임시 URL을 그대로 노출하지 않음). 테스트 6개
파일/20개(신규 19 + 기존 shared-types 1) 전부 `vi.mock`으로 외부 API를 모킹해 실제
네트워크 호출 없이 통과. `pnpm build`/`test`/`lint`/`check-types`/`format:check`
전부 통과, `./init.sh` 15/15 통과, `curl`로 5개 엔드포인트 전부 수동 스모크 테스트
(업로드→조회 왕복 포함) 완료. `rest-api.status` → `passing`(`feature_list.json`
evidence 참고). 실제 OpenAI/Meshy 키를 쓴 성공 경로는 이 세션 환경에 키가 없어
미검증 — 다음으로 이 부분을 만지는 사람이 실제 키로 확인해야 함.

### Session 012 (2026-07-27, feature-loop 하네스 첫 실행)

`ws-protocol`(priority 5) 구현 — `apps/backend/src/ws-server.ts`를 room별 Y.Doc
릴레이로 전면 구현(SyncStep1/2 핸드셰이크, Update/Awareness 브로드캐스트, 재접속 시
전체 상태 복원, 마지막 클라이언트 퇴장 시 room 정리). QA 에이전트가 독립적으로 재검증.
`ws-protocol.status` → `passing`. Commit: `4233faa`.

### Session 013 (2026-08-17, feature-loop 하네스 — collab-canvas + 브랜치 전략 변경)

사용자 요청으로 하네스에 브랜치 전략 도입: `main` 직접 커밋 중단, 남은 feature는
`feature-loop/remaining-features` 브랜치에서 작업 후 9/9 passing 시 PR 1개로 통합
(자동 구현 루프 산출물을 사람이 반드시 리뷰하게 하기 위함). 웹의 PR 템플릿 베스트
프랙티스를 참고해 `.github/PULL_REQUEST_TEMPLATE.md` 신규 작성 — "리뷰어가 특히
봐야 할 곳" 섹션에 implementer/QA가 남긴 미확인·임시방편 항목을 강제로 옮겨 적도록
설계. `.claude/skills/feature-loop/SKILL.md`에 브랜치 전략 + 완료 시 PR 자동 생성
절차 반영.

이어서 `collab-canvas`(priority 6) 구현 — `pipeline-canvas`의 로컬 `usePipelineState`
(useState 기반)를 Y.Doc(nodes/edges `Y.Map<Y.Map>`) 단일 진실 소스로 전환. 커스텀
Yjs WebSocket 클라이언트(`YjsWebSocketProvider.ts`, y-websocket 미사용, 인코딩은
전량 `y-protocols`/`lib0`)와 awareness(선택 노드+커서) 공유 신규 구현, `apps/backend`는
무수정. QA가 재연결 시 무한 재귀(RangeError)로 프로세스가 죽는 결함 1건 발견(`onerror`의
`socket.close()`가 close→error 재귀 유발) → `handleDisconnect()` 호출로 수정, 회귀
테스트 추가(QA가 수정을 독립적으로 되돌려 테스트가 실제로 실패함을 확인 후 재검증 통과).
`docs/acceptance-criteria.md` 협업 시나리오 1~5 신규 작성. `collab-canvas.status` →
`passing`. Commit: `0e0f131`(브랜치 `feature-loop/remaining-features`). 전체 진행률
6/9 passing, 다음 대상 `ai-image-generation`(priority 7).

### Session 014 (2026-08-18, feature-loop 하네스 — ai-image-generation)

`ai-image-generation`(priority 7) 구현 — fan-in 조합 규칙(연결된 Text Prompt들을
캔버스 좌표 기준 정렬 후 개행으로 결합, 모든 피어가 동일 결과를 내도록 좌표 사용)을
`docs/architecture.md`에 확정하고 `apps/frontend/src/pipeline/promptComposition.ts`로
구현. `runState.ts`(pending/ready/error 상태 판정 + 소유권/타임아웃 회수 로직),
`useNodeExecution.ts`(실행 트리거), `src/api/`(REST 호출)를 신규 작성해
`GenerateImageNode`/`PipelineCanvas`에 연결. 실행 상태는 전부 Y.Doc에만 기록.

QA 1차 지적 2건: (1) pending이 영구 고착되어 복구 경로가 없음, (2) `apps/backend`가
`.env`를 로드하지 않아 실 키가 있어도 성공 경로에 도달 불가. feature-implementer가
pending에 `{clientId, startedAt}`을 기록하고 소유자 awareness 이탈/타임아웃(2분) 시
다른 피어가 회수해 재실행할 수 있게 수정, `AbortController` 요청 타임아웃 추가,
`src/index.ts`에 `process.loadEnvFile` 배선 + `.env.example` 신규 추가로 해결.

QA 2차 재검증(이전 QA 결과를 신뢰하지 않고 코드 재독해 + 재실기동): 두 수정 모두 실제
해소 확인(회수 경로는 `PipelineCanvas.test.tsx`의 "소유자 이탈 → 재실행 → ready" /
"소유자 생존 시 잠금 유지" 테스트로, `.env` 배선은 실제 `apps/backend` 기동으로 키 유무에
따라 경고가 나타나고 사라지는 것까지 확인). 이 과정에서 `docs/acceptance-criteria.md`
시나리오 11(1)의 기대 문구가 실제 Vite dev 프록시 동작(ECONNREFUSED를 프록시가 가로채
본문 없는 500 → 폴백 문구 노출)과 달랐던 것을 QA가 발견해 환경별 분기 서술로 수정.
`ai-image-generation.status` → `passing`(`feature_list.json` evidence 참고). 실 API
키 종단 성공 경로(200 응답)는 이 세션에서 쓴 OpenAI 계정이 billing hard limit 상태라
미검증(키 로딩·요청 도달 자체는 무과금 요청으로 확인) — Known Issues 참고. 전체 진행률
7/9 passing, 다음 대상 `generate-3d-preview`(priority 8).
