# 완료 기준 시나리오

> 시나리오 1~5(협업)는 `collab-canvas` feature에서, 6~8·10~11(이미지 생성)은
> `ai-image-generation` feature에서, 9번(3D)은 `generate-3d-preview` feature에서 작성했다.
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

## 공통 사전 조건 (시나리오 6~8, 10~11 — 이미지 생성)

- 위 "공통 사전 조건"에 더해, `apps/backend/.env.example`을 `apps/backend/.env`로 복사하고
  `OPENAI_API_KEY`를 채운다. `apps/backend/src/index.ts`가 시작 시 이 파일을 읽는다
  (`process.loadEnvFile`). 키가 비어 있으면 backend 기동 로그에
  `OPENAI_API_KEY is not set — POST /api/generate-image will fail with 502` 경고가 뜨고 모든
  생성 요청이 `502 image generation failed`로 끝나므로, 그 상태에서는 시나리오 11(실패 처리)만
  수행 가능하다. **반대로 키가 설정되어 있으면 실행할 때마다 실제 OpenAI 크레딧이 소모된다.**
- 이 경고가 뜨지 않는 것이 키가 실제로 로드됐다는 확인 신호다(키 값 자체는 로그에 찍지 않는다).
- 프런트엔드는 `/api/*`, `/uploads/*`를 Vite dev 프록시로 backend(:3001)에 전달한다
  (`apps/frontend/vite.config.ts`). 따라서 브라우저에서 보이는 URL은 항상 `:5173` 기준의
  상대 경로다.
- Generate Image 노드의 실행 버튼은 **연결된 Text Prompt 노드의 내용이 하나라도 비어있지 않을
  때만** 활성화된다. 비활성일 때는 노드 카드에 `Text Prompt 노드를 연결하고 내용을 입력하세요`
  안내가 함께 보인다.

---

## 6. (생성+그래프) 프롬프트 입력 → 이미지 생성 → 노드 파이프라인에 결과 반영

**사전 조건**: 이미지 생성 공통 사전 조건. 캔버스는 비어 있다. A, B 모두 `?room=demo` 접속.

**조작 순서**

1. A에서 `Text Node`, `Image Node`를 하나씩 추가한다.
2. A에서 Text Prompt 노드에 `a neon jellyfish in deep water`를 입력한다.
3. 아직 두 노드를 연결하지 않은 상태에서 Generate Image 노드의 실행 버튼을 확인한다.
4. Text Prompt 노드의 출력 포트를 Generate Image 노드의 입력 포트로 드래그해 연결한다.
5. Generate Image 노드의 `이미지 생성` 버튼을 클릭한다.
6. 응답이 올 때까지(수 초~수십 초) 기다린다.

**기대 결과**

- (3) 실행 버튼이 비활성 상태이고 안내 문구가 보인다. 클릭해도 아무 요청이 나가지 않는다
  (DevTools Network 탭에 `/api/generate-image` 요청 없음).
- (4) 연결 직후 실행 버튼이 활성화되고 안내 문구가 사라진다.
- (5) 클릭 즉시 노드 상태 배지가 `idle` → `pending`으로 바뀌고, 미리보기 영역에 스피너와
  `생성 중...`이 보이며, 실행 버튼이 비활성화된다. Network 탭에 `POST /api/generate-image`가
  1건 나가고 요청 바디는 `{"prompt":"a neon jellyfish in deep water"}`다.
- (6) 응답이 오면 배지가 `ready`가 되고 미리보기 영역에 생성된 이미지가 표시된다. 버튼 라벨은
  `다시 생성`으로 바뀐다.
- 이 모든 변화(pending → ready, 이미지)가 **B 화면에서도 동일하게** 실시간으로 보인다
  (실행은 A만 눌렀지만 상태가 Y.Doc에 기록되기 때문).
- 응답 바디에 API 키가 들어있지 않다(`{ "imageUrl": "/uploads/...png" }`만).

**자동화 가능 여부**: 부분 자동화.

