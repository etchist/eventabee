import { Card, Stack, Text, Button, Badge } from '@shopify/polaris';

interface BillingStatusProps {
  onSubscribe: () => void;
}

export function BillingStatus({ onSubscribe }: BillingStatusProps) {
  const plans = [
    {
      name: 'Starter',
      price: '$9.99/month',
      features: [
        'Up to 10,000 events/month',
        'Segment integration',
        'Facebook Pixel integration',
        'Basic analytics',
      ],
      planId: 'starter',
      popular: false,
    },
    {
      name: 'Professional',
      price: '$29.99/month',
      features: [
        'Up to 100,000 events/month',
        'All integrations',
        'Advanced analytics',
        'Custom event mapping',
        'Priority support',
      ],
      planId: 'professional',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$99.99/month',
      features: [
        'Unlimited events',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee',
        'Custom reporting',
      ],
      planId: 'enterprise',
      popular: false,
    },
  ];

  return (
    <Card>
      <Stack distribution="fillEvenly" spacing="loose">
        {plans.map((plan) => (
          <Card key={plan.planId} sectioned>
            <Stack vertical spacing="tight">
              <Stack distribution="equalSpacing" alignment="center">
                <Text variant="headingMd" as="h3">
                  {plan.name}
                </Text>
                {plan.popular && <Badge status="info">Most Popular</Badge>}
              </Stack>
              
              <Text variant="headingLg" as="p">
                {plan.price}
              </Text>
              
              <Stack vertical spacing="extraTight">
                {plan.features.map((feature, index) => (
                  <Text key={index} as="p">
                    ✓ {feature}
                  </Text>
                ))}
              </Stack>
              
              <Button
                primary={plan.popular}
                fullWidth
                onClick={() => onSubscribe()}
              >
                Subscribe to {plan.name}
              </Button>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Card>
  );
}