# TerraFusion Monitoring Setup

This document outlines how to set up comprehensive monitoring for TerraFusion using Prometheus and Grafana, with a focus on Web Vitals metrics.

## Architecture

```
┌─────────────────┐          ┌───────────────┐          ┌─────────────┐
│   TerraFusion   │          │  Prometheus   │          │   Grafana   │
│   Application   │──scrape──▶   Metrics     │──query───▶  Dashboards │
└─────────────────┘          │   Database    │          └─────────────┘
                             └───────┬───────┘                 │
                                     │                         │
                                     ▼                         │
                             ┌───────────────┐                 │
                             │ AlertManager  │                 │
                             │ (Notifications)◀────threshold───┘
                             └───────────────┘
```

## Components

### 1. TerraFusion Application
- Exposes Web Vitals metrics at `/metrics` endpoint
- Metrics are formatted in Prometheus format
- Includes all core Web Vitals (LCP, FID, CLS, TTFB, FCP, INP)

### 2. Prometheus
- Scrapes metrics from TerraFusion application
- Stores time-series data
- Evaluates alert rules
- Configuration files in `prometheus/` directory

### 3. AlertManager
- Receives alerts from Prometheus
- Handles alert grouping, routing and notifications
- Can be configured to send alerts to Slack, email, etc.

### 4. Grafana
- Visualizes metrics from Prometheus
- Provides Web Vitals dashboard with thresholds
- Configuration files in `grafana/` directory

## Setup Instructions

### Deploy Prometheus

1. Install Prometheus using Docker:
   ```bash
   docker run \
     -p 9090:9090 \
     -v $(pwd)/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
     -v $(pwd)/prometheus/alerts:/etc/prometheus/alerts \
     prom/prometheus
   ```

2. Configure Prometheus to scrape your TerraFusion application:
   - Update the targets in `prometheus.yml` with your application URL

### Deploy Grafana

1. Install Grafana using Docker:
   ```bash
   docker run \
     -p 3000:3000 \
     -v $(pwd)/grafana/provisioning:/etc/grafana/provisioning \
     -v $(pwd)/grafana/dashboards:/var/lib/grafana/dashboards/webvitals \
     grafana/grafana
   ```

2. Add Prometheus as a data source in Grafana

### Kubernetes Deployment (Optional)

If you're using Kubernetes, you can use the following resources:

1. Prometheus Operator from the kube-prometheus-stack
2. Grafana Operator for dashboard provisioning

## Testing Your Setup

1. To verify metrics collection:
   - Navigate to `http://prometheus:9090/targets` to ensure TerraFusion is being scraped
   - Run a test query like `web_vitals_lcp_bucket` to see histogram data

2. To test alert triggering:
   - Temporarily lower threshold values in rules file
   - Force an alert condition by sending high metric values

## Troubleshooting

Common issues:

1. Metrics not appearing in Prometheus
   - Check the `/metrics` endpoint is accessible
   - Verify network connectivity between Prometheus and TerraFusion

2. Alerts not firing
   - Verify rule syntax in `webvitals.rules.yml`
   - Check AlertManager configuration

3. Dashboard not showing data
   - Verify Prometheus data source is configured correctly in Grafana
   - Ensure metric names in dashboard queries match those exported by application