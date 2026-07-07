# Progress Log

## Current Verified State

- Repository root: canvas-v (Turborepo + pnpm workspace: `apps/*`, `packages/*`)
- Standard startup path: `./init.sh` (dependency 설치 + 베이스라인 검증). `pnpm turbo run dev`는
  frontend/backend에 dev 스크립트가 아직 없어 현재는 아무 것도 실행하지 않는다.
- 표준 검증 경로: `pnpm turbo run build lint check-types` (`test` 태스크는 아직 없음)
- Current highest-priority unfinished feature: `monorepo-setup`
- Current blocker: `docs/product-plan.md`, `docs/api-spec.md`, `docs/ws-protocol.md`,
  `docs/data-model.md`, `docs/acceptance-criteria.md`가 전부 스텁 상태. `monorepo-setup`,
  `shared-types` 이후 feature들을 시작하려면 해당 문서의 실제 내용을 먼저 채워야 한다.

## Session Log

### Session 001

- Date: 2026-07-06 ~ 2026-07-07
- Goal: 모노레포 공유 설정(eslint/prettier/typescript-config)을 Turborepo 태스크 그래프로 구성하고,
  harness 엔지니어링 구조(learn-harness-engineering 방법론 기반)를 이 저장소에 세팅한다.
- Completed:
  - `packages/eslint-config`, `packages/prettier-config`, `packages/typescript-config`를
    TypeScript 소스로 작성하고 `tsc` build 스크립트로 컴파일해 `dist/`를 소비하는 구조로 구성.
    `turbo.json`의 `build: { dependsOn: ["^build"] }`가 실제로 이 패키지들을 앱보다 먼저
    빌드하는 것을 확인.
  - `apps/frontend`, `apps/backend`가 각각 `eslint.config.ts`(jiti로 직접 로드), `tsconfig.json`
    (extends), `prettier` 필드로 공유 설정 패키지를 사용하도록 연결.
  - harness 구조 세팅: 루트 `CLAUDE.md`, `feature_list.json`, `init.sh`, `claude-progress.md`,
    `session-handoff.md`, `clean-state-checklist.md` 생성. `docs/architecture.md` 이관,
    `docs/product-plan.md`/`api-spec.md`/`ws-protocol.md`/`data-model.md`/`acceptance-criteria.md`
    스텁 생성 (아직 실제 내용 없음, 각 feature의 verification이 이 문서들을 전제로 함을 명시).
- Verification run: `./init.sh` → `pnpm install` 성공, `pnpm turbo run build lint check-types`
  9/9 태스크 성공 (전부 cache hit, `FULL TURBO`).
- Evidence captured: 터미널 출력 (turbo 캐시 히트 로그, `eslint .` exit 0, `tsc --noEmit` 성공).
- Commits: `fc6c332` (초기 세팅) — harness 파일들은 이 세션에서 추가, 아직 커밋 전.
- Files or artifacts updated: `packages/eslint-config/*`, `packages/prettier-config/*`,
  `apps/*/eslint.config.ts`, `apps/*/tsconfig.json`, `CLAUDE.md`, `feature_list.json`, `init.sh`,
  `claude-progress.md`, `session-handoff.md`, `clean-state-checklist.md`, `docs/*.md`.
- Known risk or unresolved issue:
  - `apps/frontend`에 `vite`, `react-dom`, `dev`/`build` 스크립트가 없다.
  - `apps/backend`에 `express`, `ws`, `dev` 스크립트가 없다.
  - `packages/shared-types`가 아직 존재하지 않는다.
  - `turbo.json`에 `test` 태스크가 없고, Vitest가 설정되어 있지 않다.
  - `docs/` 하위 5개 문서가 스텁 상태 — 실제 스펙 없이는 `monorepo-setup`의 test 부분과 그 이후
    feature들을 구체적으로 구현할 수 없다.
- Next best step: `monorepo-setup`을 이어서 진행 — `apps/frontend`에 vite + react-dom 추가,
  `apps/backend`에 express + ws 추가, 양쪽에 dev 스크립트 추가, `turbo.json`에 `test` 태스크
  추가, Vitest(`projects`: frontend는 jsdom, backend는 node) + Supertest(backend) 설정. 완료 후
  `feature_list.json`의 `monorepo-setup.evidence`에 실행 결과를 기록하고 `status`를 `passing`으로
  전환.
