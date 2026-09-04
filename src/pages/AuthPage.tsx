
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, ArrowRight, ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import { useIsMobile } from '../hooks/useIsMobile';
import { APP_VERSION } from '../version';

interface LoginProps {
    isRegistering: boolean;
    isRecovering: boolean;
    setIsRegistering: (val: boolean) => void;
    setIsRecovering: (val: boolean) => void;
    loading: boolean;
    error: string | null;
    onSubmit: (e: React.FormEvent) => void;
    name: string; setName: (val: string) => void;
    email: string; setEmail: (val: string) => void;
    password: string; setPassword: (val: string) => void;
    showPassword: boolean; setShowPassword: (val: boolean) => void;
}

// Campo de texto con icono a la izquierda, estilo consistente en mobile y desktop.
const FieldInput: React.FC<{
    icon: React.ReactNode;
    type?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    autoComplete?: string;
    rightSlot?: React.ReactNode;
}> = ({ icon, type = 'text', value, onChange, placeholder, autoComplete, rightSlot }) => (
    <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled group-focus-within:text-brand-primary transition-colors">
            {icon}
        </span>
        <input
            type={type}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            placeholder={placeholder}
            className={`w-full h-12 sm:h-13 bg-bg border border-[rgb(var(--fg-rgb))]/10 rounded-2xl pl-11 text-text-primary outline-none focus:border-brand-primary/50 transition-all placeholder:text-text-faint text-sm ${rightSlot ? 'pr-12' : 'pr-4'}`}
        />
        {rightSlot}
    </div>
);

// Switch de dos pestañas (Iniciar sesion / Crear cuenta). Se oculta durante la recuperación.
const AuthTabs: React.FC<{ isRegistering: boolean; onSelect: (registering: boolean) => void }> = ({ isRegistering, onSelect }) => (
    <div className="w-full flex bg-bg rounded-2xl p-1 shrink-0">
        <button
            type="button"
            onClick={() => onSelect(false)}
            className={`flex-1 h-9 rounded-xl text-xs font-semibold transition-all ${!isRegistering ? 'bg-surface-2 text-text-primary shadow-elev-sm' : 'text-text-disabled'}`}
        >
            Iniciar sesion
        </button>
        <button
            type="button"
            onClick={() => onSelect(true)}
            className={`flex-1 h-9 rounded-xl text-xs font-semibold transition-all ${isRegistering ? 'bg-surface-2 text-text-primary shadow-elev-sm' : 'text-text-disabled'}`}
        >
            Crear cuenta
        </button>
    </div>
);

const ErrorBanner: React.FC<{ error: string | null }> = ({ error }) => (
    <AnimatePresence>
        {error && (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full bg-status-danger/10 border border-status-danger/20 rounded-2xl p-4 flex gap-3 shrink-0"
            >
                <AlertTriangle size={18} className="text-status-danger shrink-0" />
                <p className="text-xs text-red-200/80 font-medium">{error}</p>
            </motion.div>
        )}
    </AnimatePresence>
);

const getHeadline = (isRegistering: boolean, isRecovering: boolean) => {
    if (isRecovering) return { title: 'Recuperar acceso', subtitle: 'Ingresa tu correo para continuar' };
    if (isRegistering) return { title: 'Crea tu cuenta', subtitle: 'Empieza a gestionar tu negocio' };
    return { title: 'Bienvenido de nuevo', subtitle: 'Ingresa a tu cuenta para continuar' };
};

