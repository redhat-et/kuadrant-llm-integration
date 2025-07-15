# Kuadrant Chargeback Metrics Demo

This demo demonstrates advanced chargeback and usage tracking using a custom Limitador image that provides user and group-level metrics for the vLLM inference gateway.

## Overview

This demo showcases enhanced cost tracking and chargeback capabilities using a custom Limitador image that tracks user and group information in Prometheus metrics. This enables detailed billing and usage analysis per user and tier. The custom Limitador includes user/group extraction from request descriptors and enhanced metrics reporting. For architectural context, see the [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/).

## Prerequisites

- Kubernetes cluster with Gateway API support
- Kuadrant installed (see [bootstrap-infra/kuadrant-setup](../../bootstrap-infra/kuadrant-setup/README.md))
- vLLM inference environment (see [kubernetes-setup](../../kubernetes-setup/README.md))
- `kubectl` configured to access your cluster

## Custom Limitador Features

The custom Limitador image (`ghcr.io/nerdalert/limitador:latest`) includes:

- **User/Group Tracking**: Extracts user ID and group information from request descriptors
- **Enhanced Metrics**: Provides `incr_authorized_calls_with_user_and_group()` and `incr_limited_calls_with_user_and_group()` methods
- **Chargeback Support**: Metrics include user and group labels for detailed billing analysis
- **Prometheus Integration**: All metrics are exposed in Prometheus format with rich labeling

## Architecture

This demo sets up:

- **Custom Limitador**: Enhanced version with user/group tracking
- **API Key Secrets**: User credentials with tier and user ID metadata
- **AuthPolicy**: Authentication with user/group extraction
- **RateLimitPolicy**: Rate limiting with detailed tracking
- **ServiceMonitor**: Prometheus scraping configuration for enhanced metrics

## Setup

### Step 1: Deploy Enhanced Limitador

Apply the custom Limitador image with user/group tracking:

```bash
# Patch Limitador to use custom image
kubectl patch limitador limitador \
  -n kuadrant-system \
  --type merge \
  -p '{"spec":{"image":"ghcr.io/nerdalert/limitador:latest","version":""}}'

# Wait for rollout to complete
kubectl rollout status deploy/limitador-limitador -n kuadrant-system
```

### Step 2: Enable Enhanced Logging

Enable INFO level logging for better visibility:

```bash
kubectl patch limitador limitador \
  -n kuadrant-system \
  --type merge \
  -p '{"spec":{"verbosity":3}}'
```

### Step 3: Deploy Policies and Monitoring

```bash
kubectl apply -f chargeback-policy.yaml
kubectl apply -f limitador-servicemonitor.yaml
```

### Step 4: Verify Setup

```bash
# Check custom Limitador is running
kubectl get pods -n kuadrant-system -l app.kubernetes.io/name=limitador

# Check enhanced logging
kubectl logs -n kuadrant-system deployment/limitador-limitador --tail=50

# Verify policies are applied
kubectl get authpolicy,ratelimitpolicy -n llm

# Check ServiceMonitor
kubectl get servicemonitor -n llm-observability
```

## Testing

### Setup Port Forwarding

```bash
# Forward the Gateway port
kubectl -n llm port-forward svc/vllm-gateway-istio 8000:80 &

# Forward Prometheus for metrics
kubectl -n llm-observability port-forward svc/llm-observability 9090:9090 &

# Forward Limitador admin interface
kubectl -n kuadrant-system port-forward svc/limitador-limitador 8080:8080 &
```

### Generate Usage Data

Create realistic usage patterns for different users and tiers:

```bash
# Premium user usage
echo "=== Premium User Usage ==="
for i in {1..8}; do
  printf "Premium req #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST http://localhost:8000/v1/completions \
       -H 'Authorization: APIKEY premiumuser1_key' \
       -H 'Content-Type: application/json' \
       -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Premium request","max_tokens":20}'
done

# Free user usage (will hit limits)
echo "=== Free User Usage ==="
for i in {1..5}; do
  printf "Free req #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST http://localhost:8000/v1/completions \
       -H 'Authorization: APIKEY freeuser1_key' \
       -H 'Content-Type: application/json' \
       -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Free request","max_tokens":10}'
done

# Another premium user
echo "=== Another Premium User ==="
for i in {1..6}; do
  printf "Premium2 req #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST http://localhost:8000/v1/completions \
       -H 'Authorization: APIKEY premiumuser2_key' \
       -H 'Content-Type: application/json' \
       -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Premium2 request","max_tokens":15}'
done
```

