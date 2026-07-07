# 커스텀 Yjs WebSocket 프로토콜

> `docs/architecture.md`에 따라 Hocuspocus, `y-websocket` 모두 쓰지 않고 `ws` + `y-protocols`를
> 직접 배관해서 구현한다. 여기 정의된 메시지 타입은 `docs/data-model.md` 5번 섹션의
> `WS_MESSAGE_TYPE` 상수를 그대로 쓴다.

## 0. "서버는 병합/재해석하지 않는다"는 규칙의 정확한 의미

`docs/architecture.md`는 "room마다 Y.Doc을 메모리에 유지한다"와 "서버는 자체적으로 상태를
병합하거나 재해석하지 않는다(단순 중계자)"를 동시에 요구한다. 언뜻 모순처럼 보이지만 다음처럼
구분하면 둘 다 만족한다.

- 서버는 room마다 실제 `Y.Doc` 인스턴스를 하나씩 갖고, 클라이언트가 보낸 update를
  `Y.applyUpdate(room.doc, update)`로 **기계적으로** 반영한다. 이건 Yjs CRDT 알고리즘이 하는
  일이지 서버가 짠 로직이 아니다 — 새로 들어온 클라이언트에게 SyncStep1/2로 응답하려면 서버가
  현재 상태를 들고 있어야 하므로 필요하다.
- 서버는 `canvasObjects`/`nodes`/`edges` 같은 **도메인 구조를 절대 들여다보지 않는다.** 특정
  필드를 검사하거나, 충돌을 임의 규칙으로 해결하거나, 업데이트 일부를 거부하는 로직을 짜지
  않는다. 서버 코드에 `CanvasObject`, `GraphNode` 같은 타입이 단 한 줄도 등장하지 않아야 한다 —
  등장한다면 이 규칙을 어긴 것이다.

즉 "Yjs의 일반 병합 알고리즘 적용"까지는 허용, "도메인 로직 개입"은 금지.

## 1. 연결 수립

- 클라이언트는 `ws(s)://<host>/?room=<roomId>`로 연결한다.
- 서버는 `connection` 핸들러에서 upgrade 요청의 URL로부터 `room` 쿼리 파라미터를 읽는다.
  - 없으면 연결을 즉시 닫는다: WS close code `4400`(커스텀 애플리케이션 코드), reason
    `"room query param is required"`.
- room은 서버 메모리의 `Map<string, Room>`으로 관리하고, `Room`은 다음을 갖는다:
  ```ts
  interface Room {
    doc: Y.Doc;
    awareness: Awareness; // y-protocols/awareness
    clients: Set<WebSocket>;
  }
  ```
- 해당 `roomId`의 `Room`이 없으면 그 자리에서 새로 만든다(lazy 생성 — 첫 연결이 room을 만든다).
- 연결에 성공하면 그 WebSocket을 `room.clients`에 추가한다.

## 2. 메시지 타입 (envelope)

WS 바이너리 프레임 하나가 envelope 하나다. 바깥쪽 태그는 `docs/data-model.md`의
`WS_MESSAGE_TYPE`을 그대로 쓰고, `lib0/encoding`·`lib0/decoding`(y-protocols가 내부적으로 쓰는
저수준 인코딩 라이브러리, backend에 직접 의존성으로 추가 필요)으로 씌운다.

```
varUint  messageType   (WS_MESSAGE_TYPE.SYNC = 0 | WS_MESSAGE_TYPE.AWARENESS = 1)
...      payload
```

- `messageType === SYNC`일 때 payload는 `y-protocols/sync`가 만드는 바이트열이고, 그 안에 다시
  자체 서브타입이 있다 (이건 직접 만들지 않고 `syncProtocol.writeSyncStep1/writeSyncStep2/writeUpdate`,
  `syncProtocol.readSyncMessage`를 그대로 호출해서 얻는다):
  - `0` = SyncStep1 (보내는 쪽의 state vector)
  - `1` = SyncStep2 (요청받은 state vector 기준으로 부족한 update)
  - `2` = Update (그 이후의 낱개 변경분)
- `messageType === AWARENESS`일 때 payload는 `awarenessProtocol.encodeAwarenessUpdate(...)`가
  만드는 바이트열이다 (서브타입 없음 — 클라이언트별 상태가 이미 자체 기술적으로 들어있다).

**직접 만들지 않는 것**: SyncStep1/2/Update의 바이트 포맷과 `readSyncMessage`의 분기 처리는
`y-protocols/sync`가 이미 구현해서 제공한다. 서버/클라이언트 코드는 이 함수들을 호출만 하고,
바이너리 포맷을 재구현하지 않는다 (`CLAUDE.md`의 절대 규칙).

## 3. 핸드셰이크 시퀀스

연결 하나에 대해 서버와 클라이언트가 각각 SyncStep1을 주고받는 **양방향** 핸드셰이크다.

