# Progress Log

## Current State

- `pipeline-canvas`(priority 3), `rest-api`(priority 4) 모두 `passing`. 다음
  우선순위는 `ws-protocol`(priority 5) — 문서는 이미 준비돼 있어 바로 시작 가능.
- 외부 AI API 확정: 이미지 생성 OpenAI Images API, 3D 생성 Meshy AI(image-to-3D,
  서버가 호출) — `docs/architecture.md`/`docs/api-spec.md`/`packages/shared-types`
  (`Generate3dNode.modelUrl`) 전부 이 결정에 맞춰 갱신됨.
- `apps/backend`에 `POST /api/generate-image`, `POST /api/generate-3d`,
  `POST /api/upload`, `GET /uploads/:filename`이 구현됨(`GET /health`는 기존).
  외부 API 클라이언트(`openaiClient`/`meshyClient`)는 테스트에서 전부 mock 처리 —
  실제 키를 쓴 성공 경로는 이 환경에서 미검증.
- `docs/acceptance-criteria.md`만 스텁으로 남음.
- `apps/frontend`는 Tailwind v4 + shadcn/ui + `@xyflow/react` 세팅 완료
  (`components.json`, `src/lib/utils.ts`, `@/*` 경로 별칭).
- 표준 검증: `./init.sh` (`pnpm install` → `pnpm turbo run build lint check-types test`).
- **커밋 안 된 변경사항 있음** — Session 007부터 지금까지 사용자 요청으로 커밋을 보류
  중이다. 다음 세션 시작 시 `git status`로 먼저 확인할 것.

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
