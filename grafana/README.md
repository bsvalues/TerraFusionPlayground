# Grafana Dashboards for TerraFusion Web Vitals

This directory contains dashboard provisioning configurations for visualizing web vitals metrics in Grafana.

## Files

- `dashboards/webvitals.json`: Web Vitals Dashboard definition
- `provisioning/dashboards/webvitals.yml`: Dashboard provisioning configuration

## Dashboard Features

The Web Vitals dashboard provides:

- Time series visualizations for all core web vitals (LCP, TTFB, CLS, FCP, FID, INP)
- 95th percentile tracking with configurable thresholds
- Budget breach counter
- Filtering by route and device type

## Deployment

When deploying Grafana, ensure the provisioning directory is mounted correctly:

```bash
# Example docker command
docker run \
  -p 3000:3000 \
  -v /path/to/grafana/provisioning:/etc/grafana/provisioning \
  -v /path/to/grafana/dashboards:/var/lib/grafana/dashboards/webvitals \
  grafana/grafana
```

## Integration with Prometheus

This dashboard is designed to work with Prometheus metrics, specifically looking for:

- `web_vitals_lcp_bucket`
- `web_vitals_ttfb_bucket`
- `web_vitals_cls_bucket`
- `web_vitals_fcp_bucket`
- `web_vitals_fid_bucket`
- `web_vitals_inp_bucket`
- `web_vitals_budget_breaches_total`

Ensure these metrics are being collected by your Prometheus instance.