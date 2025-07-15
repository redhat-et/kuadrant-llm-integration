# Authorino Authorization Demo

This demo demonstrates basic API key authentication using Kuadrant's Authorino component with the vLLM inference gateway.

## Overview

This demo showcases how to secure your vLLM inference API using API key authentication. Authorino provides cloud-native authentication and authorization capabilities for Gateway API resources. For more details on Authorino's architecture, see the [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/).

## Prerequisites

- Kubernetes cluster with Gateway API support
- Kuadrant installed (see [bootstrap-infra/kuadrant-setup](../../bootstrap-infra/kuadrant-setup/README.md))
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
kubectl apply -f demos/authorino-authorization/auth-policy.yaml
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
kubectl -n llm port-forward svc/vllm-gateway-istio 8000:80

# Forward Prometheus for metrics monitoring
kubectl -n llm-observability port-forward svc/llm-observability 9090:9090 &
```

### Test Valid API Key

Tails the auth logs:

```bash
kubectl -n kuadrant-system logs deploy/authorino -f --tail=100
```

Post a completion:

```bash
# Test with valid API key
curl -X POST http://localhost:8000/v1/completions \
  -H "Authorization: APIKEY valid-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-0.6B",
    "prompt": "Cats or dogs, or both?",
    "max_tokens": 50
  }'
```

Expected response: HTTP 200 with completion JSON response

<details>
<summary>Example Valid Key Output:</summary>
{"level":"info","ts":"2025-07-13T06:50:33Z","logger":"authorino.service.auth","msg":"incoming authorization request","request id":"3714a8e8-3c58-4790-82b2-f6c859333e8d","object":{"source":{"address":{"Address":{"SocketAddress":{"address":"127.0.0.1:55356","PortSpecifier":{"PortValue":55356}}}}},"destination":{"address":{"Address":{"SocketAddress":{"address":"127.0.0.1:80","PortSpecifier":{"PortValue":80}}}}},"request":{"http":{"id":"3714a8e8-3c58-4790-82b2-f6c859333e8d","method":"POST","path":"/v1/completions","host":"localhost:8000","scheme":"http"}}}}
{"level":"info","ts":"2025-07-13T06:50:33Z","logger":"authorino.service.auth","msg":"outgoing authorization response","request id":"3714a8e8-3c58-4790-82b2-f6c859333e8d","authorized":true,"response":"OK"}
</details>

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

<details>
<summary>Example Invalid Key Output:</summary>
{"level":"info","ts":"2025-07-13T06:51:52Z","logger":"authorino.service.auth","msg":"incoming authorization request","request id":"8ef94ff4-45cc-4626-b677-c96203490f0d","object":{"source":{"address":{"Address":{"SocketAddress":{"address":"127.0.0.1:55940","PortSpecifier":{"PortValue":55940}}}}},"destination":{"address":{"Address":{"SocketAddress":{"address":"127.0.0.1:80","PortSpecifier":{"PortValue":80}}}}},"request":{"http":{"id":"8ef94ff4-45cc-4626-b677-c96203490f0d","method":"POST","path":"/v1/completions","host":"localhost:8000","scheme":"http"}}}}
{"level":"info","ts":"2025-07-13T06:51:52Z","logger":"authorino.service.auth","msg":"outgoing authorization response","request id":"8ef94ff4-45cc-4626-b677-c96203490f0d","authorized":false,"response":"UNAUTHENTICATED","object":{"code":16,"message":"the API Key provided is invalid"}}
</details>

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

<details>
<summary>Example No Key Output:</summary>
{"level":"info","ts":"2025-07-13T06:51:14Z","logger":"authorino.service.auth","msg":"incoming authorization request","request id":"7633e4f5-a2c2-41dd-8eb9-291e0379325b","object":{"source":{"address":{"Address":{"SocketAddress":{"address":"127.0.0.1:46802","PortSpecifier":{"PortValue":46802}}}}},"destination":{"address":{"Address":{"SocketAddress":{"address":"127.0.0.1:80","PortSpecifier":{"PortValue":80}}}}},"request":{"http":{"id":"7633e4f5-a2c2-41dd-8eb9-291e0379325b","method":"POST","path":"/v1/completions","host":"localhost:8000","scheme":"http"}}}}
{"level":"info","ts":"2025-07-13T06:51:14Z","logger":"authorino.service.auth","msg":"outgoing authorization response","request id":"7633e4f5-a2c2-41dd-8eb9-291e0379325b","authorized":false,"response":"UNAUTHENTICATED","object":{"code":16,"message":"credential not found"}}
</details>

## Monitoring and Metrics

### Prometheus Authorino Metrics

- Check Authorino-specific metrics by running:

```bash
curl -G http://localhost:9090/api/v1/query      --data-urlencode 'query=auth_server_authconfig_response_status{namespace="kuadrant-system"}' | jq .
```

- And you should see something like this:

```json
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": {
          "__name__": "auth_server_authconfig_response_status",
          "authconfig": "a80f9d8cc9180652282f35eb7c84a0eb69e2615dd7120cc4b275ef0abbc45416",
          "endpoint": "http",
          "exported_namespace": "kuadrant-system",
          "instance": "10.244.0.16:8080",
          "job": "authorino-controller-metrics",
          "namespace": "kuadrant-system",
          "pod": "authorino-744569f65-c9jt9",
          "service": "authorino-controller-metrics",
          "status": "OK"
        },
        "value": [
          1752463372.071,
          "213"
        ]
      },
      {
        "metric": {
          "__name__": "auth_server_authconfig_response_status",
          "authconfig": "a80f9d8cc9180652282f35eb7c84a0eb69e2615dd7120cc4b275ef0abbc45416",
          "endpoint": "http",
          "exported_namespace": "kuadrant-system",
          "instance": "10.244.0.16:8080",
          "job": "authorino-controller-metrics",
          "namespace": "kuadrant-system",
          "pod": "authorino-744569f65-c9jt9",
          "service": "authorino-controller-metrics",
          "status": "UNAUTHENTICATED"
        },
        "value": [
          1752463372.071,
          "4"
        ]
      }
    ]
  }
}
```

For troubleshooting the scrape target/svcmonitor you can directly hit the Authorino endpoint `server-metrics` with:

```bash
kubectl -n kuadrant-system port-forward svc/authorino-controller-metrics 8080:8080
curl -s http://localhost:8080/server-metrics
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
