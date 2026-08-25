import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Something went wrong' };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-900/60 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2">Scanner Error</h1>
            <p className="text-sm text-slate-300 mb-1">The scanner encountered an unexpected error.</p>
            <p className="text-xs text-slate-500 font-mono mb-6 break-all">{this.state.message}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm"
              >
                Reload
              </button>
              <button
                onClick={this.handleHome}
                className="px-5 py-2.5 bg-slate-700 text-slate-200 rounded-lg font-medium text-sm"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
