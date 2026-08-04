# Session Handoff

## Last Session: 2026-07-10 (Session 011)

### What Was Accomplished

- `pipeline-canvas`(priority 3) 구현 완료 — React Flow 기반 노드 파이프라인 캔버스,
  Tailwind v4 + shadcn/ui, Figma 시안 기준, 전역 상태 없이 `usePipelineState` 로컬 훅.
  사용자가 보고한 버그 3건(드래그 깜빡임/배경 dot 미표시/타이핑 중 IME 포커스 풀림)
  처리 — 근본 원인은 `useEffect` 기반 재조정이 만든 지연된 두 번째 렌더 패스였고,
  React 공식 "렌더링 중 상태 조정" 패턴으로 교체해 해결. Commit: `4a1214a`.
- `claude-progress.md`를 learn-harness-engineering L05 가이드에 맞춰 슬림화, `CLAUDE.md`에
  "불필요한 주석 금지" 규칙 추가. Commit: `b658a83`.
- Generate 3D 노드 동작 방식을 사용자와 확정(서버가 Meshy AI 호출, 이미지 생성은 OpenAI
  Images API) — `docs/architecture.md` "열린 질문" 해소, `Generate3dNode.resultUrl` →
  `modelUrl` rename. `docs/api-spec.md` 작성(5개 엔드포인트 요청/응답/에러 스키마).
- `rest-api`(priority 4) 구현 완료 — `apps/backend`에 `POST /api/generate-image`,
  `POST /api/generate-3d`, `POST /api/upload`, `GET /uploads/:filename` 추가
  (`GET /health`는 기존). 외부 API는 Node 22 내장 `fetch`로 호출, `multer`로 업로드
  처리, 생성 결과는 항상 `/uploads/:filename` 상대 URL로만 응답. 테스트 6 파일/20개
  전부 통과(외부 API는 `vi.mock`으로 모킹, 실제 네트워크 호출 없음). `curl`로 5개
  엔드포인트 전부 수동 스모크 테스트(업로드→조회 왕복 포함) 완료.
- `rest-api.status` → `passing`(`feature_list.json` evidence 참고).
- **아직 커밋 안 됨**: Generate3dNode rename, `docs/api-spec.md`, `docs/architecture.md`
  수정, `rest-api` 구현 전체.

### What Remains

- `ws-protocol`(priority 5) — 문서(`docs/ws-protocol.md`)는 이미 준비됨, 바로 시작 가능.
- `docs/acceptance-criteria.md`는 여전히 스텁 — `collab-canvas`/`ai-image-generation`/
  `generate-3d-preview`를 시작하기 전 재작성 필요.
- `rest-api`의 실제 OpenAI/Meshy 키를 쓴 성공 경로(200)는 이 세션 환경에 키가 없어
  미검증 — 실제 키가 주입된 환경에서 수동 확인 필요.

### Decisions Made

- 전역 상태 최소화, React Flow 재조정은 렌더링 중 상태 조정 패턴 사용(이전 세션 결정,
  유효함).
- GraphQL 검토 후 기각, REST 유지 — 이 프로젝트는 관계형 조회가 아니라 액션형 호출
  몇 개뿐이라 GraphQL의 장점이 발휘될 도메인이 아니고, `docs/product-plan.md`가 REST를
  이미 지원 직무 어필 포인트로 명시함.
- Generate 3D 노드: 클라이언트 텍스처 매핑이 아니라 서버가 Meshy AI(image-to-3D)를
  호출하는 방식. 이미지 생성은 OpenAI Images API. 두 API 키 모두 서버 환경변수
  (`OPENAI_API_KEY`, `MESHY_API_KEY`)로만 관리, `turbo.json`의 `globalEnv`에 등록.
- `POST /api/generate-3d`는 이미지 하나만 받는 계약으로 시작 — fan-in 조합 로직은
  아직 미정이라 이후 feature에서 확정.
- 생성된 이미지/3D 에셋은 OpenAI/Meshy가 주는 임시 URL을 그대로 노출하지 않고, 서버가
  다운로드해 `/uploads/:filename`으로 재호스팅 — 만료된 외부 URL에 의존하지 않기 위함.
- 외부 API 클라이언트(`openaiClient`/`meshyClient`)는 라우트에서 분리해 테스트에서
  `vi.mock()`으로 통째로 모킹 — 실제 네트워크에 의존하는 테스트를 만들지 않기 위함.
- 진행 로그 관리 방식(전 세션 결정, 유효함): `claude-progress.md`는 상태 스냅샷 위주,
  "왜" 판단은 이 파일의 "Decisions Made"에 남김. 별도 `DECISIONS.md`는 만들지 않음.

### Files Modified

(이전 라운드 `pipeline-canvas` 변경은 커밋 `4a1214a`/`b658a83` 참고, 여기서는 이번
라운드에서 커밋 안 된 변경만 나열)

- `docs/architecture.md`(외부 AI API 섹션, 열린 질문 정리), `docs/data-model.md`
  (`resultUrl` → `modelUrl`), `docs/api-spec.md`(스텁 → 5개 엔드포인트 명세)
- `packages/shared-types/src/node.ts`(`Generate3dNode.resultUrl` → `modelUrl`)
- `apps/frontend/src/pipeline/usePipelineState.ts`,
  `apps/backend/src/__tests__/shared-types.test.ts`(필드명 rename 반영)
- `apps/backend/src/lib/{storage,externalApiError,openaiClient,meshyClient}.ts`(신규)
- `apps/backend/src/routes/{generateImage,generate3d,upload,uploads}.ts`(신규)
- `apps/backend/src/app.ts`(라우터 마운트), `apps/backend/src/__tests__/app.test.ts`
  (API 키 비노출 단언 추가)
- `apps/backend/src/__tests__/{generate-image,generate-3d,upload,uploads-static}.test.ts`
  (신규)
- `apps/backend/package.json`(`multer`, `@types/multer` 추가), `turbo.json`(`globalEnv`),
  루트 `.gitignore`(`apps/backend/uploads/`)
- `feature_list.json`(`rest-api` 항목 `passing` 전환), `claude-progress.md`,
  `session-handoff.md`

### Blockers

없음.

### Next Steps

1. `ws-protocol`(priority 5) feature 구현 — `docs/ws-protocol.md` 기준으로 room별 Y.Doc
   유지, SyncStep1/2 핸드셰이크, 중계 규칙을 `ws` + `y-protocols`로 구현. `yjs`,
   `y-protocols`, `lib0` 의존성을 `apps/backend`에 추가해야 함(아직 없음).
2. 실제 `OPENAI_API_KEY`/`MESHY_API_KEY`를 넣은 환경에서 `rest-api`의 성공 경로(200)를
   수동으로 한 번 확인해둘 것.
