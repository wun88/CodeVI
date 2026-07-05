# 1. Build Stage
FROM node:20 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Production Stage
FROM nginx:alpine
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
# /api → codevi-backend 프록시 + SPA 폴백
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
