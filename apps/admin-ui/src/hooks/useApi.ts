import { useState, useEffect } from 'react';

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

interface EventStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  eventsByType: Record<string, number>;
  destinationStats: Record<string, { sent: number; failed: number }>;
}

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

export function useApi() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadConfig(),
        loadStats(),
        loadConnectionStatus(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/events/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const response = await fetch('/api/connections/status');
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      }
    } catch (error) {
      console.error('Error loading connection status:', error);
    }
  };

  const updateConfig = async (newConfig: AppConfig) => {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newConfig),
    });

    if (!response.ok) {
      throw new Error('Failed to update configuration');
    }

    const updatedConfig = await response.json();
    setConfig(updatedConfig);
    
    // Reload connection status after config update
    await loadConnectionStatus();
    
    return updatedConfig;
  };

  const testConnection = async (service: string) => {
    const response = await fetch(`/api/connections/test/${service}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to test ${service} connection`);
    }

    const result = await response.json();
    
    // Reload connection status after test
    await loadConnectionStatus();
    
    return result;
  };

  return {
    config,
    stats,
    connectionStatus,
    loading,
    updateConfig,
    testConnection,
    reload: loadData,
  };
}