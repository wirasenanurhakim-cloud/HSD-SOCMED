migrate((app) => {
  // Seed / update default admin superuser for local development
  // Email: admin@admin.com  Password: admin1234
  const email = 'admin@admin.com'
  const password = 'admin1234'

  let existingRecord = null
  try {
    existingRecord = app.findFirstRecordByData('_superusers', 'email', email)
  } catch (_) {}

  const collection = app.findCollectionByNameOrId('_superusers')

  let record
  if (existingRecord) {
    record = existingRecord
  } else {
    record = new Record(collection)
  }

  record.set('email', email)
  record.set('password', password)
  record.set('passwordConfirm', password)
  record.set('verified', true)
  app.save(record)
}, (app) => {
  // Rollback: remove the seeded admin
  try {
    const record = app.findFirstRecordByData('_superusers', 'email', 'admin@admin.com')
    if (record) app.delete(record)
  } catch {}
})
