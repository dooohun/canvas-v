# 아키텍처

> **2026-07-09 업데이트**: `docs/product-plan.md`의 화면 구성 변경(3패널 탭 → 단일 노드
> 파이프라인 캔버스)에 맞춰 이 문서를 다시 썼다. `docs/data-model.md`도 같이 다시 썼다.
> `docs/acceptance-criteria.md`(스텁)와 `feature_list.json`은 아직 옛 구조 기준이라 이어서
> 손봐야 한다.

## 모노레포 구성

Turborepo + pnpm workspaces로 `apps/frontend`, `apps/backend`, `packages/shared-types`,
`packages/eslint-config`, `packages/prettier-config`, `packages/typescript-config`를 관리한다.
`docs/data-model.md`에 정의된 파이프라인 노드/엣지/WS 메시지 타입은 `packages/shared-types`에
TypeScript 타입으로 선언하고, frontend와 backend가 각각 import해서 쓴다. 같은 구조를 두 곳에
중복 정의하지 않는다.

## 구성 요소

1. **클라이언트 (React + Three.js + React Flow)**
   - 노드 파이프라인 캔버스(단일 화면): React Flow 기반. Text Prompt / Generate Image /
     Generate 3D 세 종류의 노드를 배치하고 타입이 맞는 포트끼리 엣지로 연결한다
     (`docs/product-plan.md` 3번 섹션, `docs/data-model.md` 참고). 옛 기획의 "캔버스 에디터"
     (자유 배치 이미지 레이어)와 "노드 그래프"(생성 히스토리 전용)는 이 하나의 캔버스로
     합쳐졌다 — 더 이상 별도 화면이 아니다.
   - Generate 3D 노드는 내부(또는 확대 뷰)에서 Three.js로 결과를 렌더링하고 OrbitControls로
     회전해서 볼 수 있다.
   - 커스텀 Yjs 프로바이더: WebSocket으로 서버와 통신 (아래 참고)

2. **WebSocket 서버 (Node.js + ws + y-protocols)**
   - 방(room)마다 Y.Doc을 메모리에 유지
   - 클라이언트가 보낸 동기화/awareness 메시지를 같은 방의 다른 클라이언트에게 중계
   - 자체적으로 상태를 병합하거나 해석하지 않음 (단순 중계자). 노드 타입, 포트 호환성, 엣지
     유효성 같은 파이프라인 도메인 규칙은 **전부 클라이언트에서만** 검증한다 — 서버 코드에는
     `NodeType`, `PipelineNode` 같은 도메인 타입이 등장하지 않는다 (`docs/ws-protocol.md` 0번
     섹션 규칙 그대로 유지).

3. **REST API (Express)**
   - AI 이미지 생성 프록시: Generate Image 노드 실행 시 클라이언트 요청을 받아 서버가 API
     키로 외부 이미지 생성 API 호출, 결과 URL만 응답
   - 이미지 업로드/정적 서빙: 생성된 이미지를 파일로 저장하고 URL 발급
   - Generate 3D 노드 실행이 서버 API 호출을 수반하는지는 아직 미정 — 아래 "열린 질문" 참고

## 데이터 흐름

```
[클라이언트 A] --Generate Image 노드 실행--> [REST: AI 프록시] --호출--> [외부 이미지 생성 API]
[클라이언트 A] <--이미지 URL---
[클라이언트 A] --Yjs 업데이트(노드/엣지 변경)--> [WS 서버] --중계--> [클라이언트 B, C, ...]
```

Generate 3D 노드 실행이 REST API를 타는지, 아니면 클라이언트에서 이미지를 고정된 3D 모델에
텍스처로 매핑하는 것으로 끝나는지에 따라 위 흐름에 한 줄이 더 필요할 수 있다 (열린 질문 참고).

## Hocuspocus를 쓰지 않는 이유

Hocuspocus는 Yjs WebSocket 백엔드를 대신 구현해주는 프레임워크지만, 이 프로젝트에서는 Yjs
프로토콜(sync, awareness)을 직접 다뤄본 경험을 보여주는 것이 목적이므로 의도적으로 제외했다.
대신 `ws` 라이브러리와 Yjs의 저수준 패키지인 `y-protocols`를 직접 배관(plumbing)해서 구현한다.
이 결정은 개발 속도보다 프로토콜 이해도를 우선한 것이며, 이후 다시 검토될 수 있다.

## 룸(room) 관리

- 하나의 노드 파이프라인 = 하나의 room = 하나의 Y.Doc
- room id는 URL 파라미터(`?room=<id>`)로 전달
- 서버는 room id별로 연결된 WebSocket 목록을 메모리에 보관
- 서버 재시작 시 메모리 상의 Y.Doc은 사라짐 (영속성은 확장 과제, `docs/acceptance-criteria.md`의
  범위 밖)

## 열린 질문

이번 화면 구성 변경(3패널 → 단일 노드 캔버스)으로 새로 생긴, 아직 결정되지 않은 것들이다.
구현을 시작하기 전에 `docs/api-spec.md`/`docs/product-plan.md`에서 확정해야 한다.

- **Generate 3D 노드의 실제 동작**: (a) 이미지를 고정된 3D 모델에 텍스처로 매핑하는
  클라이언트 전용 렌더링인지, (b) 별도의 image-to-3D 생성 API를 서버가 대신 호출하는
  것인지. `docs/data-model.md`는 두 경우 모두 수용 가능하도록 `resultUrl` 필드명을 중립적으로
  뒀지만, 실제 동작은 `docs/api-spec.md`를 쓸 때 확정해야 한다.
- **여러 입력을 어떻게 조합하는지**: `docs/data-model.md`는 한 입력 포트에 여러 엣지가 들어오는
  것(fan-in)을 허용하기로 확정했지만(예: Generate Image 노드가 여러 Text Prompt 노드를 입력받는
  경우), 그 값들을 실제로 어떻게 합치는지(텍스트 이어붙이기 규칙, 이미지 여러 장을 3D 노드가
  받을 때의 처리 방식)는 노드 실행 로직 구현 시점에 정해야 한다.
