"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[HTML Motion Renderer] Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-6">
          <div className="max-w-md rounded-xl border border-red-900 bg-red-950/30 p-5 text-center">
            <h2 className="mb-2 text-sm font-bold tracking-widest text-red-300">
              Something went wrong
            </h2>
            <p className="mb-4 break-words font-mono text-xs text-red-200">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded border border-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}