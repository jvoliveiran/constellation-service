# 🏆 4 Golden Signals Dashboard - Quick Start

## 🚀 Step 1: Generate Traffic
```bash
# Run this to generate test traffic for 60 seconds
node ./scripts/generate-traffic.js
```

## 📊 Step 2: Open Prometheus
1. Go to **http://localhost:9090**
2. Click on **Graph** tab
3. Set time range to **"Last 5 minutes"**

## 🎯 Step 3: Essential Queries (Copy & Paste)

### 🚦 LATENCY - Response Time (P95)
```promql
histogram_quantile(0.95, rate(http_server_duration_bucket{http_route="/graphql"}[5m]))
```

### 📈 TRAFFIC - Requests per Second  
```promql
rate(http_server_duration_count{http_route="/graphql"}[5m])
```

### ❌ ERRORS - Error Rate Percentage
```promql
sum(rate(http_server_duration_count{http_route="/graphql",http_status_code=~"4..|5.."}[5m])) / sum(rate(http_server_duration_count{http_route="/graphql"}[5m])) * 100
```

### 🔥 SATURATION - Memory Usage Percentage
```promql
(sum(v8js_memory_heap_used) / sum(v8js_memory_heap_limit)) * 100
```

## 📋 Quick Dashboard Layout

Create 4 panels in Prometheus with these queries:

| Panel | Query | Expected Value |
|-------|-------|----------------|
| **Latency** | P95 response time | < 1 second |
| **Traffic** | Request rate | 0.5-2 req/sec |
| **Errors** | Error percentage | < 5% |
| **Saturation** | Memory usage | < 80% |

## 🎨 Visualization Tips

- **Switch to "Graph" view** for time series
- **Use "Table" view** for current values
- **Refresh every 15 seconds** for real-time monitoring
- **Zoom in** on interesting time periods

## 🚨 What to Look For

### ✅ Healthy Signals:
- Latency: Consistent, low values
- Traffic: Steady request flow
- Errors: Near zero
- Saturation: Stable, under 70%

### ⚠️ Warning Signs:
- Latency: Sudden spikes
- Traffic: Unusual patterns
- Errors: Any increase
- Saturation: Growing memory usage

## 🔗 Full Documentation
See `prometheus-dashboard-queries.md` for complete query library and advanced metrics.
