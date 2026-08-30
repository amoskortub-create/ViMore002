"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, ShieldAlert, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * @fileOverview ViMore Diagnostic Error Boundary
 * Catch and disclose terminal client-side exceptions with specific error nodes.
 */
export class DiagnosticErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught spatial error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-destructive/5 border-2 border-dashed border-destructive/20 rounded-[2.5rem] space-y-6 animate-in zoom-in-95 duration-500 text-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-destructive/20 blur-xl rounded-full animate-pulse" />
            <div className="relative h-16 w-16 bg-destructive rounded-2xl flex items-center justify-center text-white shadow-xl">
              <ShieldAlert className="h-8 w-8" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-destructive">Logic Exception</h3>
            <p className="text-[10px] font-black text-destructive/60 uppercase tracking-[0.2em]">{this.props.title || "Handshake"} Node Error</p>
          </div>
          
          <div className="w-full max-w-sm bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-destructive/10 overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3 w-3 text-destructive" />
              <span className="text-[8px] font-black text-destructive uppercase">Diagnostic Message</span>
            </div>
            <p className="text-[11px] font-mono text-destructive break-all text-left leading-relaxed">
              {this.state.error?.name}: {this.state.error?.message}
            </p>
          </div>

          <Button 
            className="rounded-xl h-12 px-8 bg-destructive hover:bg-destructive/90 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-destructive/20"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw className="h-4 w-4" /> Reset Application Node
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
