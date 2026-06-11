import { RefreshCw, Image } from 'lucide-react'
import { Card, Loader, Button } from './'

export default function PostThumbnail({ thumbnailUrl, loading, error, onRefresh, refreshDisabled }) {
  if (loading) {
    return (
      <Card className="h-64 flex items-center justify-center">
        <div className="text-center">
          <Loader size="lg" />
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Loading thumbnail...</p>
        </div>
      </Card>
    )
  }

  if (error || !thumbnailUrl) {
    return (
      <Card className="h-64 flex items-center justify-center">
        <div className="text-center">
          <Image className="w-12 h-12 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>No thumbnail available</p>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshDisabled}>
              <RefreshCw className={`w-3 h-3 ${refreshDisabled ? 'animate-spin' : ''}`} />
              Refresh Thumbnail
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative group">
        <img
          src={thumbnailUrl}
          alt="Post thumbnail"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit',
            display: 'block',
          }}
        />
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshDisabled}
            className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
            title="Refresh Thumbnail"
          >
            <RefreshCw className={`w-4 h-4 ${refreshDisabled ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </Card>
  )
}
