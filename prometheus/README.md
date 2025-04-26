# Prometheus Monitoring for TerraFusion Web Vitals

This directory contains configuration for monitoring web vitals metrics using Prometheus and Grafana.

## Files

- `prometheus.yml`: Main Prometheus configuration file
- `alerts/webvitals.rules.yml`: Alert rules for web vitals metrics breaches

## Alert Rules

The alert rules are set up to monitor 95th percentile values for the following metrics:

- LCP (Largest Contentful Paint): Triggers if > 2.5s
- TTFB (Time to First Byte): Triggers if > 1.0s
- CLS (Cumulative Layout Shift): Triggers if > 0.1
- FCP (First Contentful Paint): Triggers if > 1.8s
- FID (First Input Delay): Triggers if > 0.1s
- INP (Interaction to Next Paint): Triggers if > 0.2s

## Deployment

When deploying Prometheus, ensure the configuration file is mounted and that alerts are properly configured to notify your team.

```bash
# Example docker command
docker run \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v /path/to/alerts:/etc/prometheus/alerts \
  prom/prometheus
```