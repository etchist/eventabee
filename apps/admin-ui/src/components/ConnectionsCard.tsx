import { useState } from 'react';
import { 
  Card, 
  Stack, 
  Text, 
  Button, 
  Badge, 
  Icon,
  Spinner,
  Banner 
} from '@shopify/polaris';
import { 
  ConnectIcon, 
  AlertCircleIcon 
} from '@shopify/polaris-icons';
import { useConnections } from '../hooks/useConnections';


interface ConnectionsCardProps {
  onTest: (service: string) => void;
}

export function ConnectionsCard({ onTest }: ConnectionsCardProps) {
  const { data: status, isLoading, isError } = useConnections();
  const [testingService, setTestingService] = useState<string | null>(null);

  const handleTest = async (service: string) => {
    setTestingService(service);
    try {
      await onTest(service);
    } finally {
      setTestingService(null);
    }
  };

  if (isLoading) {
    return (
      <Card title="Integration Status">
        <Card.Section>
          <Stack distribution="center">
            <Spinner size="small" />
            <Text as="p">Loading connection status...</Text>
          </Stack>
        </Card.Section>
      </Card>
    );
  }

  if (isError || !status) {
    return (
      <Card title="Integration Status">
        <Card.Section>
          <Banner status="critical" title="Error loading connections">
            Unable to load connection status. Please refresh the page.
          </Banner>
        </Card.Section>
      </Card>
    );
  }

  const connections = [
    {
      name: 'Segment',
      key: 'segment',
      status: status.segment,
    },
    {
      name: 'Facebook',
      key: 'facebook', 
      status: status.facebook,
    },
    {
      name: 'Browserless',
      key: 'browserless',
      status: status.browserless,
    },
  ];

  return (
    <Card title="Integration Status">
      <Card.Section>
        <Stack vertical spacing="loose">
          {connections.map((connection) => (
            <Stack key={connection.key} distribution="equalSpacing" alignment="center">
              <Stack spacing="tight" alignment="center">
                <Icon
                  source={connection.status.connected ? ConnectIcon : AlertCircleIcon}
                  tone={connection.status.connected ? 'success' : 'critical'}
                />
                <Text as="p" variant="bodyMd">
                  {connection.name}
                </Text>
              </Stack>
              
              <Stack spacing="tight" alignment="center">
                <Badge 
                  status={connection.status.connected ? 'success' : 'critical'}
                >
                  {connection.status.connected ? 'Connected' : 'Disconnected'}
                </Badge>
                
                <Button
                  size="slim"
                  onClick={() => handleTest(connection.key)}
                  loading={testingService === connection.key}
                  disabled={testingService !== null && testingService !== connection.key}
                >
                  Test
                </Button>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Card.Section>
      
      {status.segment.lastSync && (
        <Card.Section>
          <Text as="p" variant="bodySm" tone="subdued">
            Last sync: {new Date(status.segment.lastSync).toLocaleString()}
          </Text>
        </Card.Section>
      )}
    </Card>
  );
}