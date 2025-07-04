import { AppProps } from 'next/app';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { AppProvider } from '@shopify/polaris';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';
import { queryClient } from '../lib/react-query/query-client';
import { ErrorBoundary } from '../components/ErrorBoundary';

function MyApp({ Component, pageProps }: AppProps) {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
    host: Buffer.from(pageProps.host || '', 'base64').toString() || '',
    forceRedirect: true,
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppBridgeProvider config={config}>
          <AppProvider i18n={enTranslations}>
            <Component {...pageProps} />
          </AppProvider>
        </AppBridgeProvider>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default MyApp;