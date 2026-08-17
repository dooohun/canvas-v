# Progress Log

## Current State

- `monorepo-setup`/`shared-types`/`pipeline-canvas`/`rest-api`/`ws-protocol`/
  `collab-canvas` 6개 `passing` (6/9). 다음 우선순위는 `ai-image-generation`
  (priority 7).
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
- `docs/acceptance-criteria.md`는 협업 시나리오 1~5까지 작성 완료, 생성/3D 시나리오
  6~11은 여전히 TODO.
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
