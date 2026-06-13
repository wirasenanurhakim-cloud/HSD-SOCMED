export default function VersionInfo() {
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '—'
  const hash = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '—'
  return (
    <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
      Build {buildTime.slice(0, 10)} {buildTime.slice(11, 16)} {hash !== '—' ? `| ${hash.slice(0, 8)}` : ''}
    </div>
  )
}
