#!/bin/bash

# Kuadrant LLM Integration Infrastructure Quick Start Script
# This script sets up the complete infrastructure including:
# - Kind cluster (optional)
# - Istio with Gateway API
# - vLLM simulator
# - Prometheus monitoring
# - Kuadrant operator and components

set -e

# Default values
DEFAULT_NAMESPACE="llm"
DEFAULT_OBSERVABILITY_NAMESPACE="llm-observability"
KUADRANT_NAMESPACE="kuadrant-system"
KIND_CLUSTER_NAME="kuadrant-llm-cluster"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     OS=Linux;;
        Darwin*)    OS=Mac;;
        *)          OS="UNKNOWN";;
    esac
}

# Function to install Kind if not present
install_kind() {
    print_status "Installing Kind..."
    
    if [[ "$OS" == "Mac" ]]; then
        if command_exists brew; then
            brew install kind
        else
            # Manual installation for macOS
            curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.29.0/kind-darwin-amd64
            chmod +x ./kind
            sudo mv ./kind /usr/local/bin/kind
        fi
    elif [[ "$OS" == "Linux" ]]; then
        curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.29.0/kind-linux-amd64
        chmod +x ./kind
        sudo mv ./kind /usr/local/bin/kind
    else
        print_error "Unsupported operating system: $OS"
        exit 1
    fi
    
    print_status "Kind installed successfully"
}

# Function to install Helm if not present
install_helm() {
    print_status "Installing Helm..."
    
    if [[ "$OS" == "Mac" ]]; then
        if command_exists brew; then
            brew install helm
        else
            # Manual installation for macOS
            curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
        fi
    elif [[ "$OS" == "Linux" ]]; then
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    else
        print_error "Unsupported operating system: $OS"
        exit 1
    fi
    
    print_status "Helm installed successfully"
}

# Function to create Kind cluster
create_kind_cluster() {
    print_header "Creating Kind Cluster: $KIND_CLUSTER_NAME"
    
    # Check if cluster already exists
    if kind get clusters | grep -q "$KIND_CLUSTER_NAME"; then
        print_warning "Kind cluster '$KIND_CLUSTER_NAME' already exists. Deleting..."
        kind delete cluster --name "$KIND_CLUSTER_NAME"
    fi
    
    # Create Kind cluster with port mappings
    cat <<EOF | kind create cluster --name "$KIND_CLUSTER_NAME" --config=-
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
    
    print_status "Kind cluster created successfully"
    
    # Set kubectl context to the new cluster
    kubectl config use-context "kind-$KIND_CLUSTER_NAME"
}

# Function to check cluster connectivity
check_cluster() {
    print_status "Checking cluster connectivity..."
    
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Unable to connect to Kubernetes cluster"
        print_error "Please ensure you have a running cluster or use --kind to create one"
        exit 1
    fi
    
    print_status "Cluster connectivity verified"
}

