# Implementation Record: User Role Simplification (ADMIN & USER)

## 1. Intent (작업 의도)
- **Role Simplification**: 기존의 복잡한 교육용 권한 체계(`STUDENT`, `INSTRUCTOR`, `ADMIN`)를 범용적인 SaaS 형태인 두 단계(`ADMIN`, `USER`)로 단순화하여 운영 효율성과 코드 가독성을 높임.

## 2. Result (결과)
- **Enum Refactoring**
  - `UserRole`에서 `STUDENT`, `INSTRUCTOR`를 삭제하고 `USER` 상수를 신설함.
- **Codebase Migration**
  - `UsersService`: 모든 신규 가입 및 빌드 유저의 기본 권한을 `UserRole.USER`로 변경.
  - `UsersController`: 권한 가드(`@Roles`) 설정을 새로운 권한 체계에 맞춰 업데이트.
  - `AuthService`: 모든 소셜 로그인 유입 시 기본 권한을 `UserRole.USER`로 할당하도록 수정.
  - `AuthController`: 출석 관련 특수 권한 엔드포인트를 `ADMIN` 전용으로 조정.
- **Verification**
  - `npm run build`를 통해 코드 내 모든 `STUDENT`/`INSTRUCTOR` 하드코딩 참조가 제거되었음을 확인 및 빌드 성공.

## 3. Retrospective (회고)
- 불필요한 계층 구조를 제거함으로써 권한 관리 로직이 단순해지고 향후 정책 확장이 용이해짐.
- 전수 조사를 통해 누락된 참조 없이 깔끔하게 리팩토링을 완료함.
