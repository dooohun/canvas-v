# Progress Log

## Current Verified State

- Repository root: canvas-v (Turborepo + pnpm workspace: `apps/*`, `packages/*`)
- Standard startup path: `./init.sh` (`pnpm install` → `pnpm turbo run build lint check-types test`).
  `pnpm turbo run dev`로 frontend(vite, :5173)와 backend(tsx watch, :3001)가 실제로 기동된다.
- 표준 검증 경로: `pnpm turbo run build lint check-types test`
- Current highest-priority unfinished feature: `canvas-crud` (priority 3) — 문서 의존성 없음,
  바로 시작 가능. `ws-protocol`(priority 5)도 문서가 준비돼 있어 시작 가능하지만 priority 순서상
  `canvas-crud`가 먼저다.
- Current blocker: `docs/api-spec.md`, `docs/acceptance-criteria.md`가 여전히 스텁 상태
  (`docs/product-plan.md`, `docs/data-model.md`, `docs/ws-protocol.md`는 채워짐). `rest-api`,
  그리고 `collab-canvas`/`ai-image-generation`/`node-graph`/`preview-3d`(acceptance-criteria
  시나리오 참조)를 시작하려면 해당 문서를 먼저 채워야 한다.

## Session Log

### Session 001

- Date: 2026-07-06 ~ 2026-07-07
- Goal: 모노레포 공유 설정(eslint/prettier/typescript-config)을 Turborepo 태스크 그래프로 구성하고,
  harness 엔지니어링 구조(learn-harness-engineering 방법론 기반)를 이 저장소에 세팅한다.
- Completed:
  - `packages/eslint-config`, `packages/prettier-config`, `packages/typescript-config`를
    TypeScript 소스로 작성하고 `tsc` build 스크립트로 컴파일해 `dist/`를 소비하는 구조로 구성.
    `turbo.json`의 `build: { dependsOn: ["^build"] }`가 실제로 이 패키지들을 앱보다 먼저
    빌드하는 것을 확인.
  - `apps/frontend`, `apps/backend`가 각각 `eslint.config.ts`(jiti로 직접 로드), `tsconfig.json`
    (extends), `prettier` 필드로 공유 설정 패키지를 사용하도록 연결.
  - harness 구조 세팅: 루트 `CLAUDE.md`, `feature_list.json`, `init.sh`, `claude-progress.md`,
    `session-handoff.md`, `clean-state-checklist.md` 생성. `docs/architecture.md` 이관,
    `docs/product-plan.md`/`api-spec.md`/`ws-protocol.md`/`data-model.md`/`acceptance-criteria.md`
    스텁 생성 (아직 실제 내용 없음, 각 feature의 verification이 이 문서들을 전제로 함을 명시).
- Verification run: `./init.sh` → `pnpm install` 성공, `pnpm turbo run build lint check-types`
  9/9 태스크 성공 (전부 cache hit, `FULL TURBO`).
- Evidence captured: 터미널 출력 (turbo 캐시 히트 로그, `eslint .` exit 0, `tsc --noEmit` 성공).
- Commits: `fc6c332` (초기 세팅) — harness 파일들은 이 세션에서 추가, 아직 커밋 전.
- Files or artifacts updated: `packages/eslint-config/*`, `packages/prettier-config/*`,
  `apps/*/eslint.config.ts`, `apps/*/tsconfig.json`, `CLAUDE.md`, `feature_list.json`, `init.sh`,
  `claude-progress.md`, `session-handoff.md`, `clean-state-checklist.md`, `docs/*.md`.
- Known risk or unresolved issue:
  - `apps/frontend`에 `vite`, `react-dom`, `dev`/`build` 스크립트가 없다.
  - `apps/backend`에 `express`, `ws`, `dev` 스크립트가 없다.
  - `packages/shared-types`가 아직 존재하지 않는다.
  - `turbo.json`에 `test` 태스크가 없고, Vitest가 설정되어 있지 않다.
  - `docs/` 하위 5개 문서가 스텁 상태 — 실제 스펙 없이는 `monorepo-setup`의 test 부분과 그 이후
    feature들을 구체적으로 구현할 수 없다.
- Next best step: `monorepo-setup`을 이어서 진행 — `apps/frontend`에 vite + react-dom 추가,
  `apps/backend`에 express + ws 추가, 양쪽에 dev 스크립트 추가, `turbo.json`에 `test` 태스크
  추가, Vitest(`projects`: frontend는 jsdom, backend는 node) + Supertest(backend) 설정. 완료 후
  `feature_list.json`의 `monorepo-setup.evidence`에 실행 결과를 기록하고 `status`를 `passing`으로
  전환.

### Session 002

