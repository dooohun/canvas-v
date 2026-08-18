# Session Handoff

## Last Session: 2026-08-18 (feature-loop 하네스 실행 — generate-3d-preview)

### What Was Accomplished

- `generate-3d-preview`(priority 8) 구현 완료 — Generate 3D 노드에 이미지가 연결되고
  실행되면 노드 카드 안에서 Three.js로 결과가 렌더링되고 OrbitControls로 회전하며
  확인할 수 있다.
- **image fan-in 선택 규칙 확정**(`docs/architecture.md`): `POST /api/generate-3d`는
  이미지 하나만 받으므로 여러 `generateImage` 입력은 "조합"이 아니라 "선택"이다.
  텍스트 fan-in과 동일한 정렬 기준(캔버스 좌표 y→x→노드id 사전순)으로 정렬한 뒤,
  그중 첫 번째 `status: 'ready'` 이미지를 쓴다. 앞쪽이 아직 준비 안 됐으면 다음
  후보로 건너뛴다(입력 하나 실패가 파이프라인을 막지 않음).
- `apps/frontend/src/pipeline/fanIn.ts`에 정렬/수집 로직을 한 번만 정의해
  `promptComposition.ts`(텍스트)와 신규 `imageSelection.ts`(이미지)가 공유하도록
  기존 코드를 리팩터링 — 중복 정의 없음.
- Generate 3D 실행은 `ai-image-generation`에서 확정한 pending 소유권/회수 패턴
  (`runState.ts`)을 그대로 재사용. 새 실행 상태 모델을 따로 만들지 않았다.
- Three.js 렌더링: Meshy 응답이 `model_urls.glb`이므로(`meshyClient.ts`)
  `GLTFLoader`로 로드. `apps/frontend/src/three/modelScene.ts`(React와 분리된 순수
  씬/카메라/렌더러/OrbitControls 배관, dispose 포함)와
  `components/pipeline/ModelViewer.tsx`(`<canvas>` 마운트, `modelUrl` 변경 시 재생성)
  로 구성. 뷰어 컨테이너에 `nodrag nowheel`을 줘서 드래그/휠이 React Flow 캔버스
  팬/줌으로 새지 않게 했다. WebGL 컨텍스트 생성 실패 시 예외를 잡아 안내 문구로
  대체(3D 미리보기 실패가 캔버스 전체를 죽이지 않음). `@react-three/fiber` 같은
  래퍼는 쓰지 않음(노드 하나에 캔버스 하나뿐이라 추상화 비용이 이득보다 큼).
- `docs/acceptance-criteria.md` 시나리오 9(3D 렌더링)를 다른 시나리오와 같은 형식
  (사전조건/조작순서/기대결과/자동화 가능 여부)으로 신규 작성.
- QA(`qa-verifier`)가 "양쪽 동시 읽기"로 REST 응답 shape(`{modelUrl}`) ↔ 프론트
  소비 코드, fan-in 규칙 ↔ 실제 구현·테스트, pending 재사용 여부(grep으로 중복 로직
  없음 확인), 서버 도메인 타입 미등장(grep 0건)을 대조 검증. `pnpm turbo run build
  lint check-types test` 15/15 통과 직접 재실행 확인.
- **리더가 직접 브라우저로 추가 검증**: QA가 jsdom 한계로 미검증 남긴 "실제
  브라우저에서 OrbitControls 회전 확인"을 CLAUDE.md의 "UI 변경은 브라우저에서 직접
  확인" 규칙에 따라 Chrome으로 직접 수행. MESHY_API_KEY가 없어 `fetch`를 패치해
  `/api/generate-image`·`/api/generate-3d` 응답만 모킹하고(조작은 전부 실제 UI로),
  Khronos 공개 샘플 glTF(Box.glb)를 modelUrl로 응답시켜 실제 WebGL 렌더링을 확인
  (테스트 파일은 `apps/backend/uploads/`가 gitignore 대상이라 커밋에 안 남고,
  검증 후 직접 삭제함). 결과: 노드 실행 버튼 pending→ready 전이, 3D 노드 카드 안에
  실제 조명/음영이 있는 큐브가 렌더링됨, 드래그 시 OrbitControls로 실제 회전하며
  React Flow 캔버스 자체는 팬 안 됨(nodrag/nowheel 격리 확인), 콘솔 에러 없음.

### What Remains

- `optimization-pass`(priority 9) — 마지막 남은 feature, `generate-3d-preview`에
  의존(그 안의 렌더링을 최적화하는 것이므로). `docs/product-plan.md` 6번 섹션
  체크리스트(텍스처 재사용, 지오메트리/머티리얼 공유, 리렌더 방지, 픽셀 비율 상한,
  프레임 측정) 중 최소 1~2개만 적용해도 벤치마크 비교 가능하다고 명시돼 있음.
