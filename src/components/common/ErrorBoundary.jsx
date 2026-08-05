"use client";
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
/**
 * Class-based React error boundary. Catches render-time errors anywhere in
 * the subtree and shows a friendly "Something went wrong" panel with a
 * reload button.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.handleReload = () => {
            this.setState({ hasError: false, error: null });
            if (typeof window !== "undefined")
                window.location.reload();
        };
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error("[ErrorBoundary]", error, info.componentStack);
    }
    render() {
        var _a;
        if (this.state.hasError) {
            return (<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-8 w-8"/>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {((_a = this.state.error) === null || _a === void 0 ? void 0 : _a.message) || "An unexpected error occurred."}
            </p>
          </div>
          <Button onClick={this.handleReload}>
            <RefreshCw className="mr-2 h-4 w-4"/> Reload page
          </Button>
        </div>);
        }
        return this.props.children;
    }
}
