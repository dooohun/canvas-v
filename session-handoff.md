# Session Handoff

## Verified Now

- What is currently working: `packages/eslint-config`, `packages/prettier-config`,
  `packages/typescript-config`가 TypeScript로 작성되어 `tsc`로 빌드되고, `apps/frontend`,
  `apps/backend`가 이를 통해 lint/format/check-types를 통과한다.
- What verification actually ran: `./init.sh` → `pnpm install` + `pnpm turbo run build lint check-types`
  (9/9 태스크 성공).

## Changed This Session

- Code or behavior added: 없음 (아직 실제 기능 코드 없음 — frontend는 스텁 `App.tsx`, backend는 스텁
  `index.ts`만 존재).
- Infrastructure or harness changes: harness 구조 전체(`CLAUDE.md`, `feature_list.json`, `init.sh`,
  `claude-progress.md`, `clean-state-checklist.md`, `docs/*.md`) 신규 세팅. 공유 config 패키지를
  TypeScript 소스 + turbo build 그래프로 전환.

## Broken Or Unverified

- Known defect: 없음 (있는 것은 모두 통과 중).
- Unverified path: `pnpm turbo run dev`, `pnpm turbo run test` — 둘 다 해당 스크립트/태스크가
  아직 없어 사실상 no-op.
- Risk for the next session: `docs/product-plan.md` 등 5개 문서가 스텁이라, 실제 스펙 없이 뒤쪽
  feature를 구현하면 기획과 어긋날 위험이 있다.

## Next Best Step

- Highest-priority unfinished feature: `monorepo-setup`
- Why it is next: 나머지 모든 feature가 여기서 만들어질 dev/test 인프라와 shared-types 패키지 존재를
  전제로 한다.
- What counts as passing: `feature_list.json`의 `monorepo-setup.verification` 5개 항목이 모두
  실제로 통과하고 `evidence`에 기록됨.
- What must not change during that step: `packages/eslint-config`/`prettier-config`/
  `typescript-config`의 기존 빌드 그래프 구조, `turbo.json`의 기존 4개 태스크(build/lint/lint:fix/
  check-types/format/format:check).

## Commands

- Startup: `./init.sh`
- Verification: `pnpm turbo run build lint check-types`
- Focused debug command: `pnpm --filter <workspace> exec <command>` (예: `pnpm --filter backend exec tsc --noEmit`)
