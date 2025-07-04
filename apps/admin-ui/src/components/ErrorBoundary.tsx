import React, { Component, ReactNode } from 'react';
import { Card, Banner, Page, Layout } from '@shopify/polaris';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Page>
          <Layout>
            <Layout.Section>
              <Card>
                <Banner
                  title="Something went wrong"
                  status="critical"
                  action={{
                    content: 'Reload page',
                    onAction: this.handleReset,
                  }}
                >
                  <p>We encountered an unexpected error. Please try reloading the page.</p>
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details style={{ marginTop: '1rem' }}>
                      <summary>Error details</summary>
                      <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
                        {this.state.error.toString()}
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </Banner>
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      );
    }

    return this.props.children;
  }
}