- 실행 → `POST /api/generate-image` 호출 → `pending`/`ready` 전이 → 원격 피어 반영:
  `apps/frontend/src/pipeline/__tests__/useNodeExecution.test.ts`(fetch mock),
  `apps/frontend/src/components/pipeline/__tests__/PipelineCanvas.test.tsx`
  ("renders pending then the generated image after a successful run").
- 서버 쪽 요청/응답 스키마와 키 비노출: `apps/backend/src/__tests__/generate-image.test.ts`.
- 실제 OpenAI 호출과 브라우저 렌더링은 수동 확인(실제 키 필요).

---

## 7. (생성+그래프) 기존 노드에서 분기 생성 → 엣지로 연결

**사전 조건**: 시나리오 6을 마친 상태(Text Prompt 1개 + `ready`인 Generate Image 1개).

**조작 순서**

1. A에서 `Image Node`를 하나 더 추가한다.
2. 기존 Text Prompt 노드의 출력 포트를 새 Generate Image 노드에도 연결한다(fan-out).
3. B에서 `Text Node`를 하나 더 추가하고 `bioluminescent, dark background`를 입력한다.
4. B에서 그 새 Text Prompt 노드를 **첫 번째** Generate Image 노드에도 연결한다(fan-in — 이제
   그 노드에는 Text Prompt 2개가 들어온다).
5. A에서 첫 번째 Generate Image 노드의 `다시 생성`을 클릭한다.
6. 두 Text Prompt 노드의 화면상 위아래 위치를 바꿔(위쪽 노드를 아래로 드래그) 다시 실행한다.

**기대 결과**

- (2) 새 엣지가 양쪽 화면에 그려지고, 새 Generate Image 노드의 실행 버튼이 활성화된다. 기존
  Generate Image 노드의 `ready` 이미지는 그대로 유지된다(분기가 기존 결과를 건드리지 않는다).
- (4) 엣지가 2개 들어오는 것이 허용된다(fan-in). 노드가 중복 생성되지 않는다.
- (5) 요청 바디의 `prompt`가 두 프롬프트를 **개행으로 이어붙인 문자열**이고, 순서는 캔버스에서
  **위에 있는 노드가 앞**이다(같은 높이면 왼쪽이 앞, 그래도 같으면 노드 id 사전순 —
  `docs/architecture.md` "여러 입력(fan-in) 조합 규칙").
- (6) 순서를 바꾼 뒤 실행하면 이어붙는 순서도 그에 맞춰 바뀐다. A가 실행하든 B가 실행하든 같은
  문자열이 만들어진다.
- 두 Generate Image 노드는 서로 독립적으로 실행된다(하나가 `pending`이어도 다른 하나는 실행 가능).

**자동화 가능 여부**: 부분 자동화.

- 조합 규칙(정렬·개행 이어붙이기·공백 제외·다른 노드로 가는 엣지 무시):
  `apps/frontend/src/pipeline/__tests__/promptComposition.test.ts`.
- fan-out/fan-in 엣지 생성 자체: `apps/frontend/src/pipeline/__tests__/usePipelineState.test.ts`.
- 실제 포트 드래그와 두 브라우저 간 확인은 수동.

---

## 8. (생성+그래프) 파이프라인 실행 결과가 각 노드 상태(idle/pending/ready/error)에 반영

**사전 조건**: 이미지 생성 공통 사전 조건. Text Prompt 1개 + Generate Image 1개가 연결되어 있고
프롬프트에 내용이 있다. A, B 모두 접속 중.

**조작 순서**

1. 실행 전 노드 배지를 확인한다.
2. A에서 실행하고, 응답이 오기 전에 B 화면의 같은 노드를 본다.
3. 성공 응답 후 양쪽 배지와 미리보기를 확인한다.
4. backend를 잠깐 내린 뒤(또는 `OPENAI_API_KEY`를 비운 뒤 재시작) 다시 실행한다.
5. backend를 정상 복구하고 다시 실행한다.
6. Text Prompt 노드의 내용을 모두 지운 뒤 Generate Image 노드를 본다.
7. 다시 내용을 채우고 A에서 실행한 뒤, `pending`이 보이는 동안 **A 탭을 새로고침**한다.
   B 화면의 같은 노드를 본다.

