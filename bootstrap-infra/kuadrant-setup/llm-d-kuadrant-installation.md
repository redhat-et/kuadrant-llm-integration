# Deploying Kuadrant on llm-d Quickstart

This is compatable with a standard llm-d deployment. To bootstrap-infra your llm-d environment, see the [llm-d Quickstart](https://github.com/llm-d/llm-d-deployer/tree/main/quickstart). You may need to modify the namespace user here from `llm` to `llm-d` as that is the default namespace from the llm-d quickstart (or install llm-d with a matching namespace via the deployer). Istio and GAIE/IGW components are already deployed so no further setup is nessecary. You can jump straight into a demo.

This will walk through an end to end opiniotated install of all components. In this case we are going to use minikube but just skip the minikube portion for deploying on an existing cluster as seen in the llm-d quickstart.

## Quick llm-d Minikube llm-d Demo Install

See [Quickstart - Minikube](https://github.com/llm-d/llm-d-deployer/blob/main/quickstart/README-minikube.md) for a detailed installation guide.

```bash
git clone https://github.com/llm-d/llm-d-deployer.git
cd llm-d-deployer/quickstart
# deploy a minikube instance with GPU support
minikube start     --driver docker     --container-runtime docker     --gpus all     --memory no-limit --cpus no-limit
# Example EC2 instance with a GPU such as g6.2xlarge
./llmd-installer.sh --values-file examples/base/slim/base-slim.yaml
```

## Deploy a Demo

Next, modify the demo manifest with the default llm-d quickstart namespace (llm-d) and IGW (llm-d-inference-gateway).

```bash
# Replace the namespace with the default llm-d namespace
yq eval 'select(.metadata.namespace == "llm").metadata.namespace = "llm-d"' \
  -i demos/limitador-basic-rate-limiting/rate-limit-policy.yaml

# Replace the gateway with the default llm-d gateway name
yq eval 'select(.spec.targetRef.kind == "Gateway").spec.targetRef.name = "llm-d-inference-gateway"' \
  -i demos/limitador-basic-rate-limiting/rate-limit-policy.yaml
```

Next, apply the manifest

```bash
$ kubectl apply -f demos/limitador-basic-rate-limiting/rate-limit-policy.yaml
secret/freeuser1-apikey created
secret/freeuser2-apikey created
secret/premiumuser1-apikey created
secret/premiumuser2-apikey created
authpolicy.kuadrant.io/api-key-auth-with-groups created
ratelimitpolicy.kuadrant.io/basic-rate-limits created
```

Forward a port to the IGW

```bash
kubectl port-forward -n llm-d svc/llm-d-inference-gateway-istio 3000:80
```

Send some requests and see the rate-limiting and auth (run the same without a key and see the 401s returned)

```bash
for i in {1..5}; do
  printf "Free tier request #%-2s -> " "$i"
  curl -s -o /dev/null -w "%{http_code}\n" \
       -H 'Authorization: APIKEY freeuser1_key' \
       -X POST http://127.0.0.1:3000/v1/completions \
       -H 'Content-Type: application/json' \
       -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Test request","max_tokens":10}'
done
```

Example output:

```text
Free tier request #1  -> 200
Free tier request #2  -> 200
Free tier request #3  -> 429
Free tier request #4  -> 429
Free tier request #5  -> 429
```

- Continue with the **[→ Demos](../../README.md#Demos)** using the namespace and gateway substition pattern to the demo manifests.
