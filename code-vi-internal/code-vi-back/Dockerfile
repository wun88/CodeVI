# 1. Build Stage
FROM node:20 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Production Stage
FROM node:20-slim
WORKDIR /usr/src/app

# MariaDB/MySQL 클라이언트 및 Bash 설치 (디버깅 편의성)
RUN apt-get update && \
    apt-get install -y default-mysql-client && \
    rm -rf /var/lib/apt/lists/*

# 실행에 필요한 최소 파일만 복사
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# 엔트리 파일을 환경변수로 지정 (기본값: main → 포트 13000 통합 서버)
ENV ENTRY_FILE=main
ENV NODE_ENV=production

# 통합 서버 포트 (Relational AST)
EXPOSE 13000
# Legacy: 13001 (relational 전용), 13002 (json 전용) - 현재 비활성화

CMD node dist/${ENTRY_FILE}