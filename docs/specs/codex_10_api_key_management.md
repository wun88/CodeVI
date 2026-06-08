# Specification: API Key Management MVP

## 1. Objective (목표)
사용자와 에이전트가 메트릭 분석 API를 안전하게 호출할 수 있도록 API Key 발급, 조회, 폐기 기능을 MVP 범위로 구현한다. 기존 `User`, `TeamProject`, `auth` 모듈과 충돌 없이 동작해야 한다.

## 2. Tech Stack (기술 스택)
- **Backend**: NestJS
- **ORM**: TypeORM
- **Security**: `bcryptjs` 또는 동등한 해시 방식
- **Auth**: JWT 기반 사용자 인증 + API Key 기반 서비스 인증
- **Docs**: Swagger DTO 문서화

## 3. Implementation Phases (구현 단계)

### Phase 1: `ApiKey` 엔티티 정의
- 필수 필드
  - `id`
  - `name`
  - `prefix`
  - `hashedKey`
  - `lastUsedAt`
  - `expiresAt`
  - `revokedAt`
- 관계 정의
  - `ManyToOne(User)`
  - `ManyToOne(TeamProject, nullable=true)`
- 인덱스 검토
  - `prefix`
  - `user`
  - `teamProject`

### Phase 2: API Key 생성 정책 구현
- 원문 키는 생성 시 1회만 응답
- 저장 시 `hashedKey`만 보관
- 식별용 `prefix`는 응답과 운영 로그에 사용
- 만료일 없는 키와 만료일 있는 키 둘 다 허용
- 폐기된 키는 즉시 인증 불가 처리

### Phase 3: API Key 서비스 계층 구현
- `createKey(userId, teamProjectId, name, expiresAt)`
- `listKeys(userId)`
- `revokeKey(userId, keyId)`
- `validateKey(rawKey)`
- `touchLastUsedAt(keyId)`

### Phase 4: 컨트롤러 및 인증 가드 연동
- `POST /api/api-keys`
- `GET /api/api-keys`
- `DELETE /api/api-keys/:id`
- JWT 인증 사용자만 키를 관리할 수 있도록 가드 적용
- 향후 분석 API에서 재사용할 수 있도록 API Key 인증 가드 분리

## 4. Acceptance Criteria (검증 기준)
- [ ] 사용자가 JWT 인증 후 새 API Key를 발급받을 수 있다.
- [ ] 발급 응답에는 원문 키가 포함되지만, DB에는 해시만 저장된다.
- [ ] 사용자는 본인이 소유한 API Key 목록만 조회할 수 있다.
- [ ] 폐기된 키는 이후 인증에 사용할 수 없다.
- [ ] Swagger에서 요청/응답 DTO와 인증 조건이 드러난다.

## 5. Dependencies (의존성)
- 기존 `users` 모듈
- 기존 `team-project` 모듈
- 기존 `auth` JWT 인증 구조
- `CommonEntity` 기반 엔티티 관례
