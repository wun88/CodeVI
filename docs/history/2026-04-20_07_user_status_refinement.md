# Implementation Record: User Status Policy & Logic Refinement

## 1. Intent (작업 의도)
- **Status Policy**: 우리 서비스의 핵심인 코드 시각화 기능을 위해 "GitHub 연동 여부"를 기준으로 유저 상태를 관리함.
- **Rules**:
  - GitHub으로 가입하거나 기존 계정을 GitHub에 연동하면 `ACTIVE` 상태가 됨.
  - 그 외의 경로(Google, Kakao, Naver, SaaS 직접 가입, CI 빌드)로 생성된 유저는 `PENDING` 상태가 됨.

## 2. Result (결과)
- **Entity Modification**
  - `User` 엔티티의 `status` 컬럼 기본값을 `UserStatus.ACTIVE`에서 `UserStatus.PENDING`으로 변경.
- **UsersService Modification**
  - `createUserByGithub`: 신규 가입 시 상태를 명시적으로 `ACTIVE`로 설정.
  - `updateGithubUid`: 다른 소셜/SaaS 계정에서 GitHub 계정을 연동(Merge)할 때 상태를 자동으로 `ACTIVE`로 전환하도록 로직 강화.
  - 나머지 소셜 로그인(`Google`, `Kakao`, `Naver`)은 엔티티 기본값에 따라 `PENDING`으로 생성됨 확인.
- **Verification**
  - 백엔드 빌드(`npm run build`) 결과 무결성 확인 및 성공.

## 3. Retrospective (회고)
- 서비스 성격에 맞는 "GitHub-First" 인증 구조를 확립함.
- `PENDING` 상태를 활용하여 프론트엔드에서 "GitHub 연동 유도" UX를 설계할 수 있는 토대를 마련함.
