# WIP - Kuadrant wasm-shim metrics

## WIP Demo patch

### Demo Patch: [nerdalert/wasm-shim/tree/chargeback-wip](https://github.com/Kuadrant/wasm-shim/compare/main...nerdalert:wasm-shim:chargeback-wip)

- Creates a metric module where the wasm-shim calls `hostcalls::define_metric()` and `hostcalls::increment_metric()`
- Envoy receives the calls and registers the metrics in its stats system.
- `initialize_metrics()` - Sets up basic counters and initializes storage
- `increment_authorized_calls()` / `increment_limited_calls()` - Simple total counters

### 

1. The plugin encodes user, group, and namespace—directly in the metric name so the sidecar can
   emit a separate counter for every combination. Example output after the patch:
   `authorized_calls_with_user_and_group__user___premiumuser1___group___premium___namespace__llm_d`. Not pretty but
   without labels it is what it is.
2. Add a ServiceMonitor to relabel.
3. Relabeling metrics in Prometheus Inside the ServiceMonitor use metricRelabelings to:
    - pull user, group, namespace out of the name and turn them into real labels;
    - strip the long suffix so the metric name becomes authorized_calls_with_user_and_group or limited_calls_with_user_and_group;

### Example Usage

- Example Envoy wasm logs for authorized calls:

Calls directly to istio envoy admin port

```shell
$ kubectl -n llm-d exec -it $GATEWAY_POD -c istio-proxy -- curl -s http://127.0.0.1:15000/stats/prometheus | grep _calls_
# TYPE authorized_calls_total counter
authorized_calls_total{} 90
# TYPE authorized_calls_with_user_and_group__user___premiumuser1___group___premium___namespace__llm_d counter
authorized_calls_with_user_and_group__user___premiumuser1___group___premium___namespace__llm_d{} 90
# TYPE limited_calls_total counter
limited_calls_total{} 80
# TYPE limited_calls_with_user_and_group__user___premiumuser1___group___premium___namespace__llm_d counter
limited_calls_with_user_and_group__user___premiumuser1___group___premium___namespace__llm_d{} 80
```

Re-label via a `servicemonitor` to get it into something resembling labels

