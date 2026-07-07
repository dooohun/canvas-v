# 아키텍처

## 모노레포 구성

Turborepo + pnpm workspaces로 `apps/frontend`, `apps/backend`, `packages/shared-types`, `packages/eslint-config`, `packages/prettier-config`, `packages/typescript-config`를 관리한다. `docs/data-model.md`에 정의된 노드/엣지/캔버스 오브젝트/WS 메시지 타입은 `packages/shared-types`에 TypeScript 타입으로 선언하고, frontend와 backend가 각각 import해서 쓴다. 같은 구조를 두 곳에 중복 정의하지 않는다.

## 구성 요소

1. **클라이언트 (React + Three.js + React Flow)**
   - 캔버스 에디터: 이미지 레이어 배치·편집
   - 노드 그래프: AI 생성 결과 분기·탐색
   - 3D 프리뷰: 완성된 캔버스를 텍스처로 매핑해 모델에 적용
   - 커스텀 Yjs 프로바이더: WebSocket으로 서버와 통신 (아래 참고)

2. **WebSocket 서버 (Node.js + ws + y-protocols)**
   - 방(room)마다 Y.Doc을 메모리에 유지
   - 클라이언트가 보낸 동기화/awareness 메시지를 같은 방의 다른 클라이언트에게 중계
   - 자체적으로 상태를 병합하거나 해석하지 않음 (단순 중계자)

3. **REST API (Express)**
   - AI 이미지 생성 프록시: 클라이언트 요청을 받아 서버가 API 키로 외부 이미지 생성 API 호출, 결과 URL만 응답
   - 이미지 업로드/정적 서빙: 생성된 이미지를 파일로 저장하고 URL 발급

## 데이터 흐름

```
[클라이언트 A] --생성 요청--> [REST: AI 프록시] --호출--> [외부 이미지 생성 API]
[클라이언트 A] <--이미지 URL---
[클라이언트 A] --Yjs 업데이트--> [WS 서버] --중계--> [클라이언트 B, C, ...]
```

## Hocuspocus를 쓰지 않는 이유

Hocuspocus는 Yjs WebSocket 백엔드를 대신 구현해주는 프레임워크지만, 이 프로젝트에서는 Yjs 프로토콜(sync, awareness)을 직접 다뤄본 경험을 보여주는 것이 목적이므로 의도적으로 제외했다. 대신 `ws` 라이브러리와 Yjs의 저수준 패키지인 `y-protocols`를 직접 배관(plumbing)해서 구현한다. 이 결정은 개발 속도보다 프로토콜 이해도를 우선한 것이며, 이후 다시 검토될 수 있다.

## 룸(room) 관리

- 하나의 캔버스/노드 그래프 = 하나의 room = 하나의 Y.Doc
- room id는 URL 파라미터(`?room=<id>`)로 전달
- 서버는 room id별로 연결된 WebSocket 목록을 메모리에 보관
- 서버 재시작 시 메모리 상의 Y.Doc은 사라짐 (영속성은 확장 과제, `docs/acceptance-criteria.md`의 범위 밖)
