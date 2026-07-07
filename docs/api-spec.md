# REST API 명세 (TODO — 아직 작성되지 않음)

> **이 문서는 스텁입니다.** `rest-api` feature(`feature_list.json`)의 verification이 이 문서를 기준으로
> 작성되어 있으므로, 해당 feature를 시작하기 전에 아래 엔드포인트별 명세를 채워야 합니다.

## 채워야 할 엔드포인트 (`docs/architecture.md` 기준)

### `POST /api/generate-image`

- Request body 스키마
- 서버가 호출하는 외부 이미지 생성 API (제공자, 인증 방식)
- Response 스키마 (이미지 URL만 반환 — API 키는 절대 노출 금지)
- 에러 케이스 (외부 API 실패, rate limit 등)

### `POST /api/upload`

- 업로드 방식 (multipart/form-data 등)
- 저장 위치, 파일명 규칙
- Response 스키마 (URL 발급)

### `GET /uploads/:filename`

- 정적 서빙 방식
- 존재하지 않는 파일 처리

### `GET /health`

- Response 스키마 (상태 확인용)

## 절대 규칙과의 연결

- `CLAUDE.md`의 "AI 이미지 생성 API 키는 서버 환경변수로만 관리" 규칙이 모든 엔드포인트에 적용됨
- `rest-api` feature의 verification: "API 키가 응답에 노출되지 않음을 테스트로 확인" — 위 각 엔드포인트 명세에 이 검증 기준이 반영되어야 함
