# MCP Registry & Integration Guide

가시화 팀의 하네스 시스템에서 사용하는 MCP(Model Context Protocol) 서버들의 설정 및 사용법을 정의합니다.

## 1. Notion MCP (Knowledge Source)
- **목적**: 기획서 및 요구사항 문서를 에이전트가 직접 참조.
- **서버**: `notion-mcp-server`
- **주요 기능**:
    - `get_page`: 특정 페이지 내용 읽기.
    - `search_pages`: 키워드로 기획 문서 검색.
- **설정**:
    ```json
    "notion-sync": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": { "NOTION_ACCESS_TOKEN": "your_token_here" }
    }
    ```

## 2. Figma MCP (Design Source)
- **목적**: 피그마의 디자인 토큰, 컴포넌트 구조, 에셋 데이터 추출.
- **서버**: `@modelcontextprotocol/server-figma`
- **주요 기능**:
    - `get_file`: 피그마 파일의 JSON 트리 구조 획득.
    - `get_image_url`: 특정 노드의 이미지 에셋 경로 획득.
- **설정**:
    ```json
    "figma-design": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"],
      "env": { "FIGMA_ACCESS_TOKEN": "your_token_here" }
    }
    ```

## 3. Stitch MCP (Platform Integration)
- **목적**: Stitch 프로젝트 관리 및 UI 생성/수정 자동화.
- **서버**: `stitch-mcp` (Built-in)
- **주요 기능**:
    - `create_project`: 새 스티치 프로젝트 생성.
    - `generate_screen_from_text`: 텍스트 프롬프트로 UI 화면 생성.
    - `edit_screens`: 기존 화면 수정.

## 4. Visualization Tech MCP (Custom)
- **목적**: AST 파싱 및 메트릭 분석 전용 도구.
- **구현 예정 기능**:
    - `parse_ast`: 소스 코드의 추상 구문 트리 반환.
    - `calculate_metrics`: 결합도(Coupling), 응집도(Cohesion) 점수 계산.
- **사용법**: `Navigator.md`에서 가이드라인 확인 후 도구 호출.

---

## 통합 워크플로우 예시
1. **User**: "Figma의 'Dashboard' 디자인을 참고해서 React 컴포넌트 만들어줘."
2. **Agent**:
    - `figma-mcp` 호출 -> 디자인 토큰 및 레이아웃 데이터 획득.
    - `notion-mcp` 호출 -> 대시보드 기획서 내용 확인.
    - `stitch-mcp` 호출 -> 획득한 데이터를 바탕으로 Stitch UI 화면 생성 및 코드 반영.
