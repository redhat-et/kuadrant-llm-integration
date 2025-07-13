#!/bin/bash

# Istio Installation Script
# This script installs Istio using Helm with a specific version for load balancing support
# What this installs:
# - Gateway API CRDs (for HTTPRoute support)
# - Istio base components
# - Istiod control plane
# - Creates the `llm` and `llm-observability` namespaces
# - Enables Istio injection for `default`, `llm`, and `llm-observability` namespaces

set -e

MODE=${1:-apply}
TAG=1.26.2
HUB=gcr.io/istio-release

echo "Istio installation mode: $MODE"
echo "Using tag: $TAG"
echo "Using hub: $HUB"

if [[ "$MODE" == "apply" ]]; then
    echo "Installing Istio..."

    # Install Gateway API CRDs first
    echo "Installing Gateway API CRDs..."
    kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/standard-install.yaml

    # Install Istio base
    echo "Installing Istio base..."
    helm upgrade -i istio-base oci://$HUB/charts/base --version $TAG -n istio-system --create-namespace

    # Install Istiod
    echo "Installing Istiod..."
    helm upgrade -i istiod oci://$HUB/charts/istiod --version $TAG -n istio-system --set tag=$TAG --set hub=$HUB --wait

    # Create namespaces if they don't exist
    echo "Creating llm namespace..."
    kubectl create namespace llm --dry-run=client -o yaml | kubectl apply -f -
    echo "Creating llm-observability namespace..."
    kubectl create namespace llm-observability --dry-run=client -o yaml | kubectl apply -f -

    # Enable Istio injection for all namespaces
    echo "Enabling Istio injection for default namespace..."
    kubectl label namespace default istio-injection=enabled --overwrite
    echo "Enabling Istio injection for llm namespace..."
    kubectl label namespace llm istio-injection=enabled --overwrite
    echo "Enabling Istio injection for llm-observability namespace..."
    kubectl label namespace llm-observability istio-injection=enabled --overwrite

    echo "Istio installation completed successfully!"
    echo "Gateway API CRDs and Istio are now installed."
    echo "Istio injection is enabled for 'default', 'llm', and 'llm-observability' namespaces."
    echo "You can now deploy your applications with Istio Gateway and HTTPRoute support."

elif [[ "$MODE" == "uninstall" ]]; then
    echo "Uninstalling Istio..."

    # Remove Istio injection labels
    kubectl label namespace default istio-injection- --ignore-not-found
    kubectl label namespace llm istio-injection- --ignore-not-found
    kubectl label namespace llm-observability istio-injection- --ignore-not-found

    # Uninstall Helm releases
    helm uninstall istiod --ignore-not-found --namespace istio-system || true
    helm uninstall istio-base --ignore-not-found --namespace istio-system || true

    # Clean up any remaining resources
    helm template istio-base oci://$HUB/charts/base --version $TAG -n istio-system | kubectl delete -f - --ignore-not-found || true

    # Clean up Gateway API CRDs (optional - comment out if you want to keep them)
    echo "Cleaning up Gateway API CRDs..."
    kubectl delete -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/standard-install.yaml --ignore-not-found || true

    echo "Istio uninstallation completed!"

else
    echo "Usage: $0 [apply|uninstall]"
    echo "  apply     - Install Istio with Gateway API CRDs (default)"
    echo "  uninstall - Remove Istio and Gateway API CRDs"
    exit 1
fi
