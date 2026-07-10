# Progress Log

## Current Verified State

- Repository root: canvas-v (Turborepo + pnpm workspace: `apps/*`, `packages/*`)
- Standard startup path: `./init.sh` (`pnpm install` → `pnpm turbo run build lint check-types test`).
  `pnpm turbo run dev`로 frontend(vite, :5173)와 backend(tsx watch, :3001)가 실제로 기동된다.
- 표준 검증 경로: `pnpm turbo run build lint check-types test`
- Current highest-priority unfinished feature: `pipeline-canvas`(priority 3) — `shared-types`가
  2026-07-09에 새 스키마로 재구현되어 다시 `passing`이므로, 이제 `pipeline-canvas`가 문서
  의존성 없이 바로 시작 가능한 최우선 feature다.
- Current blocker: `docs/acceptance-criteria.md`(스텁), `docs/api-spec.md`(스텁)만 아직 새
  구조로 안 옮겨졌다. `docs/product-plan.md`/`docs/architecture.md`/`docs/data-model.md`/
  `docs/ws-protocol.md`/`feature_list.json`/`packages/shared-types`는 2026-07-09에 전부
  노드 파이프라인 구조로 다시 썼다(Session 007~010).

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
- Commits: `b91f527`.
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

### Session 006

- Date: 2026-07-08
- Goal: `canvas-crud` feature 구현 — 캔버스 오브젝트 추가/이동/크기조절/회전/삭제/순서변경을
  로컬 상태(Zustand)로 구현.
- Completed:
  - `apps/frontend/src/store/canvasStore.ts`: Zustand 스토어. `@repo/shared-types`의
    `CanvasObject`를 그대로 사용. `addObject`(id는 `crypto.randomUUID()`로 생성, 기본값 채움),
    `moveObject`, `resizeObject`(최소 크기 20px로 clamp), `rotateObject`, `removeObject`,
    `bringToFront`/`sendToBack`(순서변경 — 배열 순서 자체가 z-order).
  - `apps/frontend/src/canvas/CanvasEditor.tsx`: 오브젝트 추가 버튼(플레이스홀더 SVG 이미지로
    생성 — 실제 AI 생성 연동은 `ai-image-generation` feature 몫), 포인터 드래그로 이동/크기조절/
    회전(모서리·상단 핸들), 선택 시 나타나는 삭제/맨앞으로/맨뒤로 버튼.
  - `App.tsx`가 `CanvasEditor`를 렌더링하도록 변경(기존 "canvas-v" 텍스트는 heading으로 유지해
    기존 테스트 안 깨지게 함).
  - 테스트: `canvasStore.test.ts` 7개(추가/이동/크기조절 clamp/회전/삭제/순서변경/존재하지
    않는 id no-op), `CanvasEditor.test.tsx` 4개(추가 클릭, 선택 시 컨트롤 노출, 삭제, 순서변경).
  - **버그 발견 및 수정**: `@testing-library/react`의 자동 cleanup이 vitest globals를 안 켠
    환경에서는 등록되지 않아서, 같은 파일 안의 여러 테스트가 렌더한 DOM이 계속 누적되는 문제
    발생(예: "오브젝트 추가" 버튼이 여러 개 잡혀서 `getByRole`이 실패). `vitest.setup.ts`에
    `afterEach(cleanup)`을 명시적으로 추가해 수정.
- Verification run: fresh 상태(`dist`/`.turbo` 삭제) `./init.sh` → 15/15 태스크 성공(frontend
  13개 테스트, backend 2개 테스트 포함). `vite` dev 서버를 직접 띄워 `curl`로 HTML/`main.tsx`가
  정상 서빙되는 것 확인.
- Evidence captured: 위 `./init.sh`/`curl` 출력, `feature_list.json`의 `canvas-crud.evidence`에
  기록.
- Commits: `8f14a81`로 커밋했으나, 이후 `git reset`으로 되돌려짐(Session 007에서 이 세션의
  구현 자체를 삭제하기로 함에 따라). 현재 저장소 히스토리에는 존재하지 않음.
