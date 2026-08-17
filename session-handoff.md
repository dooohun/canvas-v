# Session Handoff

## Last Session: 2026-08-17 (feature-loop 하네스 실행 — collab-canvas)

### What Was Accomplished

- `ws-protocol`(priority 5) 구현 완료(이전 세션, feature-loop 하네스 첫 실행 테스트) —
  `apps/backend/src/ws-server.ts`를 room별 Y.Doc 릴레이로 전면 구현. Commit: `4233faa`.
- `feature-loop` 하네스의 브랜치 전략 변경 — 지금부터 `main`에 직접 커밋하지 않고
  `feature-loop/remaining-features` 브랜치에서 작업, 9/9 feature `passing` 시 그 브랜치를
  `main`으로 향하는 PR로 한 번만 올림(사용자가 직접 리뷰 후 merge). 자동 구현 루프가 만든
  코드를 사람이 반드시 리뷰하게 하기 위한 사용자 요청. `.github/PULL_REQUEST_TEMPLATE.md`
  신규 작성(웹의 PR 템플릿 베스트프랙티스 참고 — Summary/포함된 feature/리뷰어가 특히 봐야
  할 곳/검증 방법/브레이킹 체인지 5개 섹션, "리뷰어가 특히 봐야 할 곳"에 implementer·QA가
  남긴 미확인/임시방편 항목을 강제로 옮겨 적도록 함).
- `collab-canvas`(priority 6) 구현 완료 — `pipeline-canvas`의 로컬 `usePipelineState`
  (useState 기반)를 Y.Doc(nodes/edges `Y.Map<Y.Map>`) 단일 진실 소스로 전환.
  `apps/frontend/src/collab/`에 `YjsWebSocketProvider.ts`(docs/ws-protocol.md 커스텀
  envelope을 직접 배관, y-websocket 미사용, 인코딩은 전량 `y-protocols`/`lib0`),
  `pipelineDoc.ts`(Y.Map CRUD, 노드 삭제+고아 엣지 정리를 `doc.transact` 1건으로),
  awareness(선택 노드 + 커서) 공유용 `CollabContext`/`useCollabRoom`/`usePresence` 신규.
  `apps/backend`는 한 줄도 수정하지 않음(ws-protocol이 이미 이 프로토콜을 구현해뒀음).
  QA가 재연결 시 무한 재귀(RangeError)로 프로세스가 죽는 결함 1건을 발견 →
  `onerror`의 `socket.close()`를 `this.handleDisconnect()`로 교체해 수정, 회귀 테스트
  추가(QA가 독립적으로 수정을 되돌려 테스트가 실제로 실패하는 것까지 확인).
  `docs/acceptance-criteria.md`의 협업 시나리오 1~5를 사전조건/조작순서/기대결과/자동화
  가능 여부로 신규 작성. Commit: `0e0f131`(브랜치 `feature-loop/remaining-features`).
- `collab-canvas.status` → `passing`(`feature_list.json` evidence 참고).

### What Remains

- `ai-image-generation`(priority 7) — 다음 대상. `docs/acceptance-criteria.md` 시나리오
  6~8·10~11을 이 feature 범위에서 작성해야 함. fan-in(여러 Text Prompt가 한 Generate
  Image에 연결) 시 프롬프트 병합 규칙이 미정 — 이 feature에서 확정 필요.
- `generate-3d-preview`(priority 8), `optimization-pass`(priority 9)는 아직 시작 전.
- 9/9 전부 passing이 되기 전까지는 PR을 만들지 않는다(하네스 규칙). 현재 6/9 passing.
- `rest-api`의 실제 `OPENAI_API_KEY`/`MESHY_API_KEY`를 넣은 성공 경로(200)는 여전히
  미검증 — 실제 키가 주입된 환경에서 수동 확인 필요.

### Decisions Made

- (이전 세션 결정, 유효함) 전역 상태 최소화, React Flow 재조정은 렌더링 중 상태 조정
  패턴 사용. REST 유지(GraphQL 기각). Generate 3D는 서버가 Meshy AI 호출.
