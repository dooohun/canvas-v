# Clean State Checklist

- [ ] `./init.sh`가 여전히 성공한다.
- [ ] `pnpm turbo run build lint check-types`(그리고 추가된 이후에는 `test`)가 여전히 통과한다.
- [ ] `claude-progress.md`에 이번 세션 내용이 기록되어 있다.
- [ ] `feature_list.json`의 `status`/`evidence`가 실제 상태를 반영한다 (거짓 `passing` 없음).
- [ ] 절반만 끝낸 작업이 문서화되지 않은 채 남아 있지 않다.
- [ ] `docs/*.md` 중 이번 세션에서 채운 스텁이 있다면 CLAUDE.md의 "스텁" 표시를 갱신했다.
- [ ] 다음 세션이 수동 복구 없이 이어갈 수 있다.