## Enhanced Metrics Analysis

### User-Level Metrics

The custom Limitador provides detailed user-level metrics:

```bash
# Get enhanced metrics with user and group labels
curl -s http://localhost:8080/metrics | grep -E "authorized_calls_with_user_and_group|limited_calls_with_user_and_group"
```

Expected output:

```logs
# HELP authorized_calls_with_user_and_group Authorized calls with user and group tracking
# TYPE authorized_calls_with_user_and_group counter
authorized_calls_with_user_and_group{limitador_namespace="llm/vllm-gateway",user="premiumuser1",group="premium"} 8
authorized_calls_with_user_and_group{limitador_namespace="llm/vllm-gateway",user="freeuser1",group="free"} 2
authorized_calls_with_user_and_group{limitador_namespace="llm/vllm-gateway",user="premiumuser2",group="premium"} 6

# HELP limited_calls_with_user_and_group Limited calls with user and group tracking
# TYPE limited_calls_with_user_and_group counter
limited_calls_with_user_and_group{limitador_namespace="llm/vllm-gateway",user="freeuser1",group="free"} 3
```

### Prometheus Queries for Chargeback

Access Prometheus at `http://localhost:9090` and run these queries:

#### Usage by User

```promql
# Total authorized calls per user
sum(authorized_calls_with_user_and_group) by (user, group)

# Rate of authorized calls per user (last 5 minutes)
sum(rate(authorized_calls_with_user_and_group[5m])) by (user, group)

# Total limited calls per user
sum(limited_calls_with_user_and_group) by (user, group)
```

#### Usage by Tier/Group

```promql
# Total usage by tier
sum(authorized_calls_with_user_and_group) by (group)

# Cost calculation per tier (assuming $0.002 per call)
sum(authorized_calls_with_user_and_group) by (group) * 0.002

# Rate limiting effectiveness by tier
sum(limited_calls_with_user_and_group) by (group) / sum(authorized_calls_with_user_and_group) by (group)
```

#### Chargeback Calculations

```promql
# Individual user costs (last 24 hours)
sum(increase(authorized_calls_with_user_and_group[24h])) by (user, group) * 0.002

# Total revenue by tier (last 24 hours)
sum(increase(authorized_calls_with_user_and_group[24h])) by (group) * 0.002

# Peak usage periods
sum(rate(authorized_calls_with_user_and_group[5m])) by (user, group)
```

## Monitoring and Alerting

### ServiceMonitor Configuration

The demo includes a ServiceMonitor to scrape enhanced metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: limitador-enhanced
  namespace: llm-observability
spec:
  namespaceSelector:
    matchNames:
      - kuadrant-system
  selector:
    matchLabels:
      app: limitador
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

### Log Analysis

The enhanced Limitador provides detailed logging:

```bash
# View enhanced logs showing user/group tracking
kubectl logs -n kuadrant-system deployment/limitador-limitador -f | grep -E "user|group"
```

Expected log entries:

```logs
INFO limitador: Processing request with user='premiumuser1' group='premium'
INFO limitador: Rate limit check: user='freeuser1' group='free' - ALLOWED
INFO limitador: Rate limit check: user='freeuser1' group='free' - LIMITED
```

## Chargeback Reporting

### Generate Usage Reports

Create usage reports using Prometheus data:

```bash
# Get usage summary for last 24 hours
curl -s -G --data-urlencode 'query=sum(increase(authorized_calls_with_user_and_group[24h])) by (user, group)' \
  http://localhost:9090/api/v1/query | \
  jq -r '.data.result[] | "\(.metric.user) (\(.metric.group)): \(.value[1]) calls"'

# Get cost summary for last 24 hours (at $0.002 per call)
curl -s -G --data-urlencode 'query=sum(increase(authorized_calls_with_user_and_group[24h])) by (user, group) * 0.002' \
  http://localhost:9090/api/v1/query | \
  jq -r '.data.result[] | "\(.metric.user) (\(.metric.group)): $\(.value[1])"'
```

