import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    if (typeof window !== "undefined" && window.console) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
          <Card className="w-full max-w-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <CardHeader>
              <CardTitle style={{ color: "var(--fg)" }}>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div style={{ color: "var(--fg)" }}>
                <p className="mb-2">An unexpected error occurred. Please try refreshing the page.</p>
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium mb-2" style={{ color: "var(--fg)" }}>
                      Error Details
                    </summary>
                    <pre className="text-xs p-3 rounded overflow-auto max-h-64" style={{ background: "var(--elevated)", color: "var(--fg)" }}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={this.handleReset}
                  style={{ background: "var(--fg)", color: "var(--bg)" }}
                  className="hover:opacity-90"
                >
                  Go to Home
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                >
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
