---
name: feature-loop
description: "canvas-v의 feature_list.json에서 다음으로 처리 가능한 feature를 하나 골라 feature-implementer + qa-verifier 팀으로 구현·검증·기록까지 끝내는 오케스트레이터. '다음 feature 구현해줘', 'feature_list.json 진행시켜줘', 'ws-protocol/collab-canvas/ai-image-generation/generate-3d-preview/optimization-pass 구현해줘', 'feature 하나 진행', '자동 구현 루프 실행' 요청 시 사용. 후속 작업(이전 feature 이어서 하기, QA 지적사항 반영해서 다시, blocked 상태 재시도, feature 진행 상황 확인)에도 반드시 이 스킬을 사용. 외부 반복 실행기(예: 별도의 loop 플러그인)에서 매 iteration마다 호출되는 것을 전제로, 이 스킬은 호출당 feature 정확히 1개만 처리하고 종료한다. feature_list.json에 없는 기능 요청, 범위를 벗어난 단발성 버그 수정, 반복 실행기 플러그인 자체의 사용법을 묻는 질문에는 사용하지 않는다."
---

# Feature Loop Orchestrator

canvas-v 프로젝트의 `feature_list.json`을 스펙으로 삼아, `feature-implementer`와
`qa-verifier` 2인 팀을 조율해 feature를 하나씩 구현·검증·기록하는 오케스트레이터.

## 실행 모드: 생성-검증 패턴 (named 서브 에이전트 + SendMessage)

이 하네스가 실행되는 환경에 `TeamCreate`/`TaskCreate(assignee)` 같은 정식 팀 도구가 없으면,
`Agent` 도구로 이름을 지정한 서브 에이전트 2개를 `run_in_background: true`로 띄우고
`SendMessage(to: "<이름>", ...)`로 직접 통신시키는 방식으로 동일한 조율을 구현한다
(`TeamCreate` 유무를 Phase 2 시작 시 `ToolSearch`로 먼저 확인하고, 있으면 정식 팀으로,
없으면 이 방식으로 대체). 리더(오케스트레이터)는 이름으로 각 에이전트에게 계속 메시지를
보내 진행 상황을 확인하고 개입한다.

**호출당 feature 정확히 1개만 처리하고 종료한다.** 이 스킬은 Ralph Loop 같은
외부 반복 실행기가 같은 프롬프트로 이 스킬을 계속 다시 트리거하는 것을 전제로
설계됐다 — 한 번의 호출에서 여러 feature를 몰아 처리하면, 실패했을 때 어디까지
정상이었는지 git 커밋 단위로 추적하기 어려워진다. feature 1개 = 오케스트레이터
호출 1회 = git 커밋 1개(또는 blocked 보고 1회)가 원칙이다.

## Observability: `.claude/observability/feature-loop.jsonl`

이 하네스가 얼마나 자주 왕복하고 에스컬레이션되는지 추적하기 위해, 아래 이벤트가
발생하는 시점마다 `.claude/observability/feature-loop.jsonl`에 한 줄(JSON) append한다
(디렉터리 없으면 먼저 생성). 매번 아래 형태로 `jq -n`을 이용해 한 줄을 만들어
`>>`로 추가한다(따옴표/한글 이스케이프를 직접 하지 않기 위함):

```bash
mkdir -p .claude/observability
jq -n -c \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg feature_id "<feature id>" \
  --arg event "<event 종류>" \
  --argjson detail '<JSON 객체>' \
  '{ts:$ts, feature_id:$feature_id, event:$event, detail:$detail}' \
  >> .claude/observability/feature-loop.jsonl
```

기록할 이벤트 종류는 다음 4가지로 한정한다(그 이상 세분화하지 않는다 — 스킬
지침이 무거워지는 것을 방지):

