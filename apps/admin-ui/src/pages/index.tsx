import { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  Banner,
  Spinner,
  Toast,
  Frame,
} from '@shopify/polaris';

import { BillingStatus } from '../components/BillingStatus';
import { ConnectionsCard } from '../components/ConnectionsCard';
import { EventStatsCard } from '../components/EventStatsCard';
import { ConfigurationCard } from '../components/ConfigurationCard';
import { 
  useBilling, 
  useBillingRequired,
  useConfig,
  useConnections,
  useEventStats,
  type AppConfig
} from '../hooks';

export default function Index() {
  const [toastMessage, setToastMessage] = useState('');
  
  // React Query hooks
  const {
    createSubscription,
    isLoading: billingLoading,
    isError: billingError
  } = useBilling();
  
  const { billingRequired, isCheckingBilling } = useBillingRequired();
  
  const {
    config,
    updateConfig,
    isLoading: configLoading,
    isUpdating: configUpdating
  } = useConfig();
  
  const {
    stats,
    isLoading: statsLoading
  } = useEventStats();
  
  const {
    connectionStatus,
    testConnection,
    isLoading: connectionsLoading,
    isTesting
  } = useConnections();
  
  const isLoading = isCheckingBilling || billingLoading || configLoading || statsLoading || connectionsLoading;

  const handleCreateBilling = async (plan = 'basic') => {
    try {
      await createSubscription({ plan });
    } catch {
      setToastMessage('Error creating billing subscription');
    }
  };

  const handleSaveConfig = async (newConfig: AppConfig) => {
    try {
      await updateConfig(newConfig);
      setToastMessage('Configuration saved successfully');
    } catch {
      setToastMessage('Error saving configuration');
    }
  };

  const handleTestConnection = (service: string) => {
    testConnection(service, {
      onSuccess: (result) => {
        setToastMessage(
          result.success 
            ? `${service} connection successful` 
            : `${service} connection failed`
        );
      },
      onError: () => {
        setToastMessage(`Error testing ${service} connection`);
      }
    });
  };

  if (isLoading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Spinner size="large" />
                <p style={{ marginTop: '1rem' }}>Loading dashboard...</p>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (billingError) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Banner status="critical" title="Error loading billing information">
              <p>We couldn't load your billing information. Please refresh the page or contact support.</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (billingRequired) {
    return (
      <Page title="Eventabee - Event Tracking">
        <Layout>
          <Layout.Section>
            <Banner
              title="Subscription Required"
              status="warning"
              action={{
                content: 'Subscribe Now',
                onAction: handleCreateBilling,
              }}
            >
              <p>
                To use Eventabee, you need an active subscription. 
                Choose a plan that fits your store's needs.
              </p>
            </Banner>
          </Layout.Section>
          
          <Layout.Section>
            <BillingStatus onSubscribe={(plan) => handleCreateBilling(plan)} />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Frame>
      <Page 
        title="Eventabee Dashboard" 
        subtitle="Event tracking and analytics for your Shopify store"
      >
        <Layout>
          <Layout.Section oneHalf>
            <EventStatsCard stats={stats} loading={statsLoading} />
          </Layout.Section>
          
          <Layout.Section oneHalf>
            <ConnectionsCard 
              status={connectionStatus} 
              onTest={handleTestConnection}
              loading={connectionsLoading || isTesting}
            />
          </Layout.Section>
          
          <Layout.Section>
            <ConfigurationCard 
              config={config}
              onSave={handleSaveConfig}
              loading={configLoading || configUpdating}
            />
          </Layout.Section>
        </Layout>
        
        {toastMessage && (
          <Toast 
            content={toastMessage} 
            onDismiss={() => setToastMessage('')} 
          />
        )}
      </Page>
    </Frame>
  );
}