```
Client                                   Server
  |--- WS connect (?room=<id>) --------->|
  |                                      | room 조회/생성, client 등록
  |<--- SYNC(SyncStep1, room.doc) -------|  (1) 서버가 먼저 자기 상태 벡터를 보냄
  |<--- AWARENESS(다른 클라이언트 상태) ---|  (2) 이미 접속해 있던 다른 클라이언트들의 커서/선택 상태
  |--- SYNC(SyncStep1, local doc) ------>|  (3) 클라이언트도 자기 상태 벡터를 보냄
  |                                      |
  |<--- SYNC(SyncStep2, diff) ----------|  (4) 서버가 (3)에 대해 답장 — room.doc 기준으로
  |                                      |      client에게 없는 부분만. 브로드캐스트 아님, 1:1 응답
  |--- SYNC(SyncStep2, diff) ---------->|  (5) 클라이언트가 (1)에 대해 답장 — client가 갖고 있던
  |                                      |      state vector 기준으로 서버가 모르던 부분. 서버는
  |                                      |      Y.applyUpdate(room.doc, ...)만 하고 브로드캐스트 안 함
  |                                      |
  |--- SYNC(Update) -------------------->|  (6) 이후 로컬 편집이 생길 때마다. 서버는 room.doc에
  |<--- SYNC(Update) 다른 클라이언트에게 --|      적용 후, 보낸 클라이언트를 제외한 같은 room의
  |                                      |      나머지 클라이언트에게 그대로 중계(4번 섹션)
  |--- AWARENESS(내 커서/선택 변경) ----->|  (7) 마찬가지로 room.awareness에 적용 후 중계
```

(4)와 (5)는 순서가 뒤바뀌어 도착해도 상관없다 — Yjs update 적용은 순서에 의존하지 않는(commutative)
CRDT 연산이라 도착 순서가 달라도 최종 상태는 같다.

## 4. 중계(relay) 규칙

- **SyncStep1 수신**: 브로드캐스트하지 않는다. `syncProtocol.readSyncMessage`가 자동으로 SyncStep2
  응답을 만들어주면, 그 응답을 보낸 클라이언트에게만 회신한다.
- **SyncStep2 수신**: 브로드캐스트하지 않는다. `room.doc`에 적용만 한다(`readSyncMessage`가 내부적으로
  `Y.applyUpdate` 호출).
- **Update 수신**: `room.doc`에 적용한 뒤, 같은 room의 **다른** 모든 클라이언트에게 받은 바이트를
  그대로(재인코딩하지 않고) 전달한다. 보낸 클라이언트 자신에게는 되돌려보내지 않는다(echo 방지).
- **Awareness 메시지 수신**: `awarenessProtocol.applyAwarenessUpdate(room.awareness, decoded, conn)`로
  `room.awareness`를 갱신한 뒤, 같은 room의 다른 모든 클라이언트에게 그대로 중계한다.
- 서버는 어떤 메시지에 대해서도 payload 내부(어떤 필드가 바뀌었는지)를 파싱하지 않는다 — 위
  0번 섹션 규칙.

## 5. Room 생명주기

- **생성**: 특정 `roomId`로 들어온 첫 연결이 `Room`을 만든다(lazy).
- **연결 종료(`close`/`error`) 시**:
  1. 해당 WebSocket을 `room.clients`에서 제거한다.
  2. 그 클라이언트의 awareness 상태를 `awarenessProtocol.removeAwarenessStates(room.awareness, [clientID], null)`로
     지우고, 그 결과(제거 update)를 남은 클라이언트들에게 중계한다 — 다른 사용자 화면에서 커서가
     사라지게 하기 위함.
  3. `room.clients.size === 0`이 되면 그 `Room`(및 `room.doc`, `room.awareness`)을 `Map`에서
     제거한다. `docs/architecture.md`가 명시한 대로 영속성은 범위 밖이므로, 마지막 클라이언트가
     나가면 그 room의 상태는 사라지는 게 의도된 동작이다.
- **재접속**: 재접속은 새 연결로 취급하고 3번 섹션의 핸드셰이크를 처음부터 다시 밟는다.
  - room에 다른 클라이언트가 아직 남아 있었다면(= room이 정리되지 않았다면) 핸드셰이크만으로
    전체 상태가 그대로 복원된다 — `docs/acceptance-criteria.md` 시나리오 4가 요구하는 동작.
  - room이 이미 비어서 정리된 뒤였다면, 재접속은 그냥 새 빈 room을 만드는 것과 같다(상태 유실은
    허용된 범위).

## 6. 필요 의존성 (구현 시 추가할 것)

`apps/backend`에는 현재 `ws`만 있다. `ws-protocol` feature를 시작할 때 다음을 추가해야 한다:

- `yjs` — 서버가 room별 `Y.Doc`을 들고 있으려면 필요 (0번 섹션)
- `y-protocols` — `y-protocols/sync`, `y-protocols/awareness`
- `lib0` — `y-protocols`가 내부적으로 쓰는 인코딩/디코딩 라이브러리. 바깥쪽 envelope 태그를
  씌우는 데도 같은 라이브러리를 쓴다(2번 섹션)

## 검증과의 연결

`ws-protocol` feature의 verification(`feature_list.json`): "가짜 Yjs 클라이언트 2개로 SyncStep1/2
핸드셰이크와 update 중계 확인, 브라우저 없이 서버만으로 검증".

테스트 설계 스케치:

1. 테스트 안에서 3번 섹션의 서버를 기동(포트는 임의/0으로 열어 충돌 방지).
2. `ws` 클라이언트 2개(A, B)를 각각 `Y.Doc`과 함께 만들어 같은 `room`으로 연결.
3. A, B 모두 3번 섹션 핸드셰이크((1)~(5))가 끝날 때까지 기다린다.
4. A의 로컬 `Y.Doc`에서 `doc.getMap('nodes').set(...)` 같은 변경을 만든다 → (6) Update가 발생하는지,
   B의 `Y.Doc`에 같은 변경이 반영되는지 확인.
5. A를 끊고 재연결시켜, room에 B가 남아 있는 상태에서 A가 다시 SyncStep1/2로 전체 상태를
   되찾는지 확인(5번 섹션 "재접속" 검증 겸용).