- Date: 2026-07-07
- Goal: Session 001에서 남긴 `monorepo-setup`의 나머지 범위를 마치고 `passing`으로 전환한다.
  병행해서 `docs/product-plan.md` 스텁을 실제 내용으로 채운다.
- Completed:
  - `apps/frontend`: `vite`, `react-dom`, `@vitejs/plugin-react` 추가. `vite.config.ts`,
    `index.html`, `src/main.tsx` 작성. `dev`/`build`/`preview` 스크립트 추가. `tsconfig.json`에
    `types: ["vite/client", "@testing-library/jest-dom"]` 추가.
  - `apps/backend`: `express`, `ws` 추가. `src/app.ts`(Express 앱 + `GET /health`),
    `src/ws-server.ts`(`WebSocketServer`를 http 서버에 attach, connection만 수락 — room/relay
    로직은 `ws-protocol` feature 범위), `src/index.ts`(엔트리포인트, http 서버 기동) 작성.
    `tsx`로 `dev` 스크립트 추가.
  - `turbo.json`: `test` 태스크 추가(`dependsOn: ["^build"]`). `globalEnv: ["PORT"]` 추가
    (backend의 `process.env.PORT` 사용에 대한 `eslint-plugin-turbo` 경고 해소).
  - **버그 발견 및 수정**: `lint`/`lint:fix` 태스크가 `^build`에 의존하지 않아서, `dist/`가 없는
    fresh 상태에서 `eslint.config.ts`가 `@repo/eslint-config/node`(컴파일된 dist)를 resolve하지
    못해 깨지는 문제를 발견. `turbo.json`의 `lint`/`lint:fix`에 `^build`를 dependsOn으로 추가해
    수정.
  - Vitest 설정: `apps/backend/vitest.config.ts`(environment: node) + `supertest`로
    `GET /health` 테스트 1개. `apps/frontend/vitest.config.ts`(environment: jsdom) +
    `@testing-library/react`/`jest-dom`으로 `<App />` 렌더 테스트 1개.
  - `apps/frontend/.prettierignore` 누락 발견(backend에는 있었는데 frontend에는 없어서 `dist/`가
    format:check에 걸림) — 추가.
  - `docs/product-plan.md`: 스텁을 실제 기획 내용(목적, 사용자 시나리오, 화면 구성, 범위 조정
    옵션, 최적화 체크리스트)으로 채움.
  - Session 001에서 만든 harness 파일들을 커밋(`a24418d`)한 뒤 이어서 작업.
- Verification run:
  - `rm -rf` 로 모든 `dist`/`.turbo` 캐시 삭제 후 `./init.sh` 실행 → `pnpm install` 성공,
    `pnpm turbo run build lint check-types test` 12/12 태스크 성공.
  - `pnpm turbo run dev` 실제 실행 → frontend(vite, http://localhost:5173), backend(tsx watch,
    `backend listening on :3001`) 둘 다 기동 확인, `curl localhost:3001/health` → `{"status":"ok"}`.
- Evidence captured: 위 커맨드들의 터미널 출력 (`feature_list.json`의 `monorepo-setup.evidence`에도
  기록).
- Commits: 이 세션 작업은 세션 종료 시점에 커밋 예정 (아래 "다음 세션" 참고).
- Files or artifacts updated: `apps/frontend/*`(vite.config.ts, index.html, src/main.tsx,
  vitest.config.ts, vitest.setup.ts, src/__tests__/App.test.tsx, package.json, tsconfig.json,
  .prettierignore), `apps/backend/*`(src/app.ts, src/ws-server.ts, src/index.ts,
  vitest.config.ts, src/__tests__/app.test.ts, package.json), `turbo.json`, `init.sh`,
  `docs/product-plan.md`, `feature_list.json`, `claude-progress.md`.
- Known risk or unresolved issue:
  - `apps/backend`의 ws 서버는 connection만 수락하고 아무 프로토콜 로직이 없다 (의도됨,
    `ws-protocol` feature 범위).
  - `packages/shared-types`는 여전히 존재하지 않는다 (`shared-types` feature, `docs/data-model.md`
    스텁이 먼저 채워져야 시작 가능).
  - `docs/api-spec.md`, `docs/ws-protocol.md`, `docs/data-model.md`, `docs/acceptance-criteria.md`
    4개 문서가 여전히 스텁 상태.
- Next best step: `docs/data-model.md`를 실제 스키마로 채운 뒤 `shared-types` feature 시작. 또는
  `docs/api-spec.md`/`docs/ws-protocol.md`를 먼저 채워 `rest-api`/`ws-protocol`을 준비해도 된다.
  어느 쪽이든, 이 세션에서 세운 규칙대로 한 세션에 문서 하나 + 그 문서에 대응하는 feature 하나만
  진행할 것.