- **브랜치 전략**: `main` 직접 커밋 중단, `feature-loop/remaining-features`에서 작업 후
  9/9 passing 시 PR 1개로 통합(사용자 요청 — 자동 구현 루프의 산출물을 반드시 사람이
  리뷰하게 하기 위함). feature마다 PR을 열지 않는 이유: 자동 루프 특성상 중간 산출물에
  리팩터링이 덜 끝난 코드가 섞이기 쉬워서, 리뷰는 전체가 끝난 뒤 한 번에 받는 게 낫다고
  판단.
- **Yjs 클라이언트는 y-websocket을 쓰지 않는다**: 서버가 커스텀 프로토콜(docs/ws-protocol.md)
  이므로 클라이언트도 그 envelope에 맞춰 직접 배관해야 함. 단 바이너리 인코딩 자체는
  반드시 `y-protocols`/`lib0` 함수로만 생성(CLAUDE.md 절대 규칙).
- **동시 편집 충돌 처리 기본값**: 같은 필드(예: 같은 텍스트 노드의 prompt)를 동시 타이핑하면
  필드 단위 Last-Write-Wins로 병합됨(Yjs Y.Map의 기본 동작). 문자 단위 병합이 필요해지면
  `Y.Text`로 승격 — 이번 범위에서는 하지 않음(후속 과제로 `feature_list.json`의
  `collab-canvas.notes`에 기록).
- (이전 세션 결정, 유효함) 진행 로그 관리 방식: `claude-progress.md`는 상태 스냅샷 위주,
  "왜" 판단은 이 파일의 "Decisions Made"에 남김.

### Files Modified

- `apps/frontend/src/collab/`(신규: `pipelineDoc.ts`, `YjsWebSocketProvider.ts`,
  `CollabContext.tsx`, `useCollabRoom.ts`, `localIdentity.ts`, `usePresence.ts`,
  `__tests__/{pipelineDoc,YjsWebSocketProvider}.test.ts` + 헬퍼)
- `apps/frontend/src/components/pipeline/{PresenceBar,RemoteCursors}.tsx`(신규),
  `PipelineCanvas.tsx`(ReactFlowProvider 래핑, awareness 발행, presence UI),
  `TextPromptNode.tsx`(textarea에 `nodrag` 추가 — pipeline-canvas 시절부터 있던 회귀
  버그를 이번에 발견해 함께 수정)
- `apps/frontend/src/pipeline/usePipelineState.ts`(useState 제거, `useSyncExternalStore`
  + `observeDeep`), `reactFlowAdapter.ts`(원격 좌표 반영 버그 수정)
- `docs/acceptance-criteria.md`(협업 시나리오 1~5 신규 작성)
- `turbo.json`(`globalEnv`에 `VITE_WS_URL`, `DEV` 추가)
- `.github/PULL_REQUEST_TEMPLATE.md`(신규), `.claude/skills/feature-loop/SKILL.md`
  (브랜치 전략 + 완료 시 PR 자동 생성 절차 추가), `CLAUDE.md`(하네스 변경 이력),
  `.claude/observability/feature-loop.jsonl`(신규, feature-loop 실행 이벤트 로그)
- `feature_list.json`(`collab-canvas` 항목 `passing` 전환), `session-handoff.md`,
  `claude-progress.md`

### Blockers

없음.

### Next Steps

1. `ai-image-generation`(priority 7) feature 구현 — `feature-loop` 스킬 호출로 진행.
   `docs/acceptance-criteria.md` 시나리오 6~8·10~11 작성 + fan-in 프롬프트 병합 규칙
   확정이 이 feature 범위.
2. 9/9 passing 도달 시 `feature-loop` 하네스가 자동으로 `feature-loop/remaining-features`
   → `main` PR을 생성한다 — 그 전까지는 PR 없음.
3. `rest-api`의 실제 API 키 종단 검증은 여전히 별도로 필요.