- Files or artifacts updated: `apps/frontend/src/store/canvasStore.ts`(신규),
  `apps/frontend/src/store/__tests__/canvasStore.test.ts`(신규),
  `apps/frontend/src/canvas/CanvasEditor.tsx`(신규),
  `apps/frontend/src/canvas/__tests__/CanvasEditor.test.tsx`(신규), `apps/frontend/src/App.tsx`,
  `apps/frontend/vitest.setup.ts`, `apps/frontend/package.json`(zustand 추가),
  `feature_list.json`, `claude-progress.md`.
- Known risk or unresolved issue:
  - **`canvas-crud`는 아직 `passing`이 아니라 `in_progress`다.** 이 feature 자체의 verification이
    "브라우저에서 수동으로 확인"인데, 이 세션엔 브라우저 자동화 도구가 없어서 실제 드래그 이동/
    크기조절/회전 조작을 눈으로 확인하지 못했다. 사람이 확인 후 `passing`으로 바꿔야 한다.
  - `docs/api-spec.md`, `docs/acceptance-criteria.md`는 여전히 스텁.
- Next best step: 사람이 `pnpm --filter frontend dev`로 캔버스를 열어 오브젝트 추가 → 드래그
  이동 → 모서리로 크기조절 → 상단 핸들로 회전 → 맨앞으로/맨뒤로/삭제 버튼까지 직접 확인한 뒤
  `feature_list.json`의 `canvas-crud.status`를 `passing`으로 바꿀 것. 그 다음 priority는
  `rest-api`(priority 4)인데 `docs/api-spec.md`가 스텁이라 그 문서부터 채워야 한다.

### Session 007

- Date: 2026-07-09
- Goal: 사용자가 제품 방향을 수정 — 화면 구성을 "캔버스 에디터/노드 그래프/3D 프리뷰" 3패널에서
  ComfyUI류 단일 노드 파이프라인 캔버스로 바꾸기로 함. (1) `docs/product-plan.md`를 새 구조로
  다시 쓰고, (2) 새 구조와 안 맞는 `canvas-crud`의 기존 frontend 구현을 삭제한다. **커밋은
  하지 않음 — 사용자가 직접 검토한 뒤 커밋할 예정.**
- Completed:
  - `docs/product-plan.md` 전면 재작성: 노드 타입 3종(Text Prompt/Generate Image/Generate 3D),
    포트 타입 규칙(text-to-text, image-to-image), fan-out 연결, 예시 파이프라인
    (`Text Prompt → Generate Image *n → Generate 3D *n`)을 3번 섹션(화면 구성)에 반영. 2번
    섹션(사용자 시나리오)도 파이프라인 조립 흐름으로 다시 씀. 문서 상단에 이 문서만 갱신됐고
    `docs/architecture.md`/`docs/data-model.md`/`docs/acceptance-criteria.md`/`feature_list.json`은
    아직 옛 구조 기준이라는 경고를 명시적으로 남김.
  - `apps/frontend/src/store/canvasStore.ts`, `apps/frontend/src/canvas/CanvasEditor.tsx`와 그
    테스트들을 삭제. `App.tsx`를 원래 스텁으로 되돌림. `package.json`에서 `zustand` 의존성 제거
    (더 이상 쓰는 코드 없음 — 필요해지면 다시 추가).
  - `apps/frontend/vitest.setup.ts`의 `afterEach(cleanup)` 수정은 canvas-crud 코드와 무관한
    일반 테스트 인프라 수정이라 판단해 유지함(되돌리지 않음).
  - `feature_list.json`의 `canvas-crud` 항목을 `in_progress` → `not_started`로 되돌리고,
    evidence는 지우지 않되(작업 이력 보존) "되돌림" 표시와 왜 되돌렸는지, 무엇이 재사용
    가능하다고 판단했는지(CRUD 연산 개념은 유효, 회전/좌표 모델은 폐기)를 기록.
- Verification run: fresh 상태(`dist`/`.turbo` 삭제) `./init.sh` → 15/15 태스크 성공(frontend
  2개 테스트만 남음: App, shared-types). `docs/product-plan.md`는 문서 작업이라 자동 검증 없음.
- Evidence captured: 위 `./init.sh` 터미널 출력.
- Commits: 없음 — 사용자가 검토 후 직접 커밋 예정(작업 지시 3번).
- Files or artifacts updated: `docs/product-plan.md`, `apps/frontend/src/App.tsx`,
  `apps/frontend/package.json`, `feature_list.json`, `claude-progress.md`. 삭제됨:
  `apps/frontend/src/store/`, `apps/frontend/src/canvas/`.