**기대 결과**

- (1) `idle` — 미리보기는 `Empty Output`.
- (2) A와 B 모두 `pending` — B에서도 스피너/`생성 중...`이 보이고, B의 실행 버튼도 비활성이다
  (같은 노드를 두 사람이 동시에 중복 실행하지 않게 된다).
- (3) 양쪽 다 `ready` + 이미지. `errorMessage`는 남지 않는다.
- (4) 양쪽 다 `error`로 바뀌고 에러 메시지가 노드에 보인다. 이때 **직전 이미지는 지워진다**
  (`imageUrl`은 `ready`일 때만 값이 있다는 데이터 모델 불변식 —`docs/data-model.md` 1번).
- (5) 다시 `pending` → `ready`가 되고 새 이미지로 교체된다(`error` 상태에서 재실행 가능).
- (6) 실행 버튼이 다시 비활성화되고 안내 문구가 보인다. 이미 있던 결과 이미지는 그대로 남는다
  (입력이 사라졌다고 과거 결과를 지우지는 않는다).
- (7) A가 사라지면 B 화면의 노드가 잠시 뒤 "실행하던 사용자의 연결이 끊겼습니다. 다시 실행하세요"로
  바뀌고 실행 버튼이 다시 활성화된다. B가 실행하면 정상적으로 `pending` → `ready`가 된다.
  **노드가 `pending`으로 굳어 삭제밖에 방법이 없는 상태가 되어서는 안 된다**
  (`docs/architecture.md` "실행 상태(pending) 소유권과 회수"). 반대로 A가 살아서 실행 중인
  동안에는 B의 버튼이 비활성이어야 한다(중복 실행 방지).

**자동화 가능 여부**: 대부분 자동화됨.

- 상태 전이와 불변식(pending 시 결과 비움, error 시 이미지 제거, 재실행 시 교체):
  `apps/frontend/src/collab/__tests__/pipelineDoc.test.ts`
  ("transitions a generateImage node through pending -> ready in the Y.Doc",
  "clears a stale result when a failed run overwrites a ready node",
  "propagates execution state to a peer document"),
  `useNodeExecution.test.ts`("clears a previous result when the node is re-run").
- 원격 피어에 실행 상태가 보이는 것: `PipelineCanvas.test.tsx`("shows a remote peer’s execution state").
- 버려진 실행 판정과 회수: `apps/frontend/src/pipeline/__tests__/runState.test.ts`(7건),
  `PipelineCanvas.test.tsx`("lets a pending run be recovered after its owner disconnects",
  "keeps the run locked while the peer that started it is still connected").
- 실제 backend 중단/복구 왕복, 실행 중 탭 새로고침은 수동.

---

## 9. (3D) Generate 3D 노드가 모델을 렌더링하고 OrbitControls로 회전 확인

**사전 조건**

- 이미지 생성 공통 사전 조건에 더해 `apps/backend/.env`의 `MESHY_API_KEY`를 채운다. 비어 있으면
  backend 기동 로그에 `MESHY_API_KEY is not set — POST /api/generate-3d will fail with 502`
  경고가 뜨고 모든 3D 생성이 `502 3d generation failed`로 끝난다(그 상태에서는 아래 (6)의 실패
  경로만 확인 가능하다). **키가 설정되어 있으면 실행할 때마다 실제 Meshy 크레딧이 소모된다.**
- 시나리오 6을 마쳐 `ready`인 Generate Image 노드가 하나 있다. A, B 모두 `?room=demo` 접속.
- 브라우저에서 WebGL이 활성화돼 있어야 한다(`chrome://gpu`). 비활성이면 노드 카드에
  `이 환경에서는 3D 미리보기를 표시할 수 없습니다`가 대신 표시된다.

**조작 순서**

1. A에서 하단 툴바의 `3D Node`를 클릭해 Generate 3D 노드를 추가한다. 연결하기 전에 실행 버튼을
   확인한다.
