interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100;

  mark(name: string, metadata?: Record<string, unknown>) {
    if (typeof window === "undefined" || !window.performance) {
      return;
    }

    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    window.performance.mark(startMark);

    return {
      end: () => {
        window.performance.mark(endMark);
        window.performance.measure(name, startMark, endMark);
        const measure = window.performance.getEntriesByName(name, "measure")[0];
        if (measure) {
          const metric: PerformanceMetric = {
            name,
            duration: measure.duration,
            timestamp: Date.now(),
            metadata,
          };
          this.addMetric(metric);
          window.performance.clearMarks(startMark);
          window.performance.clearMarks(endMark);
          window.performance.clearMeasures(name);
        }
      },
    };
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageDuration(name: string): number {
    const relevant = this.metrics.filter((m) => m.name === name);
    if (relevant.length === 0) return 0;
    const sum = relevant.reduce((acc, m) => acc + m.duration, 0);
    return sum / relevant.length;
  }

  clear() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;

