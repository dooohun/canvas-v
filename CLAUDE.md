# CLAUDE.md

실시간 협업 AI 에셋 캔버스. 텍스트 프롬프트로 이미지를 생성하고, 생성 결과를 노드 그래프로 분기·탐색하며, 캔버스에서 여러 명이 레이어를 합성한 뒤, 완성된 결과물을 3D 모델에 텍스처로 입혀 미리보는 웹 툴

이 저장소는 여러 세션에 걸친 장기 구현 작업을 전제로 한다. 속도보다 세션 간 연속성과 명시적 검증을 우선한다.

## 기술 스택

- 프론트엔드: React, TypeScript, Vite, Zustand(로컬 상태), Yjs(공유 상태), React Flow(노드 그래프), Three.js(3D 프리뷰)
- 백엔드: Node.js 24, TypeScript, Express, ws(WebSocket), y-protocols
- 모노레포: Turborepo + pnpm workspaces (`apps/frontend`, `apps/backend`, `packages/eslint-config`,
  `packages/prettier-config`, `packages/typescript-config`, `packages/shared-types`)

## Operating Loop (세션 시작 시 항상 이 순서로)

1. `pwd`로 저장소 루트인지 확인
2. `claude-progress.md`를 읽는다 (지난 세션 기록, 현재 검증된 상태)
3. `feature_list.json`을 읽고, 완료되지 않은 feature 중 우선순위(`priority`)가 가장 높은 것 하나를 고른다
4. `git log --oneline -5`로 최근 커밋을 확인한다
5. `./init.sh`를 실행한다. 베이스라인 검증이 이미 깨져 있으면 새 feature 작업보다 그것부터 고친다
6. `docs/product-plan.md`(전체 기획 의도)를 읽고, 필요하면 나머지 `docs/*.md`를 읽는다.
   `docs/api-spec.md`, `docs/ws-protocol.md` 같은 세부 스펙 문서는 기획 의도를 구현하기 위한
   것이므로, 기획과 충돌하는 방식으로 구현하지 않는다.

> 주의: `docs/api-spec.md`, `docs/ws-protocol.md`, `docs/data-model.md`, `docs/acceptance-criteria.md`는
> 현재 스텁 상태다 (`docs/product-plan.md`는 채워짐). 해당 문서를 참조하는 feature(아래 "세부 문서"
> 참고)를 시작하기 전에 반드시 실제 내용을 채워야 한다. 스텁인 채로 구현을 진행하지 않는다.

## 절대 규칙

- AI 이미지 생성 API 키는 서버 환경변수로만 관리하고, 클라이언트로 절대 전달하지 않는다.
- Yjs 동기화 메시지는 `y-protocols/sync`, `y-protocols/awareness`의 인코딩 함수를 사용한다. 바이너리 포맷을 직접 재구현하지 않는다.
- 서버는 같은 방(room)의 클라이언트들에게 메시지를 그대로 중계하는 역할만 한다. 서버가 임의로 상태를 병합하거나 재해석하지 않는다.
- 캔버스 오브젝트/노드 그래프 상태는 Y.Map, Y.Array로 표현한다. 일반 JS 객체로 별도 상태를 중복 관리하지 않는다.
- 노드/엣지/캔버스 오브젝트/WS 메시지 타입은 `packages/shared-types`에 한 번만 정의하고, frontend와 backend가 그것을 import해서 쓴다. 같은 구조를 두 곳에 중복 정의하지 않는다.

## 작업 규칙

- 한 세션에서는 `feature_list.json`의 미완료 feature 중 **정확히 하나만** `in_progress`로 두고 작업한다.
- 코드를 작성했다는 것만으로 완료가 아니다. `feature_list.json`의 `verification`에 명시된 방법을
  실제로 실행하고, 그 결과를 `evidence`에 기록한 뒤에만 `status`를 `passing`으로 바꾼다.
- 검증 규칙을 구현 중에 몰래 바꾸지 않는다.
- 선택한 feature의 범위 밖으로 손대지 않는다. 막힌 경우에만 최소한의 보조 수정을 한다.
- 테스트나 린트를 완료로 보이기 위해 약화시키거나 제거하지 않는다.
- 대화 요약보다 저장소 아티팩트(`claude-progress.md`, `feature_list.json`)를 우선한다.

## 필요 파일

- `feature_list.json` — feature 상태의 단일 진실 공급원
- `claude-progress.md` — 세션 로그와 현재 검증된 상태
- `init.sh` — 표준 시작/검증 경로
- `session-handoff.md` — 세션이 길어질 때 남기는 간결한 핸드오프 (선택)
- `clean-state-checklist.md` — 세션 종료 전 확인 목록

## 완료 게이트 (Completion Gate)

feature는 다음이 모두 참일 때만 `passing`으로 전환한다:

- 목표 동작이 실제로 구현되어 있다
- `feature_list.json`의 `verification`에 명시된 검증을 실제로 실행했다
- 그 증거가 `feature_list.json`의 `evidence`에 기록되어 있다
- 저장소가 여전히 표준 시작 경로(`./init.sh`)로 재시작 가능한 상태다

## 세션 종료 전

1. `claude-progress.md`를 갱신한다.
2. `feature_list.json`의 상태와 `evidence`를 갱신한다.
3. 아직 풀리지 않은 위험/블로커를 기록한다.
4. `clean-state-checklist.md`를 확인한다.
5. 저장소가 안전한 상태일 때 커밋한다.
6. 다음 세션이 `./init.sh`를 바로 실행할 수 있는 상태로 남긴다.

## 명령어

```
pnpm install                 # 의존성 설치
pnpm build                   # 전체 빌드 (의존성 순서대로, turbo run build)
pnpm lint                    # ESLint (turbo run lint)
pnpm check-types             # tsc --noEmit (turbo run check-types)
pnpm dev                     # frontend(vite, :5173) + backend(tsx watch, :3001) 동시 실행
pnpm test                    # Vitest (turbo run test)
```

테스트 프레임워크는 Vitest로 통일한다(Vite와 같은 파이프라인). frontend는 jsdom, backend는
node 환경으로, 각 앱 자체 `vitest.config.ts`에서 분리했다(Vitest의 단일 루트 `projects` 옵션
대신 turbo가 워크스페이스별로 병렬 실행하는 방식 — turbo가 이미 제공하는 것과 중복이라 단순화).
백엔드 REST API 테스트는 Supertest를 병행한다.

## 세부 문서

- `docs/product-plan.md` — 전체 기획안 (목적, 사용자 시나리오, 화면 구성, 범위 조정 옵션) (작성됨)
- `docs/architecture.md` — 시스템 구조와 설계 결정 이유 (작성됨)
- `docs/api-spec.md` — REST 엔드포인트 명세 — **스텁**
- `docs/ws-protocol.md` — 커스텀 Yjs WebSocket 프로토콜 (가장 상세) — **스텁**
- `docs/data-model.md` — Y.Map/Y.Array 데이터 스키마 — **스텁**
- `docs/acceptance-criteria.md` — 완료 기준 시나리오 — **스텁**
- `feature_list.json` — 남은 작업과 완료 상태
- `claude-progress.md` — 세션별 진행 기록
- `init.sh` — 세션 시작 시 환경 확인 스크립트
