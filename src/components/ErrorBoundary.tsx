import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
            <AlertTriangle className="w-8 h-8 text-rose-400 stroke-[2.2]" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Something went wrong
          </h2>

          <p className="text-xs text-zinc-400 max-w-xs mb-4 leading-relaxed font-mono bg-[#121214] border border-white/5 p-3 rounded-xl break-words">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>

          <button
            onClick={this.handleRetry}
            className="px-6 py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white text-sm font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
