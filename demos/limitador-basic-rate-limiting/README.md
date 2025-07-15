# Limitador Basic Rate Limiting Demo

This demo demonstrates API key authentication combined with rate limiting using Kuadrant's Authorino and Limitador components for the vLLM inference gateway.

## Overview

This demo showcases how to implement tiered rate limiting based on API key authentication. Different API keys are assigned to different tiers (free vs premium) with varying rate limits. Limitador provides cloud-native rate limiting capabilities that integrate seamlessly with Gateway API. For comprehensive details on Limitador's architecture, see the [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/).

## Prerequisites

- Kubernetes cluster with Gateway API support
- Kuadrant installed (see [bootstrap-infra/kuadrant-setup](../../bootstrap-infra/kuadrant-setup/README.md))
- vLLM inference environment (see [kubernetes-setup](../../kubernetes-setup/README.md))
- `kubectl` configured to access your cluster

## Architecture

This demo sets up:

- **API Key Secrets**: Kubernetes secrets with user tiers (free vs premium). Keycloak backing integration is planned.
- **AuthPolicy**: Authentication and user identification
- **RateLimitPolicy**: Rate limiting rules based on user tiers
- **Limitador**: Rate limiting enforcement engine

## Rate Limiting Tiers

- **Free Tier**: 2 requests per 2 minutes
- **Premium Tier**: 10 requests per 2 minutes

## Setup

### Optional Changing the namespace

```bash
yq eval 'select(.metadata.namespace == "llm").metadata.namespace = "llm-d"' \
  -i demos/limitador-basic-rate-limiting/rate-limit-policy.yaml
```

### Step 1: Deploy API Keys, AuthPolicy, and RateLimitPolicy

```bash
kubectl apply -f demos/limitador-basic-rate-limiting/rate-limit-policy.yaml
```

### Step 2: Verify Resources

```bash
# Check API key secrets
kubectl get secrets -n llm -l kuadrant.io/auth-secret=true

# Check AuthPolicy
kubectl get authpolicy -n llm

# Check RateLimitPolicy
kubectl get ratelimitpolicy -n llm

# Check Limitador deployment
kubectl get pods -n kuadrant-system -l app=limitador
```

## Testing

### Setup Port Forwarding

```bash
# Forward the Gateway port (keep this running)
kubectl -n llm port-forward svc/vllm-gateway-istio 8000:80 &

# Forward Prometheus for metrics monitoring
kubectl -n llm-observability port-forward svc/llm-observability 9090:9090 &

# Forward Limitador admin interface
kubectl -n kuadrant-system port-forward svc/limitador-limitador 8080:8080 &
```

### Test Free Tier Rate Limiting

Test free tier user - expect 2 successful requests, then 429 rate limit errors:

```bash
for i in {1..5}; do
  printf "Free tier request #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST http://localhost:8000/v1/completions \
       -H 'Authorization: APIKEY freeuser1_key' \
       -H 'Content-Type: application/json' \
       -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Test request","max_tokens":10}'
done
```

Expected output:

```logs
Free tier request #1  -> 200
Free tier request #2  -> 200
Free tier request #3  -> 429
Free tier request #4  -> 429
Free tier request #5  -> 429
```

### Test Premium Tier Rate Limiting

Test premium tier user - expect 10 successful requests, then 429 rate limit errors:

```bash
for i in {1..15}; do
  printf "Premium tier request #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST http://localhost:8000/v1/completions \
       -H 'Authorization: APIKEY premiumuser1_key' \
       -H 'Content-Type: application/json' \
       -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Test request","max_tokens":10}'
done
```

Expected output:

```logs
Premium tier request #1  -> 200
Premium tier request #2  -> 200
...
Premium tier request #10 -> 200
Premium tier request #11 -> 429
Premium tier request #12 -> 429
...
```

### Test Unauthorized Access

```bash
# Test without API key
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Test","max_tokens":10}'
```

Expected response: HTTP 401 Unauthorized

## Monitoring and Metrics

### Limitador Admin/Metrics Interface

- Access the Limitador admin/metrics interface at `http://localhost:8080`:

```bash
curl http://localhost:8080/metrics
```

- Output:

```yaml
# HELP authorized_calls Authorized calls
# TYPE authorized_calls counter
authorized_calls{limitador_namespace="llm/vllm-httproute"} 20

# HELP limited_calls Limited calls
# TYPE limited_calls counter
limited_calls{limitador_namespace="llm/vllm-httproute"} 25

# HELP datastore_partitioned Limitador is partitioned from backing datastore
# TYPE datastore_partitioned gauge
datastore_partitioned 0

# HELP limitador_up Limitador is running
# TYPE limitador_up gauge
limitador_up 1
```

When you attach a RateLimitPolicy to a Gateway, Kuadrant doesn’t hand that policy to Limitador in one big chunk.
Instead, it walks through every HTTPRoute the Gateway serves (hosts, paths, allowedRoutes, etc.) and produces a separate rule-set for each route.
Each of those rule-sets is written into the ConfigMap that Limitador mounts, and each one is given a namespace of `<kube-namespace>/<httpRoute-name>`.

- Check the limitador active limits.

```bash
curl -s http://localhost:8080/limits/llm%2Fvllm-httproute | jq .
```

- Output:

