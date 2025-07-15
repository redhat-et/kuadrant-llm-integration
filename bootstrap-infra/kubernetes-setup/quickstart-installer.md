# Kuadrant LLM Integration Installer – Quick‑start

This repo ships a single helper script that stands up (or tears down) a whole demo stack:

* **Istio** + Gateway API
* **vLLM simulator** (vLLM endpoints and metrics)
* **Prometheus** monitoring
* *(Optional)* a **Kind** cluster

The script is idempotent: run it again and only missing pieces are applied.

---

## Prerequisites

| Tool      | Notes                                                       |
| --------- | ----------------------------------------------------------- |
| `kubectl` | Pointed at the cluster where you want to deploy.            |
| `helm`    | v3.x – the script installs it for you if it’s missing.      |
| `kind`    | Only needed if you use `--kind` to spin up a local cluster. |

---

## Run

```bash
git clone https://github.com/redhat-et/kuadrant-llm-integration
cd kuadrant-llm-integration
./quickstart-install-infra.sh --kind
```

---

## 2 · Typical use‑cases

| Goal                                                                                   | Command                                             |
| -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Default install** into namespaces `llm` + `llm‑observability` on the current cluster | `./quickstart-install-infra.sh`                     |
| **Spin up a Kind cluster** and install everything                                      | `./quickstart-install-infra.sh --kind`              |
| **Custom namespaces** (e.g. `my‑llm`, `my‑obs`)                                        | `./quickstart-install-infra.sh -n my-llm -o my-obs` |
| **Uninstall everything** (keeps the cluster)                                           | `./quickstart-install-infra.sh --uninstall`         |
| **Delete the Kind cluster**, if you created one                                        | `./quickstart-install-infra.sh --kind --uninstall`  |

---

## 3 · After it’s up

```bash
# Forward the Gateway
kubectl -n llm port-forward svc/vllm-gateway-istio 8000:80

# Test the completion endpoint
curl -X POST http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"Qwen/Qwen3-0.6B","prompt":"Hello","max_tokens":10}'
```

Prometheus:

```bash
kubectl -n llm-observability port-forward svc/llm-observability 9090:9090
```

Scale the simulator:

```bash
kubectl scale deploy vllm-simulator -n llm --replicas=3
```

That’s it—happy hacking!
