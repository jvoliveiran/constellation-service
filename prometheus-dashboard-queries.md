# 🏆 4 Golden Signals Dashboard for Constellation Service

This document contains Prometheus queries for building a comprehensive monitoring dashboard based on the 4 Golden Signals.

## 📊 How to Use These Queries

1. Open Prometheus UI: **http://localhost:9090**
2. Go to **Graph** tab
3. Copy and paste any query below
4. Click **Execute**
5. Switch between **Table** and **Graph** views

---

## 🚦 1. LATENCY (Response Time)

### GraphQL API Response Time (95th Percentile)
```promql
histogram_quantile(0.95, 
  rate(http_server_duration_bucket{http_route="/graphql"}[5m])
)
```

### GraphQL API Response Time (Average)
```promql
rate(http_server_duration_sum{http_route="/graphql"}[5m]) / 
rate(http_server_duration_count{http_route="/graphql"}[5m])
```

### Response Time Distribution (50th, 90th, 95th, 99th percentiles)
```promql
histogram_quantile(0.50, rate(http_server_duration_bucket{http_route="/graphql"}[5m])) or
histogram_quantile(0.90, rate(http_server_duration_bucket{http_route="/graphql"}[5m])) or
histogram_quantile(0.95, rate(http_server_duration_bucket{http_route="/graphql"}[5m])) or
histogram_quantile(0.99, rate(http_server_duration_bucket{http_route="/graphql"}[5m]))
```

### Latency Heatmap (Response Time Buckets)
```promql
sum(rate(http_server_duration_bucket{http_route="/graphql"}[5m])) by (le)
```

---

## 📈 2. TRAFFIC (Request Volume)

### Request Rate (Requests per Second)
```promql
rate(http_server_duration_count{http_route="/graphql"}[5m])
```

### Total Requests (Last 5 minutes)
```promql
increase(http_server_duration_count{http_route="/graphql"}[5m])
```

### Request Rate by HTTP Method
```promql
sum(rate(http_server_duration_count{http_route="/graphql"}[5m])) by (http_method)
```

### Hourly Request Volume
```promql
sum(increase(http_server_duration_count{http_route="/graphql"}[1h]))
```

### Request Trend (24 hours)
```promql
sum(rate(http_server_duration_count{http_route="/graphql"}[1h]))
```

---

## ❌ 3. ERRORS (Error Rate)

### Error Rate (4xx and 5xx responses)
```promql
sum(rate(http_server_duration_count{http_route="/graphql",http_status_code=~"4..|5.."}[5m])) /
sum(rate(http_server_duration_count{http_route="/graphql"}[5m])) * 100
```

### Success Rate (2xx and 3xx responses)
```promql
sum(rate(http_server_duration_count{http_route="/graphql",http_status_code=~"2..|3.."}[5m])) /
sum(rate(http_server_duration_count{http_route="/graphql"}[5m])) * 100
```

### Error Count by Status Code
```promql
sum(rate(http_server_duration_count{http_route="/graphql"}[5m])) by (http_status_code)
```

### Error Rate Trend (Last 24 hours)
```promql
sum(rate(http_server_duration_count{http_route="/graphql",http_status_code=~"5.."}[1h])) /
sum(rate(http_server_duration_count{http_route="/graphql"}[1h]))
```

---

## 🔥 4. SATURATION (Resource Usage)

### Memory Usage (Heap Used)
```promql
sum(v8js_memory_heap_used) / 1024 / 1024
```

### Memory Usage Percentage
```promql
(sum(v8js_memory_heap_used) / sum(v8js_memory_heap_limit)) * 100
```

### Event Loop Utilization
```promql
nodejs_eventloop_utilization * 100
```

### Event Loop Delay (95th percentile)
```promql
nodejs_eventloop_delay_p95 * 1000
```

### Garbage Collection Rate
```promql
rate(v8js_gc_duration_count[5m])
```

### Garbage Collection Time (by type)
```promql
sum(rate(v8js_gc_duration_sum[5m])) by (v8js_gc_type)
```

### Available Memory per Heap Space
```promql
sum(v8js_memory_heap_space_available_size) by (v8js_heap_space_name) / 1024 / 1024
```

---

## 🗄️ DATABASE PERFORMANCE METRICS

