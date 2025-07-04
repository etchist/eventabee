import { useState, useEffect } from 'react';
import { 
  Card, 
  FormLayout, 
  TextField, 
  Button, 
  Checkbox,
  Stack,
  Text,
  Collapsible,
  Banner,
  Spinner
} from '@shopify/polaris';
import { useConfig } from '../hooks/useConfig';

interface AppConfig {
  segment: {
    enabled: boolean;
    writeKey: string;
  };
  facebook: {
    enabled: boolean;
    accessToken: string;
    pixelId: string;
  };
  browserless: {
    enabled: boolean;
    token: string;
    url: string;
  };
}

interface ConfigurationCardProps {
  onSave: (config: AppConfig) => void;
}

export function ConfigurationCard({ onSave }: ConfigurationCardProps) {
  const { data: config, isLoading, isError } = useConfig();
  const [formData, setFormData] = useState<AppConfig>({
    segment: { enabled: false, writeKey: '' },
    facebook: { enabled: false, accessToken: '', pixelId: '' },
    browserless: { enabled: false, token: '', url: '' },
  });
  
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [facebookOpen, setFacebookOpen] = useState(false);
  const [browserlessOpen, setBrowserlessOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update form data when config is loaded
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (section: keyof AppConfig, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <Card title="Integration Configuration">
        <Card.Section>
          <Stack distribution="center">
            <Spinner size="small" />
            <Text as="p">Loading configuration...</Text>
          </Stack>
        </Card.Section>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card title="Integration Configuration">
        <Card.Section>
          <Banner status="critical" title="Error loading configuration">
            Unable to load configuration. Please refresh the page.
          </Banner>
        </Card.Section>
      </Card>
    );
  }

  return (
    <Card title="Integration Configuration">
      <Card.Section>
        <Banner
          status="info"
          title="Secure Configuration"
        >
          All API keys and tokens are encrypted and stored securely. 
          Your credentials are never exposed or logged.
        </Banner>
      </Card.Section>
      
      <Card.Section>
        <FormLayout>
          {/* Segment Configuration */}
          <Stack vertical>
            <Stack distribution="equalSpacing" alignment="center">
              <Text as="h3" variant="headingSm">
                Segment Integration
              </Text>
              <Button
                plain
                onClick={() => setSegmentOpen(!segmentOpen)}
                ariaExpanded={segmentOpen}
                ariaControls="segment-config"
              >
                {segmentOpen ? 'Hide' : 'Configure'}
              </Button>
            </Stack>
            
            <Checkbox
              label="Enable Segment integration"
              checked={formData.segment.enabled}
              onChange={(checked) => updateField('segment', 'enabled', checked)}
            />
            
            <Collapsible
              open={segmentOpen}
              id="segment-config"
              transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
            >
              <TextField
                label="Segment Write Key"
                value={formData.segment.writeKey}
                onChange={(value) => updateField('segment', 'writeKey', value)}
                type="password"
                helpText="Get this from your Segment source settings"
                autoComplete="off"
              />
            </Collapsible>
          </Stack>

          {/* Facebook Configuration */}
          <Stack vertical>
            <Stack distribution="equalSpacing" alignment="center">
              <Text as="h3" variant="headingSm">
                Facebook Integration
              </Text>
              <Button
                plain
                onClick={() => setFacebookOpen(!facebookOpen)}
                ariaExpanded={facebookOpen}
                ariaControls="facebook-config"
              >
                {facebookOpen ? 'Hide' : 'Configure'}
              </Button>
            </Stack>
            
            <Checkbox
              label="Enable Facebook CAPI & Pixel"
              checked={formData.facebook.enabled}
              onChange={(checked) => updateField('facebook', 'enabled', checked)}
            />
            
            <Collapsible
              open={facebookOpen}
              id="facebook-config"
              transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
            >
              <FormLayout>
                <TextField
                  label="Facebook Access Token"
                  value={formData.facebook.accessToken}
                  onChange={(value) => updateField('facebook', 'accessToken', value)}
                  type="password"
                  helpText="Get this from Facebook Business Manager"
                  autoComplete="off"
                />
                <TextField
                  label="Facebook Pixel ID"
                  value={formData.facebook.pixelId}
                  onChange={(value) => updateField('facebook', 'pixelId', value)}
                  helpText="Find this in your Facebook Pixel settings"
                />
              </FormLayout>
            </Collapsible>
          </Stack>

          {/* Browserless Configuration */}
          <Stack vertical>
            <Stack distribution="equalSpacing" alignment="center">
              <Text as="h3" variant="headingSm">
                Browserless (Advanced)
              </Text>
              <Button
                plain
                onClick={() => setBrowserlessOpen(!browserlessOpen)}
                ariaExpanded={browserlessOpen}
                ariaControls="browserless-config"
              >
                {browserlessOpen ? 'Hide' : 'Configure'}
              </Button>
            </Stack>
            
            <Checkbox
              label="Enable Browserless for enhanced pixel tracking"
              checked={formData.browserless.enabled}
              onChange={(checked) => updateField('browserless', 'enabled', checked)}
            />
            
            <Collapsible
              open={browserlessOpen}
              id="browserless-config"
              transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
            >
              <FormLayout>
                <TextField
                  label="Browserless Token"
                  value={formData.browserless.token}
                  onChange={(value) => updateField('browserless', 'token', value)}
                  type="password"
                  helpText="Get this from your Browserless account"
                  autoComplete="off"
                />
                <TextField
                  label="Browserless URL"
                  value={formData.browserless.url}
                  onChange={(value) => updateField('browserless', 'url', value)}
                  helpText="Your Browserless WebSocket endpoint"
                />
              </FormLayout>
            </Collapsible>
          </Stack>

          <Button
            primary
            onClick={handleSave}
            loading={isSaving}
            fullWidth
          >
            Save Configuration
          </Button>
        </FormLayout>
      </Card.Section>
    </Card>
  );
}