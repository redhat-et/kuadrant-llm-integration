# Kuadrant llm Integrations

A comprehensive demonstration of securing and managing vLLM inference services using Kuadrant's cloud-native API management capabilities with Gateway API.

## Repository Overview

This repository aims to demonstrates how to deploy and manage a production-ready vLLM inference gateway using Kuadrant for authentication, authorization, rate limiting, and usage tracking. The setup includes multiple focused demos that can be used independently or combined for comprehensive API management. This repo will also include forward-looking integrations that are buildng on top of the capabilities demoed that will include new software, extensions and integrations.

## Architecture

The solution leverages:

- **Kuadrant**: Cloud-native API management platform providing authentication, authorization, and rate limiting
- **Gateway API**: Vendor-neutral API for exposing services
- **Istio**: Service mesh for traffic management and observability
- **Prometheus**: Metrics collection and monitoring
- **Custom Limitador**: rate limiting with a WIP user/group Prometheus tracking for chargeback

For detailed architectural information, see the [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/).

## Quick Start

### Prerequisites

- Kubernetes cluster (1.23+)
- Helm 3.9+
- kubectl configured
- Gateway API CRDs installed

### 1. Bootstrap Environment

Begin with 🏁 **[→ Bootstrapping a Kube cluster](./bootstrap/kubernetes-setup/README.md)** to setup the base Kubernetes environment with Gateway API and vLLM.

**Options:**