- Known risk or unresolved issue:
  - `docs/architecture.md`, `docs/data-model.md`, `docs/acceptance-criteria.md`,
    `feature_list.json`(canvas-crud/node-graph/preview-3d/collab-canvas/ai-image-generation 전부)이
    아직 옛 3패널 구조를 전제로 쓰여 있어, `docs/product-plan.md`와 내용이 어긋난다. 이 상태로
    다음 feature 구현을 시작하면 안 됨.
  - `docs/data-model.md`의 fan-in(한 노드가 여러 입력을 받는 것) 허용 여부가 아직 미정으로 남아
    있음 — 재작성 시 확정 필요.
- Next best step: 사용자가 이번 세션 변경사항(특히 `docs/product-plan.md`)을 검토하고 커밋한 뒤,
  다음 세션은 `docs/architecture.md`/`docs/data-model.md`/`docs/acceptance-criteria.md`/
  `feature_list.json`을 새 노드 파이프라인 구조에 맞게 다시 쓰는 것부터 시작한다. 그 전까지는
  코드 구현을 진행하지 않는다(harness 규칙: 기획과 충돌하는 방식으로 구현하지 않는다).

### Session 008

- Date: 2026-07-09
- Goal: 사용자 요청으로 `docs/architecture.md`, `docs/data-model.md`를 새 노드 파이프라인
  구조에 맞게 다시 쓴다.
- Completed:
  - `docs/architecture.md` 재작성: "클라이언트" 구성 요소 설명을 "캔버스 에디터/노드 그래프/3D
    프리뷰" 3개 화면에서 단일 노드 파이프라인 캔버스로 변경. "서버는 도메인 구조를 들여다보지
    않는다"는 규칙을 노드 타입/포트 검증까지 명시적으로 확장. Generate 3D 노드가 서버 API를
    타는지 등 이번 변경으로 새로 생긴 미결정 사항을 "열린 질문" 섹션으로 신설.
  - `docs/data-model.md` 재작성: `canvasObjects`/`canvasObjectOrder`(자유 배치 캔버스)를
    없애고 `nodes`/`edges`만 남김. 노드를 `type`(`textPrompt`/`generateImage`/`generate3d`)
    기준 판별 유니언으로 재정의(공통 필드 + 타입별 필드). 포트 타입(`text`/`image`)과 연결
    규칙(text-to-text, image-to-image, fan-out 허용) 표로 정리. **fan-in(한 입력 포트에 여러
    엣지)은 product-plan.md에서 미정으로 남겨뒀던 것을 이번에 "허용"으로 확정** — 표에 이미
    "1개 이상"이라 적혀 있던 것과 일치시킴. `packages/shared-types`로 옮길 새 이름
    확정(`NodeType`, `NodeStatus`, `TextPromptNode`/`GenerateImageNode`/`Generate3dNode`,
    `PipelineNode`, `PortDataType`, `NODE_PORTS`, `PipelineEdge`, `AwarenessState`(필드명
    `selectedNodeId`로 변경)).
  - 범위 밖이지만 최소 수정: `docs/ws-protocol.md`에 남아있던 `canvasObjects` 언급 한 줄
    (`CanvasObject`/`GraphNode` 타입명 예시 포함)을 새 타입명으로 교체. `CLAUDE.md`의 프로젝트
    한 줄 요약, 기술 스택 설명, 절대 규칙(캔버스 오브젝트 → 파이프라인 노드/엣지)도 새 구조에
    맞게 갱신하고, 문서 정합성 경고 블록을 최신 상태로 업데이트.
- Verification run: fresh 상태(`dist`/`.turbo` 삭제) `./init.sh` → 15/15 태스크 성공 (문서만
  바뀌었으므로 코드 동작에는 영향 없음, 회귀 없음 확인 목적).
- Evidence captured: 위 `./init.sh` 출력.
- Commits: 없음 — 이전 세션과 마찬가지로 사용자가 검토 후 직접 커밋.
- Files or artifacts updated: `docs/architecture.md`, `docs/data-model.md`, `docs/ws-protocol.md`
  (부분), `CLAUDE.md`, `claude-progress.md`.
