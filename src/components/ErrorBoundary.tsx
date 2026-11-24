import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi kesalahan pada aplikasi.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let parsedSummary = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          parsedSummary = `${parsed.operationType?.toUpperCase() || 'DB'} (${parsed.path || '-'}): ${parsed.error}`;
        }
      } catch {
        // Not JSON error string
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">Terjadi Kendala Koneksi atau Akses</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Aplikasi mendeteksi gangguan saat memproses data real-time. Silakan muat ulang halaman atau periksa izin akun Anda.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-mono text-slate-700 break-words">
              {parsedSummary}
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
