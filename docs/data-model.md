# 데이터 모델 (TODO — 아직 작성되지 않음)

> **이 문서는 스텁입니다.** `shared-types` feature가 이 문서에 정의된 스키마를 `packages/shared-types`의
> TypeScript 타입으로 옮기는 작업이므로, `shared-types` feature를 시작하기 전에 채워야 합니다.

`docs/architecture.md`의 절대 규칙("캔버스 오브젝트/노드 그래프 상태는 Y.Map, Y.Array로 표현하고 일반 JS
객체로 중복 관리하지 않는다")을 따르는 스키마 정의가 필요합니다.

## 채워야 할 내용

### 캔버스 오브젝트 (Y.Map)

- 필드 목록 (id, 이미지 URL, position, size, rotation, z-order 등)
- Y.Map 키 이름과 타입

### 노드 그래프 (Y.Map / Y.Array)

- 노드: 생성 결과(프롬프트, 이미지 URL, 부모 노드 id 등)
- 엣지: 분기 관계 표현 방식

### 캔버스 ↔ 노드 그래프 관계

- 하나의 캔버스 오브젝트가 어떤 노드에서 왔는지 참조하는 방식

### WS 메시지 타입

- `docs/ws-protocol.md`에서 다루는 sync/awareness 메시지와, 이 문서의 데이터 구조가 어떻게 매핑되는지

## 검증과의 연결

`shared-types` feature의 verification: "apps/frontend, apps/backend 양쪽에서 import 가능, tsc 에러 없음" —
위 스키마가 확정되어야 `packages/shared-types`의 타입을 작성할 수 있음.
