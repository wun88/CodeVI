# Spec: 04_jenkins_automation (Pipeline Creation)

## 1. Goal
Jenkins Remote API를 호출하여 사용자의 리포지토리 분석을 위한 Pipeline Job을 동적으로 생성하고 설정을 자동화함.

## 2. Technical Detail
- Axios 기반 Jenkins API (`/createItem`, `/build`) 연동.
- Job Config XML 동적 생성 (GitHub URL 포함).
- 생성 직후 첫 빌드 트리거.

## 3. Definition of Done (DoD)
- [ ] Jenkins 서버에 해당 리포지토리 이름으로 된 Job이 생성됨.
- [ ] 생성 즉시 Build가 시작됨.