- Known risk or unresolved issue:
  - `docs/acceptance-criteria.md`(스텁)와 `feature_list.json`은 여전히 옛 3패널 구조 기준.
  - **`packages/shared-types`의 실제 코드(`CanvasObject`, `GraphNode` 등)가 새
    `docs/data-model.md`와 어긋난 상태.** `feature_list.json`의 `shared-types`는 아직
    `passing`으로 남아 있지만 재검토가 필요함 — 이번 세션에서는 사용자가 architecture/data-model
    두 문서만 요청해서 feature_list.json은 건드리지 않음.
  - `docs/architecture.md`의 "열린 질문"(Generate 3D가 서버 API를 타는지, 여러 입력을 어떻게
    조합하는지)이 미해결.
- Next best step: 사용자 검토 후, `docs/acceptance-criteria.md`를 새 구조로 다시 쓰거나
  `feature_list.json`을 재구성하는 것, 또는 `packages/shared-types`를 새 스키마로 재구현하는
  것 중 하나를 다음으로 진행. `packages/shared-types` 재구현은 `feature_list.json`의
  `shared-types` 상태를 `passing`에서 되돌리는 작업을 동반해야 한다.

### Session 009

- Date: 2026-07-09
- Goal: 사용자 요청으로 `feature_list.json`을 새 노드 파이프라인 구조에 맞게 재정리한다.
- Completed:
  - 옛 `canvas-crud`(자유배치 캔버스)와 옛 `node-graph`(생성 히스토리 그래프)를 `pipeline-canvas`
    하나로 합침 — 새 기획에서는 캔버스 자체가 곧 노드 그래프라 둘로 나눌 이유가 없다는 점을
    반영. verification에 "노드 삭제 시 연결된 엣지도 함께 삭제" 같은 새 데이터 모델의 규칙을
    직접 검증하도록 추가.
  - 옛 `preview-3d`(별도 3D 프리뷰 탭)를 `generate-3d-preview`로 이름 변경, "Generate 3D
    노드 내부 렌더링"으로 범위 재정의. `docs/architecture.md`의 "열린 질문"(텍스처 매핑 vs
    별도 3D 생성 API)이 이 feature를 시작하기 전에 확정돼야 함을 notes에 명시.
  - `shared-types`를 `passing` → `not_started`로 되돌림. evidence는 지우지 않되(작업 이력
    보존) "옛 스키마, 폐기 대상"으로 표시하고, `WS_MESSAGE_TYPE`만 유일하게 재사용 가능하다고
    기록.
  - `rest-api`, `ws-protocol`, `collab-canvas`, `ai-image-generation`, `optimization-pass`는
    id는 유지하되 `user_visible_behavior`/`notes`를 노드 파이프라인 용어(Text
    Prompt/Generate Image/Generate 3D 노드, fan-in 조합 등)로 갱신.
  - `CLAUDE.md`의 문서 정합성 경고 블록을 갱신 — feature id 변경 사항과
    `docs/acceptance-criteria.md`만 남은 스텁이라는 것을 명시.
- Verification run: fresh 상태(`dist`/`.turbo` 삭제) `./init.sh` → 15/15 태스크 성공 (feature
  list는 문서라 코드 동작에 영향 없음, 회귀 없음 확인 목적).
- Evidence captured: 위 `./init.sh` 출력, `node -e`로 feature_list.json JSON 유효성 확인.
- Commits: 없음 — 이전 세션들과 마찬가지로 사용자가 검토 후 직접 커밋.
- Files or artifacts updated: `feature_list.json`, `CLAUDE.md`, `claude-progress.md`.
- Known risk or unresolved issue:
  - `docs/acceptance-criteria.md`(스텁)만 남았다 — `collab-canvas`/`ai-image-generation`/
    `generate-3d-preview`의 verification이 여전히 "재작성 필요"라고만 되어 있어, 이 문서를
    채우기 전까지는 구체적인 수동 검증 스크립트가 없다.
  - `packages/shared-types`는 여전히 옛 코드 그대로 — feature_list.json만 상태를 되돌렸을 뿐
    실제 재구현은 아직 안 함.
- Next best step: `packages/shared-types`를 `docs/data-model.md` 6번 섹션 이름으로 재구현
  (다음 세션 실질적 첫 작업, `shared-types` feature). 또는 `docs/acceptance-criteria.md`를
  먼저 새 구조로 채워서 뒤따르는 feature들의 verification을 구체화해도 된다.