```shell
curl -sG 'http://localhost:9090/federate' \
     --data-urlencode 'match[]=authorized_calls_with_user_and_group' \
     --data-urlencode 'match[]=limited_calls_with_user_and_group' \
 | head
# TYPE authorized_calls_with_user_and_group untyped
authorized_calls_with_user_and_group{container="istio-proxy",endpoint="http-envoy-metrics",group="enterprise",instance="10.244.0.40:15090",job="infra-sim-gw-envoy-metrics",namespace="llm_d",pod="infra-sim-inference-gateway-istio-b4d9cb756-qtrdf",service="infra-sim-gw-envoy-metrics",user="enterpriseuser1",prometheus="llm-d-monitoring/prometheus-kube-prometheus-prometheus",prometheus_replica="prometheus-prometheus-kube-prometheus-prometheus-0"} 300 1753856977321
authorized_calls_with_user_and_group{container="istio-proxy",endpoint="http-envoy-metrics",group="free",instance="10.244.0.40:15090",job="infra-sim-gw-envoy-metrics",namespace="llm_d",pod="infra-sim-inference-gateway-istio-b4d9cb756-qtrdf",service="infra-sim-gw-envoy-metrics",user="freeuser1",prometheus="llm-d-monitoring/prometheus-kube-prometheus-prometheus",prometheus_replica="prometheus-prometheus-kube-prometheus-prometheus-0"} 25 1753856977321
authorized_calls_with_user_and_group{container="istio-proxy",endpoint="http-envoy-metrics",group="premium",instance="10.244.0.40:15090",job="infra-sim-gw-envoy-metrics",namespace="llm_d",pod="infra-sim-inference-gateway-istio-b4d9cb756-qtrdf",service="infra-sim-gw-envoy-metrics",user="premiumuser1",prometheus="llm-d-monitoring/prometheus-kube-prometheus-prometheus",prometheus_replica="prometheus-prometheus-kube-prometheus-prometheus-0"} 225 1753856977321
authorized_calls_with_user_and_group{container="istio-proxy",endpoint="http-envoy-metrics",group="premium",instance="10.244.0.40:15090",job="infra-sim-gw-envoy-metrics",namespace="llm_d",pod="infra-sim-inference-gateway-istio-b4d9cb756-qtrdf",service="infra-sim-gw-envoy-metrics",user="premiumuser2",prometheus="llm-d-monitoring/prometheus-kube-prometheus-prometheus",prometheus_replica="prometheus-prometheus-kube-prometheus-prometheus-0"} 30 1753856977321
# TYPE limited_calls_with_user_and_group untyped
limited_calls_with_user_and_group{container="istio-proxy",endpoint="http-envoy-metrics",group="enterprise",instance="10.244.0.40:15090",job="infra-sim-gw-envoy-metrics",namespace="llm_d",pod="infra-sim-inference-gateway-istio-b4d9cb756-qtrdf",service="infra-sim-gw-envoy-metrics",user="enterpriseuser1",prometheus="llm-d-monitoring/prometheus-kube-prometheus-prometheus",prometheus_replica="prometheus-prometheus-kube-prometheus-prometheus-0"} 150 1753856977321
limited_calls_with_user_and_group{container="istio-proxy",endpoint="http-envoy-metrics",group="free",instance="10.244.0.40:15090",job="infra-sim-gw-envoy-metrics",namespace="llm_d",pod="infra-sim-inference-gateway-istio-b4d9cb756-qtrdf",service="infra-sim-gw-envoy-metrics",user="freeuser1",prometheus="llm-d-monitoring/prometheus-kube-prometheus-prometheus",prometheus_replica="prometheus-prometheus-kube-prometheus-prometheus-0"} 19 1753856977321
limited_calls_with_user_and_group{container="istio-proxy",endpoint="http-envoy-metrics",group="premium",instance="10.244.0.40:15090",job="infra-sim-gw-envoy-metrics",namespace="llm_d",pod="infra-sim-inference-gateway-istio-b4d9cb756-qtrdf",service="infra-sim-gw-envoy-metrics",user="premiumuser1",prometheus="llm-d-monitoring/prometheus-kube-prometheus-prometheus",prometheus_replica="prometheus-prometheus-kube-prometheus-prometheus-0"} 165 1753856977321
limited_calls_with_user_and_group{container="istio-proxy",endpoint="http-envoy-metrics",group="premium",instance="10.244.0.40:15090",job="infra-sim-gw-envoy-metrics",namespace="llm_d",pod="infra-sim-inference-gateway-istio-b4d9cb756-qtrdf",service="infra-sim-gw-envoy-metrics",user="premiumuser2",prometheus="llm-d-monitoring/prometheus-kube-prometheus-prometheus",prometheus_replica="prometheus-prometheus-kube-prometheus-prometheus-0"} 8 1753856977321
```

- Or query a user specifically:

```shell
 curl -sG --data-urlencode   'query=authorized_calls_with_user_and_group{user="premiumuser1"}'   http://localhost:9090/api/v1/query | jq
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": {
          "__name__": "authorized_calls_with_user_and_group",
          "container": "istio-proxy",
          "endpoint": "http-envoy-metrics",
          "group": "premium",
          "instance": "10.244.0.40:15090",
          "job": "infra-sim-gw-envoy-metrics",
          "namespace": "llm_d",
          "pod": "infra-sim-inference-gateway-istio-b4d9cb756-qtrdf",
          "service": "infra-sim-gw-envoy-metrics",
          "user": "premiumuser1"
        },
        "value": [
          1753936896.748,
          "315"
        ]
      }
    ]
  }
}
```

- The `servicemonitor` looks like this:

