# Stage 1: Build Angular
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# angular.json의 'angular-tailwind' 프로젝트를 빌드
RUN npm run build -- --configuration=production

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# [수정 지점] 실제 빌드 경로인 /app/dist/angular-tailwind/browser를 복사
COPY --from=builder /app/dist/code-vi-front/browser /usr/share/nginx/html

# nginx.conf 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]