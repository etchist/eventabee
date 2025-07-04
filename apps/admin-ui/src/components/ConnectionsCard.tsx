import { 
  Card, 
  Stack, 
  Text, 
  Button, 
  Badge, 
  Icon,
  Spinner 
} from '@shopify/polaris';
import { 
  ConnectIcon, 
  AlertCircleIcon 
} from '@shopify/polaris-icons';

interface ConnectionStatus {
  segment: {
    connected: boolean;
    lastSync?: string;
    error?: string;
  };
  facebook: {
    connected: boolean;
    lastSync?: string;
    error?: string;
  };
  browserless: {
    connected: boolean;
    lastSync?: string;
    error?: string;
  };
}

interface ConnectionsCardProps {
  status: ConnectionStatus | null;
  onTest: (service: string) => void;
  loading: boolean;
}

export function ConnectionsCard({ status, onTest, loading }: ConnectionsCardProps) {
  if (loading || !status) {
    return (
      <Card>
        <Card.Section>
          <Stack distribution="center">
            <Spinner size="small" />
            <Text as="p">Loading connection status...</Text>
          </Stack>
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
                  onClick={() => onTest(connection.key)}
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