### Session 003

- Date: 2026-07-07
- Goal: 루트 `package.json`에 빠져 있던 `test` 스크립트를 추가하고, `docs/data-model.md` 스텁을
  실제 스키마로 채운다.
- Completed:
  - 루트 `package.json`에 `"test": "turbo run test"` 추가 (`turbo.json`엔 태스크가 있었는데
    루트에서 `pnpm test`로 바로 실행할 방법이 없었음). `CLAUDE.md` 명령어 절의 낡은 "아직 없음"
    주석도 실제 상태로 갱신하고, Vitest `projects` 옵션 대신 앱별 `vitest.config.ts` + turbo
    병렬 실행을 쓰기로 한 결정을 명시.
  - `docs/data-model.md` 작성: Y.Doc 최상위 구조(`canvasObjects`, `canvasObjectOrder`(z-order를
    별도 Y.Array로 분리한 이유 포함), `nodes`, `edges`), 캔버스 오브젝트/노드/엣지 필드,
    캔버스↔노드그래프 연결 방식(단방향 참조로 상태 중복 방지), awareness 상태 타입, WS 메시지
    상위 구조(`WS_MESSAGE_TYPE` 상수, 바이트 인코딩 상세는 ws-protocol.md로 위임), `shared-types`가
    export할 타입 이름 확정(`CanvasObject`, `GraphNode`, `NodeStatus`, `GraphEdge`,
    `AwarenessState`, `WS_MESSAGE_TYPE`/`WsMessageType`).
- Verification run: `pnpm test`(루트) 실행해 새 스크립트가 `turbo run test`와 동일하게 동작하는지
  확인 (4/4 태스크 성공, frontend/backend 각 1개 테스트 통과). `docs/data-model.md`는 문서 작업이라
  별도 자동 검증 없음 — `docs/acceptance-criteria.md`의 시나리오(재접속 동기화, 생성 실패 처리,
  노드 클릭 시 캔버스 반영)와 필드가 어긋나지 않는지 교차 확인함.
- Evidence captured: `pnpm test` 터미널 출력.
- Commits: `4607229`.
- Files or artifacts updated: `package.json`, `CLAUDE.md`, `docs/data-model.md`,
  `feature_list.json`(`shared-types` notes 갱신), `claude-progress.md`.
- Known risk or unresolved issue:
  - `docs/api-spec.md`, `docs/ws-protocol.md`, `docs/acceptance-criteria.md`는 여전히 스텁.
  - `packages/shared-types`는 아직 스캐폴딩도 되어 있지 않음 — 다음 세션에서 시작.
- Next best step: `shared-types` feature 시작 — `packages/shared-types` 패키지 생성(package.json,
  tsconfig, turbo build 연결) 후 `docs/data-model.md` 6번 섹션에 나열된 이름 그대로 타입 작성,
  `apps/frontend`/`apps/backend` 양쪽에서 import해 tsc 에러 없는지 확인.

### Session 004

- Date: 2026-07-07
- Goal: `docs/ws-protocol.md` 스텁을 실제 프로토콜 정의로 채운다.
- Completed:
  - `docs/ws-protocol.md` 작성: "서버는 병합/재해석하지 않는다"는 규칙이 "room별 Y.Doc을 메모리에
    유지한다"와 모순되지 않는 이유를 0번 섹션에서 먼저 정리(Yjs의 일반 CRDT 병합은 허용, 도메인
    구조를 들여다보는 로직만 금지). envelope 구조(`WS_MESSAGE_TYPE` + y-protocols/sync 서브타입),
    양방향 SyncStep1/2 핸드셰이크 시퀀스(다이어그램 포함), 중계 규칙(SyncStep1/2는 1:1 응답,
    Update/Awareness만 다른 클라이언트에 브로드캐스트), room 생명주기(lazy 생성, 마지막 클라이언트
    퇴장 시 정리, 재접속 시나리오가 acceptance-criteria 시나리오 4와 어떻게 맞물리는지), 구현 시
    추가해야 할 의존성(yjs, y-protocols, lib0 — 아직 apps/backend에 없음), 검증 테스트 설계
    스케치까지 포함.
  - `CLAUDE.md`, `feature_list.json`의 `docs/ws-protocol.md` 스텁 표시를 "작성됨"으로 갱신하고,
    `ws-protocol` feature의 verification에 재접속 시나리오 확인 항목을 추가.
- Verification run: 문서 작업이라 자동 검증 없음 — `docs/data-model.md`의 `WS_MESSAGE_TYPE`
  정의, `docs/architecture.md`의 room/relay 규칙, `docs/acceptance-criteria.md`의 재접속
  시나리오(4번)와 내용이 어긋나지 않는지 교차 확인함.