```json
[
  {
    "id": null,
    "namespace": "llm/vllm-httproute",
    "max_value": 2,
    "seconds": 120,
    "name": null,
    "conditions": [
      "descriptors[0][\"limit.free_user_requests__323789ab\"] == \"1\""
    ],
    "variables": [
      "descriptors[0][\"auth.identity.userid\"]"
    ]
  },
  {
    "id": null,
    "namespace": "llm/vllm-httproute",
    "max_value": 10,
    "seconds": 120,
    "name": null,
    "conditions": [
      "descriptors[0][\"limit.premium_user_requests__465980c1\"] == \"1\""
    ],
    "variables": [
      "descriptors[0][\"auth.identity.userid\"]"
    ]
  }
]
```

### Limitador Prometheus Metrics

TODO: setup limitador prometheus rules

Check Limitador-specific metrics:

```bash
# Get all Limitador metrics
curl http://localhost:8080/metrics | grep -E 'limited_calls|authorized_calls'
```

Expected output:

```logs
# HELP limited_calls Limited calls
limited_calls{limitador_namespace="llm/vllm-gateway"} 8
# HELP authorized_calls Authorized calls
authorized_calls{limitador_namespace="llm/vllm-gateway"} 12
```

## Load Testing

### Generate Mixed Traffic

Create realistic load with both free and premium users:

```bash
# Mixed load test
echo "Starting mixed load test..."

# Premium user burst
for i in {1..5}; do
  curl -s -o /dev/null -w "Premium req $i: %{http_code}\n" \
    -X POST http://localhost:8000/v1/completions \
    -H 'Authorization: APIKEY premiumuser1_key' \
    -H 'Content-Type: application/json' \
    -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Premium request","max_tokens":10}'
done

# Free user burst (should hit limits quickly)
for i in {1..5}; do
  curl -s -o /dev/null -w "Free req $i: %{http_code}\n" \
    -X POST http://localhost:8000/v1/completions \
    -H 'Authorization: APIKEY freeuser1_key' \
    -H 'Content-Type: application/json' \
    -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Free request","max_tokens":10}'
done
```

### Rate Limit Recovery Test

Test rate limit recovery after the time window:

```bash
# Exhaust free tier limits
for i in {1..3}; do
  curl -s -o /dev/null -w "Initial req $i: %{http_code}\n" \
    -X POST http://localhost:8000/v1/completions \
    -H 'Authorization: APIKEY freeuser1_key' \
    -H 'Content-Type: application/json' \
    -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Test","max_tokens":10}'
done

echo "Waiting 2 minutes for rate limit reset..."
sleep 120

# Should work again
curl -s -o /dev/null -w "After reset: %{http_code}\n" \
  -X POST http://localhost:8000/v1/completions \
  -H 'Authorization: APIKEY freeuser1_key' \
  -H 'Content-Type: application/json' \
  -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Test","max_tokens":10}'
```

## Troubleshooting

### Check Rate Limit Policy Status

```bash
# Check RateLimitPolicy conditions
kubectl describe ratelimitpolicy basic-rate-limits -n llm

# Check if policy is properly applied
kubectl get ratelimitpolicy -n llm -o yaml
```

### Debug Rate Limiting Issues

```bash
# Check Limitador logs
kubectl logs -n kuadrant-system deployment/limitador-limitador -f

# Check Authorino logs
kubectl logs -n kuadrant-system deployment/authorino -f

# Check Envoy config for rate limiting
kubectl exec -n llm deployment/vllm-gateway-istio -c istio-proxy -- curl -s localhost:15000/config_dump | grep -A 20 -B 5 "rate_limit"
```

### Check Gateway and Route Status

```bash
# Verify Gateway is ready
kubectl get gateway vllm-gateway -n llm -o yaml

# Check HTTPRoute status
kubectl get httproute -n llm -o yaml

# Check if traffic is flowing
kubectl logs -n llm deployment/vllm-simulator -f
```

## Rate Limiting Configuration Details

### Rate Limit Windows

- **Free Tier**: 2 requests per 120 seconds (2 minutes)
- **Premium Tier**: 10 requests per 120 seconds (2 minutes)

### Counter Keys

Rate limits are enforced per user ID, extracted from the authenticated user's metadata:

- Counter key: `auth.identity.userid`
- Limits are independent per user

### Rate Limit Headers

When rate limited, responses include headers:

- `X-RateLimit-Limit`: The rate limit ceiling
- `X-RateLimit-Remaining`: Number of requests remaining
- `X-RateLimit-Reset`: Time when the rate limit resets

## Clean Up

```bash
# Remove policies and secrets
kubectl delete -f rate-limit-policy.yaml

# Stop port-forwarding
pkill -f "kubectl.*port-forward"
```

## Next Steps

- [Chargeback Metrics Demo](../kuadrant-chargeback-metrics/README.md)
- [Advanced Rate Limiting Scenarios](../kuadrant-advanced-rate-limiting/README.md)

## References

- [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/)
- [Limitador Documentation](https://docs.kuadrant.io/limitador/)
- [RateLimitPolicy API Reference](https://docs.kuadrant.io/kuadrant-operator/doc/reference/ratelimitpolicy/)
- [Gateway API Documentation](https://gateway-api.sigs.k8s.io/)
