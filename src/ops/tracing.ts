/**
 * Lightweight Tracing Stub
 *
 * No-op tracing helper designed to be replaced with OpenTelemetry later.
 * In production, emits JSON trace events to stdout.
 * In development, all operations are no-ops.
 */

export interface Span {
  end(error?: Error): void;
}

const NO_OP_SPAN: Span = {
  end(): void {
    // no-op in development
  },
};

/**
 * Starts a trace span. In production, records duration and emits a JSON line
 * to stdout when `end()` is called. In development, returns a no-op span.
 */
export function startSpan(
  name: string,
  attributes?: Record<string, string | number>
): Span {
  if (process.env.NODE_ENV !== "production") {
    return NO_OP_SPAN;
  }

  const startTime = Date.now();
  const startTs = new Date().toISOString();

  return {
    end(error?: Error): void {
      const duration = Date.now() - startTime;
      const event: Record<string, unknown> = {
        trace: true,
        span: name,
        ts: startTs,
        duration,
        error: error ? error.message : null,
        ...attributes,
      };
      process.stdout.write(JSON.stringify(event) + "\n");
    },
  };
}
