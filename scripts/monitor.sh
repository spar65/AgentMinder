#!/bin/bash

# Agent Minder Monitoring Script
# Designed to be run as a cron job to check application health and send notifications
# Example cron: */15 * * * * /path/to/scripts/monitor.sh >> /var/log/agent-minder-monitor.log 2>&1

set -e

# Configuration variables (can be overridden with environment variables)
APP_HOST=${APP_HOST:-"localhost"}
APP_PORT=${APP_PORT:-"3000"}
MONGODB_HOST=${MONGODB_HOST:-"localhost"}
MONGODB_PORT=${MONGODB_PORT:-"27017"}
TIMEOUT=${TIMEOUT:-"5"}
NOTIFICATION_EMAIL=${NOTIFICATION_EMAIL:-"admin@example.com"}
DISK_THRESHOLD=${DISK_THRESHOLD:-"90"}
MEMORY_THRESHOLD=${MEMORY_THRESHOLD:-"90"}
LOG_FILE=${LOG_FILE:-"/var/log/agent-minder-monitor.log"}
APP_NAME="Agent Minder"

# Create timestamp for logging
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Function to send notification
send_notification() {
  local subject="$1"
  local message="$2"
  
  if command -v mail &> /dev/null; then
    echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL"
    echo "[$TIMESTAMP] Notification sent to $NOTIFICATION_EMAIL: $subject"
  else
    echo "[$TIMESTAMP] WARNING: mail command not available, notification not sent: $subject"
    echo "[$TIMESTAMP] Notification message: $message"
  fi
  
  # You can add other notification methods here (Slack, SMS, etc.)
}

# Function to log message
log_message() {
  local level="$1"
  local message="$2"
  echo "[$TIMESTAMP] [$level] $message"
}

# Start monitoring
log_message "INFO" "Starting $APP_NAME monitoring check"

# Check application API
log_message "INFO" "Checking API endpoint"
if ! API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m ${TIMEOUT} http://${APP_HOST}:${APP_PORT}/api); then
  API_STATUS="TIMEOUT"
fi

if [ "$API_STATUS" = "200" ]; then
  log_message "INFO" "API is responding (HTTP $API_STATUS)"
else
  log_message "ERROR" "API is not responding properly (HTTP $API_STATUS)"
  send_notification "$APP_NAME - API ALERT" "The $APP_NAME API is not responding properly. Status: $API_STATUS\nTimestamp: $TIMESTAMP\nServer: $(hostname)"
fi

# Check MongoDB connection (requires MongoDB tools and proper auth)
log_message "INFO" "Checking MongoDB connection"
if command -v mongosh &> /dev/null; then
  if ! mongosh --host ${MONGODB_HOST} --port ${MONGODB_PORT} --eval "db.adminCommand('ping')" &> /dev/null; then
    log_message "ERROR" "MongoDB is not responding properly"
    send_notification "$APP_NAME - DATABASE ALERT" "The $APP_NAME database is not responding properly.\nTimestamp: $TIMESTAMP\nServer: $(hostname)"
  else
    log_message "INFO" "MongoDB is running and responding to ping"
  fi
else
  log_message "WARN" "MongoDB tools not available, skipping database check"
fi

# Check Docker containers if running in Docker
log_message "INFO" "Checking Docker containers"
if command -v docker &> /dev/null; then
  if docker ps | grep -q "agent-minder-app"; then
    CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' agent-minder-app-prod 2>/dev/null || echo "not found")
    log_message "INFO" "Application container is $CONTAINER_STATUS"
    
    # Check container health if available
    if ! docker inspect --format='{{.State.Health.Status}}' agent-minder-app-prod 2>/dev/null | grep -q "healthy"; then
      log_message "ERROR" "Application container is not reporting healthy"
      send_notification "$APP_NAME - CONTAINER ALERT" "The $APP_NAME application container is not healthy.\nStatus: $CONTAINER_STATUS\nTimestamp: $TIMESTAMP\nServer: $(hostname)"
    fi
  else
    log_message "WARN" "Application does not appear to be running in Docker"
  fi
  
  if docker ps | grep -q "agent-minder-mongodb"; then
    MONGO_STATUS=$(docker inspect --format='{{.State.Status}}' agent-minder-mongodb-prod 2>/dev/null || echo "not found")
    log_message "INFO" "MongoDB container is $MONGO_STATUS"
    
    if [ "$MONGO_STATUS" != "running" ]; then
      log_message "ERROR" "MongoDB container is not running"
      send_notification "$APP_NAME - DATABASE CONTAINER ALERT" "The $APP_NAME MongoDB container is not running.\nStatus: $MONGO_STATUS\nTimestamp: $TIMESTAMP\nServer: $(hostname)"
    fi
  else
    log_message "WARN" "MongoDB does not appear to be running in Docker"
  fi
else
  log_message "WARN" "Docker not available, skipping container check"
fi

# Resource usage check
log_message "INFO" "Checking system resources"

# Disk space
DISK_USAGE=$(df -h | grep -E '/$' | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
  log_message "ERROR" "Disk usage is high: ${DISK_USAGE}%"
  send_notification "$APP_NAME - DISK SPACE ALERT" "The server is running low on disk space.\nUsage: ${DISK_USAGE}%\nThreshold: ${DISK_THRESHOLD}%\nTimestamp: $TIMESTAMP\nServer: $(hostname)"
else
  log_message "INFO" "Disk usage is OK: ${DISK_USAGE}%"
fi

# Memory usage if on Linux
if [ -f /proc/meminfo ]; then
  MEM_TOTAL=$(grep 'MemTotal' /proc/meminfo | awk '{print $2}')
  MEM_AVAIL=$(grep 'MemAvailable' /proc/meminfo | awk '{print $2}')
  MEM_USAGE=$(( 100 - (MEM_AVAIL * 100 / MEM_TOTAL) ))
  
  if [ "$MEM_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
    log_message "ERROR" "Memory usage is high: ${MEM_USAGE}%"
    send_notification "$APP_NAME - MEMORY ALERT" "The server is running low on memory.\nUsage: ${MEM_USAGE}%\nThreshold: ${MEMORY_THRESHOLD}%\nTimestamp: $TIMESTAMP\nServer: $(hostname)"
  else
    log_message "INFO" "Memory usage is OK: ${MEM_USAGE}%"
  fi
fi

# Check log file size
if [ -f "$LOG_FILE" ]; then
  LOG_SIZE_MB=$(du -m "$LOG_FILE" | cut -f1)
  if [ "$LOG_SIZE_MB" -gt 100 ]; then
    log_message "WARN" "Log file is large: ${LOG_SIZE_MB}MB"
    # Optionally rotate logs if too large
    if [ "$LOG_SIZE_MB" -gt 1000 ]; then
      log_message "INFO" "Rotating log file"
      mv "$LOG_FILE" "${LOG_FILE}.$(date +%Y%m%d)"
      touch "$LOG_FILE"
      chmod 644 "$LOG_FILE"
    fi
  fi
fi

log_message "INFO" "Monitoring check completed" 