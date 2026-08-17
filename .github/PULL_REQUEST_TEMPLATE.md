## Summary

<!-- 이 PR이 왜 필요한지 1~3문장. feature 제목을 그대로 나열하지 말고, 무엇이 가능해지는지 적을 것 -->

## 포함된 feature (feature_list.json 기준)

<!-- feature-loop가 이 PR을 열 때 처리한 feature id를 상태와 함께 나열 -->

- [ ] `feature-id` — 한 줄 설명

## 리뷰어가 특히 봐야 할 곳

<!--
feature-loop처럼 자동 구현 루프가 생성한 PR은 특히 이 섹션이 중요합니다.
implementer/QA가 "미확인" "임시방편" "다음에 확정 필요"라고 남긴 지점을
여기 그대로 옮겨 적으세요. 없으면 "없음"이라고 명시.
-->

- 

## 검증 방법

<!-- 리뷰어가 로컬에서 그대로 재현할 수 있는 명령/절차 -->

```bash
pnpm install
pnpm turbo run build lint check-types test
```

- [ ] 위 명령 전부 통과
- [ ] `feature_list.json`의 해당 feature `evidence`에 QA 검증 내역 기록됨
- [ ] 문서(`docs/*.md`) 변경이 필요한 경우 함께 갱신됨

## 브레이킹 체인지 / 후속 작업

<!-- 없으면 "없음". 있으면 무엇이 깨질 수 있는지와 후속 이슈/feature id -->

