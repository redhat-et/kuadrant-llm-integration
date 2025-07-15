# Boostrap: vLLM Simulator with Istio Gateway and Prometheus on Vanilla Kubernetes

The following provides a Kubernetes deployment for the vLLM simulator with Istio service mesh and Prometheus monitoring for load balancing across multiple vLLM instances. This is an alternative to deploying llm-d and does not require a GPU
by leveraging [llm-d/llm-d-inference-sim](https://github.com/llm-d/llm-d-inference-sim).

This can be deployed on any Kubernetes cluster or Kind since no accelerator is required.

## 🚀 **Quick Start with Automated Script**

**For the easiest installation, use the automated quickstart script:**

```bash
# Install everything with default namespaces (llm, llm-observability)
./quickstart-install-infra.sh --kind

# Install with custom namespaces
./quickstart-install-infra.sh -n myapp -o myapp-monitoring

# See all options
./quickstart-install-infra.sh --help
```

The quickstart script automatically handles:
- Kind cluster creation (optional)
- Istio installation with Gateway API
- Prometheus Operator deployment
- vLLM simulator deployment
- Kuadrant installation
- Namespace management using Kustomize overlays

**Continue reading below for manual deployment instructions.**

## Base Architecture

- **vLLM Simulator**: A lightweight simulator that provides OpenAI-compatible API endpoints (deployed in `llm` namespace by default)
- **Kubernetes Gateway API**: Standard Gateway resource that provides external access and load balancing between vLLM instances (deployed in `llm` namespace by default)
- **HTTPRoute**: Kubernetes Gateway API resource that ensures traffic routes through the Gateway and picks up Envoy filtering in the datapath (deployed in `llm` namespace by default)
- **Prometheus**: Monitors and scrapes metrics from all services using Prometheus Operator (deployed in `llm-observability` namespace by default)
- **Kustomize**: Provides overlay configuration for different environments and namespace customization

**Default Namespaces:**
- `llm`: vLLM simulator, Gateway API resources, and application components
- `llm-observability`: Prometheus monitoring stack and observability components

**Note**: The quickstart script can deploy to custom namespaces using the `-n` and `-o` options.

## Prerequisites

- Kubernetes cluster (v1.20+)
- Helm v3.0+ (for Istio installation)
- `kubectl` configured to access your cluster
- `kustomize` (optional, kubectl has built-in kustomize support)
- `kind` (optional, for local development - automatically installed by quickstart script)

## Installation

## **Optional**: Setting up a Kind Cluster

If you don't have a Kubernetes cluster, you can set up a local Kind cluster:

```bash
# Install Kind (if not already installed)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.29.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Create a Kind cluster
kind create cluster --name llm-cluster --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 8000
    protocol: TCP
  - containerPort: 443
    hostPort: 8443
    protocol: TCP
EOF
```

## Quick Start

### Option 1: Automated Installation (Recommended)

```bash
# Clone the repo
git clone https://github.com/redhat-et/kuadrant-llm-integration
cd kuadrant-llm-integration

# Install everything with default namespaces (llm, llm-observability)
./quickstart-install-infra.sh --kind

# Or install with custom namespaces
./quickstart-install-infra.sh -n myapp -o myapp-monitoring
```

### Option 2: Manual Installation with Kustomize Overlays

Deploy the entire stack using Kustomize overlays:

```bash
# 0. Clone the repo
git clone https://github.com/redhat-et/kuadrant-llm-integration
cd kuadrant-llm-integration

# 1. Install Istio (creates llm and llm-observability namespaces by default)
# Set environment variables for custom namespaces (optional)
export VLLM_NAMESPACE=llm
export OBSERVABILITY_NAMESPACE=llm-observability
./kubernetes/helpers/istio-install.sh apply

# 2. Install Prometheus Operator CRDs
kubectl apply --server-side --field-manager=my-field-manager -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/master/bundle.yaml

# 3. Deploy vLLM components using default overlay
kubectl apply -k kubernetes/kustomize/overlays/default

# 4. Deploy Prometheus components using prometheus overlay
kubectl apply -k kubernetes/kustomize/overlays/prometheus

# 5. Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=vllm-simulator -n llm --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=llm-observability -n llm-observability --timeout=300s
```

If you want to scale vllm-sim instances, simply bump the replica count.

## Manual Deployment

If you prefer to deploy components individually:

```bash
# Install prerequisites
# Set environment variables for custom namespaces (optional)
export VLLM_NAMESPACE=llm
export OBSERVABILITY_NAMESPACE=llm-observability
./kubernetes/helpers/istio-install.sh apply
kubectl apply --server-side --field-manager=my-field-manager -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/master/bundle.yaml

# Deploy vLLM simulator using base resources (will be deployed to default namespace, requires manual namespace management)
kubectl apply -f kubernetes/kustomize/base/vllm-deployment.yaml -n llm
kubectl apply -f kubernetes/kustomize/base/vllm-service.yaml -n llm

# Deploy Gateway API resources
kubectl apply -f kubernetes/kustomize/base/istio-gateway.yaml -n llm

# Deploy Prometheus (llm-observability namespace)
kubectl apply -f kubernetes/kustomize/prometheus/prometheus-rbac.yaml -n llm-observability
kubectl apply -f kubernetes/kustomize/prometheus/prometheus-config.yaml -n llm-observability
kubectl apply -f kubernetes/kustomize/prometheus/prometheus-deployment.yaml -n llm-observability
kubectl apply -f kubernetes/kustomize/prometheus/llm-observability-servicemonitor.yaml -n llm-observability
```

**Note**: Manual deployment requires explicit namespace management. Consider using the overlays approach or the quickstart script for easier namespace handling.

## Accessing the Services

### vLLM Simulator API

The vLLM simulator is accessible through the Istio Gateway, which provides load balancing across multiple vLLM instances. For other deployments, replace the gateway service with the one that matches your environment:

**For Kind clusters:**

```bash
# Forward the ingress gw port
kubectl -n llm port-forward svc/vllm-gateway-istio 8000:80
```

**Test the API:**

```bash
# Test completions endpoint
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-0.6B",
    "prompt": "Meowdy partner",
    "max_tokens": 50
  }'

# Test chat completions endpoint
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-0.6B",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }'

# List available models
curl http://localhost:8000/v1/models
```

### Validate Prometheus

Access Prometheus dashboard or curl the endpoint by port-forwarding:

```bash
kubectl -n llm-observability port-forward svc/llm-observability 9090:9090
```

Then visit `http://localhost:9090` in your browser or curl the metrics endpoint at:

```bash
curl http://localhost:8000/metrics
```

### Scaling vLLM Instances

To scale your vLLM deployment for load balancing:

```bash
# Scale to 3 replicas in llm namespace
kubectl scale deployment vllm-simulator --replicas=3 -n llm

# Check the scaled pods
kubectl get pods -l app=vllm-simulator -n llm

# View the naive load balancing across your vllm replicas by displaying the pod name with each log line
kubectl logs -l app=vllm-simulator -n llm -f --prefix
```

<details>
<summary>Example output:</summary>
[pod/vllm-simulator-646cb8db6c-tgwm6/vllm-simulator] I0713 04:02:50.125728       1 simulator.go:310] "completion request received"
[pod/vllm-simulator-646cb8db6c-t9jvj/vllm-simulator] I0713 04:02:51.369322       1 simulator.go:310] "completion request received"
[pod/vllm-simulator-646cb8db6c-5bfg9/vllm-simulator] I0713 04:02:52.233316       1 simulator.go:310] "completion request received"
[pod/vllm-simulator-646cb8db6c-tgwm6/vllm-simulator] I0713 04:02:53.097022       1 simulator.go:310] "completion request received"
[pod/vllm-simulator-646cb8db6c-5bfg9/vllm-simulator] I0713 04:02:53.918130       1 simulator.go:310] "completion request received"
[pod/vllm-simulator-646cb8db6c-t9jvj/vllm-simulator] I0713 04:02:54.780033       1 simulator.go:310] "completion request received"
</details>

