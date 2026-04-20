# Specification: AST Data Integration API & Frontend Connection

## 1. Objective (목표)
백엔드의 `ast-relational` 모듈에 저장된 코드 구조 데이터(AST 노드, 의존성 엣지, 메트릭)를 프론트엔드가 시각화할 수 있도록 RESTful 엔드포인트를 노출하고, 프론트엔드 연동 계층(Service Layer)을 구축한다.

## 2. Tech Stack (기술 스택)
- **Backend**: NestJS, TypeORM (데이터 추출 및 형태 변환 API)
- **Frontend**: React, `@xyflow/react` (React Flow), `dagre` (자동 레이아웃)
- **Data Format**: 기존 구현된 React Flow 컴포넌트 환경을 해치지 않기 위해, React Flow의 표준 `Node` 및 `Edge` 인터페이스를 완벽히 준수하는 형태의 JSON으로 백엔드에서 미리 가공하여 응답함.

## 3. Implementation Phases (구현 단계)

### Phase 1: 백엔드 노드 및 엣지 조회 DTO 구현
- 프론트엔드 렌더링에 필요한 공통 데이터 포맷(Nodes 배열, Edges 배열)을 위한 응답 DTO 설계.
- 시각화를 위한 필수 속성(id, label, type, weight, source, target 등) 매핑 로직 구축.

### Phase 2: AST Relational 컨트롤러 및 서비스 엔드포인트 구축
- **GET** `/api/ast-relational/projects/:projectId/graph` 
  - 특정 프로젝트의 전체 또는 필터링된 의존성 그래프 데이터를 반환하는 엔드포인트 생성.
- **GET** `/api/ast-relational/nodes/:nodeId/details` (선택적)
  - 특정 노드 클릭 시 사이드 패널에 표시할 상세 메트릭 정보 제공 엔드포인트 생성.

### Phase 3: 프론트엔드 API 계층 연동
- `src/services/astService.ts` 생성하여 백엔드 조회 엔드포인트 호출 로직 구현.
- API 응답을 프론트엔드 상태(State)로 관리하기 위한 커스텀 훅(`useAstGraphData.ts`) 또는 Zustand 스토어 업데이트.

## 4. Acceptance Criteria (검증 기준)
- [ ] Postman 또는 Swagger를 통해 `/graph` 엔드포인트 호출 시 정상적인 JSON (Nodes/Edges 구조) 반환 확인.
- [ ] 노드 간의 `source`와 `target` ID가 실제 DB 내 `id`와 정확히 일치하여 끊어진 엣지가 발생하지 않음.
- [ ] 프론트엔드 `astService.ts`에서 API 호출 시 타입 에러 없이 성공적으로 데이터를 수신함.

## 5. Dependencies (의존성)
- 기존 구축된 `ast-relational` DB 스키마 및 Entity 모델에 의존함.
- 향후 시각화 컴포넌트(React Flow) 연동을 위한 선행 조건임.