- **Kind** - included is a fully functional Kind deployment including a vLLM simulator, Istio service mesh and Prometheus monitoring for load balancing across scalable vLLM replicas. See the Kind installation in [Bootstrapping a Kube cluster](./bootstrap/kubernetes-setup/README.md) for instructions.
- Bring your own cluster, vanilla Kubernetes, [RHOAI](https://www.redhat.com/en/products/ai/openshift-ai), etc.
- **llm-d** - This is compatable with a standard llm-d deployment. To bootstrap your llm-d environment, see the [llm-d Quickstart](https://github.com/llm-d/llm-d-deployer/tree/main/quickstart). You may need to modify the namespace user here from `llm` to `llm-d` as that is the default namespace from the llm-d quickstart (or install llm-d with a matching namespace via the deployer). Istio and GAIE/IGW components are already deployed so no further setup is nessecary. You can jump straight into a demo.

### 2. Install Kuadrant

Follow the setup guide:

📖 **[→ Kuadrant Setup Guide](bootstrap/kuadrant-setup/README.md)**

- Lightweight vLLM inference simulation service via the [llm-d](https://github.com/llm-d/llm-d-inference-sim) project.

### 3. Choose Your Demo

Select the appropriate demo based on your requirements:

| Demo | Description | Use Case |
|------|-------------|----------|
| **[Basic Authorization](demos/authorino-authorization/README.md)** | API key authentication | Secure API access with simple key-based auth |
| **[Rate Limiting](demos/limitador-basic-rate-limiting/README.md)** | Tiered rate limiting | Implement free/premium tiers with usage limits |
| **[Chargeback Metrics](demos/kuadrant-chargeback-metrics/README.md)** | Advanced usage tracking | Detailed billing and cost analysis |

## Demos

### 🔐 Basic Authorization

**[→ View Demo](demos/authorino-authorization/README.md)**

Demonstrates basic API key authentication using Kuadrant's Authorino component.

**Features:**

- API key-based authentication
- User identification and tracking
- Prometheus metrics integration

**Potential Use Case:** API security for inference gateways.

### 🚦 Rate Limiting

**[→ View Demo](demos/limitador-basic-rate-limiting/README.md)**

Implements tiered rate limiting with different limits for free and premium users.

**Features:**

- Multi-tier rate limiting (free/premium)
- User-based rate limit enforcement
- Rate limit recovery testing
- Detailed metrics and monitoring

**Potential Use Case:** Implementing SaaS-style API tiers and managing API consumption.

### 💰 Chargeback Metrics

**[→ View Demo](demos/kuadrant-chargeback-metrics/README.md)**

Advanced usage tracking with custom Limitador for detailed billing and cost analysis.

**Features:**

- Enhanced metrics with user/group tracking
- Cost calculation per user and tier
- Chargeback reporting and data export
- Custom Limitador with advanced capabilities

**Potential Use Case:** Enterprise environments requiring detailed usage analytics and billing.

## Key Features

### 🔒 Security & Authentication

- **API Key Authentication**: Secure access control using Kubernetes secrets
- **Policy-Based Authorization**: Fine-grained access control with OPA
- **Identity Extraction**: User and group information for personalized policies

### 🎯 Rate Limiting & Quotas

- **Tiered Rate Limiting**: Different limits for different user tiers
- **Per-User Enforcement**: Independent rate limits per authenticated user
- **Flexible Time Windows**: Configurable rate limit periods
- **Grace Period Handling**: Smooth recovery after rate limit resets

### 📊 Monitoring & Observability

- **Prometheus Integration**: Comprehensive metrics collection
- **User-Level Metrics**: Detailed tracking per user and group
- **Cost Tracking**: Usage-based billing and chargeback capabilities
- **Real-Time Dashboards**: Live monitoring and alerting

### 🏗️ Production-Ready Architecture

- **Cloud-Native Design**: Kubernetes-native components
- **Scalable Infrastructure**: Horizontal scaling for high availability
- **Standards-Based**: Uses Gateway API for vendor neutrality
- **Observability-First**: Built-in monitoring and logging

## Namespace Organization

The solution uses a well-organized namespace structure:

- **`llm`**: vLLM inference services and Gateway API resources
- **`llm-observability`**: Prometheus and monitoring components
- **`kuadrant-system`**: Kuadrant control plane (Authorino, Limitador, etc.)
- **`istio-system`**: Istio service mesh components

## Common Use Cases

### 1. API Gateway for ML Services

Deploy secure, scalable access to machine learning inference services with authentication and rate limiting.

### 2. SaaS API Monetization

Implement tiered pricing models with usage-based billing and detailed analytics.

### 3. Multi-Tenant ML Platform

Provide isolated access to ML services for different users and organizations.

### 4. Cost Management & Chargeback

Track and allocate costs based on actual API usage across different users and teams.

## Testing and Validation

Each demo includes comprehensive testing instructions:

- **Unit Tests**: Individual component validation
- **Integration Tests**: End-to-end workflow testing
- **Load Testing**: Performance and scalability validation
- **Metrics Validation**: Monitoring and alerting verification

## General Troubleshooting for all Demos

Common issues and solutions:

### Gateway API Issues

```bash
# Check Gateway API CRDs
kubectl get crd | grep gateway

# Verify Gateway status
kubectl get gateway -n llm
```

### Authentication Problems

```bash
# Check Authorino logs
kubectl logs -n kuadrant-system deployment/authorino

# Verify API key secrets
kubectl get secrets -n llm -l kuadrant.io/auth-secret=true
```

### Rate Limiting Issues

```bash
# Check Limitador status
kubectl get pods -n kuadrant-system -l app.kubernetes.io/name=limitador

# View rate limit policies
kubectl get ratelimitpolicy -n llm
```

## Repository Structure

```text
├── bootstrap/
│   |── kubernetes-setup                # Bootstrap a Kind or llm-d cluster or bring your own
│   └── kuadrant-setup/                 # Kuadrant installation and setup
├── demos/
│   ├── authorino-authorization/        # Basic API key authentication demo
│   ├── limitador-basic-rate-limiting/  # Rate limiting with user tiers
│   └── kuadrant-chargeback-metrics/    # Advanced usage tracking and billing
├── kubernetes/
│   ├── helpers/                        # Helper scripts for setup
│   └── kustomize/                      # Kubernetes manifests and overlays
└── README.md
```

## References

- [Kuadrant Documentation](https://docs.kuadrant.io/)
- [llm-d Project](https://github.com/llm-d/llm-d)
- [Kuadrant Architectural Overview](https://docs.kuadrant.io/1.0.x/architecture/docs/design/architectural-overview/)
- [Gateway API Documentation](https://gateway-api.sigs.k8s.io/)
- [Istio Documentation](https://istio.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)

---

## Lets Hack

Feel free to contribute use cases, demos, PRs or reach out for realtime colaboration via the llm-d project [Slack](https://github.com/llm-d/llm-d?tab=readme-ov-file#contribute).
Begin with the [Kind Setup](bootstrap/kubernetes-setup/README.md) or bring your own k8s cluster and then check out the [Kuadrant Setup](bootstrap/kuadrant-setup/README.md) to prepare your environment, then explore the demos that match your use case!
