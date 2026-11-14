import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Google Maps quota / auth failure listener
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};
const origError = console.error;
console.error = (...args: unknown[]) => {
  origError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class TurbaErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('TURBA runtime render boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-stone-50 text-stone-900 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-mono font-semibold text-emerald-800 uppercase tracking-wider">
                TURBA (تُربة)
              </p>
              <h1 className="text-lg font-bold text-stone-900">
                Application Recovery Required
              </h1>
              <p className="text-xs text-stone-600 leading-relaxed">
                An unexpected interface error interrupted rendering. Your saved parcel and agronomic settings remain safely stored in this browser.
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="p-3 rounded-lg bg-stone-100 border border-stone-200 text-[11px] font-mono text-stone-700 break-words">
                {this.state.errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <TurbaErrorBoundary>
    <App />
  </TurbaErrorBoundary>
);