2. `ready`인 Generate Image 노드의 출력 포트를 Generate 3D 노드의 입력 포트로 드래그해 연결한다.
3. Generate 3D 노드의 `3D 생성` 버튼을 클릭하고, 응답이 올 때까지(수십 초~수 분) 기다린다.
   기다리는 동안 B 화면의 같은 노드를 본다.
4. 결과가 보이면 노드 안 3D 뷰포트를 마우스로 드래그하고, 휠을 굴린다. 이어서 뷰포트 **바깥**의
   노드 헤더를 잡고 노드를 캔버스에서 옮겨 본다.
5. Generate Image 노드를 하나 더 만들어 생성한 뒤, 그것도 같은 Generate 3D 노드에 연결한다
   (fan-in). 두 이미지 노드의 위아래 위치를 바꿔 가며 `다시 생성`을 눌러 본다.
6. backend를 내리거나 `MESHY_API_KEY`를 비운 채 재시작하고 다시 실행한다. 그 뒤 정상 복구해
   다시 실행한다.
7. `pending`이 보이는 동안 A 탭을 새로고침하고 B 화면의 같은 노드를 본다.

**기대 결과**

- (1) 실행 버튼이 비활성이고 `이미지가 생성된 Generate Image 노드를 연결하세요` 안내가 보인다.
  상태 배지는 `idle`, 뷰포트 자리에는 `[3D_VIEWPORT_RENDERER]` 플레이스홀더가 보인다.
- (2) 연결 직후 실행 버튼이 활성화되고 안내 문구가 사라진다. 연결한 이미지 노드가 아직 `ready`가
  아니면 버튼은 계속 비활성이다(이미지가 없으면 3D를 만들 수 없다).
- (3) 클릭 즉시 배지가 `pending`이 되고 스피너/`생성 중...`이 보인다. Network 탭에
  `POST /api/generate-3d`가 1건 나가고 바디는 `{"imageUrl":"/uploads/<...>.png"}` 하나뿐이다
  (이미지 여러 장이나 프롬프트가 함께 나가지 않는다). B 화면에서도 같은 `pending`이 보이고
  B의 실행 버튼도 비활성이다. 응답이 오면 양쪽 배지가 `ready`가 되고, 응답 바디는
  `{ "modelUrl": "/uploads/<uuid>-model.glb" }`뿐이다(API 키가 들어있지 않다).
- (4) 노드 카드 안 검은 뷰포트에 3D 메시가 그려진다. 드래그하면 **모델이 회전**하고 휠로
  확대/축소된다. 이때 캔버스 자체는 팬/줌되지 않고 노드도 끌려가지 않는다(뷰어에 `nodrag nowheel`).
  뷰포트 바깥의 헤더를 잡으면 평소처럼 노드가 이동하며, 이동/줌 후에도 모델이 계속 렌더링된다.
  B 화면에서도 같은 모델이 렌더링된다(Y.Doc에는 URL만 공유되고 파일은 서버가 서빙).
- (5) fan-in이 허용되고 노드가 중복 생성되지 않는다. 실행 시 보내는 `imageUrl`은 항상 **캔버스에서
  더 위에 있는** `ready` 이미지 노드의 것이다(같은 높이면 왼쪽, 그래도 같으면 노드 id 사전순 —
  `docs/architecture.md` "여러 입력(fan-in) 조합 규칙"). 위아래를 바꾸면 보내는 이미지도 바뀐다.
  위쪽 이미지 노드가 `error`/`pending`이면 그것을 건너뛰고 아래쪽 `ready` 이미지가 쓰인다.
  A가 실행하든 B가 실행하든 같은 이미지가 선택된다.
- (6) 배지가 `error`가 되고 노드에 `3d generation failed`(rate limit이면
  `rate limited, try again later`)가 표시된다. 이전 `modelUrl`은 지워져 뷰포트가 다시 플레이스홀더로
  돌아간다(결과는 `ready`일 때만 존재한다는 데이터 모델 불변식). 화면 어디에도 API 키나 스택
  트레이스가 없다. 정상 복구 후 `다시 생성`을 누르면 `pending` → `ready`로 회복된다.
