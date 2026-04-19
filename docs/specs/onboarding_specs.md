# Spec: 01_user_deduplication (User Upsert Logic)

## 1. Goal
SaaS 가입(OAuth)과 CI 연동(Email/Username) 시 발생하는 사용자 정보를 `githubUid`를 기준으로 통합하여 중복 계정 생성을 방지함.

## 2. Technical Detail
- **Priority**: `githubUid` > `email` > `username`.
- **Logic**:
    - `githubUid`로 기존 사용자 조회.
    - 존재하지 않을 경우 `email`로 조회.
    - `email`로 사용자가 발견되면 해당 계정에 `githubUid`를 업데이트하여 병합.
    - 모두 없을 경우에만 신규 생성.

## 3. Definition of Done (DoD)
- [ ] 동일한 GitHub 계정으로 가입된 사용자가 다른 수단(CI)으로 유입되어도 하나의 계정으로 관리됨.
- [ ] 테스트 코드 (`users.service.spec.ts`) 통과.

---

# Spec: 02_secure_onboarding (RSA Encryption)

## 1. Goal
사용자의 GitHub PAT(Personal Access Token)를 프론트엔드에서 전송할 때, 평문 노출을 방지하기 위해 RSA 비대칭 암호화를 사용하여 보안 전송을 구현함.

## 2. Technical Detail
- **Backend**: 2048-bit RSA Key Pair 생성 (PKCS#1 OAEP / SHA-256).
- **Frontend**: API를 통해 공용키를 획득하고, PAT를 암호화하여 전송.

## 3. Definition of Done (DoD)
- [ ] PAT가 네트워크 탭에서 암호화된 상태로 확인됨.
- [ ] 백엔드에서 원본 PAT로 복호화 성공.
