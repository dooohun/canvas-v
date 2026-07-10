# 데이터 모델

> `docs/architecture.md`의 절대 규칙("파이프라인 노드/엣지 상태는 Y.Map, Y.Array로 표현하고
> 일반 JS 객체로 중복 관리하지 않는다")을 따른다. 여기 정의된 타입은 `shared-types` feature에서
> `packages/shared-types`의 TypeScript 타입으로 그대로 옮긴다. WS 메시지의 바이트 레벨 인코딩/
> 핸드셰이크 시퀀스는 `docs/ws-protocol.md`가 다루므로 여기서는 그 프로토콜이 실어 나르는 상위
> 데이터 구조만 정의한다.
>
> **2026-07-09 업데이트**: `docs/product-plan.md`의 화면 구성 변경(3패널 탭 → 단일 노드
> 파이프라인 캔버스)에 맞춰 이 문서를 다시 썼다. 옛 `canvasObjects`/`canvasObjectOrder`(자유
> 배치 이미지 캔버스)와 옛 `nodes`/`edges`(생성 히스토리 전용, 트리 구조)는 하나의 통합된
> `nodes`/`edges`(일반 그래프, 노드가 곧 파이프라인 단계)로 합쳐졌다. 현재
> `packages/shared-types`의 실제 코드(`CanvasObject`, `GraphNode` 등)는 아직 옛 스키마
> 그대로이니, `shared-types` feature를 이 문서 기준으로 다시 구현해야 한다(관련 부분은
> `feature_list.json`에서도 갱신 필요).

## 0. Y.Doc 구조 개요

room(=`?room=<id>`) 하나당 Y.Doc 하나. 그 안에 최상위 공유 타입 2개를 둔다.

| Y.Doc 최상위 키 | 타입 | 용도 |
| --- | --- | --- |
| `nodes` | `Y.Map<string, Y.Map>` | 파이프라인 노드 데이터 (키 = node id) |
| `edges` | `Y.Map<string, Y.Map>` | 노드 간 연결 데이터 (키 = edge id) |

옛 문서에 있던 `canvasObjects`/`canvasObjectOrder`는 없앴다. 자유 배치 이미지 레이어라는
개념 자체가 없어졌고(캔버스가 곧 노드 그래프), z-order 요구사항도 함께 사라졌다 — React Flow는
선택된 노드를 자체적으로 맨 위에 그리므로 별도의 순서 관리 배열이 필요 없다.

awareness(커서/선택 상태)는 Y.Doc에 넣지 않는다. `y-protocols/awareness`가 별도로 관리하는
휘발성 상태이고, 영속화 대상이 아니기 때문이다 (아래 3번 참고).

## 1. 노드 (`nodes`)

모든 노드가 공통으로 갖는 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 노드 id (uuid) |
| `type` | `"textPrompt" \| "generateImage" \| "generate3d"` | 노드 종류 |
| `position` | `{ x: number; y: number }` | React Flow가 그리는 캔버스 좌표 |

`type`에 따라 추가로 갖는 필드 (Y.Map에는 해당 타입에 필요한 필드만 존재한다 — 다른 타입의
필드는 아예 세팅하지 않는다):

### `type: "textPrompt"`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `prompt` | `string` | 사용자가 직접 입력하는 텍스트. 이 노드의 출력값 그 자체 |

입력 포트가 없는 시작 노드다 (2번 섹션 참고).

### `type: "generateImage"`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `status` | `NodeStatus`(`"idle" \| "pending" \| "ready" \| "error"`) | 실행 상태 |
| `imageUrl` | `string \| null` | 생성된 이미지 URL. `status`가 `"ready"`가 아니면 `null` |
| `errorMessage` | `string \| null` | `status`가 `"error"`일 때만 값이 있음 |

입력 텍스트는 이 노드에 저장하지 않는다. 실행 시점에 들어오는 엣지를 따라 연결된
`textPrompt` 노드들의 `prompt` 값을 읽어 조합한다(값을 복제해서 들고 있으면 원본이 바뀔 때
동기화가 깨진다 — 상태 중복 금지 규칙). 여러 개가 연결됐을 때 정확히 어떻게 합치는지는
아직 미정(`docs/architecture.md`의 "열린 질문" 참고).

### `type: "generate3d"`

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `status` | `NodeStatus` | 실행 상태 |
| `resultUrl` | `string \| null` | 결과 URL. `status`가 `"ready"`가 아니면 `null` |
| `errorMessage` | `string \| null` | `status`가 `"error"`일 때만 값이 있음 |

출력 포트가 없는 터미널 노드다. `resultUrl`이라는 중립적인 이름을 쓴 이유: 이 노드가 실제로
무엇을 만드는지(고정된 3D 모델에 이미지를 텍스처로 매핑한 결과인지, 별도 API로 생성한 3D
에셋 URL인지)가 아직 `docs/architecture.md`의 "열린 질문"으로 남아 있기 때문이다. 확정되면
필드명을 더 구체적으로(`textureUrl` 또는 `modelUrl` 등) 바꿀 수 있다.

입력 이미지도 마찬가지로 저장하지 않는다 — 실행 시점에 연결된 `generateImage` 노드들의
`imageUrl`을 읽는다.

## 2. 포트 타입과 엣지 규칙

각 노드 타입은 입력 포트 0~1개, 출력 포트 0~1개를 갖는다 (포트 여러 개가 아니라, 포트 하나에
여러 엣지가 붙을 수 있는 구조다 — 아래 참고).

| 노드 타입 | 입력 포트 타입 | 출력 포트 타입 |
| --- | --- | --- |
| `textPrompt` | 없음 | `text` |
| `generateImage` | `text` | `image` |
| `generate3d` | `image` | 없음 |

**연결 규칙**:

- 엣지는 반드시 같은 포트 타입끼리만 연결된다 — `text` 출력은 `text` 입력에만(**text-to-text**),
  `image` 출력은 `image` 입력에만(**image-to-image**) 연결 가능. 유효한 조합은
  `textPrompt → generateImage`와 `generateImage → generate3d` 둘뿐이다.
- **fan-out 허용**: 한 노드의 출력 포트에서 여러 엣지로 분기할 수 있다(하나의 `textPrompt`가
  여러 `generateImage`에 연결).
- **fan-in 허용(확정)**: 한 노드의 입력 포트에 여러 엣지가 들어올 수 있다(여러 `textPrompt`가
  한 `generateImage`에, 또는 여러 `generateImage`가 한 `generate3d`에 연결). 실제로 여러 입력을
  어떻게 조합해서 실행할지는 `docs/architecture.md`의 "열린 질문"으로 남겨둠 — 데이터 모델
  수준에서는 허용하는 것으로 확정.
- 이 연결 규칙은 **클라이언트에서만** 검증한다(React Flow의 연결 유효성 검사). 서버는 이 규칙을
  전혀 모른다 — `docs/architecture.md`의 "서버는 도메인 구조를 들여다보지 않는다" 규칙.

## 3. 엣지 (`edges`)

`edges.get(id)`가 반환하는 `Y.Map`의 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 엣지 id (uuid) |
| `sourceNodeId` | `string` | 출력 쪽 노드 |
| `targetNodeId` | `string` | 입력 쪽 노드 |

엣지에 포트 id를 따로 두지 않는다 — 노드 타입마다 입력/출력 포트가 각각 최대 1개뿐이라
`sourceNodeId`/`targetNodeId`만으로 어느 포트인지 항상 결정된다(2번 섹션 표 참고). 노드
타입이 늘어나 포트가 여러 개 필요해지면 그때 `sourcePortId`/`targetPortId`를 추가한다.

- 새 엣지 연결: `edges`에 `{ sourceNodeId, targetNodeId }` 추가 (연결 전에 2번 섹션 규칙으로
  유효성 검사)
- 엣지 삭제: `edges.delete(id)`
- 노드 삭제 시: 그 노드를 참조하는 모든 엣지도 같이 삭제한다(고아 엣지 방지) — 클라이언트가
  노드 삭제와 엣지 정리를 하나의 Yjs transaction으로 묶어서 처리한다.

## 4. Awareness 상태 (Y.Doc 밖, `y-protocols/awareness`)

Y.Doc에 영속화되지 않는 클라이언트별 휘발성 상태. `awareness.setLocalState(...)`에 실어 보내는
값의 타입:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `clientId` | `number` | Yjs가 클라이언트 연결마다 부여하는 id |
| `name` | `string` | 표시용 이름 (익명 세션이면 클라이언트가 생성) |
| `color` | `string` | 커서/선택 하이라이트 색 (hex) |
| `cursor` | `{ x: number; y: number } \| null` | 캔버스 위 커서 좌표. 캔버스 밖이면 `null` |
| `selectedNodeId` | `string \| null` | 현재 선택 중인 노드 id (옛 `selectedObjectId`에서 이름만 변경) |

## 5. WS 메시지 타입 (상위 구조만 — 바이트 인코딩은 `docs/ws-protocol.md` 참고)

서버는 이 메시지의 내용을 해석하지 않고 같은 room에 그대로 중계한다(단순 중계자 규칙). 그래도
클라이언트/서버 양쪽 코드가 같은 태그 값을 쓰도록 `shared-types`에 공유 상수로 정의한다. 이
부분은 화면 구성 변경과 무관하게 그대로 유지된다.

```ts
export const WS_MESSAGE_TYPE = {
  SYNC: 0,
  AWARENESS: 1,
} as const;

export type WsMessageType = (typeof WS_MESSAGE_TYPE)[keyof typeof WS_MESSAGE_TYPE];
```

- `SYNC` 메시지의 payload는 `y-protocols/sync`가 인코딩한 바이너리(SyncStep1/SyncStep2/Update)이고,
  그 안의 내용이 바로 위 1~3번 섹션의 `nodes`/`edges` Y.Doc 갱신이다.
- `AWARENESS` 메시지의 payload는 `y-protocols/awareness`가 인코딩한 바이너리이고, 그 안의 내용이
  4번 섹션의 `AwarenessState`다.
- 이 태그 값과 핸드셰이크 순서(연결 시 SyncStep1을 언제 보내는지 등)의 상세는
  `docs/ws-protocol.md`에서 정의한다.

## 6. `packages/shared-types`로 옮길 때의 이름

`shared-types` feature에서 아래 이름으로 export한다 (frontend는 Yjs 타입 위에 얹어 쓰고,
backend는 이 타입들로 검증용 테스트 픽스처를 만든다). **옛 `CanvasObject`/`GraphNode`/
`GraphEdge`는 없앤다** — 아래 이름으로 대체:

- `NodeType`(`"textPrompt" | "generateImage" | "generate3d"`), `NodeStatus`(`"idle" | "pending" | "ready" | "error"`) — 1번 섹션
- `TextPromptNode`, `GenerateImageNode`, `Generate3dNode` — 1번 섹션 타입별 필드. 셋을 묶은
  판별 유니언 `PipelineNode = TextPromptNode | GenerateImageNode | Generate3dNode`도 함께 export
- `PortDataType`(`"text" | "image"`), `NODE_PORTS`(노드 타입 → 입출력 포트 타입 조회용 상수
  객체, 2번 섹션 표 그대로) — 클라이언트의 연결 유효성 검사가 이 상수 하나만 보고 판단하도록
- `PipelineEdge` — 3번 섹션 (옛 `GraphEdge`에서 이름만 변경, 필드는 동일)
- `AwarenessState` — 4번 섹션 (`selectedNodeId`로 필드명 변경)
- `WS_MESSAGE_TYPE`, `WsMessageType` — 5번 섹션 (변경 없음)

## 검증과의 연결

`shared-types` feature의 verification: "apps/frontend, apps/backend 양쪽에서 import 가능, tsc 에러 없음" —
단, 현재 `packages/shared-types`의 실제 코드는 이 문서 이전 버전(옛 스키마) 기준으로 이미
구현되어 있다. 6번 섹션의 새 이름으로 다시 작성하고, `feature_list.json`의 `shared-types`
항목도 이 사실을 반영해 다시 검토해야 한다(현재 `passing`으로 표시돼 있지만 코드가 최신
스키마와 어긋난 상태).
