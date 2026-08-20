import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  scope?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard React Error Boundary component.
 * Must be a class component as per React requirements.
 */
// Direct inheritance from Component helps with type resolution for this.props and this.setState
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Check for common lazy-loading errors and attempt auto-recovery
    if (error?.message?.includes('dynamically imported module') || 
        error?.message?.includes('Failed to fetch')) {
         
         const storageKey = 'auto_reload_attempted';
         try {
             const hasReloaded = sessionStorage.getItem(storageKey);
             
             if (!hasReloaded) {
                 if (import.meta.env.DEV) console.log("Auto-reloading due to fetch error...");
                 sessionStorage.setItem(storageKey, 'true');
                 window.location.reload();
                 return;
             }
         } catch(e) {}
    }
  }

  // Arrow function to preserve 'this' context for accessing state and setState
  public handleRetry = () => {
    // Access state correctly from inheritance
    // Fix: cast this to any to access state which TS is not recognizing on the class instance
    const { error } = (this as any).state;
    if (error?.message?.includes('dynamically imported module') || 
        error?.message?.includes('Failed to fetch')) {
        window.location.reload();
        return;
    }
    
    // setState is inherited from Component base class
    // Fix for Error in file src/components/ui/ErrorBoundary.tsx on line 67: Property 'setState' does not exist on type 'ErrorBoundary'.
    (this as any).setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    // state is inherited from Component base class
    // Fix for Error in file src/components/ui/ErrorBoundary.tsx on line 74: Property 'props' does not exist on type 'ErrorBoundary'.
    const { hasError, error } = (this as any).state;
    // props is inherited from Component base class
    // Fix for Error in file src/components/ui/ErrorBoundary.tsx on line 74: Property 'props' does not exist on type 'ErrorBoundary'.
    const { fallback, scope, children } = (this as any).props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network');

      return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-surface-3 border border-white/5 rounded-xl text-center animate-fade-in mx-auto max-w-md my-4 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[60px] rounded-full pointer-events-none" />

          <div className="w-20 h-20 rounded-xl bg-red-500/10 flex items-center justify-center mb-6 border border-white/5 shadow-inner shrink-0 relative z-10">
            {isNetworkError ? <WifiOff className="text-red-500" size={40} /> : <AlertTriangle className="text-red-500" size={40} />}
          </div>
          
          <h3 className="text-white font-bold text-xl mb-2 relative z-10">
            {isNetworkError ? 'Error de Conexión' : 'Algo salió mal'}
          </h3>
          
          <p className="text-zinc-400 text-sm mb-8 max-w-xs mx-auto leading-relaxed relative z-10">
            {error?.message || "Ha ocurrido un error inesperado al procesar los datos."}
            <br/><span className="text-[10px] opacity-60 mt-2 block">Alcance: {scope || 'General'}</span>
          </p>
          
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-bold transition-all border border-white/10 active:scale-95 hover:border-white/20 relative z-10 shadow-lg"
          >
            <RefreshCw size={18} /> {isNetworkError ? 'Reconectar' : 'Intentar de nuevo'}
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;