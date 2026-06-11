export const GOAL = ['SELLING', 'EDUCATION', 'ENGAGEMENT', 'AWARENESS', 'TRUST']
export const GENRE = ['POV', 'PRODUCT_KNOWLEDGE', 'MARAH_MARAH', 'STORYTELLING', 'TIPS', 'TESTIMONI', 'TUTORIAL']
export const PLATFORM = ['TIKTOK', 'INSTAGRAM']
export const ORIGIN = ['ORIGINAL', 'MIRRORING', 'ADAPTED']
export const STATUS = ['DRAFT', 'PUBLISHED', 'ARCHIVED']

// Thumbnail Proxy API URL - Deploy ke Vercel, lalu update URL ini
// Format: https://your-app.vercel.app/api/thumbnail?url={postUrl}&platform={platform}
export const THUMBNAIL_PROXY_URL = process.env.VITE_THUMBNAIL_PROXY_URL || '/api/thumbnail'

export function calcScore(m, avgER) {
  if (!m.views) return { score: 0, tier: 'LOW' }
  const er = m.views > 0
    ? ((m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0)) / m.views * 100
    : 0
  const score = Math.round(er * 10) / 10
  let tier
  if (avgER != null && avgER > 0) {
    tier = er >= avgER * 1.2 ? 'HIGH' : er >= avgER * 0.8 ? 'MEDIUM' : 'LOW'
  } else {
    tier = score >= 3 ? 'HIGH' : score >= 1 ? 'MEDIUM' : 'LOW'
  }
  return { score, tier }
}
