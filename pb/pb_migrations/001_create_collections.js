migrate((app) => {
  const rule = '@request.auth.id != ""'

  function createCol(name, type, fields) {
    let col
    try {
      col = app.findCollectionByNameOrId(name)
      if (col) return col
    } catch {}
    col = new Collection({
      name,
      type,
      listRule: rule,
      viewRule: rule,
      createRule: rule,
      updateRule: rule,
      deleteRule: rule,
      fields,
    })
    app.save(col)
    return col
  }

  createCol('brands', 'base', [
    { type: 'text', name: 'name', required: true, unique: true },
    { type: 'text', name: 'color' },
  ])

  createCol('settings', 'base', [
    { type: 'text', name: 'key', required: true, unique: true },
    { type: 'text', name: 'value' },
  ])

  createCol('monthly_reports', 'base', [
    { type: 'text', name: 'month', required: true, unique: true },
    { type: 'text', name: 'summary' },
  ])

  createCol('content_assets', 'base', [
    { type: 'text', name: 'title', required: true },
    { type: 'text', name: 'goal', required: true },
    { type: 'text', name: 'genre', required: true },
    { type: 'number', name: 'duration' },
    { type: 'text', name: 'status', required: true },
    { type: 'text', name: 'brand', noRelation: true },
  ])

  createCol('publish_instances', 'base', [
    { type: 'text', name: 'platform', required: true },
    { type: 'text', name: 'origin' },
    { type: 'date', name: 'publish_date', required: true },
    { type: 'url', name: 'post_url' },
    { type: 'url', name: 'thumbnail_url' },
    { type: 'date', name: 'last_thumbnail_update' },
    { type: 'text', name: 'shortcode' },
    { type: 'text', name: 'asset', noRelation: true },
  ])

  createCol('content_plan', 'base', [
    { type: 'text', name: 'title', required: true },
    { type: 'text', name: 'type', required: true },
    { type: 'date', name: 'planned_date', required: true },
    { type: 'text', name: 'status' },
    { type: 'text', name: 'notes' },
    { type: 'text', name: 'brand', noRelation: true },
  ])

  createCol('metric_history', 'base', [
    { type: 'text', name: 'publish', required: true },
    { type: 'date', name: 'capture_date', required: true },
    { type: 'number', name: 'views' },
    { type: 'number', name: 'likes' },
    { type: 'number', name: 'comments' },
    { type: 'number', name: 'shares' },
    { type: 'number', name: 'reach' },
    { type: 'number', name: 'saves' },
    { type: 'number', name: 'followers' },
    { type: 'number', name: 'watch_time' },
    { type: 'number', name: 'retention' },
  ])

  createCol('metric_snapshots', 'base', [
    { type: 'text', name: 'publish', required: true },
    { type: 'text', name: 'capture_date', required: true },
    { type: 'date', name: 'snapshot_date' },
    { type: 'number', name: 'views' },
    { type: 'number', name: 'likes' },
    { type: 'number', name: 'comments' },
    { type: 'number', name: 'shares' },
    { type: 'number', name: 'reach' },
    { type: 'number', name: 'saves' },
    { type: 'number', name: 'followers' },
    { type: 'number', name: 'watch_time' },
    { type: 'number', name: 'retention' },
  ])

  createCol('account_snapshots', 'base', [
    { type: 'text', name: 'month', required: true },
    { type: 'text', name: 'brand', noRelation: true },
    { type: 'number', name: 'impressions' },
    { type: 'number', name: 'followers' },
    { type: 'number', name: 'profile_views' },
    { type: 'number', name: 'post_views' },
    { type: 'number', name: 'likes' },
    { type: 'number', name: 'comments' },
    { type: 'number', name: 'shares' },
  ])

  createCol('account_snapshot_history', 'base', [
    { type: 'text', name: 'month', required: true },
    { type: 'text', name: 'brand', noRelation: true },
    { type: 'number', name: 'impressions' },
    { type: 'number', name: 'followers' },
    { type: 'number', name: 'profile_views' },
    { type: 'number', name: 'post_views' },
    { type: 'number', name: 'likes' },
    { type: 'number', name: 'comments' },
    { type: 'number', name: 'shares' },
  ])

  createCol('csv_import_mapping', 'base', [
    { type: 'text', name: 'external_id' },
    { type: 'text', name: 'shortcode' },
    { type: 'url', name: 'post_url' },
    { type: 'text', name: 'platform' },
    { type: 'text', name: 'publish', noRelation: true },
    { type: 'text', name: 'asset', noRelation: true },
  ])

  // Superuser should be created via PocketBase CLI: ./pocketbase superuser create
}, (app) => {
  const names = ['csv_import_mapping','metric_snapshots','metric_history','publish_instances','content_assets','account_snapshot_history','account_snapshots','content_plan','monthly_reports','settings','brands']
  for (const name of names) {
    try {
      const col = app.findCollectionByNameOrId(name)
      if (col) app.delete(col)
    } catch {}
  }
})
