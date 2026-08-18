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
   - AI 3D 생성 프록시: Generate 3D 노드 실행 시 클라이언트 요청을 받아 서버가 API 키로
     Meshy AI(image-to-3D)를 호출, 결과 3D 에셋 URL만 응답

## 데이터 흐름

```
[클라이언트 A] --Generate Image 노드 실행--> [REST: AI 이미지 프록시] --호출--> [OpenAI Images API]
[클라이언트 A] <--이미지 URL---
[클라이언트 A] --Generate 3D 노드 실행--> [REST: AI 3D 프록시] --호출--> [Meshy AI]
[클라이언트 A] <--3D 에셋 URL---
[클라이언트 A] --Yjs 업데이트(노드/엣지 변경)--> [WS 서버] --중계--> [클라이언트 B, C, ...]
```

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

## 외부 AI API

- **이미지 생성**: OpenAI Images API. 서버가 API 키로 호출하고 이미지 URL만 클라이언트에 응답.
- **3D 생성**: Meshy AI(image-to-3D). 서버가 API 키로 호출하고 3D 에셋 URL만 클라이언트에 응답.
  (2026-07-10 결정 — 클라이언트 전용 텍스처 매핑 방식은 채택하지 않음.)

두 API 키 모두 서버 환경변수로만 관리하고 클라이언트로 전달하지 않는다 (`CLAUDE.md` 절대 규칙).
요청/응답 스키마, 인증 방식, 에러 케이스는 `docs/api-spec.md`에 정의한다.

## 여러 입력(fan-in) 조합 규칙

`docs/data-model.md`는 한 입력 포트에 여러 엣지가 들어오는 것(fan-in)을 허용한다. 그 값들을
실제로 어떻게 합치는지를 `ai-image-generation` feature에서 아래와 같이 확정했다
(2026-08-17 결정, 구현: `apps/frontend/src/pipeline/promptComposition.ts`).

**텍스트(여러 `textPrompt` → 하나의 `generateImage`)**

1. 실행 대상 노드로 들어오는 엣지의 source 중 `textPrompt` 노드만 모은다.
2. 각 노드의 `prompt`를 `trim()`하고, 빈 문자열이 된 것은 제외한다.
3. 캔버스 좌표 기준 **위→아래(`position.y` 오름차순), 같은 높이면 왼→오른쪽(`position.x`
   오름차순), 그래도 같으면 노드 id 사전순**으로 정렬한다.
4. 개행(`\n`) 하나로 이어붙여 하나의 문자열로 만들고, 그 문자열만 `POST /api/generate-image`에
   보낸다(서버는 조합 규칙을 모른다 — `docs/api-spec.md` 그대로).

정렬 기준을 "엣지가 만들어진 순서"가 아니라 캔버스 좌표로 잡은 이유: 엣지 생성 순서는 피어마다
다르게 관찰될 수 있지만 좌표는 모든 피어가 Y.Doc으로 공유하므로, 누가 실행하든 같은 프롬프트
문자열이 만들어진다. 사용자 입장에서도 "위에 있는 노드가 앞에 온다"가 화면만 보고 예측 가능하다.

조합 결과가 빈 문자열이면(연결된 `textPrompt`가 없거나 전부 공백) 실행 자체가 불가능한 상태로
보고, 노드의 실행 버튼을 비활성화한다(안내 문구 노출). 방어적으로 실행이 호출되더라도 API를
호출하지 않고 `status: "error"`로 남긴다.

**이미지(여러 `generateImage` → 하나의 `generate3d`)**: `POST /api/generate-3d`가 이미지 하나만
받으므로(`docs/api-spec.md`), 같은 정렬 기준의 **첫 번째** `status: "ready"` 이미지를 쓴다.
확정 및 구현은 `generate-3d-preview` feature에서 한다.

## 실행 상태(pending) 소유권과 회수

노드 실행 상태는 Y.Doc에 기록한다(협업 중인 다른 사용자에게도 진행 상황이 보여야 하므로).
그런데 `pending`을 `ready`/`error`로 끝낼 수 있는 것은 **요청을 들고 있는 클라이언트 하나뿐**이다.
그 클라이언트가 새로고침/탭 종료/네트워크 단절로 사라지면, room에 남은 피어들의 Y.Doc에는
`pending`이 그대로 남고 이후 접속자에게도 전파된다. 실행 버튼을 `pending`이라고 단순히
비활성화하면 그 노드는 삭제 말고는 복구할 방법이 없다.

**결정(2026-08-17)**: `pending`은 Y.Doc에 유지하되 소유자를 함께 기록하고 회수 경로를 둔다.

1. 실행 시작 시 노드에 `pendingRun = { clientId, startedAt }`을 쓴다(`clientId`는 Yjs clientID =
   awareness의 클라이언트 식별자). 종료(`ready`/`error`) 시 `null`로 지운다.
2. 어떤 피어든 아래 중 하나면 그 실행을 **버려진 실행**으로 보고 재실행을 허용한다
   (`apps/frontend/src/pipeline/runState.ts`).
   - `pendingRun.clientId`가 현재 awareness에 없다(소유자가 나갔다).
   - `pendingRun`이 비어 있다(구버전 클라이언트가 쓴 상태).
   - 시작된 지 요청 타임아웃 + 여유 시간을 넘겼다(소유자가 살아는 있지만 멈춘 경우).
3. 버려진 실행이면 노드에 "실행하던 사용자의 연결이 끊겼습니다. 다시 실행하세요"를 보여주고
   실행 버튼을 다시 활성화한다. 재실행은 `pendingRun`을 새 소유자로 덮어쓴다.
4. 클라이언트는 생성 요청 자체에도 `AbortController` 타임아웃을 건다. 응답이 오지 않아도
   소유자가 스스로 `error`로 끝내므로, 정상 연결 상태에서는 2번 회수 경로에 의존하지 않는다.

awareness는 소유자가 사라지면 서버가 `removeAwarenessStates`를 중계하므로(`docs/ws-protocol.md`),
남은 피어가 별도 하트비트 없이 소유자 이탈을 알 수 있다. 시각 비교는 피어 간 시계 오차의
영향을 받으므로 판정의 1차 근거는 awareness이고 시간은 보조 수단이다.

## 열린 질문

- 이미지 fan-in의 실제 구현(위 규칙을 그대로 적용할지, 사용자가 입력을 고르게 할지)은
  `generate-3d-preview` feature에서 마무리한다. 텍스트 fan-in은 위에서 확정됐다.
