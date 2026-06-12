import React from 'react';

export class PluginErrorBoundary extends React.Component<
  { pluginId: string; children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error) {
    console.error(`Admin plugin ${this.props.pluginId} crashed`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card glass" role="alert">
          <h2>Plugin unavailable</h2>
          <p>The plugin failed inside its isolated Admin workspace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