- (7) B 화면의 노드가 잠시 뒤 `실행하던 사용자의 연결이 끊겼습니다. 다시 실행하세요`로 바뀌고
  실행 버튼이 다시 활성화된다. 노드가 복구 불가능한 `pending`으로 굳지 않는다
  (`docs/architecture.md` "실행 상태(pending) 소유권과 회수" — 시나리오 8 (7)과 동일한 경로).

**자동화 가능 여부**: 부분 자동화.

- 이미지 fan-in 선택 규칙(정렬·`ready`가 아닌 후보 건너뛰기·다른 노드로 가는 엣지 무시):
  `apps/frontend/src/pipeline/__tests__/imageSelection.test.ts`.
- 실행 → `POST /api/generate-3d` 호출 → `pending`/`ready`/`error` 전이 → 원격 피어 반영:
  `apps/frontend/src/pipeline/__tests__/useNodeExecution.test.ts`
  (`useNodeExecution — runGenerate3d` 5건),
  `apps/frontend/src/components/pipeline/__tests__/PipelineCanvas.test.tsx`
  (`PipelineCanvas — Generate 3D 실행` 5건).
- 요청/응답 스키마, 타임아웃, 에러 메시지: `apps/frontend/src/api/__tests__/generation.test.ts`
  (`requestGenerate3d` 4건), 서버 쪽은 `apps/backend/src/__tests__/generate-3d.test.ts`.
- Three.js 씬/카메라/렌더러/OrbitControls 초기화, `modelUrl`을 GLTFLoader로 로드, 모델 프레이밍,
  dispose: `apps/frontend/src/three/__tests__/modelScene.test.ts`(WebGL 렌더러만 stub, 나머지는 실제
  three). 뷰어 컴포넌트가 `modelUrl` 변경마다 씬을 다시 만들고 언마운트 시 정리하는 것과 WebGL
  불가 환경 폴백: `apps/frontend/src/components/pipeline/__tests__/ModelViewer.test.tsx`.
- **수동 확인이 필요한 것**: 실제 픽셀이 그려지는지, OrbitControls 드래그로 정말 회전하는지,
  React Flow 캔버스로 제스처가 새지 않는지, 그리고 실제 Meshy API 왕복(위 (3)의 종단 성공).
  jsdom에는 WebGL이 없어 자동화 범위 밖이다 — 브라우저(또는 Playwright + WebGL 지원 헤드리스)로
  확인한다.

---

## 10. (생성) 생성 결과 이미지가 노드에 표시됨

**사전 조건**: 시나리오 6의 결과(`ready`인 Generate Image 노드 1개).

**조작 순서**

1. Generate Image 노드의 미리보기 영역을 본다.
2. DevTools Elements에서 그 `<img>`의 `src`를 확인하고, 같은 URL을 새 탭에서 연다.
3. 캔버스를 확대/축소하고 노드를 드래그해 옮긴다.
4. B(다른 브라우저)에서 같은 room을 새로 열어 노드를 확인한다.
5. A 탭을 새로고침한다(B는 접속 유지).

**기대 결과**

- (1) 생성된 이미지가 노드 카드 안에 표시되고, `Empty Output` 플레이스홀더는 사라진다.
- (2) `src`는 `/uploads/<uuid>-generated.png` 형태의 상대 경로다(외부 AI 서비스의 임시 URL이
  아니다 — `docs/api-spec.md` 공통 사항). 새 탭에서 열면 같은 이미지가 200으로 응답된다.
- (3) 이미지가 노드와 함께 이동/확대되고 깨지지 않는다.
- (4) B 화면에서도 같은 이미지가 보인다(Y.Doc에 URL만 공유되고 이미지 자체는 서버에서 서빙).
- (5) 새로고침 후에도 이미지가 그대로 복원된다(다른 클라이언트가 room에 남아 있는 경우 —
  시나리오 4의 알려진 한계 동일).

**자동화 가능 여부**: 부분 자동화.

