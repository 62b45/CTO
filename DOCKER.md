# Docker Deployment Guide

This document provides comprehensive instructions for deploying and running the game application using Docker.

## Quick Start

### Prerequisites

- **Docker**: v20.10 or higher
- **Docker Compose**: v1.29 or higher

### One-Command Startup

```bash
# Start the entire application stack
docker compose up
```

This command will:
1. Build all necessary Docker images
2. Create and configure containers
3. Set up networking between services
4. Initialize the SQLite database
5. Seed initial data
6. Start both frontend and backend services

The application will be accessible at:
- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:3001 (port 3001)

## Architecture Overview

The Docker deployment uses a **multi-stage build** process that optimizes image sizes and separates concerns:

### Build Stages

1. **Backend Builder**
   - Compiles TypeScript source code
   - Generates Prisma client
   - Prepares build artifacts

2. **Frontend Builder**
   - Installs dependencies with Vite
   - Builds optimized React bundle
   - Accepts API URL as build argument

3. **Backend Runtime**
   - Node.js 18 Alpine image
   - Runs database migrations and seeding
   - Serves API on port 3001
   - Persists data to Docker volume

4. **Frontend Runtime**
   - Nginx Alpine image
   - Serves static React assets
   - Proxies API requests to backend
   - Handles SPA routing

### Data Persistence

All application data is stored in a named Docker volume (`game-data`), ensuring data persists across container restarts:

```bash
# Inspect the volume
docker volume inspect game-data

# Data stored in volume:
# - dev.db (SQLite database)
# - cooldowns.json
# - progression.json
# - professions.json
# - inventory.json
# - dungeons.json
# - arena.json
```

## Common Commands

### Starting Services

```bash
# Start in foreground (see logs)
docker compose up

# Start in background
docker compose up -d

# Start and rebuild images
docker compose up --build

# Start specific service
docker compose up backend
docker compose up frontend
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# Last N lines
docker compose logs -f --tail=50 backend
```

### Stopping Services

```bash
# Stop services (keep data/volumes)
docker compose stop

# Stop and remove containers (keep data/volumes)
docker compose down

# Stop, remove containers AND volumes (warning: deletes data)
docker compose down -v
```

### Restarting Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend
```

### Status

```bash
# View container status
docker compose ps

# Show running containers
docker ps

# Show all containers (including stopped)
docker ps -a

# View volume information
docker volume ls

# Inspect specific volume
docker volume inspect game-data
```

## Configuration

### Environment Variables

Environment variables are defined in `docker-compose.yml`:

**Backend Service**:
- `NODE_ENV=production` - Production mode
- `PORT=3001` - API port
- `DATABASE_URL=file:/app/data/dev.db` - SQLite database path
- `LOG_LEVEL=info` - Logging level
- JSON data file paths for legacy storage

**Frontend Service**:
- `VITE_API_URL` - Configured during build to `http://localhost:3001`

### Customizing Environment

To override environment variables, edit `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      LOG_LEVEL: debug  # Enable debug logging
      PORT: 3001
      # Add custom variables here
```

### Database Configuration

The SQLite database is automatically initialized on first run:

1. Database migrations run (`prisma db push`)
2. Seed script populates initial data
3. Database file persists in volume

To reinitialize the database:

```bash
# Remove the volume and restart
docker compose down -v
docker compose up

# Or just delete the database file and restart
docker volume rm game-data
docker compose up
```

## Health Checks

Both services include health checks:

```bash
# Backend health
curl http://localhost:3001/health

# Frontend health
curl http://localhost/health
```

Services automatically restart if health checks fail.

## Networking

Services communicate through a Docker bridge network:

- **Frontend** → **Backend**: Via nginx proxy at `http://backend:3001`
- **Host** → **Frontend**: Port 80
- **Host** → **Backend**: Port 3001

## API Access

### From Host Machine

```bash
# Direct backend API
curl http://localhost:3001/api/actions

# Via frontend proxy
curl http://localhost/api/actions

# Health check
curl http://localhost:3001/health
```

