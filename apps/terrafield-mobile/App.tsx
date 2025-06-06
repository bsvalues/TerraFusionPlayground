import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { createLogger, format, transports } from 'winston';
import newrelic from 'newrelic';
import CircuitBreaker from 'opossum';
import { ChaosMonkey } from './chaos-monkey';
import { retry } from './utils';

import { initConnectivityMonitor, processSyncQueue } from './src/sync-manager';
import { MobilePropertyEditor } from './src/components/MobilePropertyEditor';

// Demo property IDs
const DEMO_PROPERTIES = [
  { id: 'property-123', address: '123 Main St' },
  { id: 'property-456', address: '456 Oak Ave' },
  { id: 'property-789', address: '789 Pine Rd' },
];

// Example logging configuration
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'terrafusion' },
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

export default function App() {
  // Selected property ID
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Connection status
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Initialize connectivity monitor
  useEffect(() => {
    console.log('Initializing TerraField mobile app');

    // Subscribe to network state
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected);

      // Process sync queue when connected
      if (state.isConnected) {
        processSyncQueue().catch(error => {
          console.error('Error processing sync queue:', error);
        });
      }
    });

    // Initialize connectivity monitor
    const monitorUnsubscribe = initConnectivityMonitor();

    // Check initial connection state
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
      setIsLoading(false);
    });

    // Cleanup
    return () => {
      unsubscribe();
      monitorUnsubscribe();
    };
  }, []);

  // Handle property selection
  const handleSelectProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
  };

  // Handle back to property list
  const handleBackToList = () => {
    setSelectedPropertyId(null);
  };

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Initializing TerraField...</Text>
      </View>
    );
  }

  // If a property is selected, show the property editor
  if (selectedPropertyId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <Text style={styles.backButtonText}>← Back to Properties</Text>
          </TouchableOpacity>
          <ConnectionStatus isConnected={isConnected} />
        </View>

        <MobilePropertyEditor
          propertyId={selectedPropertyId}
          userId={`mobile-user-${Math.floor(Math.random() * 1000)}`}
        />

        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  // Otherwise, show the property list
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TerraField</Text>
        <ConnectionStatus isConnected={isConnected} />
      </View>

      <Text style={styles.subtitle}>Property List</Text>

      <ScrollView style={styles.scrollView}>
        {DEMO_PROPERTIES.map(property => (
          <TouchableOpacity
            key={property.id}
            style={styles.propertyCard}
            onPress={() => handleSelectProperty(property.id)}
          >
            <Text style={styles.propertyId}>{property.id}</Text>
            <Text style={styles.propertyAddress}>{property.address}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

// Connection status indicator component
interface ConnectionStatusProps {
  isConnected: boolean | null;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  if (isConnected === null) {
    return null;
  }

  return (
    <View
      style={[styles.connectionIndicator, isConnected ? styles.connected : styles.disconnected]}
    >
      <Text style={styles.connectionText}>{isConnected ? 'Online' : 'Offline'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4361ee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#4361ee',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  scrollView: {
    flex: 1,
    marginHorizontal: 16,
  },
  propertyCard: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  propertyId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  connectionIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#F44336',
  },
  connectionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

// Example New Relic integration
import newrelic from 'newrelic';

app.use(newrelic.expressMiddleware());

// Custom transaction tracking
app.get('/api/properties', (req, res) => {
  newrelic.startWebTransaction('GET /api/properties', () => {
    // API logic
  });
});

// Example circuit breaker
const breaker = new CircuitBreaker(
  async function () {
    return await syncWithRemote();
  },
  {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  }
);

breaker.fallback(() => {
  return { status: 'offline', data: localCache };
});

// Example chaos monkey
const chaos = new ChaosMonkey({
  services: ['sync', 'api', 'database'],
  failureRate: 0.1,
  recoveryTime: 5000,
});

chaos.start();

// Example retry with exponential backoff
const syncWithRetry = retry(
  async () => {
    return await syncWithRemote();
  },
  {
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 10000,
  }
);

// Example Vite configuration
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          sync: ['@terrafusion/offline-sync'],
        },
      },
    },
  },
});

// Example Playwright configuration
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  workers: 4,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
});

// Example performance monitoring
import { PerformanceObserver } from 'perf_hooks';

const observer = new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 1000) {
      logger.warn('Slow operation detected', {
        name: entry.name,
        duration: entry.duration,
      });
    }
  }
});

observer.observe({ entryTypes: ['measure'] });