### Customization

To customize the deployment:

1. **Base Configuration**: Edit files in `kubernetes/kustomize/base/` and `kubernetes/kustomize/prometheus/`
2. **Environment-specific**: Create new overlays in `kubernetes/kustomize/overlays/` or use the quickstart script with custom namespaces
3. **Resource Limits**: Adjust CPU/memory limits in deployment manifests or create overlay patches
4. **Namespace Configuration**: Use the quickstart script's `-n` and `-o` options, or create custom overlays with different `namespace:` values

### Creating a New Environment

#### Option 1: Using the Quickstart Script (Recommended)

```bash
# Deploy to custom namespaces
./quickstart-install-infra.sh -n prod-llm -o prod-monitoring

# Deploy to existing cluster (no Kind)
./quickstart-install-infra.sh -n prod-llm -o prod-monitoring
```

#### Option 2: Creating Custom Overlays

```bash
# Create new overlay directory
mkdir -p kubernetes/kustomize/overlays/prod

# Create namespace definition
cat > kubernetes/kustomize/overlays/prod/namespace.yaml <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: prod-llm
  labels:
    name: prod-llm
    environment: prod
    project: vllm-simulator
EOF

# Create kustomization.yaml
cat > kubernetes/kustomize/overlays/prod/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: prod-llm

resources:
- ../../base
- namespace.yaml

labels:
- pairs:
    environment: prod
    project: vllm-simulator

namePrefix: prod-

replicas:
- name: vllm-simulator
  count: 3
EOF

# Deploy production environment
kubectl apply -k kubernetes/kustomize/overlays/prod
```

