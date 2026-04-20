# Implementation Record: GitHub & Jenkins Automation (Phase 3 & 4)

## 1. Intent (작업 의도)
- **Phase 3 (GitHub Automation)**: 사용자의 GitHub 리포지토리에 자동 분석을 위한 `Jenkinsfile`을 주입하여 분석 환경을 자동화함.
- **Phase 4 (Jenkins Automation)**: Jenkins Remote API를 사용하여 프로젝트별 파이프라인 잡(Job)을 동적으로 생성하고 분석 실행을 트리거함.

## 2. Result (결과)
- **GitHub Integration (Phase 3)**
  - `Octokit` 라이브러리를 활용하여 리포지토리별 `Jenkinsfile` 존재 여부 체크 및 부재 시 템플릿 파일 자동 생성 로직 구현.
  - 기존 파일 유지 정책(Skip if exists) 적용.
- **Jenkins Integration (Phase 4)**
  - Axios 기반 Jenkins Remote API 연동.
  - Job Config XML 동적 생성 및 `createItem`, `build` API 연동 완료.
  - 리포지토리 URL을 기반으로 잡 이름을 자동 추출하는 유틸리티 구현.
- **Verification**
  - 백엔드 빌드 통과 및 관련 서비스 코드 무결성 확인.

## 3. Retrospective (회고)
- `OnboardingService`에서 GitHub와 Jenkins 연동을 순차적으로 수행하는 파이프라인을 구축함.
- 환경 변수(`JENKINS_URL`, `TOKEN` 등) 기반의 유연한 설정을 도입하여 인프라 확장성을 고려함.
