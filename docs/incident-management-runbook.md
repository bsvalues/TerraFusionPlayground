# TerraFusion Incident Management Runbook

This document outlines the procedures for handling performance-related incidents in the TerraFusion application.

## Monitoring and Alerting Setup

### Prometheus Alerts to PagerDuty Integration

1. **Install and Configure Alertmanager**

   Add to `prometheus/alertmanager.yml`:

   ```yaml
   global:
     resolve_timeout: 5m
     pagerduty_url: https://events.pagerduty.com/v2/enqueue

   route:
     group_by: ['alertname', 'severity']
     group_wait: 30s
     group_interval: 5m
     repeat_interval: 3h
     receiver: 'pagerduty-critical'
     routes:
     - match:
         severity: page
       receiver: 'pagerduty-critical'
     - match:
         severity: warning
       receiver: 'pagerduty-warning'

   receivers:
   - name: 'pagerduty-critical'
     pagerduty_configs:
     - routing_key: YOUR_PAGERDUTY_SERVICE_KEY
       severity: critical
       description: '{{ .CommonAnnotations.summary }}'
       details:
         firing: '{{ .Alerts.Firing | len }}'
         resolved: '{{ .Alerts.Resolved | len }}'
         summary: '{{ .CommonAnnotations.summary }}'
         description: '{{ .CommonAnnotations.description }}'
   
   - name: 'pagerduty-warning'
     pagerduty_configs:
     - routing_key: YOUR_PAGERDUTY_SERVICE_KEY
       severity: warning
       description: '{{ .CommonAnnotations.summary }}'
       details:
         firing: '{{ .Alerts.Firing | len }}'
         resolved: '{{ .Alerts.Resolved | len }}'
         summary: '{{ .CommonAnnotations.summary }}'
         description: '{{ .CommonAnnotations.description }}'
   ```

2. **Create PagerDuty Service**

   - Log in to PagerDuty
   - Create a new Service for TerraFusion
   - Set up the appropriate Escalation Policy (e.g., Frontend team for Web Vitals issues)
   - Obtain the Service Integration Key to use in the Alertmanager config

## On-Call Responsibilities

### Primary On-Call Engineer

- **Response Time**: Acknowledge alerts within 15 minutes
- **Investigation**: Begin investigation within 30 minutes
- **Communication**: Update status within 1 hour of acknowledgment
- **Escalation**: Escalate to secondary on-call after 1 hour without resolution

### Secondary On-Call Engineer

- **Response Time**: Acknowledge escalated incidents within 15 minutes
- **Collaboration**: Work with primary on-call to resolve the issue
- **Escalation**: Escalate to Engineering Manager if resolution not in progress within 30 minutes

## Incident Severity Levels

| Severity | Description | Example |
|----------|-------------|---------|
| P1 - Critical | Service is down or unusable for majority of users | LCP > 5s for 10+ minutes |
| P2 - High | Service is degraded, affecting a significant subset of users | LCP > 3s for 10+ minutes |
| P3 - Medium | Non-critical functionality is impaired | CLS > 0.15 for 1+ hours |
| P4 - Low | Minor issues with minimal impact | FCP > 2s for dashboard page |

## Alert Response Procedures

### Web Vitals Performance Issues

#### For LCP/TTFB Issues:

1. Check server load and response times in AWS CloudWatch
2. Check CDN configuration and cache hit rates
3. Review recent deployments that might have introduced heavy resources
4. Check for failing origin servers or load balancers

#### For CLS Issues:

1. Check recent UI component changes
2. Verify image dimensions are properly constrained in CSS
3. Check for dynamic content loading that might shift layout
4. Review asynchronous font loading implementation

#### For FID/INP Issues:

1. Check JavaScript execution times in transaction monitoring
2. Review recent JavaScript changes that might be causing main thread blocking
3. Check for heavy third-party scripts
4. Profile the application using Chrome DevTools Performance panel

## Incident Resolution

### Post-Mortem Template

After resolving a P1 or P2 incident, complete a post-mortem document with:

1. Incident timeline
2. Root cause analysis
3. Resolution steps
4. Prevention measures
5. Action items with assignees and due dates

### Communication

During an incident:

1. Update the #incidents Slack channel every 30 minutes
2. For user-facing issues, post updates to status page
3. Notify stakeholders for incidents lasting more than 1 hour

## Testing the Alert System

Run a monthly test to ensure the alerting system is functioning:

1. Manually trigger a test alert in Prometheus
2. Verify PagerDuty receives and routes the alert correctly
3. Validate that on-call engineers receive notifications
4. Complete a mock incident response

## Key Contacts

| Role | Name | Contact |
|------|------|---------|
| Frontend Lead | TBD | TBD |
| Backend Lead | TBD | TBD |
| DevOps Engineer | TBD | TBD |
| Engineering Manager | TBD | TBD |

## Reference Performance Budgets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| LCP | < 2.5s | > 2.5s | > 4.0s |
| TTFB | < 0.6s | > 0.6s | > 1.0s |
| CLS | < 0.1 | > 0.1 | > 0.25 |
| FID | < 100ms | > 100ms | > 300ms |
| INP | < 200ms | > 200ms | > 500ms |
| FCP | < 1.8s | > 1.8s | > 3.0s |