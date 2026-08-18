# Session Handoff

## Last Session: 2026-08-18 (feature-loop 하네스 실행 — ai-image-generation)

### What Was Accomplished

- `ai-image-generation`(priority 7) 구현 완료 — Text Prompt 노드를 Generate Image
  노드에 연결하고 실행하면 REST API로 이미지가 생성되고 결과가 Y.Doc에 반영되어
  협업 중인 모든 피어에게 실시간으로 보인다(status: pending → ready/error).
- fan-in 조합 규칙 확정: 연결된 Text Prompt들의 prompt를 trim 후 빈 값 제외, 캔버스
  좌표(위→아래, 왼→오른쪽) + 노드 id 사전순 정렬 후 개행으로 결합. 엣지 생성 순서가
  아니라 좌표를 쓰는 이유는 모든 피어가 같은 문자열을 만들어야 하기 때문
  (`docs/architecture.md` '여러 입력(fan-in) 조합 규칙').
- `apps/frontend/src/pipeline/{promptComposition,runState,useNodeExecution}.ts` +
  `src/api/`(REST 호출) 신규, `GenerateImageNode.tsx`/`PipelineCanvas.tsx`에 연결.
  실행 상태는 전부 Y.Doc(Y.Map)에만 기록 — 별도 JS 상태로 중복 관리하지 않음.
- QA 1차 지적 2건을 feature-implementer가 수정:
  1. **pending 영구 고착** — 실행 시작 시 노드에 `pendingRun={clientId,startedAt}`을
     함께 기록. 소유자가 awareness에서 사라지거나 타임아웃(2분)을 넘긴 실행은
     '버려진 실행'으로 보아 다른 피어가 회수해 재실행할 수 있게 함
     (`docs/architecture.md` '실행 상태(pending) 소유권과 회수'). 요청에도
     `AbortController` 타임아웃을 추가해 매달린 요청이 스스로 error로 끝나게 함.
  2. **`.env` 미로드** — `apps/backend`가 `.env`를 읽지 않아 실 키가 있어도 성공
     경로에 도달 못하던 배선 누락. `src/index.ts`에서 `process.loadEnvFile`로 로드
     (테스트가 `app.ts`를 직접 import해 오염되지 않도록 `index.ts`에 둠), 키 미설정
     시 기동 경고 출력, `apps/backend/.env.example` 신규 추가.
- QA 2차 재검증(이전 QA 결과를 신뢰하지 않고 코드 재독해 + 실기동으로 재확인):
  두 수정 모두 실제 해소 확인. 회수 경로는 `PipelineCanvas.test.tsx`의 "소유자 이탈
  → 안내 노출 → 재실행 → ready" / "소유자 생존 시 버튼 잠금 유지" 테스트로 커버.
  `.env` 배선은 실제 `apps/backend` 기동으로 키 유무에 따라 경고가 나타나고
  사라지는 것, 로드된 키가 OpenAI에 실제 도달하는 것(무과금 요청)까지 확인.
  이 과정에서 `docs/acceptance-criteria.md` 시나리오 11(1)의 기대 문구가 실제 Vite
  dev 프록시 동작(backend가 죽으면 프록시가 ECONNREFUSED를 가로채 본문 없는 500 →
  폴백 문구 "이미지 생성에 실패했습니다" 노출, "서버에 연결할 수 없습니다"가 아님)과
  달랐던 것을 QA가 발견해 환경별 분기 서술로 문서를 수정.
- `ai-image-generation.status` → `passing`(`feature_list.json` evidence 참고).

### What Remains

- `generate-3d-preview`(priority 8) — 다음 대상. `docs/architecture.md` '열린 질문'
  (이미지를 고정 3D 모델에 텍스처로 매핑할지, 별도 image-to-3D API를 쓸지)은 이미
  확정됨(Meshy AI, `rest-api` feature에서 결정) — 이 feature는 그 결과를 Three.js로
  노드 안에서 렌더링(OrbitControls)하는 프론트엔드 작업.