| event | 기록 시점 | detail 예시 |
|-------|----------|------------|
| `feature_selected` | Phase 0에서 처리할 feature를 확정한 직후 | `{"status_before": "not_started"}` |
| `roundtrip` | qa-verifier가 결함을 발견해 feature-implementer에게 다시 보낼 때마다(Phase 3) | `{"round": 1, "summary": "<결함 한 줄 요약>"}` |
| `escalation` | 3회 왕복 후에도 미해결이라 리더에게 에스컬레이션될 때(Phase 3→4) | `{"rounds": 3, "reason": "<미해결 사유 한 줄>"}` |
| `final_status` | Phase 4/5에서 feature의 최종 상태가 정해질 때 | `{"status": "passing"}` 또는 `{"status": "blocked", "blocker": "<사유>"}` |

이 로그는 하네스 운영 관찰용이므로 `feature_list.json`의 `evidence`/`notes`와
별개다 — 서로의 내용을 복사하지 않는다.

## 에이전트 구성

| 팀원 | 에이전트 타입 | 역할 | 산출물 |
|------|-------------|------|--------|
| feature-implementer | `feature-implementer` (커스텀) | 배정된 feature 구현 | 코드 변경 + 구현 요약 |
| qa-verifier | `qa-verifier` (커스텀) | verification 항목 실제 실행·검증 | 검증 리포트 + evidence 초안 |

두 팀원 모두 `Agent` 도구 호출 시 `model: "opus"`를 명시한다.

## 워크플로우

### Phase 0: 컨텍스트 확인 (어떤 feature를 처리할지 결정)

1. `feature_list.json`을 읽는다.
2. `status: "in_progress"`인 feature가 있으면 **그것을 계속** 처리한다(같은 feature를
   중간부터 재개 — `single_active_feature` 규칙).
3. 없으면 `status: "not_started"`인 feature 중 `priority`가 가장 낮은(우선순위가 가장
   높은) 것을 선택한다.
4. feature가 확정되면(재개든 신규든) 곧바로 `feature_selected` 이벤트를 기록한다
   (Observability 섹션 참고).
4. 모든 feature가 `status: "passing"`이면, 팀을 만들지 않고 즉시 "모든 feature 완료
   (9/9 passing)"을 보고하고 종료한다 — 이때는 어떤 완료 조건 문구든 정직하게 출력해도
   된다(실제로 참이므로).
5. 선택된 feature가 `status: "blocked"`이면, `notes`에 기록된 블로커가 이번에 해소됐는지
   먼저 확인한다(예: 이전에는 없던 API 키가 이제 `.env`에 있는지). 해소 안 됐으면 팀을
   만들지 않고 "blocked 상태 유지 — {블로커 내용}"을 보고하고 종료한다. **이 경우
   완료를 암시하는 문구를 절대 출력하지 않는다.** 이 경우도 `final_status` 이벤트를
   `{"status": "blocked", "blocker": "...", "resolved": false}`로 기록한다.
6. `session-handoff.md`, `claude-progress.md`를 읽어 직전 세션에서 남긴 결정/제약을
   파악한다.

### Phase 1: 준비

1. 선택한 feature의 `status`를 `in_progress`로 변경해 `feature_list.json`에 즉시 반영한다
   (팀 작업 도중 실패해도 다음 호출이 같은 feature를 이어서 잡을 수 있도록).
2. feature가 의존하는 문서 목록을 정리한다: `docs/architecture.md`, `docs/data-model.md`,
   `docs/api-spec.md`, `docs/ws-protocol.md`, `docs/product-plan.md`, 필요 시
   `docs/acceptance-criteria.md`(스텁이면 이번 feature 범위에서 구체화 필요).

### Phase 2: 팀 구성

`ToolSearch("select:TeamCreate")`로 정식 팀 도구 존재를 먼저 확인한다.

**있으면** 템플릿대로 `TeamCreate` + `TaskCreate(assignee)`로 구성한다.

**없으면(이 환경의 기본 가정)** `Agent` 도구로 이름을 지정한 서브 에이전트 2개를
`run_in_background: true`로 각각 스폰한다:

