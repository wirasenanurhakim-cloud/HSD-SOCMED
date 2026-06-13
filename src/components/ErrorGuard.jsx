import { Component } from 'react'

export default class ErrorGuard extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6 py-12 max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl"
                 style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              !
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Halaman gagal dimuat
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Terjadi kesalahan saat memuat halaman ini. Silakan coba lagi.
            </p>
            <button onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: 'var(--accent)' }}>
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
