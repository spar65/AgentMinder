#!/bin/bash

# MongoDB Restore Script
# Restores a backup of the Agent Minder MongoDB database

set -e  # Exit immediately if a command exits with a non-zero status

# Configuration variables (can be overridden with environment variables)
MONGODB_HOST=${MONGODB_HOST:-"localhost"}
MONGODB_PORT=${MONGODB_PORT:-"27017"}
MONGODB_USER=${MONGODB_USER:-"agentminder"}
MONGODB_PASSWORD=${MONGODB_PASSWORD:-"your_password_here"}
MONGODB_DB_NAME=${MONGODB_DB_NAME:-"agent-minder-prod"}
BACKUP_DIR=${BACKUP_DIR:-"./backups"}

# Check if a backup file was specified
if [ $# -eq 0 ]; then
  echo "Error: No backup file specified."
  echo "Usage: $0 <backup_filename>"
  echo "Available backups:"
  find "${BACKUP_DIR}" -name "${MONGODB_DB_NAME}_*.gz" -type f | sort
  exit 1
fi

BACKUP_FILE="$1"

# If just the filename was provided without path, assume it's in the backup directory
if [[ ! "$BACKUP_FILE" = /* ]] && [[ ! "$BACKUP_FILE" = ./* ]]; then
  BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
fi

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' not found."
  exit 1
fi

# Confirm before proceeding
echo "WARNING: This will overwrite data in the '${MONGODB_DB_NAME}' database."
echo "Restore from: ${BACKUP_FILE}"
read -p "Are you sure you want to continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

# Perform the restore
echo "Restoring MongoDB database '${MONGODB_DB_NAME}' from ${BACKUP_FILE}..."
mongorestore --host=${MONGODB_HOST} --port=${MONGODB_PORT} \
  --username=${MONGODB_USER} --password=${MONGODB_PASSWORD} \
  --authenticationDatabase=${MONGODB_DB_NAME} \
  --nsInclude="${MONGODB_DB_NAME}.*" \
  --drop --gzip --archive="${BACKUP_FILE}"

# Check if restore was successful
if [ $? -eq 0 ]; then
  echo "Restore completed successfully."
else
  echo "Restore failed."
  exit 1
fi 