```
Agent(
  name: "feature-implementer",
  subagent_type: "feature-implementer",
  model: "opus",
  run_in_background: true,
  prompt: "{선택된 feature 객체 전체(JSON)} + 관련 docs 경로 목록 + session-handoff.md/claude-progress.md 요약. '이 feature를 구현하고, 완료되면 qa-verifier에게 SendMessage로 변경 파일 목록과 verification 항목별 확인 방법을 알려라' 지시."
)

Agent(
  name: "qa-verifier",
  subagent_type: "qa-verifier",
  model: "opus",
  run_in_background: true,
  prompt: "{선택된 feature 객체 전체(JSON)}. 'feature-implementer로부터 구현 완료 알림을 SendMessage로 기다렸다가, verification 배열을 실제로 실행해 검증하라. 결함 발견 시 feature-implementer에게 SendMessage로 구체적 수정 요청, 전체 통과 시 리더(main)에게 SendMessage로 evidence 초안과 함께 보고하라' 지시."
)
```

두 에이전트 모두 이름으로 스폰했으므로 리더는 이후 `SendMessage(to: "feature-implementer", ...)` /
`SendMessage(to: "qa-verifier", ...)`로 언제든 개입할 수 있다.

### Phase 3: 생성-검증 루프

**실행 방식:** 두 에이전트가 서로 이름으로 `SendMessage`를 주고받으며 자체 조율한다.
리더는 각 에이전트가 유휴 상태가 되거나 `SendMessage(to: "main", ...)`로 보고할 때까지
기다리고, 필요하면 직접 개입한다.

1. `feature-implementer`가 구현하고 `qa-verifier`에게 완료를 알린다.
2. `qa-verifier`가 검증하다 결함을 찾으면 `feature-implementer`에게 직접 피드백 →
   재수정 → 재검증. **최대 3회 왕복**까지 자체 조율을 허용한다. 리더는 두 팀원의
   SendMessage 교신을 지켜보다 결함 리포트가 오갈 때마다(왕복 1회당) `roundtrip`
   이벤트를 기록한다(Observability 섹션).
3. 3회 왕복 후에도 미해결이면 두 팀원 모두 리더에게 에스컬레이션 — 리더가 직접
   판단하거나(간단한 이슈) `blocked`로 기록할지 결정한다. 에스컬레이션이 발생하는
   즉시 `escalation` 이벤트를 기록한다.
4. `qa-verifier`가 "전체 통과, evidence 기록 가능"을 리더에게 보고하면 Phase 4로.

### Phase 4: 기록 및 통합

QA가 전체 통과를 보고한 경우만 진행한다.

1. `feature_list.json`의 해당 feature: `status: "passing"`, `evidence` 배열에 QA가
   제공한 초안을 오늘 날짜와 함께 append(기존 evidence는 지우지 않고 누적).
2. Phase 1에서 함께 갱신한 문서(`docs/acceptance-criteria.md` 등)가 있으면 그 변경도
   최종본으로 정리.
3. `claude-progress.md`(상태 스냅샷) + `session-handoff.md`(What Was
   Accomplished/Decisions Made/Next Steps)를 이번 feature 기준으로 갱신 — 프로젝트의
   기존 관례(진행 로그는 상태 스냅샷 위주, "왜"는 Decisions Made에)를 따른다.
4. `pnpm turbo run build lint check-types test`(`./init.sh`)가 전부 통과하는지
   마지막으로 한 번 더 확인한다(팀 작업 중 다른 회귀가 섞이지 않았는지).
5. git commit 1개 생성 — 커밋 메시지는 이번 feature의 "왜"를 담는다(무엇을 했는지는
   diff로 보이므로). hook 실패 시 원인을 고쳐 재시도(`--no-verify` 금지).
6. `final_status` 이벤트를 `{"status": "passing"}`으로 기록한다.

