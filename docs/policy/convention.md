# Coding Convention & Policy

가시화 팀의 코딩 표준 및 에이전트 행동 정책을 정의합니다.

## 1. 일반 원칙
- 모든 코드는 **Typescript**를 기본으로 하며, 인터페이스 및 타입 정의를 엄격히 수행한다.
- **Functional Programming** 지향: 사이드 이펙트를 최소화하고 순수 함수를 활용한다.
- **Visualization Rule**: 그래프 렌더링 시 노드 간의 최대 거리는 200px을 넘지 않도록 레이아웃 알고리즘을 최적화한다.

## 2. 에이전트 정책 (Agent Policy)
- **Self-Documenting**: 모든 함수 상단에는 JSDoc을 포함해야 하며, 복잡한 로직은 `Intent`를 주석으로 남긴다.
- **No Hallucination**: 모르는 라이브러리나 API를 사용할 때는 반드시 `read_url_content` 등으로 공식 문서를 읽은 뒤 구현한다.
- **Security**: 개인정보나 비밀키가 코드에 포함되지 않도록 `mcp-server-git` 등으로 커밋 전 스캔한다.

## 3. 커밋 가이드라인
- `feat`: 새로운 기능 추가 (예: AST 파서 추가)
- `fix`: 버그 수정
- `docs`: 문서 수정 (Agent.md, Navigator.md 등)
- `refactor`: 코드 리팩토링
- `chore`: 빌드 과정 또는 도구 관련 수정
