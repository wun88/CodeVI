---
description: Run integration tests and fix any failures
---

다음을 순서대로 실행하라:

1. 환경 확인: `!docker ps | grep test-db`
   - test-db 컨테이너가 없으면 `!docker compose -f docker-compose.test.yml up -d`로 띄움

2. 통합 테스트 실행: `!npm run test:integration -- --reporter=verbose`

3. 실패 시:
   - 첫 번째 실패의 출력을 읽고 원인 분석
   - 원인 분류: (a) 코드 버그, (b) DB 스키마 불일치, (c) API 계약 변경, (d) 테스트 자체가 stale
   - 적절한 곳을 수정 (테스트는 명백히 잘못된 경우에만 수정)
   - 해당 테스트만 재실행하여 확인
   - 통과하면 전체 재실행

4. 같은 테스트에서 3회 실패하면 멈추고 사용자에게 보고

5. 모두 통과하면 "✅ 통합 검증 완료" 출력