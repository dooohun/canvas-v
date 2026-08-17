# 완료 기준 시나리오

> 시나리오 1~5(협업)는 `collab-canvas` feature에서 작성했다. 6~11은 해당 feature
> (`ai-image-generation`, `node-graph`, `preview-3d`)를 시작할 때 같은 형식으로 채운다.
>
> 각 시나리오는 **사전 조건 / 조작 순서 / 기대 결과 / 자동화 가능 여부**를 갖는다.

## 공통 사전 조건 (시나리오 1~5)

- 저장소 루트에서 `pnpm install` 완료.
- `pnpm dev`로 backend(`:3001`, WS 릴레이 포함)와 frontend(`:5173`)가 동시에 떠 있다.
- 브라우저 창(또는 프로필/시크릿 창) 2개를 준비한다. 아래에서 **클라이언트 A**, **클라이언트 B**로 부른다.
- 두 클라이언트 모두 `http://localhost:5173/?room=demo`로 접속한다(같은 room id).
  - `?room=`을 생략하면 room id는 `default`가 된다.
  - 화면 상단 중앙의 presence bar에 `연결됨` + `room: demo`가 표시되어야 이후 시나리오가 유효하다.
    (`연결 끊김`이면 backend가 떠 있는지 먼저 확인한다.)
- 서버는 마지막 클라이언트가 나가면 room을 폐기한다(`docs/ws-protocol.md` 5절). 즉 각
  시나리오는 A, B 중 최소 한 쪽이 계속 접속해 있는 동안 수행한다.

---

## 1. (협업) 두 클라이언트가 같은 room에서 하나의 파이프라인을 함께 편집

**사전 조건**: 공통 사전 조건. 캔버스는 비어 있다.

**조작 순서**

1. A에서 하단 툴바의 `Text Node`를 클릭한다.
2. B에서 하단 툴바의 `Image Node`를 클릭한다.
3. A에서 Text Prompt 노드의 텍스트 영역에 `a neon jellyfish`를 입력한다.
4. B에서 Text Prompt 노드의 출력 포트(오른쪽 핸들)를 Generate Image 노드의 입력 포트(왼쪽
   핸들)로 드래그해 연결한다.
5. B에서 Generate Image 노드의 출력 포트를 다시 Text Prompt 노드의 입력 쪽으로 연결해 본다
   (유효하지 않은 조합).

**기대 결과**

- (1) 직후 B 화면에도 같은 위치에 Text Prompt 노드가 나타난다.
- (2) 직후 A 화면에도 Generate Image 노드가 나타난다. 두 화면의 노드 개수는 항상 2개로 같다.
- (3) 입력 중 B의 Text Prompt 노드 텍스트가 (거의 실시간으로) `a neon jellyfish`로 갱신된다.
- (4) A 화면에도 두 노드를 잇는 엣지가 그려진다.
- (5) 연결이 생성되지 않는다(양쪽 화면 모두 엣지 1개 유지). Text Prompt에는 입력 포트가 없고
  `image → text` 조합이 금지되기 때문이다. 서버는 이 규칙을 전혀 모르며, 검증은 클라이언트에서만
  일어난다.

**자동화 가능 여부**: 부분 자동화.

- 노드/엣지 추가·삭제·프롬프트 편집이 Y.Doc에 기록되고 다른 Y.Doc으로 병합되는 것,
  포트 타입 위반 엣지가 거부되는 것: `apps/frontend/src/collab/__tests__/pipelineDoc.test.ts`,
  `apps/frontend/src/pipeline/__tests__/usePipelineState.test.ts` (Vitest).
- 실제 포트 드래그 조작과 두 브라우저 간 왕복은 수동 확인.

---

## 2. (협업) A가 노드를 이동하면 B 화면에 실시간 반영

**사전 조건**: 시나리오 1을 마쳐 노드 2개와 엣지 1개가 있다.

**조작 순서**

1. A에서 Text Prompt 노드 헤더를 잡고 캔버스 오른쪽 아래로 드래그한 뒤 마우스를 놓는다.
2. B에서 Generate Image 노드를 위쪽으로 드래그해 놓는다.
3. B에서 노드를 드래그하는 **도중에** A가 같은 캔버스를 보고 있는다.

