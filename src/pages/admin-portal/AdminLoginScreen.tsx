import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminLoginScreenProps {
  deniedMessage?: string | null;
}

const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ deniedMessage }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : (err?.message || 'No se pudo iniciar sesión.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-status-warning-soft to-orange-600 flex items-center justify-center shadow-glow-sm mb-4">
            <ShieldCheck size={26} className="text-black" />
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Panel de Plataforma</h1>
          <p className="text-sm text-text-muted mt-1">Acceso exclusivo para administradores de Noova</p>
        </div>

        {deniedMessage && (
          <div className="mb-5 p-3 rounded-md bg-status-danger/10 border border-status-danger/20 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-status-danger-soft shrink-0 mt-0.5" />
            <p className="text-xs text-status-danger-soft font-medium leading-relaxed">{deniedMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" />
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo de administrador"
              className="w-full pl-11"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full pl-11"
            />
          </div>

          {error && (
            <p className="text-xs text-status-danger-soft font-medium px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[52px] rounded-lg bg-gradient-to-r from-status-warning-soft to-orange-600 text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity mt-2"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Ingresar al panel'}
          </button>
        </form>

        <p className="text-center text-[11px] text-text-faint mt-8">
          Este panel es distinto al de la app de tu negocio. Si buscás iniciar sesión en tu cuenta, volvé al inicio.
        </p>
      </div>
    </div>
  );
};

export default AdminLoginScreen;