### Session 010

- Date: 2026-07-09
- Goal: `packages/shared-types`를 `docs/data-model.md`의 새 노드 파이프라인 스키마로
  재구현한다 (`shared-types` feature, priority 2).
- Completed:
  - `packages/shared-types/src/canvas-object.ts`, `node-graph.ts`(옛 스키마) 삭제.
  - `src/node.ts` 신규: `NodeType`, `NodeStatus`, `TextPromptNode`/`GenerateImageNode`/
    `Generate3dNode`(공통 필드는 `NodeBase`로 추출), 판별 유니언 `PipelineNode`. 입력 텍스트/
    이미지는 노드에 저장하지 않고 엣지를 따라 실행 시점에 읽는다는 걸 doc comment로 명시
    (docs/data-model.md 1번 섹션 규칙).
  - `src/ports.ts` 신규: `PortDataType`, `NODE_PORTS`(노드 타입 → 입출력 포트 조회), 그리고
    docs/data-model.md에는 없던 `canConnect(sourceType, targetType)` 헬퍼를 추가로 만들어
    포트 호환성 비교 로직이 여러 곳에 중복되지 않게 함.
  - `src/edge.ts` 신규: `PipelineEdge`(옛 `GraphEdge`에서 이름만 변경).
  - `src/awareness.ts`: `selectedObjectId` → `selectedNodeId`로 필드명 변경.
  - `src/ws-message.ts`: 변경 없음(WS_MESSAGE_TYPE은 화면 구성과 무관).
  - `src/index.ts`를 새 export 목록으로 재작성.
  - `apps/frontend`, `apps/backend`의 `src/__tests__/shared-types.test.ts`를 새 타입으로
    다시 씀 — 타입 값 생성 테스트에 더해 `canConnect` 기반 포트 호환성 테스트
    (`textPrompt→generateImage` 유효, `textPrompt→generate3d` 무효 등) 추가.
  - `feature_list.json`의 `shared-types`를 `passing`으로 전환, evidence에 재구현 내역 기록.
    `CLAUDE.md`의 문서 정합성 경고도 최신화(shared-types 완료 반영).
- Verification run: fresh 상태(`dist`/`.turbo` 삭제) `./init.sh` → 15/15 태스크 성공
  (frontend/backend 각각 shared-types 테스트 2개씩 포함, 전체 테스트 파일 수 유지). `pnpm turbo
  run format` + `format:check`로 신규 파일 포맷 정리 확인.
- Evidence captured: 위 `./init.sh`/`format:check` 출력, `feature_list.json`의
  `shared-types.evidence`에 기록.
- Commits: 없음 — 이전 세션들과 마찬가지로 사용자가 검토 후 직접 커밋.
- Files or artifacts updated: `packages/shared-types/src/*`(node.ts, ports.ts, edge.ts 신규,
  awareness.ts, index.ts 수정, canvas-object.ts/node-graph.ts 삭제),
  `apps/frontend/src/__tests__/shared-types.test.ts`, `apps/backend/src/__tests__/shared-types.test.ts`,
  `feature_list.json`, `CLAUDE.md`, `claude-progress.md`.
- Known risk or unresolved issue:
  - `docs/acceptance-criteria.md`(스텁), `docs/api-spec.md`(스텁)가 유일하게 남은 스텁 문서.
  - `Generate3dNode.resultUrl`이라는 필드명은 docs/architecture.md '열린 질문'이 확정되면
    바뀔 수 있음 — 그때 shared-types도 같이 갱신해야 함(잊지 말 것).
  - 서버(`src/app.ts`, `src/ws-server.ts`)는 여전히 `@repo/shared-types`를 import하지 않음 —
    테스트 파일에서만 씀. 의도된 것(도메인 타입이 서버 런타임에 등장하면 안 됨).
- Next best step: `pipeline-canvas` feature 시작 — React Flow로 Text Prompt/Generate Image/
  Generate 3D 노드 추가·이동·삭제, `NODE_PORTS`/`canConnect`로 검증하는 엣지 연결/해제를
  로컬(비협업) 상태로 구현. 문서 의존성 없이 바로 시작 가능.
