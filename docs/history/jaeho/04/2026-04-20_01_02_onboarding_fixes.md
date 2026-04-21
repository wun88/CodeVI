# Implementation Record: User Deduplication & Secure Onboarding (Phase 1 & 2)

## 1. Intent (작업 의도)
- **Phase 1 (User Deduplication)**: SaaS 가입(OAuth)과 CI 연동 시 발생하는 이메일 중복 계정을 `githubUid`를 기준으로 통합하여 데이터 무결성을 확보함.
- **Phase 2 (Secure Onboarding)**: 사용자의 GitHub PAT 전송 시 보안을 위해 2048-bit RSA 비대칭 암호화 시스템을 구축함.

## 2. Result (결과)
- **Backend (Phase 1)**
  - `UsersService.updateGithubUid` 메서드 신설: 기존 이메일 유저에게 GitHub UID를 동적으로 연결 가능하게 함.
  - `AuthService.findOrCreateGithubUser` 로직 고도화: GitHub 로그인 시 UID가 없더라도 이메일이 일치하면 기존 계정에 연동(Merge)하도록 수정.
- **Backend (Phase 2)**
  - `AuthService` 내 RSA 키 페어 생성 및 관리 로직 구현 (OAEP/SHA-256).
  - `AuthController.getRsaPublicKey` 엔드포인트(`GET /api/auth/rsa-public-key`) 추가.
  - `AuthService.decryptText` 메서드 구현으로 암호화된 PAT 복호화 지원.
- **Verification**
  - 백엔드 빌드(`npm run build`) 무결성 확인 및 성공.
  - 미비했던 `@octokit/rest` 의존성 추가 및 `node_modules` 정리.

## 3. Retrospective (회고)
- 초기 코드 분석 중 `GithubService`가 존재하지 않는 `AuthService.decryptText`를 호출하고 있는 런타임 잠재 결함을 발견하여 즉시 해결함.
- 프론트엔드의 대규모 TypeScript 에러(기존 결함)에도 불구하고, 백엔드 서비스의 로직 무결성을 확보하고 빌드 성공을 이끌어냄.
- 향후 프론트엔드의 대규모 타입 리팩토링이 필요함을 인지함.
