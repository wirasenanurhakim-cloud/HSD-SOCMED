import { useState } from 'react'

const PLATFORM_LOGO = {
  TIKTOK: '/tiktok.png',
  INSTAGRAM: '/ig.png',
}

export default function PlatformIcon({ platform, size = 12 }) {
  const [failed, setFailed] = useState(false)
  const src = PLATFORM_LOGO[platform]
  if (!src || failed) {
    if (platform === 'TIKTOK') {
      return <span className="font-mono font-bold" style={{ fontSize: size + 4, lineHeight: 1 }}>♪</span>
    }
    if (platform === 'INSTAGRAM') {
      return <span className="font-bold" style={{ fontSize: size - 1, lineHeight: 1 }}>IG</span>
    }
    return <span style={{ fontSize: size - 2, lineHeight: 1 }}>?</span>
  }
  return (
    <img
      src={src}
      alt={platform}
      style={{ width: size, height: size, borderRadius: 2 }}
      onError={() => setFailed(true)}
    />
  )
}