- 9/9 전부 passing이 되기 전까지는 PR을 만들지 않는다(하네스 규칙). 현재 8/9
  passing — `optimization-pass` 하나만 남았다.
- **번들 크기**: three 추가로 frontend gzip 번들이 329kB가 되어 vite chunk-size
  경고가 뜬다. 코드 스플리팅(예: Generate 3D 노드를 동적 import)은
  `optimization-pass` feature 범위로 남겨뒀다 — 그 feature에서 반드시 다룰 것.
- `ai-image-generation`의 실 OPENAI_API_KEY 종단 성공 경로와, 이번 feature의 실
  MESHY_API_KEY 종단 성공 경로(200 + 실제 Meshy 3D 에셋) 둘 다 이 세션 환경에 키가
  없어 미검증 — 크레딧/키가 있는 환경에서 수동 확인 필요 (mock 기반 상태 전이는
  둘 다 검증됨, 이번 feature는 추가로 리더가 실제 WebGL 렌더링까지는 브라우저로
  확인함).
- `docs/api-spec.md`의 `response_format: "b64_json"` 서술 오류(코드가 맞고 문서가
  낡음, `rest-api` feature에서 넘어온 것)는 여전히 미정리.

### Decisions Made

- **이미지 fan-in은 "조합"이 아니라 "선택"** — REST 계약이 이미지 하나만 받으므로
  텍스트처럼 이어붙일 수 없다. 정렬 기준은 텍스트와 동일하게 재사용해 결정론을
  유지하고, "사용자가 직접 고르게" 하는 방식은 채택하지 않음(Y.Doc에 새 공유 상태를
  요구하는데 좌표 규칙만으로 충분히 예측 가능하기 때문).
- **Three.js는 래퍼 없이 직접 배관** — `@react-three/fiber`/`@react-three/drei`
  대신 순수 `three` + 수동 React 마운트/언마운트. 노드 하나당 캔버스 하나뿐이라
  선언적 래퍼의 이득이 크지 않다고 판단.
- **QA가 jsdom 한계로 미검증 남긴 항목은 리더가 직접 브라우저로 메꾼다** — 자동화
  불가 항목을 "미검증"으로만 남기지 않고, CLAUDE.md의 UI 변경 검증 규칙에 따라
  실제 조작(mock 응답 + 실제 glTF 파일)으로 리더가 확인한 뒤 evidence에 기록.
  이후 feature에서도 3D/UI 관련 QA 갭이 남으면 같은 방식(리더의 직접 브라우저
  검증)을 재사용할 것.
- (이전 세션 결정, 유효함) `main` 직접 커밋 중단, `feature-loop/remaining-features`
  에서 작업 후 9/9 passing 시 PR 1개로 통합. fan-in 프롬프트/이미지 정렬은 캔버스
  좌표 기준(엣지 생성 순서 아님). pending 실행 소유권은 awareness+타임아웃으로 판정.

### Files Modified

- `apps/frontend/src/pipeline/{fanIn.ts(신규), imageSelection.ts(신규),
  promptComposition.ts(리팩터)}` + 각 `__tests__/`
- `apps/frontend/src/pipeline/useNodeExecution.ts`(`runGenerate3d` 추가)
- `apps/frontend/src/three/modelScene.ts`(신규) + `__tests__/`
- `apps/frontend/src/components/pipeline/ModelViewer.tsx`(신규),
  `Generate3dNode.tsx`, `PipelineCanvas.tsx`(3D 실행 디스패치) + 각 `__tests__/`
- `apps/frontend/src/api/generation.ts`(`requestGenerate3d` 추가) + `__tests__/`
- `apps/frontend/package.json`(`three` 의존성 추가)
- `docs/{architecture.md, api-spec.md, acceptance-criteria.md}`
- `feature_list.json`(`generate-3d-preview` 항목 `passing` 전환), `session-handoff.md`,
  `claude-progress.md`, `.claude/observability/feature-loop.jsonl`

### Blockers

없음.

### Next Steps

1. `optimization-pass`(priority 9) feature 구현 — `feature-loop` 스킬 호출로 진행.
   이게 마지막 남은 feature다.
2. 9/9 passing 도달 시 `feature-loop` 하네스가 자동으로
   `feature-loop/remaining-features` → `main` PR을 생성한다.
3. `optimization-pass`에서 번들 크기(three 코드 스플리팅) 문제를 같이 다룰 것 —
   위 "What Remains" 참고.
4. `ai-image-generation`/`generate-3d-preview` 둘 다 실 API 키 종단 검증은 별도로
   필요.
