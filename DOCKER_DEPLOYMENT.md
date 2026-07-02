

## Deployment Steps

### 1. Prepare the Project

```bash
# Clone the repository
git clone https://github.com/your-repo/ynab-mcp-server.git
cd ynab-mcp-server

# Create directory structure
mkdir -p authelia/{config,db} nginx/{conf.d,snippets}
```

### 2. Enhanced Dockerfile

Create or update `Dockerfile`:

```dockerfile
# Production-optimized Dockerfile
FROM node:lts-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --production --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Set non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Environment variables (to be overridden)
ENV YNAB_API_TOKEN=""
ENV YNAB_BUDGET_ID=""
ENV PORT=3000
ENV TRANSPORT_MODE="http"
ENV HTTP_AUTH_TOKEN=""
ENV CORS_ORIGINS=""

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 3. Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # YNAB MCP Server
  ynab-mcp:
    build: .
    container_name: ynab-mcp-server
    restart: unless-stopped
    environment:
      - YNAB_API_TOKEN=${YNAB_API_TOKEN}
      - YNAB_BUDGET_ID=${YNAB_BUDGET_ID:-}
      - PORT=3000
      - TRANSPORT_MODE=http
      - HTTP_AUTH_TOKEN=${HTTP_AUTH_TOKEN}
      - CORS_ORIGINS=https://ynab-mcp.yourdomain.com
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: mcp-nginx
    restart: unless-stopped
    ports:
      - "127.0.0.1:80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/snippets:/etc/nginx/snippets
    depends_on:
      - ynab-mcp
      - authelia
    networks:
      - mcp-network

  # Authelia Authentication
  authelia:
    image: authelia/authelia:latest
    container_name: mcp-authelia
    restart: unless-stopped
    volumes:
      - ./authelia/configuration.yml:/config/configuration.yml
      - ./authelia/users_database.yml:/config/users_database.yml
      - ./authelia/db:/config/db
    environment:
      - TZ=UTC
    networks:
      - mcp-network

  # Redis for Authelia sessions
  redis:
    image: redis:alpine
    container_name: mcp-redis
    restart: unless-stopped
    volumes:
      - ./authelia/redis:/data
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```