# Stage 1: Build stage
FROM oven/bun:latest AS build

WORKDIR /app

# Sabhi config files copy karein
COPY package.json bun.lock* bunfig.toml* ./
RUN bun install

# Source code copy aur compile karein
COPY . .
RUN bun run build

# Stage 2: Nginx Web Server
FROM nginx:alpine

# Vinxi/TanStack Start ka static output copy karein
COPY --from=build /app/.output/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]