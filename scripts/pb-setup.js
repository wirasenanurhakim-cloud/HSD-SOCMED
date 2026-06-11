/**
 * PocketBase Setup Script
 * Creates all collections needed for the app
 * 
 * Run: node scripts/pb-setup.js
 */

import PocketBase from 'pocketbase'

const PB_URL = process.env.VITE_PB_URL || 'https://adaptable-laughter-production-fe96.up.railway.app'
const ADMIN_EMAIL = 'admin@admin.com'
const ADMIN_PASSWORD = 'admin1234'

async function main() {
  console.log('Connecting to PocketBase:', PB_URL)
  
  const pb = new PocketBase(PB_URL)
  
  // Authenticate as admin
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
    console.log('✓ Authenticated as admin')
  } catch (err) {
    console.error('✗ Authentication failed:', err.message)
    console.log('Make sure to set admin credentials in Railway environment variables:')
    console.log('  PB_ADMIN_EMAIL=admin@admin.com')
    console.log('  PB_ADMIN_PASSWORD=admin1234')
    process.exit(1)
  }
  
  // Collection schemas
  const collections = [
    {
      name: 'brands',
      type: 'base',
      fields: [
        { type: 'text', name: 'name', required: true, unique: true },
        { type: 'text', name: 'color' },
      ]
    },
    {
      name: 'settings',
      type: 'base',
      fields: [
        { type: 'text', name: 'key', required: true, unique: true },
        { type: 'text', name: 'value' },
      ]
    },
    {
      name: 'content_assets',
      type: 'base',
      fields: [
        { type: 'text', name: 'title', required: true },
        { type: 'text', name: 'goal', required: true },
        { type: 'text', name: 'genre', required: true },
        { type: 'number', name: 'duration' },
        { type: 'text', name: 'status', required: true },
        { type: 'text', name: 'brand' },
      ]
    },
    {
      name: 'publish_instances',
      type: 'base',
      fields: [
        { type: 'text', name: 'platform', required: true },
        { type: 'text', name: 'origin' },
        { type: 'date', name: 'publish_date', required: true },
        { type: 'url', name: 'post_url' },
        { type: 'url', name: 'thumbnail_url' },
        { type: 'date', name: 'last_thumbnail_update' },
        { type: 'text', name: 'shortcode' },
        { type: 'text', name: 'asset' },
      ]
    },
    {
      name: 'metric_history',
      type: 'base',
      fields: [
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
      ]
    },
    {
      name: 'content_plan',
      type: 'base',
      fields: [
        { type: 'text', name: 'title', required: true },
        { type: 'text', name: 'type', required: true },
        { type: 'date', name: 'planned_date', required: true },
        { type: 'text', name: 'status' },
        { type: 'text', name: 'notes' },
        { type: 'text', name: 'brand' },
      ]
    },
    {
      name: 'monthly_reports',
      type: 'base',
      fields: [
        { type: 'text', name: 'month', required: true, unique: true },
        { type: 'text', name: 'summary' },
      ]
    },
    {
      name: 'metric_snapshots',
      type: 'base',
      fields: [
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
      ]
    },
    {
      name: 'account_snapshots',
      type: 'base',
      fields: [
        { type: 'text', name: 'month', required: true },
        { type: 'text', name: 'brand' },
        { type: 'number', name: 'impressions' },
        { type: 'number', name: 'followers' },
        { type: 'number', name: 'profile_views' },
        { type: 'number', name: 'post_views' },
        { type: 'number', name: 'likes' },
        { type: 'number', name: 'comments' },
        { type: 'number', name: 'shares' },
      ]
    },
    {
      name: 'csv_import_mapping',
      type: 'base',
      fields: [
        { type: 'text', name: 'external_id' },
        { type: 'text', name: 'shortcode' },
        { type: 'url', name: 'post_url' },
        { type: 'text', name: 'platform' },
        { type: 'text', name: 'publish' },
        { type: 'text', name: 'asset' },
      ]
    },
  ]
  
  console.log('\nCreating collections...\n')
  
  for (const col of collections) {
    try {
      // Check if collection exists
      let existing = null
      try {
        existing = await pb.collections.getOne(col.name)
      } catch {
        existing = null
      }
      
      if (existing) {
        // Update existing collection with public access
        await pb.collections.update(existing.id, {
          listRule: '',
          viewRule: '',
          createRule: '',
          updateRule: '',
          deleteRule: '',
        })
        console.log(`✓ ${col.name} (updated - public access)`)
      } else {
        // Create collection with PUBLIC access (no auth required)
        await pb.collections.create({
          name: col.name,
          type: col.type,
          fields: col.fields.map(f => ({
            type: f.type,
            name: f.name,
            required: f.required || false,
            unique: f.unique || false,
          })),
          // Public access - no auth required
          listRule: '',
          viewRule: '',
          createRule: '',
          updateRule: '',
          deleteRule: '',
        })
        console.log(`✓ ${col.name} (created)`)
      }
    } catch (err) {
      console.error(`✗ ${col.name}:`, err.message)
    }
  }
  
  // Create default brand "IG"
  try {
    const brands = await pb.collections.getFullList('brands')
    const igBrand = brands.find(b => b.name.toUpperCase() === 'IG')
    if (!igBrand) {
      await pb.collections.create('brands', {
        name: 'IG',
        color: '#E4405F',
      })
      console.log('✓ Brand "IG" (created)')
    } else {
      console.log('✓ Brand "IG" (already exists)')
    }
  } catch (err) {
    console.error('✗ Brand "IG":', err.message)
  }
  
  console.log('\n✅ Setup complete!')
  console.log('\nNext steps:')
  console.log('1. Go to PocketBase Admin: ' + PB_URL + '/_/')
  console.log('2. Disable auth rules for testing (set listRule, viewRule to null)')
  console.log('3. Test the app!')
}

main().catch(console.error)