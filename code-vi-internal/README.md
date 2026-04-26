# CodeVi Internal Web

`code-vi-internal`은 Re:Factory의 코드 시각화·분석 플랫폼인 **CodeVi** 본체입니다. 사용자가 로그인 후 실제로 코드를 업로드/연동하고, AST·메트릭을 시각화하는 모든 기능이 이곳에 있습니다.

회사 소개(마케팅) 페이지는 별도 디렉토리(`code-vi-external/code-vi-front`)에 있으며, 회사 소개 페이지의 LOGIN 버튼은 본 internal 프런트엔드로 redirect 됩니다.

## 프로젝트 구조

```
code-vi-internal/
├── code-vi-back/   # NestJS 백엔드 (포트 13000)
└── code-vi-front/  # CodeVi 플랫폼 프런트엔드 (Vite, 포트 5174)
```

## 시작하기

### 백엔드

```bash
cd code-vi-back
npm install
npm run start:dev   # http://localhost:13000  (Swagger: /api)
```

### 프런트엔드

```bash
cd code-vi-front
npm install
npm run dev         # http://localhost:5174
```

## 환경 변수

백엔드 CORS는 다음 두 origin을 모두 허용합니다 (개발 기본값):

| 변수 | 기본값 | 용도 |
|------|--------|------|
| `DEVELOP_EXTERNAL_FRONTEND_URL` | `http://localhost:5173` | 회사 소개 페이지 origin |
| `DEVELOP_INTERNAL_FRONTEND_URL` | `http://localhost:5174` | CodeVi 플랫폼 origin |
| `DEPLOY_FRONTEND_URL1`~`6` | (운영) | 배포 도메인용 |

## 라우트 개요

| 경로 | 설명 |
|------|------|
| `/` | 비로그인 시 로그인 모달 자동 오픈 / 로그인 시 `/dashboard` 로 redirect |
| `/code-insight`, `/code-insight/upload`, `/code-insight/github`, `/code-insight/onboarding`, `/code-insight/dashboard` | 코드 업로드 및 온보딩 |
| `/dashboard` | 메인 대시보드 |
| `/visualization/:snapshotId` | AST 그래프 뷰 |
| `/mypage` | 사용자 프로필 |
| `/auth/{github,google,kakao,naver}-callback` | OAuth 콜백 |