# Function to create dynamic overlays with custom namespaces
create_dynamic_overlays() {
    local namespace=$1
    local observability_namespace=$2
    
    print_status "Creating dynamic overlays for namespaces: $namespace, $observability_namespace"
    
    # Create dynamic overlay for vLLM components
    local vllm_overlay_dir="$SCRIPT_DIR/kubernetes/kustomize/overlays/dynamic"
    mkdir -p "$vllm_overlay_dir"
    
    # Create vLLM overlay kustomization
    cat > "$vllm_overlay_dir/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: $namespace

resources:
- ../../base
- namespace.yaml

labels:
- pairs:
    environment: dynamic
    project: vllm-simulator
EOF
    
    # Create vLLM namespace definition
    cat > "$vllm_overlay_dir/namespace.yaml" <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: $namespace
  labels:
    name: $namespace
    environment: dynamic
    project: vllm-simulator
EOF

    # Create dynamic overlay for prometheus components
    local prometheus_overlay_dir="$SCRIPT_DIR/kubernetes/kustomize/overlays/prometheus-dynamic"
    mkdir -p "$prometheus_overlay_dir"

    # Create prometheus overlay kustomization
    cat > "$prometheus_overlay_dir/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: $observability_namespace

resources:
- ../../prometheus
- namespace.yaml

labels:
- pairs:
    environment: dynamic
    project: llm-observability
EOF

    # Create prometheus namespace definition
    cat > "$prometheus_overlay_dir/namespace.yaml" <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: $observability_namespace
  labels:
    name: $observability_namespace
    environment: dynamic
    project: llm-observability
EOF


    
    # Update prometheus config to use correct namespace for vLLM target
    cp "$SCRIPT_DIR/kubernetes/kustomize/prometheus/prometheus-config.yaml" "$prometheus_overlay_dir/prometheus-config-patch.yaml"
    
    # Create a patch for prometheus config with correct namespace references
    cat > "$prometheus_overlay_dir/prometheus-config-patch.yaml" <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: llm-observability-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    rule_files:

    scrape_configs:
    - job_name: 'prometheus'
      static_configs:
      - targets: ['localhost:9090']

    - job_name: 'vllm-simulator'
      static_configs:
      - targets: ['vllm-simulator.$namespace.svc.cluster.local:8000']
      metrics_path: /metrics
      scrape_interval: 10s

    - job_name: 'kubernetes-pods'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - default
          - $namespace
          - $observability_namespace
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: \$1:\$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name
EOF
    
    # Create a patch for servicemonitor with correct namespace
    cat > "$prometheus_overlay_dir/servicemonitor-patch.yaml" <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: vllm-simulator-monitor
  labels:
    app: vllm-simulator
spec:
  endpoints:
  - interval: 30s
    port: http
    path: /metrics
  selector:
    matchLabels:
      app: vllm-simulator
  namespaceSelector:
    matchNames:
    - $namespace
EOF

    # Create a patch for ClusterRoleBinding with correct namespace
    cat > "$prometheus_overlay_dir/rbac-patch.yaml" <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: llm-observability
subjects:
- kind: ServiceAccount
  name: llm-observability
  namespace: $observability_namespace
EOF
    
    # Update prometheus overlay to include patches
    cat >> "$prometheus_overlay_dir/kustomization.yaml" <<EOF

patches:
- path: prometheus-config-patch.yaml
- path: servicemonitor-patch.yaml
- path: rbac-patch.yaml
EOF
    
    print_status "Dynamic overlays created successfully"
}

# Function to cleanup dynamic overlays and restore files
cleanup_dynamic_overlays() {
    print_status "Cleaning up dynamic overlays..."
    
    # Remove dynamic overlays
    if [[ -d "$SCRIPT_DIR/kubernetes/kustomize/overlays/dynamic" ]]; then
        rm -rf "$SCRIPT_DIR/kubernetes/kustomize/overlays/dynamic"
    fi
    
    if [[ -d "$SCRIPT_DIR/kubernetes/kustomize/overlays/prometheus-dynamic" ]]; then
        rm -rf "$SCRIPT_DIR/kubernetes/kustomize/overlays/prometheus-dynamic"
    fi
    
    # Restore any backup files
    find "$SCRIPT_DIR/kubernetes/kustomize" -name "*.backup" | while read -r backup_file; do
        original_file="${backup_file%.backup}"
        if [[ -f "$backup_file" ]]; then
            mv "$backup_file" "$original_file"
        fi
    done
    
    # Clean up any backup files from istio-install.sh (no longer needed)
    if [[ -f "$SCRIPT_DIR/kubernetes/helpers/istio-install.sh.backup" ]]; then
        rm -f "$SCRIPT_DIR/kubernetes/helpers/istio-install.sh.backup"
    fi
    
    print_status "Cleanup completed"
}

# Function to install prerequisites
install_prerequisites() {
    print_status "Installing prerequisites..."
    
    # Check for required tools
    if ! command_exists kubectl; then
        print_error "kubectl is required but not installed"
        exit 1
    fi
    
    if ! command_exists helm; then
        print_warning "Helm not found. Installing..."
        install_helm
    fi
    
    print_status "Prerequisites check completed"
}

# Function to install Istio
install_istio() {
    local namespace=$1
    local observability_namespace=$2
    
    print_header "Installing Istio with Gateway API"
    
    # Set environment variables for istio-install.sh
    export VLLM_NAMESPACE="$namespace"
    export OBSERVABILITY_NAMESPACE="$observability_namespace"
    
    # Run istio installation
    chmod +x "$SCRIPT_DIR/kubernetes/helpers/istio-install.sh"
    "$SCRIPT_DIR/kubernetes/helpers/istio-install.sh" apply
    
    print_status "Istio installation completed"
}

# Function to install Prometheus Operator
install_prometheus_operator() {
    print_header "Installing Prometheus Operator"
    
    print_status "Installing Prometheus Operator CRDs..."
    kubectl apply --server-side --field-manager=quickstart-installer -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/master/bundle.yaml
    
    print_status "Prometheus Operator installed successfully"
}

# Function to deploy vLLM components
deploy_vllm() {
    print_header "Deploying vLLM Components"
    
    print_status "Deploying vLLM simulator and gateway..."
    kubectl apply -k "$SCRIPT_DIR/kubernetes/kustomize/overlays/dynamic"
    
    print_status "vLLM components deployed successfully"
}

