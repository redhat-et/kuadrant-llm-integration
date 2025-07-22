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

## llm-d Deployment

> To deploy on llm-d, please see this end to end walkthrough and demo 📖 **[→ Kuadrant with llm-d Integration Demo](llm-d/README.md)**

## Quick Start

### Prerequisites

- Kubernetes cluster (1.23+)
- [Helm 3.9+](https://helm.sh/docs/intro/install/)
- kubectl
- Kustomize – [installation](https://kubectl.docs.kubernetes.io/installation/kustomize/)
- yq (mikefarah) – [installation](https://github.com/mikefarah/yq?tab=readme-ov-file#install)
- jq – [download & install guide](https://stedolan.github.io/jq/download/)

### 1. Bootstrap Infra Environment

For a completely scripted quickstart see **[→ Kuadrant LLM Integration Installer – Quick‑start](./bootstrap-infra/kubernetes-setup/quickstart-installer.md)**.

Begin with 🏁 **[→ Bootstrapping a Kube cluster](./bootstrap-infra/kubernetes-setup/README.md)** to setup the base Kubernetes infra with Gateway API and vLLM.

**Options:**

- **Kind** - included is a fully functional Kind deployment including a vLLM simulator, Istio service mesh and Prometheus monitoring for load balancing across scalable vLLM replicas. See the Kind installation in [Bootstrapping a Kube cluster](./bootstrap-infra/kubernetes-setup/README.md) for instructions.
- Bring your own cluster, vanilla Kubernetes, [RHOAI](https://www.redhat.com/en/products/ai/openshift-ai), etc.
- **llm-d** - See 🏁 **[→ Deploying Kuadrant on llm-d Quickstart](./llm-d/README.md)**

### 2. Install Kuadrant

Follow the setup guide if you already have an existing cluster running:

📖 **[→ Kuadrant Setup Guide](bootstrap-infra/kuadrant-setup/README.md)**

- GPU acceleraters are not required as we are deploying a vLLM inference simulator service via the [llm-d](https://github.com/llm-d/llm-d-inference-sim) project. Swap out images to use vLLM or use the llm-d project option above for true end to end inference validation.

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
├── README.md
├── bootstrap-infra
│   ├── kuadrant-setup
│   │   ├── README.md
│   │   └── llm-d-kuadrant-installation.md
│   └── kubernetes-setup
│       ├── README.md
│       └── quickstart-installer.md
├── demos
│   ├── authorino-authorization
│   │   ├── README.md
│   │   └── auth-policy.yaml
│   ├── kuadrant-chargeback-metrics
│   │   ├── README.md
│   │   ├── chargeback-policy.yaml
│   │   └── limitador-servicemonitor.yaml
│   ├── limitador-basic-rate-limiting
│   │   ├── README.md
│   │   └── rate-limit-policy.yaml
│   └── limitador-token-rate-limiting
│       └── README.md
├── kubernetes
│   ├── helpers
│   │   └── istio-install.sh
│   ├── kustomize
│   │   ├── base
│   │   │   ├── istio-gateway.yaml
│   │   │   ├── kustomization.yaml
│   │   │   ├── vllm-deployment.yaml
│   │   │   └── vllm-service.yaml
│   │   ├── overlays
│   │   │   ├── default
│   │   │   │   ├── kustomization.yaml
│   │   │   │   └── namespace.yaml
│   │   │   ├── dev
│   │   │   │   ├── kustomization.yaml
│   │   │   │   ├── namespace.yaml
│   │   │   │   └── vllm-deployment-patch.yaml
│   │   │   └── prometheus
│   │   │       ├── kustomization.yaml
│   │   │       ├── kustomizeconfig.yaml
│   │   │       └── namespace.yaml
│   │   └── prometheus
│   │       ├── kuadrant-servicemonitors.yaml
│   │       ├── kustomization.yaml
│   │       ├── llm-observability-servicemonitor.yaml
│   │       ├── prometheus-config.yaml
│   │       ├── prometheus-deployment.yaml
│   │       └── prometheus-rbac.yaml
│   └── manifests
│       ├── istio-gateway.yaml
│       ├── kuadrant-servicemonitors.yaml
│       ├── prometheus-config.yaml
│       ├── prometheus-deployment.yaml
│       ├── prometheus-rbac.yaml
│       ├── vllm-deployment.yaml
│       └── vllm-service.yaml
├── llm-d
│   ├── README.md
│   ├── limitador-servicemonitor.yaml
│   └── llm-d-chargeback-policy.yaml
└── quickstart-install-infra.sh
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
Begin with the [Kind Setup](bootstrap-infra/kubernetes-setup/README.md) or bring your own llm-d or k8s cluster and then check out the [Kuadrant Setup](bootstrap-infra/kuadrant-setup/README.md) to prepare your environment, then explore the demos that match your use case!