## Monitoring and Observability

### Prometheus Targets

The Prometheus instance is configured to scrape:

- vLLM simulator metrics (`/metrics` endpoint)
- Kubernetes pods with prometheus annotations
- Prometheus itself

### Service Discovery

Prometheus uses Kubernetes service discovery to automatically find and scrape services. Add these annotations to your services:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8000"
  prometheus.io/path: "/metrics"
```

## Troubleshooting

### Check Pod Status

```bash
# Check vLLM pods in llm namespace
kubectl get pods -l app=vllm-simulator -n llm

# Check Prometheus pods in llm-observability namespace
kubectl get pods -l app.kubernetes.io/instance=llm-observability -n llm-observability

# Check Istio system pods
kubectl get pods -n istio-system
```

### View Logs

```bash
# vLLM simulator logs
kubectl logs -l app=vllm-simulator -n llm 

# Prometheus logs
kubectl logs -l app.kubernetes.io/instance=llm-observability -n llm-observability

# Istio logs
kubectl logs -n istio-system -l app=istiod
```

### Check Istio Configuration

```bash
# Check Gateway API Gateway (llm namespace)
kubectl get gateway -n llm

# Check HTTPRoute (Gateway API) (llm namespace)
kubectl get httproute -n llm

# Check Gateway API resources cluster-wide
kubectl get gatewayclasses
kubectl get gateways.gateway.networking.k8s.io -n llm

# Check if Istio injection is enabled (note: not required for Gateway API)
kubectl get namespace default -o yaml | grep istio-injection
kubectl get namespace llm -o yaml | grep istio-injection
kubectl get namespace llm-observability -o yaml | grep istio-injection

# Check Istio ingress gateway
kubectl get svc istio-ingressgateway -n istio-system

# Verify Gateway API implementation
kubectl describe gateway vllm-gateway -n llm
kubectl describe httproute vllm-httproute -n llm
```

### Check Service Status

```bash
# Check vLLM service (llm namespace)
kubectl get svc vllm-simulator -n llm

# Check Prometheus service (llm-observability namespace)
kubectl get svc llm-observability -n llm-observability

# Check cross-namespace connectivity
kubectl get endpoints vllm-simulator -n llm
kubectl get endpoints llm-observability -n llm-observability
```

### Network Connectivity

```bash
# Check Gateway API and HTTPRoute status
kubectl get gateway vllm-gateway -n llm -o yaml
kubectl get httproute vllm-httproute -n llm -o yaml

# Check Istio proxy status
kubectl get pods -o wide -n llm
kubectl get pods -o wide -n llm-observability
istioctl proxy-status

# Verify Gateway API implementation status
kubectl describe gateway vllm-gateway -n llm
kubectl describe httproute vllm-httproute -n llm
```

### Check Prometheus Operator

```bash
# Check if Prometheus Operator is installed (cluster-wide)
kubectl get pods -A -l app.kubernetes.io/name=prometheus-operator

