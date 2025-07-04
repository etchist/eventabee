import { Card, Spinner, Stack, Text } from '@shopify/polaris';

interface LoadingFallbackProps {
  message?: string;
}

export function LoadingFallback({ message = 'Loading...' }: LoadingFallbackProps) {
  return (
    <Card>
      <Card.Section>
        <Stack distribution="center" alignment="center" spacing="tight">
          <Spinner size="small" />
          <Text as="p" variant="bodySm" tone="subdued">
            {message}
          </Text>
        </Stack>
      </Card.Section>
    </Card>
  );
}