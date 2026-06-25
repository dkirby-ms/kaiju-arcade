/**
 * Prometheus Metrics Registry
 *
 * Lightweight in-process Prometheus text format registry.
 * Zero external dependencies — implements counters, gauges, and histograms manually.
 *
 * The /metrics endpoint exposes text format for scraping by a Prometheus sidecar.
 * DO NOT use session IDs, room IDs, or player names as label values (high cardinality).
 */

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface CounterState {
  type: "counter";
  help: string;
  values: Map<string, number>;
}

interface GaugeState {
  type: "gauge";
  help: string;
  values: Map<string, number>;
}

interface HistogramState {
  type: "histogram";
  help: string;
  buckets: number[];
  values: Map<string, HistogramBucket>;
}

interface HistogramBucket {
  count: number;
  sum: number;
  bucketCounts: number[];
}

type MetricState = CounterState | GaugeState | HistogramState;

const registry = new Map<string, MetricState>();

// ---------------------------------------------------------------------------
// Label serialisation helpers
// ---------------------------------------------------------------------------

function labelKey(labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) {
    return "";
  }
  const sorted = Object.keys(labels).sort();
  return sorted.map((k) => `${k}=${labels[k]}`).join(",");
}

function labelString(labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) {
    return "";
  }
  const sorted = Object.keys(labels).sort();
  const pairs = sorted.map((k) => `${k}="${labels[k]}"`).join(",");
  return `{${pairs}}`;
}

// ---------------------------------------------------------------------------
// Metric registration
// ---------------------------------------------------------------------------

function registerCounter(name: string, help: string): void {
  if (!registry.has(name)) {
    registry.set(name, { type: "counter", help, values: new Map() });
  }
}

function registerGauge(name: string, help: string): void {
  if (!registry.has(name)) {
    registry.set(name, { type: "gauge", help, values: new Map() });
  }
}

function registerHistogram(name: string, help: string, buckets: number[]): void {
  if (!registry.has(name)) {
    registry.set(name, { type: "histogram", help, buckets: [...buckets].sort((a, b) => a - b), values: new Map() });
  }
}

// ---------------------------------------------------------------------------
// Pre-register all metrics at module load
// ---------------------------------------------------------------------------

registerCounter(
  "kaiju_join_total",
  "Total player join attempts"
);

registerCounter(
  "kaiju_disconnect_total",
  "Total player disconnections"
);

registerCounter(
  "kaiju_reconnect_total",
  "Total player reconnect attempts"
);

registerGauge(
  "kaiju_active_rooms",
  "Number of currently active match rooms"
);

registerGauge(
  "kaiju_active_players",
  "Number of currently connected players"
);

registerHistogram(
  "kaiju_tick_duration_ms",
  "Game loop tick execution duration in milliseconds",
  [10, 20, 30, 50, 75, 100]
);

registerHistogram(
  "kaiju_join_latency_ms",
  "Join request processing latency in milliseconds",
  [100, 500, 1000, 2000, 3000, 5000]
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function incCounter(name: string, labels?: Record<string, string>): void {
  const metric = registry.get(name);
  if (!metric || metric.type !== "counter") {
    return;
  }
  const key = labelKey(labels);
  metric.values.set(key, (metric.values.get(key) ?? 0) + 1);
}

export function setGauge(name: string, value: number, labels?: Record<string, string>): void {
  const metric = registry.get(name);
  if (!metric || metric.type !== "gauge") {
    return;
  }
  const key = labelKey(labels);
  metric.values.set(key, value);
}

export function observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
  const metric = registry.get(name);
  if (!metric || metric.type !== "histogram") {
    return;
  }
  const key = labelKey(labels);
  let bucket = metric.values.get(key);
  if (!bucket) {
    bucket = {
      count: 0,
      sum: 0,
      bucketCounts: new Array(metric.buckets.length).fill(0) as number[],
    };
    metric.values.set(key, bucket);
  }
  bucket.count++;
  bucket.sum += value;
  for (let i = 0; i < metric.buckets.length; i++) {
    if (value <= metric.buckets[i]) {
      bucket.bucketCounts[i]++;
    }
  }
}

// ---------------------------------------------------------------------------
// Text format serialisation
// ---------------------------------------------------------------------------

export function getMetricsText(): string {
  const lines: string[] = [];

  for (const [name, metric] of registry.entries()) {
    lines.push(`# HELP ${name} ${metric.help}`);
    lines.push(`# TYPE ${name} ${metric.type}`);

    if (metric.type === "counter" || metric.type === "gauge") {
      if (metric.values.size === 0) {
        lines.push(`${name} 0`);
      } else {
        for (const [key, value] of metric.values.entries()) {
          const lStr = key ? `{${key.replace(/([^,=]+)=([^,]+)/g, '$1="$2"')}}` : "";
          lines.push(`${name}${lStr} ${value}`);
        }
      }
    } else if (metric.type === "histogram") {
      if (metric.values.size === 0) {
        // Emit zero-valued histogram
        for (const b of metric.buckets) {
          lines.push(`${name}_bucket{le="${b}"} 0`);
        }
        lines.push(`${name}_bucket{le="+Inf"} 0`);
        lines.push(`${name}_sum 0`);
        lines.push(`${name}_count 0`);
      } else {
        for (const [key, bucket] of metric.values.entries()) {
          const lBase = labelString(key ? Object.fromEntries(
            key.split(",").map((p) => {
              const [k, v] = p.split("=");
              return [k, v] as [string, string];
            })
          ) : undefined);
          const lPart = lBase ? lBase.slice(0, -1) : ""; // strip trailing }

          for (let i = 0; i < metric.buckets.length; i++) {
            const leLabel = lPart
              ? `${lPart},le="${metric.buckets[i]}"}`
              : `{le="${metric.buckets[i]}"}`;
            lines.push(`${name}_bucket${leLabel} ${bucket.bucketCounts[i]}`);
          }
          const infLabel = lPart ? `${lPart},le="+Inf"}` : `{le="+Inf"}`;
          lines.push(`${name}_bucket${infLabel} ${bucket.count}`);

          lines.push(`${name}_sum${lBase} ${bucket.sum}`);
          lines.push(`${name}_count${lBase} ${bucket.count}`);
        }
      }
    }
  }

  return lines.join("\n") + "\n";
}