### Database Query Duration (95th Percentile)
```promql
histogram_quantile(0.95, 
  rate(http_server_duration_bucket{http_route="/graphql"}[5m])
)
```

### Database Query Rate
```promql
sum(rate(http_server_duration_count{http_route="/graphql"}[5m]))
```

### Slow Database Operations (>100ms)
```promql
sum(rate(http_server_duration_bucket{http_route="/graphql",le="0.1"}[5m])) / 
sum(rate(http_server_duration_count{http_route="/graphql"}[5m]))
```

### Database Connection Time
```promql
histogram_quantile(0.95, 
  rate(http_client_duration_bucket[5m])
)
```

---

## 🎯 SLA & Business Metrics

### Availability (Uptime)
```promql
up{job="constellation-service"} * 100
```

### SLA Compliance (Requests under 500ms)
```promql
sum(rate(http_server_duration_bucket{http_route="/graphql",le="0.5"}[5m])) /
sum(rate(http_server_duration_count{http_route="/graphql"}[5m])) * 100
```

### Service Health Score (Combined metric)
```promql
(
  # Availability (40%)
  (up{job="constellation-service"} * 0.4) +
  # Low Error Rate (30%) - inverted so high success = high score
  ((1 - (sum(rate(http_server_duration_count{http_route="/graphql",http_status_code=~"5.."}[5m])) / sum(rate(http_server_duration_count{http_route="/graphql"}[5m])))) * 0.3) +
  # Fast Response (20%) - inverted so low latency = high score  
  ((1 - (histogram_quantile(0.95, rate(http_server_duration_bucket{http_route="/graphql"}[5m])) / 2)) * 0.2) +
  # Low Resource Usage (10%) - inverted so low usage = high score
  ((1 - (nodejs_eventloop_utilization)) * 0.1)
) * 100
```

---

## 🚨 Alerting Queries

### High Latency Alert (P95 > 1 second)
```promql
histogram_quantile(0.95, rate(http_server_duration_bucket{http_route="/graphql"}[5m])) > 1
```

### High Error Rate Alert (> 5%)
```promql
sum(rate(http_server_duration_count{http_route="/graphql",http_status_code=~"5.."}[5m])) /
sum(rate(http_server_duration_count{http_route="/graphql"}[5m])) > 0.05
```

### High Memory Usage Alert (> 80%)
```promql
(sum(v8js_memory_heap_used) / sum(v8js_memory_heap_limit)) > 0.8
```

### High Event Loop Utilization Alert (> 70%)
```promql
nodejs_eventloop_utilization > 0.7
```

---

## 📋 Dashboard Layout Recommendation

### Row 1: Overview (4 panels)
- **Latency:** P95 response time (single stat)
- **Traffic:** Request rate (single stat) 
- **Errors:** Error rate percentage (single stat)
- **Saturation:** Memory usage percentage (single stat)

### Row 2: Latency Details (2 panels)
- **Response Time Percentiles:** Time series graph
- **Latency Heatmap:** Heatmap visualization

### Row 3: Traffic Details (2 panels)  
- **Request Rate:** Time series graph
- **Request Volume:** Bar chart (hourly)

### Row 4: Errors & Health (2 panels)
- **Error Rate by Status Code:** Time series graph
- **Success Rate:** Time series graph

### Row 5: Saturation Details (3 panels)
- **Memory Usage:** Time series graph
- **Event Loop Metrics:** Time series graph  
- **Garbage Collection:** Time series graph

---

## 🎨 Visualization Tips

### For Prometheus UI:
1. **Time Series:** Use for trends over time
2. **Table:** Use for current values and rankings
3. **Time Range:** Set to "Last 1 hour" for real-time monitoring

### Color Coding Suggestions:
- 🟢 **Green:** Success rates, availability, healthy metrics
- 🟡 **Yellow:** Warning thresholds (70-90%)
- 🔴 **Red:** Critical thresholds (>90%), errors
- 🔵 **Blue:** Neutral metrics (traffic, latency)

### Thresholds:
- **Latency:** Good <500ms, Warning 500ms-1s, Critical >1s
- **Error Rate:** Good <1%, Warning 1-5%, Critical >5%
- **Memory:** Good <70%, Warning 70-90%, Critical >90%
- **Event Loop:** Good <50%, Warning 50-70%, Critical >70%
