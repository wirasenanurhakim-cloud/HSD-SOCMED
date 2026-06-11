#!/bin/sh
# Initialize PocketBase with collections and default data

echo "Waiting for PocketBase to start..."
sleep 5

PB_URL="${PB_URL:-https://adaptable-laughter-production-fe96.up.railway.app}"
ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@admin.com}"
ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-admin1234}"

echo "Setting up PocketBase at $PB_URL"

# Authenticate and get token
echo "Authenticating..."
TOKEN=$(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to authenticate"
  exit 1
fi

echo "Authenticated successfully"

# Function to create collection
create_collection() {
  local name=$1
  local type=$2
  local fields=$3
  
  # Check if exists
  EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: $TOKEN" \
    "$PB_URL/api/collections/$name")
  
  if [ "$EXISTS" = "200" ]; then
    echo "Collection $name already exists"
    return
  fi
  
  echo "Creating collection: $name"
  curl -s -X POST "$PB_URL/api/collections" \
    -H "Authorization: $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"type\":\"$type\",\"fields\":$fields,\"listRule\":\"\",\"viewRule\":\"\",\"createRule\":\"\",\"updateRule\":\"\",\"deleteRule\":\"\"}"
  echo ""
}

# Create collections
create_collection "brands" "base" '[{"type":"text","name":"name","required":true,"unique":true},{"type":"text","name":"color"}]'
create_collection "settings" "base" '[{"type":"text","name":"key","required":true,"unique":true},{"type":"text","name":"value"}]'
create_collection "content_assets" "base" '[{"type":"text","name":"title","required":true},{"type":"text","name":"goal","required":true},{"type":"text","name":"genre","required":true},{"type":"number","name":"duration"},{"type":"text","name":"status","required":true},{"type":"text","name":"brand"}]'
create_collection "publish_instances" "base" '[{"type":"text","name":"platform","required":true},{"type":"text","name":"origin"},{"type":"date","name":"publish_date","required":true},{"type":"url","name":"post_url"},{"type":"url","name":"thumbnail_url"},{"type":"date","name":"last_thumbnail_update"},{"type":"text","name":"shortcode"},{"type":"text","name":"asset"}]'
create_collection "metric_history" "base" '[{"type":"text","name":"publish","required":true},{"type":"date","name":"capture_date","required":true},{"type":"number","name":"views"},{"type":"number","name":"likes"},{"type":"number","name":"comments"},{"type":"number","name":"shares"},{"type":"number","name":"reach"},{"type":"number","name":"saves"},{"type":"number","name":"followers"},{"type":"number","name":"watch_time"},{"type":"number","name":"retention"}]'
create_collection "content_plan" "base" '[{"type":"text","name":"title","required":true},{"type":"text","name":"type","required":true},{"type":"date","name":"planned_date","required":true},{"type":"text","name":"status"},{"type":"text","name":"notes"},{"type":"text","name":"brand"}]'
create_collection "monthly_reports" "base" '[{"type":"text","name":"month","required":true,"unique":true},{"type":"text","name":"summary"}]'
create_collection "metric_snapshots" "base" '[{"type":"text","name":"publish","required":true},{"type":"text","name":"capture_date","required":true},{"type":"date","name":"snapshot_date"},{"type":"number","name":"views"},{"type":"number","name":"likes"},{"type":"number","name":"comments"},{"type":"number","name":"shares"},{"type":"number","name":"reach"},{"type":"number","name":"saves"},{"type":"number","name":"followers"},{"type":"number","name":"watch_time"},{"type":"number","name":"retention"}]'
create_collection "account_snapshots" "base" '[{"type":"text","name":"month","required":true},{"type":"text","name":"brand"},{"type":"number","name":"impressions"},{"type":"number","name":"followers"},{"type":"number","name":"profile_views"},{"type":"number","name":"post_views"},{"type":"number","name":"likes"},{"type":"number","name":"comments"},{"type":"number","name":"shares"}]'

# Create default brand "IG"
echo "Creating default brand 'IG'..."
curl -s -X POST "$PB_URL/api/collections/brands/records" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"IG","color":"#E4405F"}'
echo ""

echo "Setup complete!"