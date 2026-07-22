# Spec: 19_github_connect_email_scope_fix (GitHub 레포 연동 콜백 500 에러 수정)

> 관련 문서: [jej_18_github_repository_integration.md](./jej_18_github_repository_integration.md) — 본 문서는 18번 명세서에서 구현한 "GitHub 레포 연동" 플로우에서 실사용 중 발견된 버그의 원인 분석 및 수정 기록이다.

---

## 1. 증상

Project Analysis → GitHub 연동 → "GitHub으로 연결" 클릭 → GitHub 인가 화면에서 승인 후, 콜백에서 500 에러 발생:

```json
{
  "statusCode": 500,
  "path": "/api/auth/github/callback?code=...&state=eyJhbGciOiJIUzI1NiIs...",
  "message": "Failed to fetch user emails"
}
```

`state` payload를 디코드하면 `purpose: "github-connect"` — 로그인이 아닌 **레포 연동(repo scope) 플로우**에서만 재현된다. 기존 `/auth/github/signin`(로그인 전용) 플로우는 동일 코드 경로를 타지만 문제없이 동작한다.

---

## 2. 원인 분석

### 2.1 두 플로우가 콜백을 공유하는 구조

GitHub OAuth App의 Authorization callback URL은 1개만 등록 가능하므로, 로그인(`/auth/github/signin`)과 레포 연동(`GET /api/github/connect`)이 **동일한 콜백**(`/auth/github/callback`)과 **동일한 Passport 전략 인스턴스**(`GithubStrategy`)를 공유한다. 두 흐름은 `state` 파라미터로만 구분된다([auth.controller.ts:141-204](../../code-vi-internal/code-vi-back/src/auth/auth.controller.ts#L141-L204)).

문제는 두 플로우가 **서로 다른 scope**를 GitHub에 요청한다는 데 있다:

| 플로우 | 요청 scope | 코드 위치 |
|---|---|---|
| 로그인 (`/auth/github/signin`) | `user:email`, `read:user` | `GithubStrategy` 생성자 ([github.strategy.ts:16](../../code-vi-internal/code-vi-back/src/auth/strategies/github.strategy.ts#L16)) |
| 레포 연동 (`/api/github/connect`) | `repo`, `read:user` (수정 전) | `GITHUB_CONNECT_SCOPE` ([github-connect.service.ts:24](../../code-vi-internal/code-vi-back/src/github-connect/github-connect.service.ts#L24)) |

### 2.2 passport-github2의 버그성 동작

`passport-github2`는 콜백에서 이메일 조회(`GET /user/emails`) 여부를 판단할 때, **이번 요청에서 실제로 승인된 scope가 아니라 `GithubStrategy` 생성자에 고정된 scope**만 본다.

```js
// node_modules/passport-github2/lib/strategy.js:112-124
var canAccessEmail = false;
var scopes = self._scope;                 // ← 생성자에 고정된 scope. 요청별 승인 scope 아님
...
canAccessEmail = scopes.some(function(scope) {
  return scope === 'user' || scope === 'user:email';
});
if (!canAccessEmail) {
  return done(null, profile);
}
// Getting emails
self._oauth2.get(self._userEmailURL, accessToken, function (err, body, res) {
  if (err) {
    return done(new InternalOAuthError('Failed to fetch user emails', err));  // ← 여기서 터짐
  }
```

`GithubStrategy` 생성자에는 `user:email`이 포함되어 있으므로 `canAccessEmail`은 **항상 true**다. 따라서 레포 연동 플로우에서 발급된 access token(scope: `repo read:user`, `user:email` 없음)으로도 무조건 `GET /user/emails`를 호출하게 되고, GitHub는 해당 scope 부족을 이유로 404를 반환한다:

```
statusCode: 404,
data: '{"message":"Not Found","documentation_url":"https://docs.github.com/rest/users/emails#list-email-addresses-for-the-authenticated-user","status":"404"}'
```

이 404가 `InternalOAuthError('Failed to fetch user emails', ...)`로 래핑되어 컨트롤러까지 올라가 500으로 응답된다.

### 2.3 이메일이 애초에 필요한 이유

레포 연동 플로우도 `findOrCreateGithubUser()`를 경유하므로 이메일이 없으면 `validate()`가 자체적으로 `UnauthorizedException`을 던진다([github.strategy.ts:32-36](../../code-vi-internal/code-vi-back/src/auth/strategies/github.strategy.ts#L32-L36)) — 즉 이메일 자체는 이 플로우에도 실제로 필요하다. 문제는 "이메일이 필요하다"가 아니라 "그 이메일을 가져올 권한(`user:email` scope)을 요청하지 않았다"는 것.

---

## 3. 수정 내용

`GITHUB_CONNECT_SCOPE`에 `user:email`을 추가.

```diff
- const GITHUB_CONNECT_SCOPE = 'repo read:user';
+ // passport-github2는 실제 승인된 scope가 아니라 GithubStrategy 생성자의 고정 scope로
+ // 이메일 조회 가능 여부를 판단한다(user:email 포함 여부만 봄). 콜백을 로그인과 공유하는 이상
+ // user:email을 빼면 "Failed to fetch user emails"로 콜백이 500 난다.
+ const GITHUB_CONNECT_SCOPE = 'repo read:user user:email';
```

파일: [`code-vi-internal/code-vi-back/src/github-connect/github-connect.service.ts`](../../code-vi-internal/code-vi-back/src/github-connect/github-connect.service.ts)

- 최소 권한 원칙과의 관계: [18번 명세서 §12](./jej_18_github_repository_integration.md#12-보안)는 "로그인 플로우는 `user:email read:user`만, `repo`는 연동 플로우에서만"을 최소 권한 원칙으로 명시했었다. 이번 수정으로 연동 플로우도 `user:email`을 함께 요청하게 되어 원칙이 소폭 후퇴하지만, `GithubStrategy`를 콜백 공유 구조로 유지하는 한 불가피하다(대안은 §5 참고).

---

## 4. 검증

1. Jenkins 콘솔이 아닌 실제 GitHub 인가 화면까지 왕복하는 수동 테스트로 재현/수정 확인:
   - 수정 전: 콜백에서 500, 서버 로그에 `GET /user/emails` → `404 Not Found` (`docs/rest/users/emails#list-email-addresses-for-the-authenticated-user`) 확인.
   - 코드 수정 후 `nest start --watch` 핫리로드 반영, 재현 시나리오 재시도 예정(사용자 측 재연결 테스트로 최종 확인 필요 — 이 문서 작성 시점에는 재연결까지는 미확인).
2. 회귀 확인: 로그인 전용 플로우(`GITHUB_CONNECT_SCOPE`와 무관, 기존 `user:email read:user` 그대로)는 변경 없음 — 영향 없음.

---

## 5. 향후 개선 (참고, 본 수정 범위 아님)

- **근본 해결**: `passport-github2`의 `canAccessEmail` 판단이 요청별 scope가 아니라 전략 인스턴스 고정 scope에 의존하는 구조적 한계이므로, 두 플로우가 이 라이브러리의 셔틀 콜백을 계속 공유하는 한 "연동 플로우도 항상 `user:email`을 함께 요청"해야 하는 제약이 남는다. 완전히 분리하려면 레포 연동 플로우를 `passport-github2` 대신 GitHub OAuth를 직접 호출하는 방식(수동 `code` → `access_token` 교환, [18번 명세서 §6.1 시퀀스](./jej_18_github_repository_integration.md#61-authorization-code-flow-sequence-diagram)가 원래 의도했던 방식)으로 바꿔야 한다.
- 이번 수정은 기존 공유 콜백/전략 구조를 유지한 채 가장 작은 변경으로 막은 것이다.

---

## 6. 별개로 확인된 이슈 (본 수정과 무관, 참고용)

같은 세션에서 "로그인하면 다른 사람의 레포 목록이 뜬다"는 증상도 보고되었으나, 조사 결과 **코드 버그가 아님**으로 결론. GitHub OAuth 인가 화면(`github.com/login/oauth/authorize`)은 브라우저에 이미 활성화된 GitHub 세션이 있으면 계정 선택 없이 그 세션으로 즉시 승인한다 — 즉 어떤 GitHub 계정의 레포가 뜨는지는 우리 앱의 로그인 계정이 아니라 **그 순간 브라우저의 github.com 세션**에 의해 결정된다. 별도 코드 수정 없음.
