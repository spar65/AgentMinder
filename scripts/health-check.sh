#!/bin/bash

# Agent Minder Health Check Script
# Verifies that the application and database are running properly

set -e

# Configuration variables (can be overridden with environment variables)
APP_HOST=${APP_HOST:-"localhost"}
APP_PORT=${APP_PORT:-"3000"}
MONGODB_HOST=${MONGODB_HOST:-"localhost"}
MONGODB_PORT=${MONGODB_PORT:-"27017"}
TIMEOUT=${TIMEOUT:-"5"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running Agent Minder health check...${NC}"
echo ""

# Check application API
echo -e "${YELLOW}Checking API endpoint...${NC}"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m ${TIMEOUT} http://${APP_HOST}:${APP_PORT}/api)

if [ "$API_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ API is responding (HTTP ${API_STATUS})${NC}"
else
  echo -e "${RED}❌ API is not responding properly (HTTP ${API_STATUS})${NC}"
  API_RUNNING=false
fi

# Check API docs
echo -e "${YELLOW}Checking API documentation...${NC}"
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m ${TIMEOUT} http://${APP_HOST}:${APP_PORT}/api/docs)

if [ "$DOCS_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ API documentation is available (HTTP ${DOCS_STATUS})${NC}"
else
  echo -e "${RED}❌ API documentation is not available (HTTP ${DOCS_STATUS})${NC}"
fi

# Check MongoDB connection (requires MongoDB tools and proper auth)
echo -e "${YELLOW}Checking MongoDB connection...${NC}"
if command -v mongosh &> /dev/null; then
  if mongosh --host ${MONGODB_HOST} --port ${MONGODB_PORT} --eval "db.adminCommand('ping')" &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB is running and responding to ping${NC}"
  else
    echo -e "${RED}❌ MongoDB is not responding properly${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ MongoDB tools not available, skipping database check${NC}"
fi

# Check Docker containers if running in Docker
echo -e "${YELLOW}Checking Docker containers...${NC}"
if command -v docker &> /dev/null; then
  if docker ps | grep -q "agent-minder-app"; then
    CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' agent-minder-app-prod 2>/dev/null || echo "not found")
    echo -e "${GREEN}✅ Application container is ${CONTAINER_STATUS}${NC}"
    
    # Check container health if available
    if docker inspect --format='{{.State.Health.Status}}' agent-minder-app-prod 2>/dev/null | grep -q "healthy"; then
      echo -e "${GREEN}✅ Application container is reporting healthy${NC}"
    else
      echo -e "${YELLOW}⚠️ Application container health status unavailable or unhealthy${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️ Application does not appear to be running in Docker${NC}"
  fi
  
  if docker ps | grep -q "agent-minder-mongodb"; then
    MONGO_STATUS=$(docker inspect --format='{{.State.Status}}' agent-minder-mongodb-prod 2>/dev/null || echo "not found")
    echo -e "${GREEN}✅ MongoDB container is ${MONGO_STATUS}${NC}"
  else
    echo -e "${YELLOW}⚠️ MongoDB does not appear to be running in Docker${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ Docker not available, skipping container check${NC}"
fi

# Resource usage check
echo -e "${YELLOW}Checking system resources...${NC}"

# Disk space
DISK_USAGE=$(df -h | grep -E '/$' | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo -e "${RED}❌ Disk usage is high: ${DISK_USAGE}%${NC}"
else
  echo -e "${GREEN}✅ Disk usage is OK: ${DISK_USAGE}%${NC}"
fi

# Memory usage if on Linux
if [ -f /proc/meminfo ]; then
  MEM_TOTAL=$(grep 'MemTotal' /proc/meminfo | awk '{print $2}')
  MEM_AVAIL=$(grep 'MemAvailable' /proc/meminfo | awk '{print $2}')
  MEM_USAGE=$(( 100 - (MEM_AVAIL * 100 / MEM_TOTAL) ))
  
  if [ "$MEM_USAGE" -gt 90 ]; then
    echo -e "${RED}❌ Memory usage is high: ${MEM_USAGE}%${NC}"
  else
    echo -e "${GREEN}✅ Memory usage is OK: ${MEM_USAGE}%${NC}"
  fi
elif command -v vm_stat &> /dev/null; then
  # For macOS
  echo -e "${YELLOW}⚠️ Detailed memory stats not available for macOS${NC}"
else
  echo -e "${YELLOW}⚠️ Unable to determine memory usage${NC}"
fi

echo ""
echo -e "${GREEN}Health check completed.${NC}"
echo "" 