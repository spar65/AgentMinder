#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🐳 Checking Docker status..."

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker daemon is not running!${NC}"
  echo -e "${YELLOW}Please start Docker Desktop and try again.${NC}"
  echo "If Docker Desktop is not installed, run: brew install --cask docker"
  exit 1
fi

echo -e "${GREEN}✅ Docker daemon is running${NC}"

# Check if MongoDB containers are running
if docker ps | grep -q "agent-minder-mongodb"; then
  echo -e "${GREEN}✅ MongoDB container is already running${NC}"
else
  echo -e "${YELLOW}⚠️ MongoDB container is not running${NC}"
  echo "Starting MongoDB containers..."
  docker-compose up -d
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ MongoDB containers started successfully${NC}"
  else
    echo -e "${RED}❌ Failed to start MongoDB containers${NC}"
    exit 1
  fi
fi

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
ATTEMPT=0
MAX_ATTEMPTS=30

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ((ATTEMPT++))
  
  # Try to ping MongoDB
  if docker exec agent-minder-mongodb-test mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB is ready after $ATTEMPT attempts${NC}"
    exit 0
  fi
  
  echo -n "."
  sleep 1
done

echo -e "\n${RED}❌ Timed out waiting for MongoDB to be ready${NC}"
exit 1 