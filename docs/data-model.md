# 데이터 모델

> `docs/architecture.md`의 절대 규칙("캔버스 오브젝트/노드 그래프 상태는 Y.Map, Y.Array로 표현하고
> 일반 JS 객체로 중복 관리하지 않는다")을 따른다. 여기 정의된 타입은 `shared-types` feature에서
> `packages/shared-types`의 TypeScript 타입으로 그대로 옮긴다. WS 메시지의 바이트 레벨 인코딩/
> 핸드셰이크 시퀀스는 `docs/ws-protocol.md`가 다루므로 여기서는 그 프로토콜이 실어 나르는 상위
> 데이터 구조만 정의한다.

## 0. Y.Doc 구조 개요

room(=`?room=<id>`) 하나당 Y.Doc 하나. 그 안에 최상위 공유 타입 3개를 둔다.

| Y.Doc 최상위 키 | 타입 | 용도 |
| --- | --- | --- |
| `canvasObjects` | `Y.Map<string, Y.Map>` | 캔버스 오브젝트 데이터 (키 = object id) |
| `canvasObjectOrder` | `Y.Array<string>` | 캔버스 오브젝트의 z-order (뒤→앞 순서로 id 나열) |
| `nodes` | `Y.Map<string, Y.Map>` | 노드 그래프의 노드 데이터 (키 = node id) |
| `edges` | `Y.Map<string, Y.Map>` | 노드 그래프의 엣지 데이터 (키 = edge id) |

**z-order를 별도 `Y.Array`로 분리하는 이유**: `Y.Map`은 동시 삽입 시 순회 순서가 안정적으로
보장되지 않는다. "순서변경"(`canvas-crud` feature)이 요구사항이므로, 실제 오브젝트 데이터는
`canvasObjects`에 두고 그리는 순서(z-order)만 `canvasObjectOrder`라는 `Y.Array<string>`으로
따로 관리한다. 오브젝트를 추가하면 이 배열 끝에 id를 push, 삭제하면 배열에서도 제거, 순서변경은
배열 안에서 id를 옮기는 것으로 표현한다.

awareness(커서/선택 상태)는 Y.Doc에 넣지 않는다. `y-protocols/awareness`가 별도로 관리하는
휘발성 상태이고, 영속화 대상이 아니기 때문이다 (아래 4번 참고).

## 1. 캔버스 오브젝트 (`canvasObjects`)

`canvasObjects.get(id)`가 반환하는 `Y.Map`의 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 오브젝트 id (uuid) |
| `imageUrl` | `string` | 표시할 이미지 URL (REST API가 발급한 URL 또는 업로드 URL) |
| `sourceNodeId` | `string \| null` | 이 오브젝트가 어느 노드 그래프 노드에서 왔는지. 사용자가 직접 업로드한 경우 `null` |
| `x` | `number` | 캔버스 좌표계 기준 좌상단 x |
| `y` | `number` | 캔버스 좌표계 기준 좌상단 y |
| `width` | `number` | 너비 (px) |
| `height` | `number` | 높이 (px) |
| `rotation` | `number` | 회전 각도 (degree, 시계방향) |

- 추가: `canvasObjects.set(id, new Y.Map([...]))` + `canvasObjectOrder.push([id])`
- 이동/크기조절/회전: 해당 `Y.Map`의 `x`/`y`/`width`/`height`/`rotation` 필드만 갱신 (필드
  단위 갱신이라야 동시 편집 시 Yjs가 필드별로 병합할 수 있다 — 오브젝트 전체를 새로 만들어
  덮어쓰지 않는다)
- 삭제: `canvasObjects.delete(id)` + `canvasObjectOrder`에서 해당 id 제거
- 순서변경: `canvasObjectOrder` 안에서 id의 위치만 변경 (오브젝트 데이터는 그대로)

## 2. 노드 그래프 (`nodes`, `edges`)

### 노드 (`nodes.get(id)`)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 노드 id (uuid) |
| `prompt` | `string` | 이 노드를 생성한 프롬프트 |
| `status` | `"pending" \| "ready" \| "error"` | 생성 진행 상태 (acceptance-criteria 시나리오 11: 생성 실패 처리) |
| `imageUrl` | `string \| null` | 생성된 이미지 URL. `status`가 `"ready"`가 아니면 `null` |
| `errorMessage` | `string \| null` | `status`가 `"error"`일 때만 값이 있음 |
| `parentNodeId` | `string \| null` | 분기 시작점이 된 부모 노드. 최초 생성 노드는 `null` |
| `position` | `{ x: number; y: number }` | React Flow가 그리는 좌표 |
| `createdAt` | `number` | 생성 시각 (epoch ms) |

### 엣지 (`edges.get(id)`)

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 엣지 id (uuid) |
| `sourceNodeId` | `string` | 분기 시작 노드 |
| `targetNodeId` | `string` | 분기로 새로 생긴 노드 |

- 새 생성(첫 노드): `nodes`에 `parentNodeId: null`인 노드 추가, 엣지 없음
- 기존 노드에서 분기: `nodes`에 `parentNodeId: <기존 노드 id>`인 새 노드 추가 + `edges`에
  `{ sourceNodeId: <기존 노드 id>, targetNodeId: <새 노드 id> }` 추가
- 노드 그래프는 트리 구조가 기본이지만, `edges`를 `nodes`와 분리해 둔 것은 이후 두 노드를
  수동으로 잇는 등의 확장을 열어두기 위함(현재 범위에서는 트리로만 생성됨)

## 3. 캔버스 ↔ 노드 그래프 관계

- 캔버스 오브젝트의 `sourceNodeId`가 노드 그래프의 `nodes`를 가리키는 유일한 연결점이다.
- 노드 그래프에서 노드를 클릭하면, 그 노드의 `imageUrl`을 가진 캔버스 오브젝트를 캔버스에
  추가(또는 이미 있으면 포커스)한다 — `sourceNodeId`로 기존 오브젝트를 찾는다
  (acceptance-criteria 시나리오 8).
- 역방향 참조(캔버스 오브젝트 목록을 노드가 아는 것)는 두지 않는다. 노드 하나가 캔버스에 여러 번
  올라갈 수 있어야 하므로(같은 생성 결과를 여러 위치에 배치) 1:N 관계이고, 노드 쪽에서 역참조를
  관리하면 오브젝트 추가/삭제 때마다 노드 쪽도 갱신해야 해서 상태가 중복된다.

## 4. Awareness 상태 (Y.Doc 밖, `y-protocols/awareness`)

Y.Doc에 영속화되지 않는 클라이언트별 휘발성 상태. `awareness.setLocalState(...)`에 실어 보내는
값의 타입:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `clientId` | `number` | Yjs가 클라이언트 연결마다 부여하는 id |
| `name` | `string` | 표시용 이름 (익명 세션이면 클라이언트가 생성) |
| `color` | `string` | 커서/선택 하이라이트 색 (hex) |
| `cursor` | `{ x: number; y: number } \| null` | 캔버스 위 커서 좌표. 캔버스 밖이면 `null` |
| `selectedObjectId` | `string \| null` | 현재 선택 중인 캔버스 오브젝트 id |

## 5. WS 메시지 타입 (상위 구조만 — 바이트 인코딩은 `docs/ws-protocol.md` 참고)

서버는 이 메시지의 내용을 해석하지 않고 같은 room에 그대로 중계한다(단순 중계자 규칙). 그래도
클라이언트/서버 양쪽 코드가 같은 태그 값을 쓰도록 `shared-types`에 공유 상수로 정의한다.

```ts
export const WS_MESSAGE_TYPE = {
  SYNC: 0,
  AWARENESS: 1,
} as const;

export type WsMessageType = (typeof WS_MESSAGE_TYPE)[keyof typeof WS_MESSAGE_TYPE];
```

- `SYNC` 메시지의 payload는 `y-protocols/sync`가 인코딩한 바이너리(SyncStep1/SyncStep2/Update)이고,
  그 안의 내용이 바로 위 1~3번 섹션의 `canvasObjects`/`canvasObjectOrder`/`nodes`/`edges` Y.Doc
  갱신이다.
- `AWARENESS` 메시지의 payload는 `y-protocols/awareness`가 인코딩한 바이너리이고, 그 안의 내용이
  4번 섹션의 `AwarenessState`다.
- 이 태그 값과 핸드셰이크 순서(연결 시 SyncStep1을 언제 보내는지 등)의 상세는
  `docs/ws-protocol.md`에서 정의한다.

## 6. `packages/shared-types`로 옮길 때의 이름

`shared-types` feature에서 아래 이름으로 그대로 export한다 (frontend는 Yjs 타입 위에 얹어 쓰고,
backend는 이 타입들로 검증용 테스트 픽스처를 만든다):

- `CanvasObject` — 1번 섹션 필드
- `GraphNode`, `NodeStatus`(`"pending" | "ready" | "error"`) — 2번 섹션 노드 필드
- `GraphEdge` — 2번 섹션 엣지 필드
- `AwarenessState` — 4번 섹션
- `WS_MESSAGE_TYPE`, `WsMessageType` — 5번 섹션

## 검증과의 연결

`shared-types` feature의 verification: "apps/frontend, apps/backend 양쪽에서 import 가능, tsc 에러 없음" —
6번 섹션에 나열된 이름 그대로 `packages/shared-types`에 타입을 작성하면 된다.
