#!/bin/sh

chmod +x pocketbase

# Create data directory if not exists
mkdir -p /pb/pb_data

# Upsert superuser
./pocketbase superuser upsert \
  "${PB_SUPERUSER_EMAIL}" \
  "${PB_SUPERUSER_PASSWORD}"

# Start PocketBase with persistent data directory
exec ./pocketbase serve --http=0.0.0.0:$PORT --dir=/pb/pb_data