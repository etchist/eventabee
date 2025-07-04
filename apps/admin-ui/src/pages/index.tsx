import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  Banner,
  Spinner,
  Toast,
  Frame,
} from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';

import { BillingStatus } from '../components/BillingStatus';
import { ConnectionsCard } from '../components/ConnectionsCard';
import { EventStatsCard } from '../components/EventStatsCard';
import { ConfigurationCard } from '../components/ConfigurationCard';
import { useApi } from '../hooks/useApi';

export default function Index() {
  const app = useAppBridge();
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [billingRequired, setBillingRequired] = useState(false);
  
  const { 
    config, 
    stats, 
    connectionStatus,
    updateConfig,
    testConnection,
    loading: apiLoading 
  } = useApi();

  useEffect(() => {
    checkBillingStatus();
  }, []);

  const checkBillingStatus = async () => {
    try {
      const response = await fetch('/api/billing/status', {
        headers: {
          'Authorization': `Bearer ${await getSessionToken()}`,
        },
      });
      
      const billingData = await response.json();
      
      if (!billingData.hasActiveSubscription) {
        setBillingRequired(true);
      }
    } catch (error) {
      console.error('Error checking billing status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionToken = async () => {
    // This would get the session token from App Bridge
    return 'session-token';
  };

  const handleCreateBilling = async () => {
    try {
      const response = await fetch('/api/billing/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getSessionToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: 'basic',
        }),
      });
      
      const { confirmationUrl } = await response.json();
      
      if (confirmationUrl) {
        const redirect = Redirect.create(app);
        redirect.dispatch(Redirect.Action.REMOTE, confirmationUrl);
      }
    } catch (error) {
      setToastMessage('Error creating billing subscription');
    }
  };

  const handleSaveConfig = async (newConfig: any) => {
    try {
      await updateConfig(newConfig);
      setToastMessage('Configuration saved successfully');
    } catch (error) {
      setToastMessage('Error saving configuration');
    }
  };

  const handleTestConnection = async (service: string) => {
    try {
      const result = await testConnection(service);
      setToastMessage(
        result.success 
          ? `${service} connection successful` 
          : `${service} connection failed`
      );
    } catch (error) {
      setToastMessage(`Error testing ${service} connection`);
    }
  };

  if (loading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Spinner size="large" />
              </div>
            </Card>
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
            <BillingStatus onSubscribe={handleCreateBilling} />
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
            <EventStatsCard stats={stats} loading={apiLoading} />
          </Layout.Section>
          
          <Layout.Section oneHalf>
            <ConnectionsCard 
              status={connectionStatus} 
              onTest={handleTestConnection}
              loading={apiLoading}
            />
          </Layout.Section>
          
          <Layout.Section>
            <ConfigurationCard 
              config={config}
              onSave={handleSaveConfig}
              loading={apiLoading}
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