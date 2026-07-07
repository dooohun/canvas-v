# 커스텀 Yjs WebSocket 프로토콜 (TODO — 아직 작성되지 않음)

> **이 문서는 스텁입니다.** `feature_list.json`의 `ws-protocol` feature가 가장 상세한 문서로 이 파일을 지목하고 있고,
> verification도 이 프로토콜 정의를 기준으로 통합 테스트를 작성하게 되어 있습니다. `ws-protocol` feature를
> 시작하기 전에 반드시 채워야 합니다.

`docs/architecture.md`에 따르면 Hocuspocus를 쓰지 않고 `ws` + `y-protocols`로 직접 구현하므로, 아래 내용이
특히 상세하게 정의되어야 합니다.

## 채워야 할 내용

### 연결 수립

- WebSocket 연결 URL 형식 (`?room=<id>` 파라미터)
- 연결 시 서버가 room별 클라이언트 목록에 등록하는 절차

### 메시지 타입

- `y-protocols/sync`의 SyncStep1 / SyncStep2 / Update 메시지 인코딩 형식
- `y-protocols/awareness` 메시지 인코딩 형식
- 두 종류를 구분하기 위한 메시지 envelope(첫 바이트/타입 태그 등)

### 핸드셰이크 시퀀스

- 클라이언트 연결 → SyncStep1 전송 → 서버 응답(SyncStep2) → 이후 update 브로드캐스트 흐름을 순서도로 정리

### 중계(relay) 규칙

- 서버는 같은 room의 다른 클라이언트에게만 그대로 전달 (해석/병합 없음 — `docs/architecture.md` 절대 규칙)
- 연결 종료/재연결 시 처리

### room 생명주기

- room 생성 시점 (첫 연결 시 lazy하게 생성되는지)
- room의 Y.Doc이 메모리에서만 유지된다는 제약과, 마지막 클라이언트 종료 시 정리 여부

## 검증과의 연결

`ws-protocol` feature의 verification: "가짜 Yjs 클라이언트 2개로 SyncStep1/2 핸드셰이크와 update 중계 확인" —
위 메시지 타입/시퀀스가 구체적으로 정의되어야 테스트를 작성할 수 있음.