# Check Prometheus CRDs
kubectl get prometheus -n llm-observability
kubectl get servicemonitor -n llm-observability
```

## Load Balancing

### Traffic Distribution

The Kubernetes Gateway API automatically distributes traffic across all healthy vLLM instances. Traffic routing is handled by:

1. **Gateway (Gateway API)**: Standard Kubernetes Gateway API resource that provides ingress traffic management
2. **HTTPRoute (Gateway API)**: Official Kubernetes routing resource that ensures traffic flows through the Gateway and picks up Envoy filtering in the datapath

This configuration ensures:

- **Standards-based approach**: Uses official Kubernetes Gateway API instead of vendor-specific resources
- **Proper load balancing** across vLLM instances
- **Envoy filtering** is applied to all traffic
- **Observability** through Istio/Envoy metrics
- **Traffic policies** like retries, timeouts, and circuit breaking (via Gateway API features)
- **Portability** across different Gateway API implementations

You can configure advanced traffic policies by modifying the HTTPRoute in `kubernetes/kustomize/base/istio-gateway.yaml`. The simplified single-rule approach (`/` prefix) handles all traffic patterns including:

- `/v1/completions` and `/v1/chat/completions` (API endpoints)
- `/metrics` (Prometheus metrics)
- `/health` (Health checks)
- Any other paths

## Development

### Adding New Features

1. Update the base manifests in `kubernetes/manifests/`
2. Create or update overlays in `kubernetes/kustomize/overlays/`

### Testing

```bash
# Apply dev overlay (uses llm-dev namespace)
kubectl apply -k kubernetes/kustomize/overlays/dev

# Test the endpoints (assuming port-forwarding is set up)
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-3.5-turbo", "prompt": "Test", "max_tokens": 10}'

# Check metrics
curl http://localhost:8000/metrics

# Or test with the quickstart script
./quickstart-install-infra.sh -n dev-llm -o dev-monitoring
```

## Cleanup

### Option 1: Using the Quickstart Script (Recommended)

```bash
# Uninstall everything
./quickstart-install-infra.sh --uninstall

# Uninstall and delete Kind cluster
./quickstart-install-infra.sh --kind --uninstall
```

### Option 2: Manual Cleanup

To remove all resources manually:

```bash
# Remove vLLM application resources
kubectl delete -k kubernetes/kustomize/overlays/default

# Remove Prometheus resources
kubectl delete -k kubernetes/kustomize/overlays/prometheus

# Remove Istio (optional)
# Set environment variables for custom namespaces (if used)
export VLLM_NAMESPACE=llm
export OBSERVABILITY_NAMESPACE=llm-observability
./kubernetes/helpers/istio-install.sh uninstall

# Remove Prometheus Operator (optional)
kubectl delete -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/master/bundle.yaml

# Remove namespaces (optional)
kubectl delete namespace llm
kubectl delete namespace llm-observability
```

For Kind cluster:

```bash
kind delete cluster --name kuadrant-llm-cluster
```

## Namespace Configuration Summary

This deployment uses proper namespace isolation with Kustomize overlays:

### Default Namespaces
- **`llm`**: vLLM simulator, Gateway API resources
- **`llm-observability`**: Prometheus monitoring stack

### Customizing Namespaces

**Using the Quickstart Script:**
```bash
./quickstart-install-infra.sh -n <vllm-namespace> -o <observability-namespace>
```

**Using Environment Variables with istio-install.sh:**
```bash
export VLLM_NAMESPACE=my-app
export OBSERVABILITY_NAMESPACE=my-monitoring
./kubernetes/helpers/istio-install.sh apply
```

**Using Custom Overlays:**
Create new overlays in `kubernetes/kustomize/overlays/` with different `namespace:` values.

### Available Overlays
- `overlays/default/`: Uses `llm` namespace
- `overlays/dev/`: Uses `llm-dev` namespace with development patches
- `overlays/prometheus/`: Uses `llm-observability` namespace

The base resources in `kubernetes/kustomize/base/` and `kubernetes/kustomize/prometheus/` are namespace-agnostic and work with any overlay configuration.

## License

This project is licensed under the MIT License.
