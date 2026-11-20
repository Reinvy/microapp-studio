import { Component, type ReactNode } from 'react';
import { Button } from './input';

export interface ErrorBoundaryProps {
  fallback?: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * UI isolation boundary (MADS-FBK-07). Renders the caller-provided fallback or
 * a safe default surface with a recovery action.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (fallback) return fallback(error, this.reset);
      return (
        <div className="mads-error-surface" role="alert">
          <h2 className="mads-error-surface__title">Terjadi kesalahan</h2>
          <p className="mads-error-surface__description">{error.message}</p>
          <div className="mads-error-surface__actions">
            <Button variant="secondary" onClick={this.reset}>
              Coba lagi
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
