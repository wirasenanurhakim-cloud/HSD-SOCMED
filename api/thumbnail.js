export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const url = req.query?.url || req.url?.split('?')[1]?.split('&').find(p => p.startsWith('url='))?.split('=')[1]
    const platform = req.query?.platform || req.url?.split('&').find(p => p.startsWith('platform='))?.split('=')[1]

    // Decode URL if needed
    const postUrl = url ? decodeURIComponent(url) : null

    if (!postUrl) {
      return res.status(400).json({ error: 'url parameter required', thumbnail: null })
    }

    let thumbnail = null

    // INSTAGRAM - Fetch HTML and extract thumbnail
    if (platform === 'INSTAGRAM' || postUrl.includes('instagram.com')) {
      try {
        const response = await fetch(postUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          }
        })
        const html = await response.text()

        // Method 1: og:image meta tag
        const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
        if (ogMatch) {
          thumbnail = ogMatch[1].replace(/&amp;/g, '&')
        }

        // Method 2: background-image CSS (yang kamu kasih!)
        if (!thumbnail) {
          const bgMatch = html.match(/style=["'][^"']*background-image:\s*url\(["']([^"']+)["']/i)
          if (bgMatch) {
            thumbnail = bgMatch[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          }
        }

        // Method 3: data-src attribute
        if (!thumbnail) {
          const dataSrcMatch = html.match(/data-src=["']([^"']+)["']/i)
          if (dataSrcMatch) {
            thumbnail = dataSrcMatch[1].replace(/&amp;/g, '&')
          }
        }

        // Method 4: srcset
        if (!thumbnail) {
          const srcsetMatch = html.match(/srcset=["']([^"']+)["']/i)
          if (srcsetMatch) {
            const urls = srcsetMatch[1].split(',')
            if (urls.length > 0) {
              thumbnail = urls[urls.length - 1].trim().split(' ')[0].replace(/&amp;/g, '&')
            }
          }
        }

        // Method 5: Look for scontent or fbcdn patterns
        if (!thumbnail) {
          const cdnMatch = html.match(/(https:\/\/scontent[^\s"'>\)]+\.jpg)/i)
            || html.match(/(https:\/\/[^\s"'>\)]*fbcdn[^\s"'>\)]+\.jpg)/i)
          if (cdnMatch) {
            thumbnail = cdnMatch[1]
          }
        }

      } catch (fetchError) {
        console.error('[Thumbnail Worker] Instagram fetch error:', fetchError.message)
      }
    }

    // TIKTOK - Construct CDN URL from video ID
    if (platform === 'TIKTOK' || postUrl.includes('tiktok.com')) {
      const videoIdMatch = postUrl.match(/video\/(\d+)/)
      if (videoIdMatch) {
        const videoId = videoIdMatch[1]
        // Try multiple CDN patterns
        thumbnail = `https://p16.tiktokcdn.com/tos-maliva-p-0068/${videoId}/tiktok-embed/embed/thumbnail`
      } else {
        // Try oEmbed as fallback
        try {
          const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(postUrl)}`)
          const oembedData = await oembedRes.json()
          if (oembedData.thumbnail_url) {
            thumbnail = oembedData.thumbnail_url
          }
        } catch (oembedError) {
          console.error('[Thumbnail Worker] TikTok oEmbed error:', oembedError.message)
        }
      }
    }

    return res.json({
      success: true,
      thumbnail,
      platform,
      url: postUrl
    })

  } catch (error) {
    console.error('[Thumbnail Worker] Error:', error.message)
    return res.status(500).json({
      error: error.message,
      thumbnail: null
    })
  }
}
