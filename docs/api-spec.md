# REST API 명세

서버는 `docs/architecture.md`가 정의한 대로 AI 생성 프록시와 정적 파일 서빙만 담당한다.
노드/엣지 그래프 구조나 포트 유효성 같은 파이프라인 도메인 규칙은 여기 등장하지 않는다 —
클라이언트가 실행 시점에 연결된 노드들의 값을 미리 resolve해서 보낸다 (`CLAUDE.md` 절대 규칙).

외부 AI API: 이미지 생성은 OpenAI Images API, 3D 생성은 Meshy AI(image-to-3D)를 쓴다
(`docs/architecture.md` "외부 AI API" 섹션, 2026-07-10 확정).

## 공통 사항

- API 키(`OPENAI_API_KEY`, `MESHY_API_KEY`)는 서버 환경변수로만 읽는다. 응답 바디/헤더
  어디에도 노출되지 않는다 — 모든 엔드포인트의 테스트가 이를 확인해야 한다.
- 에러 응답 형식은 공통으로 `{ "error": string }` — Express 기본 에러 핸들러(HTML + 스택
  트레이스)가 대신 응답하는 경우가 없어야 한다. 예: 파싱 안 되는 JSON 바디를 보내면
  `400 { "error": "invalid JSON body" }`.
- 생성된 이미지/3D 에셋은 `POST /api/upload`가 쓰는 것과 같은 로컬 파일 저장소에 저장하고,
  클라이언트에는 `GET /uploads/:filename`으로 접근 가능한 상대 URL만 돌려준다 — 이렇게 하면
  OpenAI/Meshy가 반환하는 임시 URL에 의존하지 않고 이후에도 계속 접근 가능하다.

## `POST /api/generate-image`

Generate Image 노드를 실행하면 클라이언트가 호출한다. 어떤 Text Prompt 노드들이 연결되어
있었는지, 여러 개면 어떻게 합쳤는지는 클라이언트가 이미 하나의 문자열로 만들어 보낸다
(fan-in 조합 규칙은 `docs/architecture.md` "여러 입력(fan-in) 조합 규칙"에서 확정 — 이
엔드포인트는 합쳐진 결과 문자열 하나만 받으며 규칙 자체는 모른다).

**Request**

```json
{ "prompt": "a futuristic cyberpunk cityscape at night" }
```

- `prompt: string` — 비어있지 않아야 함.

**서버 동작**: OpenAI Images API를 `prompt`로 호출(`response_format: "b64_json"`)하고,
받은 이미지를 로컬 저장소에 저장한 뒤 그 URL을 반환한다. (base64로 받는 이유: OpenAI가 주는
URL은 시간이 지나면 만료되므로, 우리 서버에 영구적으로 남겨야 한다.)

**Response `200`**

```json
{ "imageUrl": "/uploads/8f14e-generated.png" }
```

**에러**

| 상황 | status | body |
| --- | --- | --- |
| `prompt`가 없거나 빈 문자열 | `400` | `{ "error": "prompt is required" }` |
| OpenAI API 호출 실패(네트워크, 5xx) | `502` | `{ "error": "image generation failed" }` |
| OpenAI rate limit(429) | `429` | `{ "error": "rate limited, try again later" }` |

## `POST /api/generate-3d`

Generate 3D 노드를 실행하면 클라이언트가 호출한다. 이 엔드포인트는 이미지 **하나**만 받는다.
여러 Generate Image 노드가 fan-in으로 연결된 경우 어느 이미지를 보낼지는 클라이언트가 정하며
(캔버스 좌표 순서상 첫 번째 `ready` 이미지 — `docs/architecture.md` "여러 입력(fan-in) 조합 규칙"),
서버는 그 선택 규칙을 알지 못한다.

**Request**

```json
{ "imageUrl": "/uploads/8f14e-generated.png" }
```

- `imageUrl: string` — 우리 서버가 서빙하는 이미지 경로(위 `/api/generate-image` 응답과 동일한
  형식). Meshy AI 호출 시 서버가 절대 URL로 변환해서 전달한다.

**서버 동작**: Meshy AI의 image-to-3D 생성을 요청한다. Meshy AI는 비동기 작업(생성 요청 →
polling으로 완료 확인) 방식이므로, 서버가 완료될 때까지 polling한 뒤 응답한다(클라이언트
입장에서는 다른 엔드포인트와 동일하게 단일 요청/응답으로 보임 — 노드의 `status: pending`
표시는 이 요청이 끝날 때까지의 대기 시간을 클라이언트가 보여주는 것). 완료된 3D 에셋(glTF/GLB)을
로컬 저장소에 저장한 뒤 그 URL을 반환한다.

**Response `200`**

```json
{ "modelUrl": "/uploads/2b91a-model.glb" }
```

**에러**

| 상황 | status | body |
| --- | --- | --- |
| `imageUrl`이 없거나 우리 서버가 서빙하지 않는 경로 | `400` | `{ "error": "imageUrl is required" }` |
| Meshy AI 호출/polling 실패 | `502` | `{ "error": "3d generation failed" }` |
| Meshy AI rate limit | `429` | `{ "error": "rate limited, try again later" }` |

## `POST /api/upload`

일반 파일 업로드 엔드포인트. `/api/generate-image`, `/api/generate-3d`가 생성 결과를 저장할
때도 내부적으로 같은 저장 로직을 쓴다.

**Request**: `multipart/form-data`, 필드명 `file`.

**서버 동작**: 파일을 저장 디렉터리에 `<uuid>-<원본 파일명>` 형식으로 저장.

**Response `200`**

```json
{ "url": "/uploads/8f14e-photo.png" }
```

**에러**

| 상황 | status | body |
| --- | --- | --- |
| `file` 필드 없음 | `400` | `{ "error": "file is required" }` |
| 이미지/3D 에셋이 아닌 MIME 타입 | `400` | `{ "error": "unsupported file type" }` |
| 파일 크기 초과 | `413` | `{ "error": "file too large" }` |

## `GET /uploads/:filename`

저장 디렉터리를 정적 서빙한다.

- 존재하는 파일: 해당 파일을 적절한`Content-Type`으로 응답(`200`).
- 존재하지 않는 파일: `404`, `{ "error": "not found" }`.
- `filename`에 경로 순회 문자(`..`, `/`)가 포함되면 `400`(경로 탈출 방지).

## `GET /health`

이미 `monorepo-setup`에서 구현됨. 이 feature에서는 API 키 비노출 검증 대상에도 포함시킨다.

**Response `200`**

```json
{ "status": "ok" }
```