# Function to deploy Prometheus monitoring
deploy_prometheus() {
    print_header "Deploying Prometheus Monitoring"
    
    print_status "Deploying Prometheus components..."
    kubectl apply -k "$SCRIPT_DIR/kubernetes/kustomize/overlays/prometheus-dynamic"
    
    print_status "Prometheus monitoring deployed successfully"
}

# Function to install Kuadrant
install_kuadrant() {
    print_header "Installing Kuadrant"

    print_status "Adding Kuadrant Helm repository..."
    helm repo add kuadrant https://kuadrant.io/helm-charts --force-update
    helm repo update

    print_status "Installing Kuadrant operator..."
    helm install kuadrant-operator kuadrant/kuadrant-operator \
        --create-namespace \
        --namespace "$KUADRANT_NAMESPACE"

    print_status "Waiting for Kuadrant operator to be ready..."
    kubectl wait --for=condition=available deployment/kuadrant-operator-controller-manager \
        -n "$KUADRANT_NAMESPACE" --timeout=300s

    print_status "Deploying Kuadrant control plane..."
    cat <<EOF | kubectl apply -f -
apiVersion: kuadrant.io/v1beta1
kind: Kuadrant
metadata:
  name: kuadrant
  namespace: $KUADRANT_NAMESPACE
EOF

    print_status "Kuadrant installation completed"
}

# Function to wait for deployments
wait_for_deployments() {
    local namespace=$1
    local observability_namespace=$2

    print_header "Waiting for Deployments to be Ready"

    print_status "Waiting for vLLM simulator to be ready..."
    kubectl wait --for=condition=ready pod -l app=vllm-simulator -n "$namespace" --timeout=300s

    print_status "Waiting for Prometheus to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=llm-observability -n "$observability_namespace" --timeout=300s

    print_status "Waiting for Kuadrant to be ready..."
    kubectl wait --for=condition=ready pod -l control-plane=controller-manager -n "$KUADRANT_NAMESPACE" --timeout=300s

    print_status "All deployments are ready"
}

# Function to print access instructions
print_access_instructions() {
    local namespace=$1
    local observability_namespace=$2

    print_header "Access Instructions"

    echo -e "${GREEN}vLLM Simulator API:${NC}"
    echo "  Port forward: kubectl -n $namespace port-forward svc/vllm-gateway-istio 8000:80"
    echo "  Test endpoint: curl -X POST http://localhost:8000/v1/completions \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"model\": \"Qwen/Qwen3-0.6B\", \"prompt\": \"Hello!\", \"max_tokens\": 50}'"
    echo ""

    echo -e "${GREEN}Prometheus Dashboard:${NC}"
    echo "  Port forward: kubectl -n $observability_namespace port-forward svc/llm-observability 9090:9090"
    echo "  Access: http://localhost:9090"
    echo ""

    echo -e "${GREEN}Kuadrant Components:${NC}"
    echo "  Check status: kubectl get kuadrant kuadrant -n $KUADRANT_NAMESPACE"
    echo "  View components: kubectl get pods -n $KUADRANT_NAMESPACE"
    echo ""

    echo -e "${GREEN}Scale vLLM instances:${NC}"
    echo "  Scale up: kubectl scale deployment vllm-simulator --replicas=3 -n $namespace"
    echo "  View logs: kubectl logs -l app=vllm-simulator -n $namespace -f --prefix"
}