const MobileLogin: React.FC<LoginProps> = ({
    isRegistering, isRecovering, setIsRegistering, setIsRecovering, loading, error, onSubmit,
    name, setName, email, setEmail, password, setPassword, showPassword, setShowPassword
}) => {
    const { title, subtitle } = getHeadline(isRegistering, isRecovering);

    return (
        <div className="fixed inset-0 bg-bg flex items-center justify-center p-5 overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                 style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

            <div className="relative z-10 w-full max-h-full overflow-y-auto custom-scrollbar">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 rounded-2xl pt-6 px-6 pb-6 flex flex-col shadow-2xl gap-5"
                >
                    {isRecovering && (
                        <button
                            onClick={() => setIsRecovering(false)}
                            className="w-8 h-8 -ml-1 -mb-2 flex items-center justify-center text-text-disabled active:scale-90 transition-transform shrink-0"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <div className="flex flex-col items-center text-center shrink-0">
                        <AnimatedLogo size={48} isStatic showFill={true} />
                        <h1 className="text-xl font-bold text-text-primary mt-3">{title}</h1>
                        <p className="text-text-disabled text-xs mt-1">{subtitle}</p>
                    </div>

                    {!isRecovering && (
                        <AuthTabs
                            isRegistering={isRegistering}
                            onSelect={(reg) => { setIsRegistering(reg); setIsRecovering(false); }}
                        />
                    )}

                    <ErrorBanner error={error} />

                    <form onSubmit={onSubmit} className="w-full flex flex-col gap-3 shrink-0">
                        {isRegistering && (
                            <FieldInput
                                icon={<UserIcon size={18} />}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nombre completo"
                                autoComplete="name"
                            />
                        )}

                        <FieldInput
                            icon={<Mail size={18} />}
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@empresa.com"
                            autoComplete="email"
                        />

                        {!isRecovering && (
                            <FieldInput
                                icon={<Lock size={18} />}
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                rightSlot={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-faint"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                }
                            />
                        )}

                        {!isRegistering && !isRecovering && (
                            <div className="flex justify-end -mt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsRecovering(true)}
                                    className="text-[11px] font-semibold text-text-disabled hover:text-text-secondary transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        )}

                        {isRegistering && (
                            <p className="text-[11px] text-text-disabled leading-tight px-1">
                                Al crear una cuenta, aceptas nuestros <span className="text-brand-primary-hi font-semibold">Términos y condiciones</span>
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-2xl bg-brand-gradient text-white font-bold text-sm flex items-center justify-center gap-2 shadow-glow active:scale-[0.98] transition-all hover:brightness-110 mt-1 disabled:opacity-50"
                        >
                            {loading ? (
                                <RefreshCw className="animate-spin" size={18} />
                            ) : (
                                <>
                                    {isRecovering ? 'Enviar enlace' : (isRegistering ? 'Crear cuenta' : 'Acceder ahora')}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

const DesktopLogin: React.FC<LoginProps> = (props) => {
    const { title, subtitle } = getHeadline(props.isRegistering, props.isRecovering);

    return (
        <div className="fixed inset-0 bg-bg flex items-center justify-center p-6 overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                 style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-[860px] h-[560px] bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 rounded-2xl shadow-2xl overflow-hidden flex"
            >
                {/* Branding Side */}
                <div className="w-2/5 bg-surface-sunken border-r border-[rgb(var(--fg-rgb))]/5 flex flex-col items-center justify-center p-8 relative overflow-hidden text-center">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-brand-primary/10 blur-[60px] rounded-full -translate-x-1/2 -translate-y-1/2" />

                    <div className="relative z-10 flex flex-col items-center">
                        <AnimatedLogo size={100} showFill={true} isStatic={true} />
                        <h1 className="text-3xl font-black text-text-primary tracking-tighter mt-4 uppercase">NOOVA</h1>
                        <p className="text-text-disabled font-bold tracking-[0.4em] uppercase text-[9px] mt-1">Suite Manager</p>
                    </div>

                    <div className="absolute bottom-6 text-text-faint text-[9px] font-mono uppercase tracking-widest">
                        Build {APP_VERSION} • Secure Core
                    </div>
                </div>

                {/* Form Side */}
                <div className="flex-1 p-10 flex flex-col justify-center bg-surface-1">
                    <div className="max-w-[340px] mx-auto w-full flex flex-col gap-5">
                        <div className="flex items-center gap-2 -mb-1">
                            {props.isRecovering && (
                                <button
                                    onClick={() => props.setIsRecovering(false)}
                                    className="w-7 h-7 -ml-1 flex items-center justify-center text-text-disabled hover:text-text-secondary transition-colors shrink-0"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                            )}
                            <div>
                                <h2 className="text-3xl font-bold text-text-primary tracking-tight leading-tight">{title}</h2>
                                <p className="text-text-disabled mt-1 text-sm">{subtitle}</p>
                            </div>
                        </div>

                        {!props.isRecovering && (
                            <AuthTabs
                                isRegistering={props.isRegistering}
                                onSelect={(reg) => { props.setIsRegistering(reg); props.setIsRecovering(false); }}
                            />
                        )}

                        <ErrorBanner error={props.error} />

                        <form onSubmit={props.onSubmit} className="flex flex-col gap-4">
                            {props.isRegistering && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-text-disabled uppercase tracking-wider ml-1">Nombre</label>
                                    <FieldInput
                                        icon={<UserIcon size={18} />}
                                        value={props.name}
                                        onChange={e => props.setName(e.target.value)}
                                        placeholder="Juan Pérez"
                                        autoComplete="name"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-text-disabled uppercase tracking-wider ml-1">Correo electrónico</label>
                                <FieldInput
                                    icon={<Mail size={18} />}
                                    type="email"
                                    value={props.email}
                                    onChange={e => props.setEmail(e.target.value)}
                                    placeholder="admin@empresa.com"
                                    autoComplete="email"
                                />
                            </div>

                            {!props.isRecovering && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[11px] font-semibold text-text-disabled uppercase tracking-wider ml-1">Contraseña</label>
                                        {!props.isRegistering && (
                                            <button type="button" onClick={() => props.setIsRecovering(true)} className="text-[10px] font-semibold text-text-faint hover:text-brand-primary transition-colors uppercase">¿Olvidaste?</button>
                                        )}
                                    </div>
                                    <FieldInput
                                        icon={<Lock size={18} />}
                                        type={props.showPassword ? 'text' : 'password'}
                                        value={props.password}
                                        onChange={e => props.setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete={props.isRegistering ? 'new-password' : 'current-password'}
                                        rightSlot={
                                            <button
                                                type="button"
                                                onClick={() => props.setShowPassword(!props.showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-faint"
                                            >
                                                {props.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        }
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={props.loading}
                                className="w-full h-12 bg-brand-gradient text-white rounded-2xl font-bold text-sm shadow-glow flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all mt-1 disabled:opacity-50"
                            >
                                {props.loading ? <RefreshCw className="animate-spin" size={18} /> : (props.isRecovering ? 'Continuar' : (props.isRegistering ? 'Crear cuenta' : 'Acceder ahora'))}
                                {!props.loading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const AuthPage: React.FC = () => {
  const { login, register, resetPassword } = useAuth();
  const { showToast } = useToast();
  const isMobile = useIsMobile();

  const [isRecovering, setIsRecovering] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (loading) return;
    if (!email || !email.includes('@')) { setError('Ingresa un correo electrónico válido'); return; }
    if (!isRecovering && password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

    setLoading(true);
    try {
      if (isRecovering) {
        await resetPassword(email);
        showToast('Correo de recuperación enviado.', 'info');
        setIsRecovering(false);
      } else if (isRegistering) {
        if (!name.trim()) throw new Error("El nombre es requerido.");
        await register(email, password, name);
        showToast('Cuenta creada con éxito', 'success');
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      let msg = 'Error de conexión. Intenta de nuevo.';
      if (err.message?.includes("Invalid login")) msg = "Credenciales incorrectas. Verifica tu email y contraseña.";
      else if (err.message) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const props = {
      isRegistering, isRecovering, setIsRegistering, setIsRecovering,
      loading, error, onSubmit: handleSubmit,
      name, setName, email, setEmail, password, setPassword,
      showPassword, setShowPassword
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key="auth-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full">
          {isMobile ? <MobileLogin {...props} /> : <DesktopLogin {...props} />}
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthPage;
