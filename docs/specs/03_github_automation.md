# Spec: 03_github_automation (Jenkinsfile Injection)

## 1. Goal
GitHub API를 사용하여 사용자의 리포지토리에 `Jenkinsfile`이 존재하는지 확인하고, 없을 경우 자동 분석용 템플릿을 주입함.

## 2. Technical Detail
- `@octokit/rest` 사용.
- `GET /repos/{owner}/{repo}/contents/Jenkinsfile` 호출.
- 404 에러 시 `PUT /repos/{owner}/{repo}/contents/Jenkinsfile` 호출하여 파일 생성.

## 3. Definition of Done (DoD)
- [ ] PAT를 가진 유저의 리포지토리에 Jenkinsfile이 자동 생성됨.
- [ ] 기존 Jenkinsfile이 있을 경우 덮어쓰지 않고 스킵함.