- `optimization-pass`(priority 9)는 `generate-3d-preview`에 의존, 아직 시작 전.
- 9/9 전부 passing이 되기 전까지는 PR을 만들지 않는다(하네스 규칙). 현재 7/9 passing.
- `ai-image-generation`의 실 API 키 종단 성공 경로(실제 200 + 이미지 표시)는 이
  세션에서 쓴 OpenAI 계정이 billing hard limit 상태라 미검증(키 로딩·요청 도달
  자체는 확인됨) — 크레딧이 있는 환경에서 수동 확인 필요.
- `docs/api-spec.md`가 OpenAI 호출에 `response_format: "b64_json"`을 명시하지만
  `openaiClient.ts`는 이 파라미터를 보내지 않음(`gpt-image-1`은 b64가 기본이라 코드가
  맞고 문서가 낡음, `rest-api` feature에서 넘어온 서술 오류) — 후속 정리 필요.

### Decisions Made

- **fan-in 프롬프트 조합은 캔버스 좌표 기준 정렬**(엣지 생성 순서 아님) — 모든 피어가
  결정론적으로 같은 결합 문자열을 만들어야 하므로. 좌표가 같으면 노드 id 사전순으로
  타이브레이크.
- **pending 실행의 소유권은 awareness + 타임아웃으로 판정**: 별도의 서버측 락이나
  중앙 조정 없이, 클라이언트가 Y.Doc에 기록한 소유자 정보와 Yjs awareness의
  outdated 처리를 조합해 "버려진 실행"을 판정. 서버는 여전히 상태를 해석하지 않는다
  (CLAUDE.md 절대 규칙 유지).
- **`.env` 로드는 `app.ts`가 아닌 `index.ts`에서** — Supertest 테스트가 `createApp()`을
  직접 import해서 쓰므로, 로드 위치를 엔트리포인트에만 둬야 테스트가 개발자의 로컬
  `.env`에 우연히 의존하지 않는다.
- (이전 세션 결정, 유효함) `main` 직접 커밋 중단, `feature-loop/remaining-features`에서
  작업 후 9/9 passing 시 PR 1개로 통합. Yjs 클라이언트는 y-websocket 미사용(커스텀
  envelope 직접 배관, 인코딩만 `y-protocols`/`lib0`). 진행 로그는 `claude-progress.md`
  상태 스냅샷 + 이 파일의 "Decisions Made"에 "왜"를 남기는 방식 유지.

### Files Modified

- `apps/frontend/src/pipeline/{promptComposition.ts, runState.ts, useNodeExecution.ts}`
  (신규) + 각 `__tests__/`
- `apps/frontend/src/api/`(신규 디렉터리, REST 호출 + `__tests__/generation.test.ts`)
- `apps/frontend/src/components/pipeline/{GenerateImageNode,PipelineCanvas}.tsx`,
  `__tests__/PipelineCanvas.test.tsx`(pending 회수 시나리오 테스트 추가)
- `apps/frontend/src/pipeline/reactFlowAdapter.ts`, `apps/frontend/vite.config.ts`
- `apps/frontend/src/collab/pipelineDoc.ts` + `__tests__/pipelineDoc.test.ts`
- `apps/backend/src/index.ts`(`.env` 로드 배선), `apps/backend/.env.example`(신규)
- `packages/shared-types/src/{index.ts,node.ts}`(실행 상태 관련 타입)
- `docs/{acceptance-criteria.md,api-spec.md,architecture.md,data-model.md}`
- `apps/{backend,frontend}/src/__tests__/shared-types.test.ts`
- `feature_list.json`(`ai-image-generation` 항목 `passing` 전환), `session-handoff.md`,
  `claude-progress.md`, `.claude/observability/feature-loop.jsonl`

### Blockers

없음.

### Next Steps

1. `generate-3d-preview`(priority 8) feature 구현 — `feature-loop` 스킬 호출로 진행.
   `docs/acceptance-criteria.md`의 3D 시나리오(9번, 아직 TODO) 작성이 이 feature 범위.
2. 9/9 passing 도달 시 `feature-loop` 하네스가 자동으로 `feature-loop/remaining-features`
   → `main` PR을 생성한다 — 그 전까지는 PR 없음.
3. `ai-image-generation`의 실 API 키 종단 검증(billing 문제 해소 후)과
   `docs/api-spec.md`의 `response_format` 서술 정리는 별도로 필요.
