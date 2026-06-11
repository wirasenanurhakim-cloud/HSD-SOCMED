#!/bin/sh

chmod +x pocketbase

./pocketbase superuser upsert \
"${PB_SUPERUSER_EMAIL}" \
"${PB_SUPERUSER_PASSWORD}"

exec ./pocketbase serve --http=0.0.0.0:$PORT