```shell
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: infra-sim-gw-envoy-metrics
  namespace: llm-d
  labels:
    app.kubernetes.io/component: inference-gateway
    app.kubernetes.io/gateway:  infra-sim-inference-gateway
spec:
  selector:
    app.kubernetes.io/component: inference-gateway
    app.kubernetes.io/gateway:  infra-sim-inference-gateway
  ports:
    - name: http-envoy-metrics
      port: 15090
      targetPort: 15090
      protocol: TCP
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: infra-sim-gw-envoy-metrics
  namespace: llm-d-monitoring
  labels:
    release: prometheus            # ← must match Prometheus selector
    app.kubernetes.io/component: inference-gateway
    app.kubernetes.io/gateway:  infra-sim-inference-gateway
spec:
  namespaceSelector:
    matchNames: [llm-d]
  selector:
    matchLabels:
      app.kubernetes.io/component: inference-gateway
      app.kubernetes.io/gateway:  infra-sim-inference-gateway
  endpoints:
    - port: http-envoy-metrics
      path: /stats/prometheus
      interval: 15s
      scrapeTimeout: 10s
      honorLabels: true
      metricRelabelings:
        # Extract labels from authorized_* metrics
        - action: replace
          sourceLabels: [__name__]
          regex: authorized_calls_with_user_and_group__user___([A-Za-z0-9_-]+)___group___([A-Za-z0-9_-]+)___namespace__([A-Za-z0-9_-]+)
          targetLabel: user
          replacement: $1
        - action: replace
          sourceLabels: [__name__]
          regex: authorized_calls_with_user_and_group__user___([A-Za-z0-9_-]+)___group___([A-Za-z0-9_-]+)___namespace__([A-Za-z0-9_-]+)
          targetLabel: group
          replacement: $2
        - action: replace
          sourceLabels: [__name__]
          regex: authorized_calls_with_user_and_group__user___([A-Za-z0-9_-]+)___group___([A-Za-z0-9_-]+)___namespace__([A-Za-z0-9_-]+)
          targetLabel: namespace
          replacement: $3
        # Extract labels from limited_* metrics
        - action: replace
          sourceLabels: [__name__]
          regex: limited_calls_with_user_and_group__user___([A-Za-z0-9_-]+)___group___([A-Za-z0-9_-]+)___namespace__([A-Za-z0-9_-]+)
          targetLabel: user
          replacement: $1
        - action: replace
          sourceLabels: [__name__]
          regex: limited_calls_with_user_and_group__user___([A-Za-z0-9_-]+)___group___([A-Za-z0-9_-]+)___namespace__([A-Za-z0-9_-]+)
          targetLabel: group
          replacement: $2
        - action: replace
          sourceLabels: [__name__]
          regex: limited_calls_with_user_and_group__user___([A-Za-z0-9_-]+)___group___([A-Za-z0-9_-]+)___namespace__([A-Za-z0-9_-]+)
          targetLabel: namespace
          replacement: $3
        - action: replace
          sourceLabels: [__name__]
          regex: (authorized_calls_with_user_and_group)__.*$
          targetLabel: __name__
          replacement: $1
        - action: replace
          sourceLabels: [__name__]
          regex: (limited_calls_with_user_and_group)__.*$
          targetLabel: __name__
          replacement: $1
EOF
```

### Alternative Approaches (haven't investigated, just spit-balling):

1. Write out a log line with JSON labels from the Wasm filter and let a
   log‑based exporter convert it to proper prom metrics. More complexity and maintenance.

2. Side‑channel gRPC exporter from the filter to a local agent that does
   support labels. Heavier and complex but gives you first‑class labels without regexes. More complexity and maintenance.

3. Upstream label support proxy‑wasm ABI. There are some stale issues around this. One of these is from 2021, the other 4/2025. My guess
   is there is not much interest but ¯\\_(ツ)_/¯
- [Metric emission with custom labels and values #311](https://github.com/proxy-wasm/proxy-wasm-rust-sdk/issues/311)
- [Prometheus metric labels #130](https://github.com/proxy-wasm/proxy-wasm-cpp-sdk/issues/130)
