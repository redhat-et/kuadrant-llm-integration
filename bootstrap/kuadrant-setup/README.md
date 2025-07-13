# Kuadrant Setup

This guide provides instructions for installing Kuadrant on a Kubernetes cluster with Gateway API and vLLM inference capabilities.

## Overview

Kuadrant is a cloud-native API management solution that provides authentication, authorization, and rate limiting for Gateway API. For a comprehensive understanding of Kuadrant's architecture and components, see the [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/).

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Kubernetes | 1.23+ | |
| Helm | 3.9+ | |
| Gateway API | `gateway.networking.k8s.io/v1beta1` | CRDs must be present |
| Istio | Latest | Sidecar injection enabled |
| vLLM Environment | - | See [kubernetes-setup](../kubernetes-setup/README.md) |

**Note**: This setup assumes you have a working Kubernetes cluster with Gateway API and vLLM inference environment. If you need to set up the base Kubernetes environment, please refer to the [kubernetes-setup](../kubernetes-setup/README.md) documentation first.

## Installation

### Step 1: Add Kuadrant Helm Repository

```bash
helm repo add kuadrant https://kuadrant.io/helm-charts
helm repo update
```

### Step 2: Install Kuadrant Operator

```bash
helm install kuadrant-operator kuadrant/kuadrant-operator \
  --create-namespace \
  --namespace kuadrant-system
```

### Step 3: Deploy Kuadrant Control Plane

```bash
cat <<EOF | kubectl apply -f -
apiVersion: kuadrant.io/v1beta1
kind: Kuadrant
metadata:
  name: kuadrant
  namespace: kuadrant-system
EOF
```

### Step 4: Verify Installation

```bash
# Check Kuadrant readiness
kubectl get kuadrant kuadrant -n kuadrant-system \
  -o=jsonpath='{.status.conditions[?(@.type=="Ready")].message}{"\n"}'

# Check all components are running
kubectl get pods -n kuadrant-system

# Verify CRDs are installed
kubectl get crd | grep kuadrant
```

Expected output should show:

- `kuadrant` resource in Ready state
- All pods in `kuadrant-system` namespace are Running
- Kuadrant CRDs are installed (AuthPolicy, RateLimitPolicy, etc.)

## Components Installed

After successful installation, you'll have:

- **Kuadrant Operator**: Manages the lifecycle of Kuadrant components
- **Authorino**: Provides authentication and authorization capabilities
- **Limitador**: Handles rate limiting and quota enforcement
- **DNS Operator**: Manages DNS records for multi-cluster scenarios

## Namespaces

This setup works with the following namespace structure:

- `kuadrant-system`: Kuadrant control plane components
- `llm`: vLLM inference workloads and Gateway API resources
- `llm-observability`: Monitoring and observability components

## Next Steps

Once Kuadrant is installed, you can proceed with the demos:

- [Basic Authorization](../../demos/authorino-authorization/README.md)
- [Rate Limiting](../../demos/limitador-basic-rate-limiting/README.md)
- [Chargeback Metrics](../../demos/kuadrant-chargeback-metrics/README.md)

## Troubleshooting

### Check Operator Logs

```bash
kubectl logs -n kuadrant-system deployment/kuadrant-operator -f
```

### Check Component Status

```bash
# Authorino
kubectl get pods -n kuadrant-system -l app.kubernetes.io/name=authorino

# Limitador
kubectl get pods -n kuadrant-system -l app.kubernetes.io/name=limitador
```

### Common Issues

**Issue**: Kuadrant not reaching Ready state
**Solution**: Check that Gateway API CRDs are installed and the namespace has proper RBAC permissions

**Issue**: Components not starting
**Solution**: Verify resource quotas and ensure sufficient cluster resources

## Clean Up

To remove Kuadrant:

```bash
# Remove Kuadrant custom resources
kubectl delete kuadrant kuadrant -n kuadrant-system

# Uninstall operator
helm uninstall kuadrant-operator -n kuadrant-system

# Remove namespace (optional)
kubectl delete namespace kuadrant-system
```

## References

- [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/)
- [Kuadrant Documentation](https://docs.kuadrant.io/)
- [Gateway API Documentation](https://gateway-api.sigs.k8s.io/)
