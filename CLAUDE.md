# CLAUDE.md

실시간 협업 AI 노드 파이프라인 빌더. Text Prompt/Generate Image/Generate 3D 노드를 캔버스에 배치하고 타입이 맞는 포트끼리(text-to-text, image-to-image) 엣지로 연결해 AI 생성 파이프라인을 조립하는 웹 툴
여러 명이 같은 room에서 실시간으로 같은 파이프라인을 함께 편집한다 (`docs/product-plan.md` 참고)

## 기술 스택

- 프론트엔드: React, TypeScript, Vite, Zustand(로컬 상태), Yjs(공유 상태), React Flow(노드 파이프라인 캔버스), Three.js(Generate 3D 노드 렌더링)
- 백엔드: Node.js 24, TypeScript, Express, ws(WebSocket), y-protocols
- 모노레포: Turborepo + pnpm workspaces (`apps/frontend`, `apps/backend`, `packages/eslint-config`,
  `packages/prettier-config`, `packages/typescript-config`, `packages/shared-types`)

## 명령어

```
pnpm install                 # 의존성 설치
pnpm build                   # 전체 빌드 (의존성 순서대로, turbo run build)
pnpm lint                    # ESLint (turbo run lint)
pnpm check-types             # tsc --noEmit (turbo run check-types)
pnpm dev                     # frontend(vite, :5173) + backend(tsx watch, :3001) 동시 실행
pnpm test                    # Vitest (turbo run test)
```

테스트는 Vitest로 통일(frontend: jsdom, backend: node, 앱별 `vitest.config.ts`). 백엔드 REST API 테스트는 Supertest 병행.

## 절대 규칙

- AI 이미지 생성 API 키는 서버 환경변수로만 관리하고, 클라이언트로 절대 전달하지 않는다.
- Yjs 동기화 메시지는 `y-protocols/sync`, `y-protocols/awareness`의 인코딩 함수를 사용한다. 바이너리 포맷을 직접 재구현하지 않는다.
- 서버는 같은 방(room)의 클라이언트들에게 메시지를 그대로 중계하는 역할만 한다. 서버가 임의로 상태를 병합하거나 재해석하지 않는다.
- 파이프라인 노드/엣지 상태는 Y.Map, Y.Array로 표현한다. 일반 JS 객체로 별도 상태를 중복 관리하지 않는다.
- 노드/엣지/WS 메시지 타입은 `packages/shared-types`에 한 번만 정의하고, frontend와 backend가 그것을 import해서 쓴다. 같은 구조를 두 곳에 중복 정의하지 않는다.
- 노드 타입/포트 호환성/엣지 유효성 검증은 클라이언트에서만 한다. 서버 코드에 `PipelineNode`, `NodeType` 같은 도메인 타입이 등장해서는 안 된다.
- 불필요한 주석을 달지 않는다. 다음 두 경우를 제외하고는 주석을 작성하지 않는다: (1) 타입/인터페이스에 대한 문서 역할을 하는 주석, (2) 코드 자체만으로는 의도가 설명되지 않는 경우(숨은 제약, 비직관적인 워크어라운드 등)의 설명. 코드가 하는 일을 그대로 서술하는 주석, 작업 이력이나 변경 이유를 남기는 주석은 달지 않는다.

## 하네스: feature_list.json 자동 구현

**목표:** `feature_list.json`의 남은 feature를 하나씩 구현·검증·기록해 나가는 전문 에이전트 팀 운영.

**트리거:** feature 구현/진행 관련 요청 시 `feature-loop` 스킬을 사용하라(호출당 feature 1개만 처리). 단순 질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-27 | 초기 구성 (feature-implementer, qa-verifier 에이전트 + feature-loop 오케스트레이터) | 전체 | feature_list.json 기반 구현을 Ralph Loop로 자동 반복시키기 위한 하네스 구축 |
| 2026-08-17 | main 직접 커밋 금지, `feature-loop/remaining-features` 브랜치 작업 + 9/9 passing 시 PR 자동 생성으로 변경. `.github/PULL_REQUEST_TEMPLATE.md` 추가 | feature-loop | 자동 구현 루프가 만드는 코드를 병합 전 사람이 반드시 리뷰하도록 하기 위함(사용자 요청) |
| 2026-08-18 | qa-verifier 서브에이전트 모델을 opus → sonnet으로 변경(feature-implementer는 opus 유지) | feature-loop | QA 라운드가 토큰을 과도하게 소모해 비용 절감(사용자 요청) |
