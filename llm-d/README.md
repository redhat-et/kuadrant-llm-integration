# Kuadrant with llm-d Integration Demo

This demo demonstrates how to integrate [Kuadrant](https://docs.kuadrant.io/) API management with [llm-d](https://github.com/llm-d/llm-d), with potential chargeback capabilities, user tier management, and usage metric tracking for LLM inference services.

This is validated on OpenShift and Vanilla Kube running llm-d. The llm-d deployment is the decoupled charts
deployment we are going live with in the next release (week of 7/21) that can be reviewed here [llm-d-incubation/llm-d-infra](https://github.com/llm-d-incubation/llm-d-infra).

## Prerequisites

This example does not require GPUs since we are using a vLLM sim example new to llm-d. If you want to deploy on an accelerator, a good reference installation would be [Quickstart - Simple Deployment](https://github.com/llm-d-incubation/llm-d-infra/tree/main/quickstart/examples/simple) that can be deployed with `Qwen/Qwen3-0.6B` on EC2 4xL4 `g6.12xlarge` or 1xL4 `g6.2xlarge`. If you use the 1xL4 type, be sure to reduce the replica to `1` in [ms-sim/values.yaml](https://github.com/llm-d-incubation/llm-d-infra/blob/3e378594b9d2b45064774a1d14e2fb0e1dabc489/quickstart/examples/simple/ms-simple/values.yaml#L32)

- Kubernetes cluster (1.23+)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) configured
- [Helm 3.9+](https://helm.sh/docs/intro/install/)
- [llm-d deployment (release candidate)](https://github.com/llm-d-incubation/llm-d-infra) (installation detailed below)
- [llm-d pre-reqs](https://github.com/llm-d-incubation/llm-d-infra/blob/main/quickstart/install-deps.sh)

## Architecture

This demo deploys:
- **llm-d inference gateway**: Provides OpenAI-compatible API endpoints
- **Kuadrant control plane**: Authentication, authorization, and rate limiting
- **Enhanced Limitador**: Custom rate limiter with user/group metrics tracking
- **Prometheus integration**: Metrics collection for billing and monitoring

## Quick Start

### Step 1: Install llm-d

Deploy the llm-d infrastructure and model services:

```bash
# Clone and install llm-d infra
git clone https://github.com/llm-d-incubation/llm-d-infra.git
cd llm-d-incubation/llm-d-infra/quickstart

# Install infrastructure with Istio gateway
./llmd-infra-installer.sh --namespace llm-d \
  -r infra-sim \
  --gateway istio

# Deploy modelservice and Gateway Inference Engine (GIE)
cd examples/sim
helmfile --selector managedBy=helmfile apply helmfile.yaml --skip-diff-on-install

# Configure TLS workaround for the inference gateway
export EPP_NAMESPACE="llm-d"
export EPP_NAME=$(kubectl get svc -n "${EPP_NAMESPACE}" -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | grep -- "-epp" | head -n1)

cat <<EOF | kubectl apply -n "${EPP_NAMESPACE}" -f -
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: ${EPP_NAME}-insecure-tls
spec:
  host: ${EPP_NAME}
  trafficPolicy:
    tls:
      mode: SIMPLE
      insecureSkipVerify: true
EOF
```

### Step 2: Verify llm-d Installation

```bash
# Test the deployment
kubectl -n llm-d port-forward svc/infra-sim-inference-gateway-istio 8000:80

# In another terminal, test the API
curl -s http://localhost:8000/v1/models -H "Content-Type: application/json" | jq .
```

### Step 3: Install Kuadrant

```bash
# Add Kuadrant Helm repository
helm repo add kuadrant https://kuadrant.io/helm-charts
helm repo update

# Install Kuadrant Operator
helm install kuadrant-operator kuadrant/kuadrant-operator \
  --create-namespace \
  --namespace kuadrant-system

# Deploy Kuadrant Control Plane
cat <<EOF | kubectl apply -f -
apiVersion: kuadrant.io/v1beta1
kind: Kuadrant
metadata:
  name: kuadrant
  namespace: kuadrant-system
EOF

# Verify installation
kubectl get kuadrant kuadrant -n kuadrant-system \
  -o=jsonpath='{.status.conditions[?(@.type=="Ready")].message}{"\n"}'

kubectl get pods -n kuadrant-system
kubectl get crd | grep kuadrant
```

### Step 4: Configure Enhanced Limitador

Deploy the custom Limitador image with user/group tracking capabilities:

```bash
# Patch Limitador to use custom image
kubectl patch limitador limitador \
  -n kuadrant-system \
  --type merge \
  -p '{"spec":{"image":"ghcr.io/nerdalert/limitador:latest","version":""}}'

# Wait for rollout completion
kubectl rollout status deploy/limitador-limitador -n kuadrant-system

kubectl patch limitador limitador \
  -n kuadrant-system \
  --type merge \
  -p '{"spec":{"verbosity":3}}'
```

### Step 5: Apply Chargeback Policies

Deploy the authentication and rate limiting policies with user tiers:

```bash
kubectl apply -f llm-d-chargeback-policy.yaml

# Output
secret/freeuser1-apikey created
secret/freeuser2-apikey created
secret/premiumuser1-apikey created
secret/premiumuser2-apikey created
secret/enterpriseuser1-apikey created
authpolicy.kuadrant.io/chargeback-auth created
ratelimitpolicy.kuadrant.io/chargeback-limits created
```

This creates:

- API key secrets for different user tiers (free, premium, enterprise)
- AuthPolicy for user authentication and group extraction
- RateLimitPolicy with tiered rate limits

Apply the Prometheus service monitor

```bash
# may need to rename the namespace in the svc monitor manifest to openshift-monitoring
kubeclt apply -f limitador-servicemonitor.yaml
```

## User Tiers and Rate Limits

| Tier | Rate Limit | Users |
|------|------------|-------|
| **Free** | 2 requests per 2 minutes | `freeuser1`, `freeuser2` |
| **Premium** | 10 requests per 2 minutes | `premiumuser1`, `premiumuser2` |
| **Enterprise** | 50 requests per 2 minutes | `enterpriseuser1` |

## Testing the Integration

### Setup Port Forward

```bash
# Forward the llm-d inference gateway
kubectl -n llm-d port-forward svc/infra-sim-inference-gateway-istio 8000:80
```

### Test Different User Tiers

Use the following script to test rate limiting behavior across user tiers:

```bash
#!/bin/bash

# Set the model ID (use 'random' for infra-sim, 'Qwen/Qwen3-0.6B' for infra-simple)
export MODEL_ID="random"
echo "Using model: $MODEL_ID"
echo ""

# Premium user usage (should allow 10 requests)
echo "=== Premium User Usage ==="
for i in {1..15}; do
  printf "Premium req #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST http://localhost:8000/v1/completions \
       -H 'Authorization: APIKEY premiumuser1_key' \
       -H 'Content-Type: application/json' \
       -d "{\"model\":\"$MODEL_ID\",\"prompt\":\"Premium request\",\"max_tokens\":20}"
done

# Free user usage (should hit limits after 2 requests)
echo "=== Free User Usage ==="
for i in {1..5}; do
  printf "Free req #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST http://localhost:8000/v1/completions \
       -H 'Authorization: APIKEY freeuser1_key' \
       -H 'Content-Type: application/json' \
       -d "{\"model\":\"$MODEL_ID\",\"prompt\":\"Free request\",\"max_tokens\":10}"
done

# Another premium user
echo "=== Another Premium User ==="
for i in {1..6}; do
  printf "Premium2 req #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST http://localhost:8000/v1/completions \
       -H 'Authorization: APIKEY premiumuser2_key' \
       -H 'Content-Type: application/json' \
       -d "{\"model\":\"$MODEL_ID\",\"prompt\":\"Premium2 request\",\"max_tokens\":15}"
done
```

### Expected Output

Premium users should see `200` responses for their first 10 requests, then `429` (rate limited). Free users should see `200` for their first 2 requests, then `429`.

```bash
for i in {1..15}; do
  printf "Premium req #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -X POST http://localhost:8000/v1/completions \
       -H 'Authorization: APIKEY premiumuser1_key' \
       -H 'Content-Type: application/json' \
       -d "{\"model\":\"$MODEL_ID\",\"prompt\":\"Premium request\",\"max_tokens\":20}"
done
Premium req #1  -> 200
Premium req #2  -> 200
Premium req #3  -> 200
Premium req #4  -> 200
Premium req #5  -> 200
Premium req #6  -> 200
Premium req #7  -> 200
Premium req #8  -> 200
Premium req #9  -> 200
Premium req #10 -> 200
Premium req #11 -> 429  # Rate limited
Premium req #12 -> 429
Premium req #13 -> 429
Premium req #14 -> 429
Premium req #15 -> 429
```

## Monitoring and Metrics

### Access Limitador Metrics

```bash
# Forward Limitador metrics port
kubectl -n kuadrant-system port-forward svc/limitador-limitador 8080:8080

# View raw metrics
curl -s http://localhost:8080/metrics
# HELP limited_calls Limited calls
# TYPE limited_calls counter
authorized_calls{limitador_namespace="llm-d/ms-sim-llm-d-modelservice",user="premiumuser1"} 30
authorized_calls{limitador_namespace="llm-d/ms-sim-llm-d-modelservice",user="freeuser1"} 6
authorized_calls{limitador_namespace="llm-d/ms-sim-llm-d-modelservice",user="premiumuser2"} 20

# HELP limited_calls Limited calls
# TYPE limited_calls counter
limited_calls{limitador_namespace="llm-d/ms-sim-llm-d-modelservice",user="premiumuser1"} 53
limited_calls{limitador_namespace="llm-d/ms-sim-llm-d-modelservice",user="freeuser1"} 19
limited_calls{limitador_namespace="llm-d/ms-sim-llm-d-modelservice",user="premiumuser2"} 16
```

### View Active Rate Limits

```bash
# Check current limits for the llm-d namespace
curl -s http://localhost:8080/limits/llm-d%2Fms-sim-llm-d-modelservice | jq .
```

### Prometheus Integration

Scrape prometheus

```bash
# Forward Prometheus (adjust namespace as needed)
kubectl -n llm-d-monitoring port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090

# Query limited calls by user
curl -sG --data-urlencode 'query=limited_calls' \
    http://localhost:9090/api/v1/query | jq '.data.result'
```

- Limited Calls Output:

```json
[
  {
    "metric": {
      "__name__": "limited_calls",
      "chargeback_user": "premiumuser1",
      "container": "limitador",
      "endpoint": "http",
      "instance": "10.244.0.78:8080",
      "job": "limitador-limitador",
      "limitador_namespace": "llm-d/ms-sim-llm-d-modelservice",
      "namespace": "kuadrant-system",
      "pod": "limitador-limitador-f7566bfcb-mk672",
      "service": "limitador-limitador",
      "user": "premiumuser1"
    },
    "value": [
      1753150559.186,
      "53"
    ]
  },
  {
    "metric": {
      "__name__": "limited_calls",
      "chargeback_user": "freeuser1",
      "container": "limitador",
      "endpoint": "http",
      "instance": "10.244.0.78:8080",
      "job": "limitador-limitador",
      "limitador_namespace": "llm-d/ms-sim-llm-d-modelservice",
      "namespace": "kuadrant-system",
      "pod": "limitador-limitador-f7566bfcb-mk672",
      "service": "limitador-limitador",
      "user": "freeuser1"
    },
    "value": [
      1753150559.186,
      "19"
    ]
  },
  {
    "metric": {
      "__name__": "limited_calls",
      "chargeback_user": "premiumuser2",
      "container": "limitador",
      "endpoint": "http",
      "instance": "10.244.0.78:8080",
      "job": "limitador-limitador",
      "limitador_namespace": "llm-d/ms-sim-llm-d-modelservice",
      "namespace": "kuadrant-system",
      "pod": "limitador-limitador-f7566bfcb-mk672",
      "service": "limitador-limitador",
      "user": "premiumuser2"
    },
    "value": [
      1753150559.186,
      "16"
    ]
  }
]
```

----

```bash
# Query authorized calls by user
curl -sG --data-urlencode 'query=authorized_calls' \
    http://localhost:9090/api/v1/query | jq '.data.result'
```

- Authorized Calls Output:

```json
[
  {
    "metric": {
      "__name__": "authorized_calls",
      "chargeback_user": "premiumuser1",
      "container": "limitador",
      "endpoint": "http",
      "instance": "10.244.0.78:8080",
      "job": "limitador-limitador",
      "limitador_namespace": "llm-d/ms-sim-llm-d-modelservice",
      "namespace": "kuadrant-system",
      "pod": "limitador-limitador-f7566bfcb-mk672",
      "service": "limitador-limitador",
      "user": "premiumuser1"
    },
    "value": [
      1753150672.113,
      "30"
    ]
  },
  {
    "metric": {
      "__name__": "authorized_calls",
      "chargeback_user": "freeuser1",
      "container": "limitador",
      "endpoint": "http",
      "instance": "10.244.0.78:8080",
      "job": "limitador-limitador",
      "limitador_namespace": "llm-d/ms-sim-llm-d-modelservice",
      "namespace": "kuadrant-system",
      "pod": "limitador-limitador-f7566bfcb-mk672",
      "service": "limitador-limitador",
      "user": "freeuser1"
    },
    "value": [
      1753150672.113,
      "6"
    ]
  },
  {
    "metric": {
      "__name__": "authorized_calls",
      "chargeback_user": "premiumuser2",
      "container": "limitador",
      "endpoint": "http",
      "instance": "10.244.0.78:8080",
      "job": "limitador-limitador",
      "limitador_namespace": "llm-d/ms-sim-llm-d-modelservice",
      "namespace": "kuadrant-system",
      "pod": "limitador-limitador-f7566bfcb-mk672",
      "service": "limitador-limitador",
      "user": "premiumuser2"
    },
    "value": [
      1753150672.113,
      "20"
    ]
  }
]
```

### Debug Rate Limiting

```bash
# Check Limitador logs
kubectl logs -n kuadrant-system deployment/limitador-limitador -f

# View rate limit configuration
kubectl describe ratelimitpolicy chargeback-limits -n llm-d
```

## Clean Up


To remove the demo components:

```bash
# Remove policies and secrets
kubectl delete -f llm-d-chargeback-policy.yaml

# Remove Kuadrant
kubectl delete kuadrant kuadrant -n kuadrant-system
helm uninstall kuadrant-operator -n kuadrant-system

# Remove llm-d
helm uninstall infra-sim
# From the llm-d quickstart/examples/sim directory
helmfile --selector managedBy=helmfile destroy
```

## Next Steps

- Explore other demos in this repository (NOTE: the namesapces are not llm-d so use the kind deployment in the base README or modify namespaces in the kustomize manifests):
  - [Basic Authorization](../demos/authorino-authorization/README.md)
  - [Basic Rate Limiting](../demos/limitador-basic-rate-limiting/README.md)
  - [Chargeback Metrics](../demos/kuadrant-chargeback-metrics/README.md)
- Review the [main repository README](../README.md) for additional use cases
- Check out the [llm-d project examples](https://github.com/llm-d-incubation/llm-d-infra/tree/main/quickstart/examples) for more deployment options