### Export Data for Billing

```bash
# Export usage data in CSV format
echo "timestamp,user,group,calls,cost" > usage_report.csv
curl -s -G --data-urlencode 'query=authorized_calls_with_user_and_group' \
  http://localhost:9090/api/v1/query | \
  jq -r '.data.result[] | "\(now),\(.metric.user),\(.metric.group),\(.value[1]),\(.value[1] | tonumber * 0.002)"' >> usage_report.csv

echo "Usage report generated: usage_report.csv"
head -10 usage_report.csv
```

## Load Testing for Chargeback

### Realistic Usage Simulation

```bash
# Simulate 1 hour of mixed usage
echo "Simulating realistic usage patterns..."

# Premium users - steady usage
for hour in {1..3}; do
  echo "Hour $hour - Premium users"
  for user in premiumuser1 premiumuser2; do
    for req in {1..5}; do
      curl -s -o /dev/null \
        -X POST http://localhost:8000/v1/completions \
        -H "Authorization: APIKEY ${user}_key" \
        -H 'Content-Type: application/json' \
        -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Business request","max_tokens":20}'
    done
  done
  
  # Free users - bursty usage
  echo "Hour $hour - Free users (bursty)"
  for user in freeuser1 freeuser2; do
    for req in {1..3}; do
      curl -s -o /dev/null \
        -X POST http://localhost:8000/v1/completions \
        -H "Authorization: APIKEY ${user}_key" \
        -H 'Content-Type: application/json' \
        -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Personal request","max_tokens":10}'
    done
  done
  
  echo "Sleeping 10 seconds between hours..."
  sleep 10
done
```

## Troubleshooting

### Check Custom Limitador Status

```bash
# Verify custom image is running
kubectl get pods -n kuadrant-system -l app.kubernetes.io/name=limitador -o jsonpath='{.items[0].spec.containers[0].image}'

# Check logs for user/group tracking
kubectl logs -n kuadrant-system deployment/limitador-limitador | grep -E "user|group" | tail -20

# Verify enhanced metrics endpoint
curl -s http://localhost:8080/metrics | grep -c "user.*group"
```

### Debug Metrics Collection

```bash
# Check ServiceMonitor targets
kubectl get servicemonitor -n llm-observability limitador-enhanced -o yaml

# Verify Prometheus is scraping
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "limitador-enhanced")'

# Check metric labels
curl -s http://localhost:9090/api/v1/label/user/values | jq
curl -s http://localhost:9090/api/v1/label/group/values | jq
```

### Policy Troubleshooting

```bash
# Check AuthPolicy status
kubectl describe authpolicy chargeback-auth -n llm

# Check RateLimitPolicy status
kubectl describe ratelimitpolicy chargeback-limits -n llm

# Verify user/group extraction
kubectl logs -n kuadrant-system deployment/authorino | grep -E "user|group"
```

## Clean Up

```bash
# Remove policies and monitoring
kubectl delete -f chargeback-policy.yaml
kubectl delete -f limitador-servicemonitor.yaml

# Revert to standard Limitador image
kubectl patch limitador limitador \
  -n kuadrant-system \
  --type merge \
  -p '{"spec":{"image":"","version":""}}'

# Wait for rollout
kubectl rollout status deploy/limitador-limitador -n kuadrant-system

# Stop port-forwarding
pkill -f "kubectl.*port-forward"

# Remove usage report
rm -f usage_report.csv
```

## Next Steps

- Set up automated billing pipelines using the enhanced metrics
- Create dashboards for real-time usage monitoring
- Implement alerts for usage anomalies
- Export data to external billing systems

## References

- [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/)
- [Custom Limitador PR](https://github.com/nerdalert/limitador/commit/60a16cb972712b94b2d77a56ea8a3f95921f173a)
- [Prometheus Metrics Documentation](https://prometheus.io/docs/concepts/metric_types/)
- [Limitador Documentation](https://docs.kuadrant.io/limitador/)