**기대 결과**

- (1) 마우스를 놓는 순간 B 화면의 Text Prompt 노드가 같은 좌표로 이동하고, 연결된 엣지도 따라
  다시 그려진다.
- (2) A 화면에서도 동일하게 반영된다.
- (3) 드래그 중인 노드는 드래그를 놓을 때 한 번 공유된다(드래그 중 중간 좌표는 전송하지 않는다).
  드래그 중인 로컬 노드가 원격 갱신 때문에 튀거나 깜빡이지 않아야 한다.
- 이동 후에도 양쪽 화면의 노드 좌표가 일치한다(새로고침해도 동일 — 단 room에 다른 클라이언트가
  남아 있는 경우).

**자동화 가능 여부**: 부분 자동화.

- 좌표가 Y.Doc에 기록되고 원격 update가 훅에 반영되는 것: `usePipelineState.test.ts`
  ("writes prompt edits and positions through to the Y.Doc", "re-renders when a remote peer update
  is applied to the Y.Doc").
- 드래그 중 좌표 소유권(로컬 우선)은 `reconcileFlowNodes`가 `dragging` 플래그로 처리하지만,
  실제 드래그 부드러움은 수동 확인.

---

## 3. (협업) 동시 편집 충돌 시 Yjs CRDT 병합 동작

**사전 조건**: 공통 사전 조건. Text Prompt 노드 1개가 있고 A, B 모두 그 노드가 보인다.

**조작 순서**

1. A와 B에서 **동시에** 같은 Text Prompt 노드를 서로 다른 위치로 드래그해 놓는다.
2. A와 B에서 각각 다른 노드를 하나씩 추가한다(A: Image Node, B: 3D Node) — 거의 동시에.
3. A가 Text Prompt 노드를 삭제(노드 헤더의 X)하는 동안 B는 같은 노드의 프롬프트를 편집한다.

**기대 결과**

- (1) 잠시 후 두 화면의 노드 좌표가 **서로 같은 값**으로 수렴한다(둘 중 하나의 좌표가 이기며,
  어느 쪽이 이기든 두 화면은 동일하다 — Yjs Y.Map의 결정론적 last-writer-wins).
- (2) 어느 것도 유실되지 않고 양쪽 모두 노드 3개가 된다.
- (3) 삭제가 이긴다: 양쪽 화면에서 그 노드가 사라지고, 그 노드에 붙어 있던 엣지도 함께 사라진다
  (고아 엣지가 남지 않는다).
- 프롬프트 텍스트를 A, B가 동시에 타이핑하면 문자 단위 병합이 아니라 **필드 단위 last-writer-wins**로
  덮어써진다(현재 데이터 모델이 `prompt`를 `string`으로 정의하기 때문 — 문자 단위 병합이 필요해지면
  `Y.Text`로 승격해야 한다). 이 경우에도 양쪽 화면의 최종 값은 반드시 같아야 한다.

**자동화 가능 여부**: 자동화됨(수동 확인은 체감용).

- `apps/frontend/src/collab/__tests__/pipelineDoc.test.ts`의
  "merges concurrent edits from two documents (CRDT convergence)",
  "resolves a conflicting move of the same node deterministically on both peers",
  "keeps a node deleted on one peer while the other edited it"가 독립 Y.Doc 2개로 이 시나리오를
  그대로 재현한다.

---

## 4. (협업) 한 클라이언트가 재접속해도 상태 동기화 유지

**사전 조건**: 시나리오 1의 결과(노드 2개 + 엣지 1개)가 있고 A, B 모두 접속 중.

**조작 순서**

1. B는 접속을 유지한 채, A의 탭을 새로고침(F5)한다.
2. A의 presence bar가 `연결 중` → `연결됨`으로 바뀌는 것을 확인한다.
3. (선택) backend를 잠깐 껐다 켠 뒤(`pnpm dev` 재시작 없이 backend 프로세스만 종료/재시작),
   A/B의 presence bar를 확인한다.

**기대 결과**

- (1)~(2) 새로고침한 A 화면에 노드 2개와 엣지 1개, 프롬프트 텍스트까지 그대로 복원된다
  (SyncStep1/SyncStep2 핸드셰이크만으로 복원). A의 이름/색은 새 클라이언트이므로 바뀔 수 있다.
- B 화면의 collaborator 목록에서 예전 A는 사라지고 새 A가 나타난다.
- (3) backend가 죽으면 양쪽 presence bar가 `연결 끊김`이 되고, 약 1초 간격으로 자동 재연결을
  시도해 backend가 다시 뜨면 `연결됨`으로 돌아온다. 이때 살아남은 클라이언트의 로컬 Y.Doc이
  다시 서버로 올라가므로 파이프라인 내용도 복구된다.
- **알려진 한계**: A, B가 **모두** 나간 뒤 재접속하면 room이 이미 폐기되어 빈 캔버스가 된다
  (영속성은 범위 밖 — `docs/architecture.md`, `docs/ws-protocol.md` 5절).

**자동화 가능 여부**: 부분 자동화.

- 재연결 타이머와 소켓 재생성: `YjsWebSocketProvider.test.ts`
  ("drops remote awareness states and reconnects after the socket closes").
- 서버 쪽 재접속 시 상태 복원: `apps/backend/src/__tests__/ws-server.test.ts`(ws-protocol feature).
- 브라우저 새로고침 후 화면 복원 자체는 수동 확인.

---

## 5. (협업) awareness(커서/선택 상태) 공유

**사전 조건**: 공통 사전 조건. 노드가 최소 1개 있다.

**조작 순서**

1. A, B 모두 접속한 상태에서 각자의 presence bar를 확인한다.
2. A에서 아무 노드나 클릭해 선택한다.
3. A에서 마우스를 캔버스 위에서 움직인다.
4. A에서 캔버스 밖(브라우저 주소창 쪽)으로 마우스를 벗어나게 한다.
5. A 탭을 닫는다.

**기대 결과**

- (1) 양쪽 presence bar에 자신(`... (나)`)과 상대방의 이름·색 점이 함께 보인다. 이름/색은
  Yjs clientID에서 파생되므로 서로 다르다.
- (2) B 화면에서 A가 선택한 노드에 A의 색 테두리(outline)와 노드 위 이름 배지가 나타난다.
  A 자신의 화면에는 자기 배지가 표시되지 않는다.
- (3) B 화면에 A의 색 커서 포인터와 이름이 A의 마우스를 따라 움직인다. 커서는 캔버스(flow)
  좌표계로 공유되므로, B가 화면을 확대/이동해도 커서가 캔버스의 같은 지점에 붙어 있다.
- (4) B 화면에서 A의 커서가 사라진다(`cursor: null`). 선택 배지는 유지된다.
- (5) B의 presence bar에서 A가 사라지고, A의 선택 배지/커서도 즉시 사라진다(서버가
  `removeAwarenessStates` 결과를 중계).

**자동화 가능 여부**: 부분 자동화.

- awareness 인코딩/디코딩 왕복과 selectedNodeId 전파: `YjsWebSocketProvider.test.ts`
  ("sends and receives awareness envelopes"), 연결 종료 시 원격 상태 제거도 같은 파일에서 검증.
- presence bar/선택 배지 렌더링: `apps/frontend/src/components/pipeline/__tests__/PipelineCanvas.test.tsx`
  ("shows the connection status and a remote collaborator selecting a node").
- 실제 마우스 이동에 따른 커서 추적은 수동 확인.

---

## 채워야 할 시나리오 (해당 feature에서 작성)

6. (생성+그래프) 프롬프트 입력 → 이미지 생성 → 노드 파이프라인에 결과 반영
7. (생성+그래프) 기존 노드에서 분기 생성 → 엣지로 연결
8. (생성+그래프) 파이프라인 실행 결과가 각 노드 상태(idle/pending/ready/error)에 반영
9. (3D) Generate 3D 노드가 모델을 렌더링하고 OrbitControls로 회전 확인
10. (생성) 생성 결과 이미지가 노드에 표시됨
11. (생성) 생성 실패 시 에러 처리 확인