# Function to uninstall everything
uninstall_everything() {
    local namespace=$1
    local observability_namespace=$2

    print_header "Uninstalling Kuadrant LLM Integration"

    print_status "Removing Kuadrant control plane..."
    kubectl delete kuadrant kuadrant -n "$KUADRANT_NAMESPACE" --ignore-not-found=true

    print_status "Uninstalling Kuadrant operator..."
    helm uninstall kuadrant-operator -n "$KUADRANT_NAMESPACE" --ignore-not-found || true

    print_status "Removing vLLM components..."
    if [[ -d "$SCRIPT_DIR/kubernetes/kustomize/overlays/dynamic" ]]; then
        kubectl delete -k "$SCRIPT_DIR/kubernetes/kustomize/overlays/dynamic" --ignore-not-found=true
    else
        # Fallback to default overlay if dynamic doesn't exist
        kubectl delete -k "$SCRIPT_DIR/kubernetes/kustomize/overlays/default" --ignore-not-found=true
    fi

    print_status "Removing Prometheus monitoring..."
    if [[ -d "$SCRIPT_DIR/kubernetes/kustomize/overlays/prometheus-dynamic" ]]; then
        kubectl delete -k "$SCRIPT_DIR/kubernetes/kustomize/overlays/prometheus-dynamic" --ignore-not-found=true
    else
        # Fallback to default overlay if dynamic doesn't exist
        kubectl delete -k "$SCRIPT_DIR/kubernetes/kustomize/overlays/prometheus" --ignore-not-found=true
    fi

    print_status "Removing Prometheus Operator..."
    kubectl delete -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/master/bundle.yaml --ignore-not-found=true

    print_status "Removing Istio..."
    if [[ -f "$SCRIPT_DIR/kubernetes/helpers/istio-install.sh" ]]; then
        # Set environment variables for istio-install.sh
        export VLLM_NAMESPACE="$namespace"
        export OBSERVABILITY_NAMESPACE="$observability_namespace"
        "$SCRIPT_DIR/kubernetes/helpers/istio-install.sh" uninstall
    fi

    print_status "Removing namespaces..."
    kubectl delete namespace "$namespace" --ignore-not-found=true
    kubectl delete namespace "$observability_namespace" --ignore-not-found=true
    kubectl delete namespace "$KUADRANT_NAMESPACE" --ignore-not-found=true

    if [[ "$USE_KIND" == "true" ]]; then
        print_status "Deleting Kind cluster..."
        kind delete cluster --name "$KIND_CLUSTER_NAME" --ignore-not-found || true
    fi

    print_status "Uninstallation completed"

    # Cleanup dynamic overlays
    cleanup_dynamic_overlays
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --namespace NAME           Namespace for vLLM components (default: $DEFAULT_NAMESPACE)"
    echo "  -o, --observability-namespace  Namespace for observability components (default: $DEFAULT_OBSERVABILITY_NAMESPACE)"
    echo "  -k, --kind                     Create a Kind cluster for testing"
    echo "  -u, --uninstall                Uninstall all components"
    echo "  -h, --help                     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --kind                      # Create Kind cluster and install everything"
    echo "  $0 -n myapp -o myapp-obs       # Install with custom namespaces using dynamic overlays"
    echo "  $0 --uninstall                 # Uninstall everything"
    echo "  $0 --kind --uninstall          # Uninstall and delete Kind cluster"
}

# Main function
main() {
    local namespace="$DEFAULT_NAMESPACE"
    local observability_namespace="$DEFAULT_OBSERVABILITY_NAMESPACE"
    local uninstall=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--namespace)
                namespace="$2"
                shift 2
                ;;
            -o|--observability-namespace)
                observability_namespace="$2"
                shift 2
                ;;
            -k|--kind)
                USE_KIND=true
                shift
                ;;
            -u|--uninstall)
                uninstall=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    # Detect operating system
    detect_os
    print_status "Detected OS: $OS"

    # Handle uninstall
    if [[ "$uninstall" == "true" ]]; then
        if [[ "$USE_KIND" == "true" ]]; then
            # For Kind uninstall, we just delete the cluster
            print_status "Deleting Kind cluster..."
            kind delete cluster --name "$KIND_CLUSTER_NAME" --ignore-not-found || true
        else
            # Check if cluster exists before uninstalling
            if kubectl cluster-info &> /dev/null; then
                uninstall_everything "$namespace" "$observability_namespace"
            else
                print_warning "No cluster found or cluster is not accessible"
            fi
        fi
        cleanup_dynamic_overlays
        exit 0
    fi

    # Handle installation
    print_header "Kuadrant LLM Integration Quick Start"
    print_status "Namespace: $namespace"
    print_status "Observability namespace: $observability_namespace"

    # Install prerequisites
    install_prerequisites

    # Create Kind cluster or check existing cluster
    if [[ "$USE_KIND" == "true" ]]; then
        if ! command_exists kind; then
            install_kind
        fi
        create_kind_cluster
    else
        check_cluster
    fi

    # Create dynamic overlays for the specified namespaces
    create_dynamic_overlays "$namespace" "$observability_namespace"

    # Install components
    install_istio "$namespace" "$observability_namespace"
    install_prometheus_operator
    deploy_vllm
    deploy_prometheus
    install_kuadrant

    # Wait for deployments to be ready
    wait_for_deployments "$namespace" "$observability_namespace"

    # Print access instructions
    print_access_instructions "$namespace" "$observability_namespace"

    # Cleanup dynamic overlays
    cleanup_dynamic_overlays

    print_status "Installation completed successfully!"
}

# Run main function with all arguments
main "$@"
