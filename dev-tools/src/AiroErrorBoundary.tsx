import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  captureGlobalErrors?: boolean;
}

interface State {
  error: Error | null;
}

export default class AiroErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '1rem', color: 'red' }}>
          <strong>Something went wrong.</strong>
          <pre style={{ fontSize: '0.8em' }}>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
