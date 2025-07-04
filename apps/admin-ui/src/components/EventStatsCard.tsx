import { 
  Card, 
  Stack, 
  Text, 
  ProgressBar,
  Spinner 
} from '@shopify/polaris';

interface EventStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  eventsByType: Record<string, number>;
  destinationStats: Record<string, { sent: number; failed: number }>;
}

interface EventStatsCardProps {
  stats: EventStats | null;
  loading: boolean;
}

export function EventStatsCard({ stats, loading }: EventStatsCardProps) {
  if (loading || !stats) {
    return (
      <Card>
        <Card.Section>
          <Stack distribution="center">
            <Spinner size="small" />
            <Text as="p">Loading event statistics...</Text>
          </Stack>
        </Card.Section>
      </Card>
    );
  }

  const successRate = stats.totalEvents > 0 
    ? (stats.successfulEvents / stats.totalEvents) * 100 
    : 0;

  const topEvents = Object.entries(stats.eventsByType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <Card title="Event Analytics">
      <Card.Section>
        <Stack vertical spacing="loose">
          <Stack distribution="equalSpacing">
            <Stack vertical spacing="extraTight">
              <Text as="h3" variant="headingLg">
                {stats.totalEvents.toLocaleString()}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Total Events
              </Text>
            </Stack>
            
            <Stack vertical spacing="extraTight">
              <Text as="h3" variant="headingLg" tone="success">
                {stats.successfulEvents.toLocaleString()}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Successful
              </Text>
            </Stack>
            
            <Stack vertical spacing="extraTight">
              <Text as="h3" variant="headingLg" tone="critical">
                {stats.failedEvents.toLocaleString()}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Failed
              </Text>
            </Stack>
          </Stack>
          
          <Stack vertical spacing="tight">
            <Text as="h4" variant="headingSm">
              Success Rate
            </Text>
            <ProgressBar progress={successRate} size="small" />
            <Text as="p" variant="bodySm" tone="subdued">
              {successRate.toFixed(1)}% of events processed successfully
            </Text>
          </Stack>
        </Stack>
      </Card.Section>
      
      {topEvents.length > 0 && (
        <Card.Section>
          <Stack vertical spacing="tight">
            <Text as="h4" variant="headingSm">
              Top Event Types
            </Text>
            {topEvents.map(([eventType, count]) => (
              <Stack key={eventType} distribution="equalSpacing">
                <Text as="p">{eventType.replace('_', ' ')}</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {count.toLocaleString()}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Card.Section>
      )}
    </Card>
  );
}