### Between Services (Docker Network)

```bash
# From frontend nginx container
# Reverse proxy configured to: http://backend:3001/api/*
```

## Building Images Manually

```bash
# Build all images
docker compose build

# Build specific service
docker compose build backend
docker compose build frontend

# Build with no cache
docker compose build --no-cache

# View built images
docker images | grep game
```

## Development Workflow

### Local Development (without Docker)

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Docker Development

```bash
# Build and start
docker compose up --build

# Make code changes (requires rebuild)
docker compose down
docker compose up --build

# Or use volume mounts for hot reload (advanced)
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Verify images exist
docker images | grep game

# Rebuild images
docker compose build --no-cache
docker compose up
```

### Database Issues

```bash
# Check if database file exists
docker volume inspect game-data

# Reset database
docker compose down -v
docker compose up

# View database operations
docker compose logs backend | grep -i database
```

### Port Already in Use

```bash
# Change ports in docker-compose.yml
# Or kill existing containers
docker compose down

# Find what's using ports
lsof -i :80
lsof -i :3001

# Kill process (if needed)
kill -9 <PID>
```

### Frontend Can't Connect to Backend

```bash
# Check backend health
curl http://localhost:3001/health

# Check frontend logs
docker compose logs frontend | grep -i api

# Verify network connection
docker compose exec frontend wget -O - http://backend:3001/health
```

### Permission Errors

```bash
# Run with elevated privileges if needed
sudo docker compose up

# Or configure Docker for non-root access (recommended)
sudo usermod -aG docker $USER
newgrp docker
```

## Performance Optimization

### Image Sizes

- **Backend**: ~200-300 MB (Node.js + dependencies)
- **Frontend**: ~50-100 MB (Nginx + static assets)
- **Data Volume**: Depends on gameplay data

### Build Time

- First build: 3-5 minutes
- Rebuild (with cache): 30-60 seconds
- Rebuild (no cache): 3-5 minutes

### Runtime Performance

- Backend startup: 2-3 seconds
- Database init: 2-5 seconds
- Frontend health: <1 second
- Total startup: 5-10 seconds

## Production Considerations

### Security

- Use environment-specific .env files
- Store sensitive keys in Docker secrets (Swarm mode)
- Use least-privilege service accounts
- Enable API authentication/authorization
- Use HTTPS in production (add reverse proxy)

### Scaling

For production deployments:

```yaml
# Use container orchestration (Docker Compose for small scale)
version: '3.8'
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Monitoring

```bash
# Monitor resource usage
docker stats

# View container processes
docker top game-backend

# View container events
docker events --filter "container=game-backend"
```

## Cleanup

### Remove All Containers and Volumes

```bash
# WARNING: This deletes all data
docker compose down -v

# Remove images too
docker compose down -v --rmi all

# Clean up unused volumes
docker volume prune

# Clean up all unused resources
docker system prune -a
```

## Advanced Usage

### Accessing Container Shell

```bash
# Backend shell
docker compose exec backend sh

# Frontend shell
docker compose exec frontend sh

# Run commands
docker compose exec backend node -v
docker compose exec frontend nginx -t
```

### Inspecting Container Filesystem

```bash
# List backend files
docker compose exec backend ls -la /app

# List data volume
docker compose exec backend ls -la /app/data

# Check database
docker compose exec backend ls -la /app/data/dev.db
```

### Custom Build Arguments

Edit `docker-compose.yml` to pass build arguments:

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      target: frontend-runtime
      args:
        VITE_API_URL: https://api.example.com
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Nginx Docker Documentation](https://hub.docker.com/_/nginx)

## Support

For issues or questions:

1. Check the logs: `docker compose logs`
2. Verify prerequisites: Docker version, disk space
3. Review configuration: Check `docker-compose.yml` and `Dockerfile`
4. Consult Docker documentation for specific errors
5. Test locally first: `pnpm dev` before Docker deployment
