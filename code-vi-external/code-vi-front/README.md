# Re:Factory — 회사 소개 페이지 (Frontend)

`code-vi-external/code-vi-front`는 Re:Factory 사의 마케팅·회사 소개 사이트입니다. 실제 코드 분석/시각화 기능은 본 프런트엔드에 포함되지 않으며, **LOGIN 버튼 / 코드 진단하기 CTA** 클릭 시 별도의 CodeVi 플랫폼(`code-vi-internal/code-vi-front`) 으로 이동합니다.

## 페이지 구성

| 경로 | 설명 |
|------|------|
| `/` | 메인 (RE:FACTORY 소개 + Hero CTA) |
| `/about-us` | 회사 가치, 핵심 기능, Why Re:Factory |
| `/faq` | 자주 묻는 질문 |
| `/community` | 커뮤니티 |
| `/contact-us` | 문의 |

## CodeVi 플랫폼으로의 이동

- 헤더의 `LOGIN` 버튼, Hero 영역의 `코드 진단하기` 버튼 → `VITE_INTERNAL_URL` 로 redirect
- 기본값: `http://localhost:5174` (internal 프런트엔드 dev 서버)
- 프로덕션에서는 `.env.production` 또는 빌드 시점에 별도 서브도메인으로 설정

```bash
# .env (옵션)
VITE_INTERNAL_URL=https://codevi.refactory.example.com
```

## 시작하기

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## 의존성

회사 소개 사이트라 시각화·HTTP·상태 라이브러리는 포함하지 않습니다 (React + react-router-dom 만).
