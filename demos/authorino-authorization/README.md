# Authorino Authorization Demo

This demo demonstrates basic API key authentication using Kuadrant's Authorino component with the vLLM inference gateway.

## Overview

This demo showcases how to secure your vLLM inference API using API key authentication. Authorino provides cloud-native authentication and authorization capabilities for Gateway API resources. For more details on Authorino's architecture, see the [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/).

## Prerequisites

- Kubernetes cluster with Gateway API support
- Kuadrant installed (see [bootstrap/kuadrant-setup](../../bootstrap/kuadrant-setup/README.md))
- vLLM inference environment (see [kubernetes-setup](../../kubernetes-setup/README.md))
- `kubectl` configured to access your cluster

## Architecture

This demo sets up:

- **API Key Secrets**: Kubernetes secrets containing API keys for different users
- **AuthPolicy**: Kuadrant policy that defines authentication rules for the Gateway
- **vLLM Gateway**: Gateway API resource that routes traffic to vLLM inference services

## Setup

### Step 1: Deploy API Key Secrets and AuthPolicy

```bash
kubectl apply -f auth-policy.yaml
```

### Step 2: Verify Resources

```bash
# Check API key secrets
kubectl get secrets -n llm -l kuadrant.io/auth-secret=true

# Check AuthPolicy
kubectl get authpolicy -n llm

# Check Gateway status
kubectl get gateway -n llm
```

## Testing

### Setup Port Forwarding

```bash
# Forward the Gateway port (keep this running)
kubectl -n llm port-forward svc/vllm-gateway-istio 8000:80 &

# Forward Prometheus for metrics monitoring
kubectl -n llm-observability port-forward svc/llm-observability 9090:9090 &
```

### Test Valid API Key

```bash
# Test with valid API key
curl -X POST http://localhost:8000/v1/completions \
  -H "Authorization: APIKEY valid-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-0.6B",
    "prompt": "Hello, how are you?",
    "max_tokens": 50
  }'
```

Expected response: HTTP 200 with completion JSON response

### Test Invalid API Key

```bash
# Test with invalid API key
curl -X POST http://localhost:8000/v1/completions \
  -H "Authorization: APIKEY invalid-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-0.6B",
    "prompt": "Hello, how are you?",
    "max_tokens": 50
  }'
```

Expected response: HTTP 401 Unauthorized

### Test Without API Key

```bash
# Test without API key
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-0.6B",
    "prompt": "Hello, how are you?",
    "max_tokens": 50
  }'
```

Expected response: HTTP 401 Unauthorized

## Monitoring and Metrics

### Prometheus Metrics

Access Prometheus dashboard at `http://localhost:9090` and query:

```promql
# Total requests to the vLLM service
rate(istio_requests_total{destination_service_name="vllm-simulator"}[5m])

# Authentication success/failure rates
rate(istio_requests_total{destination_service_name="vllm-simulator"}[5m]) by (response_code)

# Request latency
histogram_quantile(0.95, rate(istio_request_duration_milliseconds_bucket{destination_service_name="vllm-simulator"}[5m]))
```

### Authorino Metrics

Check Authorino-specific metrics:

```promql
# Authentication requests
rate(authorino_auth_requests_total[5m])

# Authentication response times
histogram_quantile(0.95, rate(authorino_auth_request_duration_seconds_bucket[5m]))
```

### View Authorino Logs

```bash
# View Authorino logs for authentication events
kubectl logs -n kuadrant-system deployment/authorino -f
```

## Load Testing

Generate load to test authentication performance:

```bash
# Generate 100 requests with valid API key
for i in {1..100}; do
  echo "Request $i"
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:8000/v1/completions \
    -H "Authorization: APIKEY valid-api-key-123" \
    -H "Content-Type: application/json" \
    -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Test","max_tokens":10}'
done
```

## Troubleshooting

### Check Gateway Status

```bash
# Verify Gateway is accepting traffic
kubectl describe gateway vllm-gateway -n llm

# Check HTTPRoute status
kubectl get httproute -n llm
```

### Check AuthPolicy Status

```bash
# Check AuthPolicy conditions
kubectl describe authpolicy api-key-auth -n llm

# Check if AuthPolicy is properly applied
kubectl get authpolicy -n llm -o yaml
```

### Debug Authentication Issues

```bash
# Check Authorino logs
kubectl logs -n kuadrant-system deployment/authorino

# Check Istio proxy logs
kubectl logs -n llm deployment/vllm-gateway-istio -c istio-proxy

# Check Envoy config for auth filters
kubectl exec -n llm deployment/vllm-gateway-istio -c istio-proxy -- curl -s localhost:15000/config_dump | grep -A 20 -B 5 "authorino"
```

## Configuration Details

### Secret Structure

API key secrets must have:

- Label: `kuadrant.io/auth-secret: "true"`
- Label: `app: llm-gateway` (for selector matching)
- Data field: `api_key` containing the actual key

### Authentication Flow

1. Client sends request with `Authorization: APIKEY <key>` header
2. Istio proxy intercepts request and forwards to Authorino
3. Authorino validates the API key against Kubernetes secrets
4. If valid, request is forwarded to vLLM service
5. If invalid, 401 Unauthorized is returned

## Clean Up

```bash
# Remove AuthPolicy and secrets
kubectl delete -f auth-policy.yaml

# Stop port-forwarding
pkill -f "kubectl.*port-forward"
```

## Next Steps

- [Rate Limiting Demo](../limitador-basic-rate-limiting/README.md)
- [Chargeback Metrics Demo](../kuadrant-chargeback-metrics/README.md)

## References

- [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/)
- [Authorino Documentation](https://docs.kuadrant.io/authorino/)
- [Gateway API Documentation](https://gateway-api.sigs.k8s.io/)