- Evidence captured: 해당 없음(문서만 변경, 코드 변경 없음).
- Commits: `7162dd2`.
- Files or artifacts updated: `docs/ws-protocol.md`, `CLAUDE.md`, `feature_list.json`,
  `claude-progress.md`.
- Known risk or unresolved issue:
  - `docs/api-spec.md`, `docs/acceptance-criteria.md`는 여전히 스텁.
  - `packages/shared-types`는 여전히 스캐폴딩되어 있지 않음 — priority상 `shared-types`가
    `ws-protocol`보다 먼저다.
- Next best step: priority 순서대로면 `shared-types` feature(패키지 스캐폴딩 + 타입 작성)가
  다음. `ws-protocol` 구현은 그 다음 순서지만 문서는 이미 준비돼 있어 언제 시작해도 막히지 않는다.

### Session 005

- Date: 2026-07-08
- Goal: `shared-types` feature 구현 — `packages/shared-types` 스캐폴딩 후 `docs/data-model.md`
  6번 섹션의 타입을 작성하고 frontend/backend 양쪽에서 실제로 import해 검증한다.
- Completed:
  - `packages/shared-types` 생성: `package.json`(다른 config 패키지와 동일한 tsc build →
    dist 패턴), `tsconfig.json`(`@repo/typescript-config/base.json` 확장 — node 전용이 아니라
    frontend/backend 양쪽에서 쓰이므로), `eslint.config.ts`(`@repo/eslint-config/base` 사용).
  - `src/canvas-object.ts`(`CanvasObject`), `src/node-graph.ts`(`GraphNode`, `NodeStatus`,
    `GraphEdge`), `src/awareness.ts`(`AwarenessState`), `src/ws-message.ts`(`WS_MESSAGE_TYPE`,
    `WsMessageType`), `src/index.ts`(재export) — `docs/data-model.md`에 정의된 필드 그대로.
  - `apps/frontend`, `apps/backend`의 `package.json`에 `@repo/shared-types: workspace:*`를
    `dependencies`에 추가(타입 전용이 아니라 `WS_MESSAGE_TYPE`이 런타임 값이라 `devDependencies`가
    아님).
  - 각 앱에 `src/__tests__/shared-types.test.ts` 추가: 실제로 타입 값을 만들고
    `WS_MESSAGE_TYPE`을 assert하는 테스트로 "import 가능 + tsc 에러 없음" 검증을 단순 import가
    아니라 실행 가능한 증거로 남김.
  - **버그 발견 및 수정**: `packages/shared-types`에 `.prettierignore`가 없어서 `dist/`가
    `format:check`에 걸리는 문제 — frontend/backend에서 이미 겪었던 것과 같은 종류의 버그.
    `.prettierignore`(`dist`) 추가로 수정. (다음에 패키지를 새로 만들 때 잊지 말 것.)
- Verification run: fresh 상태(`dist`/`.turbo` 전부 삭제) `./init.sh` 실행 → `pnpm install` 성공,
  `pnpm turbo run build lint check-types test` 15/15 태스크 성공(패키지 6개 + 앱 2개). turbo
  로그에서 `@repo/shared-types:build`가 `frontend:build`/`backend:build`보다 먼저 실행되는 것도
  확인(의존 그래프가 제대로 잡힘).
- Evidence captured: 위 `./init.sh` 터미널 출력, `feature_list.json`의 `shared-types.evidence`에
  기록.
- Commits: 세션 종료 시점에 커밋 예정.
- Files or artifacts updated: `packages/shared-types/*`(신규), `apps/frontend/package.json`,
  `apps/frontend/src/__tests__/shared-types.test.ts`(신규), `apps/backend/package.json`,
  `apps/backend/src/__tests__/shared-types.test.ts`(신규), `feature_list.json`,
  `claude-progress.md`.
- Known risk or unresolved issue:
  - `docs/api-spec.md`, `docs/acceptance-criteria.md`는 여전히 스텁.
  - `packages/shared-types`의 타입은 아직 실제 앱 코드(캔버스/노드그래프 상태)에서 쓰이지 않고
    테스트에서만 쓰인다 — `canvas-crud`, `ws-protocol` 등 후속 feature에서 실제로 소비됨.
- Next best step: priority 순서상 다음은 `canvas-crud`(문서 의존성 없음, 바로 시작 가능) —
  캔버스 오브젝트 로컬 CRUD를 `CanvasObject` 타입으로 구현. `ws-protocol` 구현도 언제든 시작
  가능하지만 priority가 더 낮다.
