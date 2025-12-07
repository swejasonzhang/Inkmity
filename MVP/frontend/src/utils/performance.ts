interface PerformanceMark {
  end(): void;
}

class PerformanceMonitor {
  private isEnabled = typeof window !== "undefined" && "performance" in window;
  private marks: Map<string, number> = new Map();

  mark(name: string): PerformanceMark | null {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const startTime = performance.now();
      this.marks.set(name, startTime);
      
      if (performance.mark) {
        performance.mark(`${name}-start`);
      }

      return {
        end: () => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          this.marks.delete(name);

          if (performance.mark && performance.measure) {
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
          }

          if (import.meta.env.DEV) {
            console.debug(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
          }
        },
      };
    } catch (error) {
      console.warn("Performance monitoring failed", error);
      return null;
    }
  }

  measure(name: string, startMark: string, endMark: string): void {
    if (!this.isEnabled || !performance.measure) {
      return;
    }

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name, "measure")[0];
      if (measure && import.meta.env.DEV) {
        console.debug(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.warn("Performance measure failed", error);
    }
  }

  getDuration(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) {
      return null;
    }

    return performance.now() - startTime;
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;