에스컬레이션으로 넘어온 경우(3회 왕복 후 미해결):
1. 리더가 직접 결함을 판단할 수 있으면 팀원에게 구체적 지시로 재시도 1회 허용.
2. 그래도 해결 안 되거나 외부 요인(실 API 키 부재 등 구조적 제약)이면, feature를
   `status: "blocked"`로 기록하고 `notes`에 블로커와 필요 조치를 명시. **이 경우
   evidence를 조작하거나 passing으로 넘기지 않는다.**
3. 최종적으로 `passing`이든 `blocked`이든, 이 케이스도 `final_status` 이벤트를
   (`{"status": "blocked", "blocker": "..."}` 형태로) 기록한다.

### Phase 5: 정리 및 보고

1. 팀원들에게 종료 알림(SendMessage). 정식 팀(`TeamCreate`)로 구성했다면 `TeamDelete`로
   정리한다 — 이름 지정 서브 에이전트로 구성했다면 별도 정리 없이 그대로 둔다.
2. 사용자에게 결과 요약: "{feature.id} {passing|blocked}. 전체 진행률 N/9 passing.
   다음 대상: {next feature.id 또는 '없음(전체 완료)'}."
3. **완료 서약은 실제로 9개 feature 전부 `passing`일 때만 출력한다.** 그 외에는
   진행 상황만 정직하게 보고하고, "아직 완료 아님"을 분명히 한다 — 이 스킬을 Ralph
   Loop 같은 반복 실행기가 completion-promise 판정에 그대로 쓸 수 있어야 하므로,
   거짓 완료 신호를 내보내면 안 된다.

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| feature-implementer 중지/실패 | 리더가 유휴 알림 감지 → SendMessage로 상태 확인 → 재시작. 재실패 시 해당 feature를 `blocked`로 기록하고 이유 명시 |
| qa-verifier와 feature-implementer 3회 왕복 후 미해결 | 리더 에스컬레이션(위 Phase 4 참고) |
| 실 API 키 등 환경 제약으로 종단 검증 불가 | `blocked`로 기록, 어떤 키/환경이 필요한지 `notes`에 명시. 완료 서약 금지 |
| `docs/acceptance-criteria.md` 등 선행 문서가 스텁 | feature-implementer가 해당 절을 구체화하는 것을 이 feature 범위로 포함시킴(별도 feature로 미루지 않음) |
| git commit hook 실패 | 원인 수정 후 재시도. hook을 건너뛰지 않음 |

## 테스트 시나리오

### 정상 흐름
1. `feature_list.json`에서 `ws-protocol`(priority 5)이 `not_started`로 선택됨.
2. `in_progress`로 표시 후 팀 구성(feature-implementer + qa-verifier, 각 1개 작업).
3. feature-implementer가 `ws` + `y-protocols`로 room별 Y.Doc 동기화 서버를 구현.
4. qa-verifier가 Vitest 통합 테스트(가짜 클라이언트 2개, SyncStep1/2 핸드셰이크,
   update 중계, 재접속 시나리오)를 실행해 전체 통과 확인.
5. `feature_list.json.ws-protocol.status → passing`, evidence 기록,
   `session-handoff.md`/`claude-progress.md` 갱신, commit 1개 생성.
6. "ws-protocol passing. 5/9 passing. 다음 대상: collab-canvas" 보고.

### 에러 흐름
1. `rest-api`류 feature 재작업 중 qa-verifier가 "실 OPENAI_API_KEY 없어 200 응답
   경로 미검증"을 발견.
2. feature-implementer와 3회 왕복해도 mock 이상의 검증이 구조적으로 불가능함을 확인.
3. 리더가 에스컬레이션 접수 → `status: "blocked"`, `notes`에 "실 API 키 주입 환경에서
   수동 확인 필요"로 기록.
4. "해당 feature blocked — 실 API 키 필요. 완료 아님" 보고, 완료 서약 미출력.