- 응답 URL이 노드에 반영되고 `<img>`로 렌더링되는 것: `PipelineCanvas.test.tsx`
  ("renders pending then the generated image after a successful run" — `alt="생성된 이미지"`의
  `src` 확인).
- `/uploads/:filename` 서빙과 경로 순회 차단: `apps/backend/src/__tests__/uploads-static.test.ts`.
- 실제 이미지 픽셀이 브라우저에 그려지는 것은 수동 확인.

---

## 11. (생성) 생성 실패 시 에러 처리 확인

**사전 조건**: Text Prompt(내용 있음) 1개 + Generate Image 1개가 연결되어 있다.

**조작 순서**

1. backend를 완전히 종료한 뒤 실행 버튼을 클릭한다.
2. backend를 켜되 `OPENAI_API_KEY`를 비우거나 잘못된 값으로 설정하고 재시작한 뒤 실행한다.
3. (선택) OpenAI rate limit(429)을 유발하거나, `apps/backend/src/lib/openaiClient.ts`가 429를
   던지도록 임시 수정해 실행한다.
4. 실패한 상태에서 노드를 그대로 두고 B 화면을 확인한다.
5. 정상 상태로 복구한 뒤 같은 노드에서 `다시 생성`을 클릭한다.

**기대 결과**

- (1) 배지가 `error`가 되고 노드에 에러 메시지가 표시된다. 표시되는 문구는 요청이 Vite dev
  프록시를 거치는지에 따라 갈린다.
  - `pnpm dev`(Vite dev 프록시 경유): 프록시가 backend의 ECONNREFUSED를 가로채 본문이 빈
    `500 Internal Server Error`(`Content-Type: text/plain`)를 대신 응답하므로 `fetch`는
    reject하지 않는다. 응답 본문 JSON 파싱이 실패해 폴백 문구인
    `이미지 생성에 실패했습니다`가 표시된다.
  - 프록시를 거치지 않는 호출(same-origin 배포 등): `fetch` 자체가 throw하여
    `서버에 연결할 수 없습니다`가 표시된다.
  - 어느 경우든 노드는 `error`로 전이되고, 브라우저 콘솔에 처리되지 않은
    예외(unhandled rejection)가 남지 않는다.
- (2) 배지가 `error`가 되고 서버가 준 메시지 `image generation failed`가 표시된다
  (`docs/api-spec.md` 에러 표). 화면 어디에도 스택 트레이스나 API 키가 보이지 않는다.
- (3) `rate limited, try again later`가 표시된다.
- (4) B 화면에서도 같은 `error` 상태와 같은 메시지가 보인다.
- (5) `pending` → `ready`로 정상 복구되고, 에러 메시지는 사라진다. 노드가 `error`에서 영구히
  막히지 않는다.
- 어떤 실패에서도 노드가 **복구 불가능한 `pending`으로 남지 않는다**. 구체적으로:
  - 응답이 오지 않고 매달리는 경우: 클라이언트 요청 타임아웃(2분)이 걸려 실행자가 스스로
    `error`(`생성 요청이 시간 초과되었습니다`)로 끝낸다.
  - 실행자가 사라져 아무도 끝낼 수 없는 경우: 남은 피어가 "실행하던 사용자의 연결이 끊겼습니다"
    안내와 함께 재실행할 수 있다(시나리오 8의 (7)).

**자동화 가능 여부**: 대부분 자동화됨.

- 네트워크 실패/502/429 각각의 메시지와 `error` 전이: `useNodeExecution.test.ts`
  ("stores the server error message when generation fails",
  "reports a network failure without leaving the node stuck in pending"),
  `PipelineCanvas.test.tsx`("renders the server error message when the run fails").
- 요청 타임아웃(AbortController): `apps/frontend/src/api/__tests__/generation.test.ts`
  ("aborts and reports a timeout when the server never responds").
- 서버 쪽 에러 status/body와 키 비노출: `apps/backend/src/__tests__/generate-image.test.ts`.
- 실제 rate limit 재현은 수동(또는 위 3번의 임시 수정).
