import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import Button from './Button';

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

      // El detalle técnico ya se registró en componentDidCatch (consola/logging);
      // al usuario solo se le muestra un mensaje claro y una acción.
      return (
        <div
          role="alert"
          className="w-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-surface-3 border border-border-subtle rounded-xl text-center animate-fade-in mx-auto max-w-md my-4 shadow-elev-lg"
        >
          <div className="w-20 h-20 rounded-xl bg-status-danger/10 flex items-center justify-center mb-6 border border-border-subtle shrink-0">
            {isNetworkError
              ? <WifiOff className="text-status-danger" size={40} aria-hidden="true" />
              : <AlertTriangle className="text-status-danger" size={40} aria-hidden="true" />}
          </div>

          <h3 className="text-text-primary font-bold text-xl mb-2">
            {isNetworkError ? 'Sin conexión' : 'Algo salió mal'}
          </h3>

          <p className="text-text-muted text-sm mb-8 max-w-xs mx-auto leading-relaxed">
            {isNetworkError
              ? 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
              : `No pudimos cargar ${scope ? `la sección "${scope}"` : 'esta sección'} correctamente.`}
          </p>

          <Button variant="secondary" onClick={this.handleRetry} leftIcon={<RefreshCw size={18} aria-hidden="true" />}>
            {isNetworkError ? 'Reintentar' : 'Intentar nuevamente'}
          </Button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;