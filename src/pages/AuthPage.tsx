
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
// Add missing RefreshCw icon to the import list
import { Eye, EyeOff, Lock, Mail, User as UserIcon, ArrowRight, AlertTriangle, Smartphone, RefreshCw, UserPlus } from 'lucide-react';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import { useIsMobile } from '../hooks/useIsMobile';
import { APP_VERSION } from '../version';

type AuthStep = 'login';

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

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Grid Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        
        {/* Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-brand-primary/10 blur-[120px] pointer-events-none rounded-full" />
        
        <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
            {children}
        </div>
    </div>
);

const MobileLogin: React.FC<LoginProps> = ({ 
    isRegistering, isRecovering, setIsRegistering, setIsRecovering, loading, error, onSubmit,
    name, setName, email, setEmail, password, setPassword, showPassword, setShowPassword
}) => (
    <div className="fixed inset-0 bg-bg flex flex-col">
        {/* Main Card Container */}
        <div className="flex-1 flex flex-col justify-end overflow-hidden">
            <div className="px-8 mb-4 flex items-center gap-2">
                {(isRecovering || isRegistering) && (
                    <button 
                        onClick={() => {
                            if (isRecovering) setIsRecovering(false);
                            else if (isRegistering) setIsRegistering(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-white active:scale-90 transition-transform -ml-2"
                    >
                        <ArrowRight className="rotate-180" size={24} />
                    </button>
                )}
                <h2 className="text-2xl font-bold text-white">
                    {isRecovering ? 'Recuperar' : isRegistering ? 'Crear cuenta' : 'Iniciar sesion'}
                </h2>
            </div>
            
            <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                className="bg-surface-1 rounded-t-2xl pt-5 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-8 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/5 max-h-[92%] overflow-y-auto custom-scrollbar"
            >
                {/* Logo & Welcome */}
                <div className="flex items-start gap-4 mb-4 shrink-0">
                    <AnimatedLogo size={40} isStatic showFill={true} />
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                            {isRecovering ? 'Recuperar acceso' : isRegistering ? 'Bienvenido' : 'Bienvenido de nuevo'}
                        </h1>
                        <p className="text-zinc-500 text-xs sm:text-sm mt-1">
                            {isRecovering ? 'Ingresa tu correo para continuar' : isRegistering ? 'Hola, crea una nueva cuenta' : 'Ingresa a tu cuenta para continuar'}
                        </p>
                    </div>
                </div>

                {/* Illustration Section - More compact */}
                <div className="relative w-full aspect-square max-w-[120px] sm:max-w-[160px] mx-auto mb-4 sm:mb-6 flex items-center justify-center shrink-0">
                    {/* Floating Dots */}
                    <motion.div 
                        animate={{ y: [0, -10, 0] }} 
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-0 right-4 w-3 h-3 bg-brand-accent rounded-full blur-[2px]" 
                    />
                    <motion.div 
                        animate={{ y: [0, 10, 0] }} 
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-4 left-0 w-2 h-2 bg-teal-400 rounded-full blur-[1px]" 
                    />
                    <motion.div 
                        animate={{ x: [0, 8, 0] }} 
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-4 left-2 w-4 h-4 bg-status-warning rounded-full blur-[2px]" 
                    />
                    <motion.div 
                        animate={{ x: [0, -8, 0] }} 
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-6 right-0 w-3 h-3 bg-status-info rounded-full blur-[1px]" 
                    />
                    
                    {/* Central Circle */}
                    <div className="w-full h-full bg-bg rounded-full flex items-center justify-center shadow-2xl border border-white/5">
                        <div className="w-12 h-20 sm:w-16 sm:h-28 border-2 border-zinc-800 rounded-md sm:rounded-lg flex items-center justify-center relative">
                            <div className="absolute top-1.5 w-5 sm:w-7 h-0.5 bg-zinc-800 rounded-full" />
                            {isRegistering ? (
                                <UserIcon size={20} className="text-zinc-700 sm:size-[28px]" strokeWidth={1} />
                            ) : (
                                <Lock size={20} className="text-zinc-700 sm:size-[28px]" strokeWidth={1} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Message Section */}
                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full bg-status-danger/10 border border-status-danger/20 rounded-2xl p-4 flex gap-3 mb-6 shrink-0"
                        >
                            <AlertTriangle size={18} className="text-status-danger shrink-0" />
                            <p className="text-xs text-red-200/80 font-medium">
                                {error}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form onSubmit={onSubmit} className="w-full space-y-3 sm:space-y-4 shrink-0">
                    {isRegistering && (
                        <input 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full h-12 sm:h-14 bg-bg border border-white/10 rounded-2xl px-6 text-white outline-none focus:border-brand-primary/50 transition-all placeholder:text-zinc-700 text-sm sm:text-base" 
                            placeholder="Nombre" 
                        />
                    )}
                    
                    <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full h-12 sm:h-14 bg-bg border border-white/10 rounded-2xl px-6 text-white outline-none focus:border-brand-primary/50 transition-all placeholder:text-zinc-700 text-sm sm:text-base" 
                        placeholder="Correo electronico" 
                    />

                    {!isRecovering && (
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full h-12 sm:h-14 bg-bg border border-white/10 rounded-2xl px-6 pr-14 text-white outline-none focus:border-brand-primary/50 transition-all placeholder:text-zinc-700 text-sm sm:text-base" 
                                placeholder="Contraseña" 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 p-2"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
                                ) : (
                                    <Eye className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
                                )}
                            </button>
                        </div>
                    )}

                    {!isRegistering && !isRecovering && (
                        <div className="flex justify-end">
                            <button 
                                type="button"
                                onClick={() => setIsRecovering(true)}
                                className="text-[10px] sm:text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    )}

                    {isRegistering && (
                        <div className="flex items-start gap-3 px-1 py-1 sm:py-2">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-zinc-700 rounded-md shrink-0 flex items-center justify-center">
                                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-brand-primary rounded-sm opacity-0" />
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-zinc-500 leading-tight">
                                Al crear una cuenta, esta de acuerdo con nuestros <span className="text-indigo-500 font-bold">Terminos y condiciones</span>
                            </p>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full h-12 sm:h-14 rounded-2xl bg-brand-gradient text-white font-bold text-sm sm:text-base flex items-center justify-center shadow-glow active:scale-[0.98] transition-all hover:brightness-110 mt-2 sm:mt-4 disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : (isRecovering ? 'Enviar Enlace' : (isRegistering ? 'Sign up' : 'Iniciar sesion'))}
                    </button>
                </form>

                <div className="pt-4 pb-2 flex justify-center shrink-0">
                    <button 
                        onClick={() => { setIsRegistering(!isRegistering); setIsRecovering(false); }} 
                        className="text-zinc-500 text-sm"
                    >
                        {isRegistering ? 'Ya tienes cuenta? ' : 'No tienes cuenta? '}
                        <span className="text-indigo-500 font-bold">
                            {isRegistering ? 'Iniciar sesion' : 'Registrate'}
                        </span>
                    </button>
                </div>
            </motion.div>
        </div>
    </div>
);

const DesktopLogin: React.FC<LoginProps> = (props) => (
    <div className="fixed inset-0 bg-bg flex items-center justify-center p-6 overflow-hidden">
        {/* Grid Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
        
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-[860px] h-[540px] bg-surface-1 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex"
        >
            {/* Branding Side */}
            <div className="w-2/5 bg-surface-sunken border-r border-white/5 flex flex-col items-center justify-center p-8 relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-32 h-32 bg-brand-primary/10 blur-[60px] rounded-full -translate-x-1/2 -translate-y-1/2" />
                
                <div className="relative z-10 flex flex-col items-center">
                    <AnimatedLogo size={100} showFill={true} isStatic={true} />
                    <h1 className="text-3xl font-black text-white tracking-tighter mt-4 uppercase">NOOVA</h1>
                    <p className="text-zinc-500 font-bold tracking-[0.4em] uppercase text-[9px] mt-1">Suite Manager</p>
                </div>

                <div className="absolute bottom-6 text-zinc-700 text-[9px] font-mono uppercase tracking-widest">
                    Build {APP_VERSION} • Secure Core
                </div>
            </div>

            {/* Form Side */}
            <div className="flex-1 p-10 flex flex-col justify-center bg-surface-1">
                <div className="max-w-[340px] mx-auto w-full">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
                            {props.isRecovering ? 'Recuperar Cuenta' : props.isRegistering ? 'Crear Registro' : 'Bienvenido de nuevo'}
                        </h2>
                        <p className="text-zinc-500 mt-2">Gestiona tu ecosistema digital hoy.</p>
                    </div>

                    <form onSubmit={props.onSubmit} className="space-y-5">
                        {props.isRegistering && (
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">Nombre</label>
                                <div className="relative group">
                                    <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-primary transition-colors" />
                                    <input value={props.name} onChange={e => props.setName(e.target.value)} className="w-full h-12 bg-bg border border-white/10 rounded-2xl pl-11 pr-4 text-white outline-none focus:border-brand-primary/50 transition-all" placeholder="Juan Pérez" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
                            <div className="relative group">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-primary transition-colors" />
                                <input type="email" value={props.email} onChange={e => props.setEmail(e.target.value)} className="w-full h-12 bg-bg border border-white/10 rounded-2xl pl-11 pr-4 text-white outline-none focus:border-brand-primary/50 transition-all" placeholder="admin@empresa.com" />
                            </div>
                        </div>

                        {!props.isRecovering && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-1">Contraseña</label>
                                    {!props.isRegistering && (
                                        <button type="button" onClick={() => props.setIsRecovering(true)} className="text-[10px] font-semibold text-zinc-600 hover:text-brand-primary transition-colors uppercase">¿Olvidaste?</button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-primary transition-colors" />
                                    <input type={props.showPassword ? "text" : "password"} value={props.password} onChange={e => props.setPassword(e.target.value)} className="w-full h-12 bg-bg border border-white/10 rounded-2xl pl-11 pr-12 text-white outline-none focus:border-brand-primary/50 transition-all font-mono" placeholder="••••••••" />
                                    <button type="button" onClick={() => props.setShowPassword(!props.showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                        {props.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={props.loading} 
                            className="w-full h-12 bg-brand-gradient text-white rounded-2xl font-bold text-sm shadow-glow flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all mt-4 disabled:opacity-50"
                        >
                            {props.loading ? <RefreshCw className="animate-spin" size={18} /> : (props.isRecovering ? 'Continuar' : (props.isRegistering ? 'Confirmar' : 'Acceder ahora'))}
                            {!props.loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <div className="mt-8 flex items-center justify-center gap-3">
                        <span className="text-xs text-zinc-600">{props.isRegistering ? '¿Ya eres miembro?' : '¿Nuevo en la plataforma?'}</span>
                        <button onClick={() => { props.setIsRegistering(!props.isRegistering); props.setIsRecovering(false); }} className="text-xs font-semibold text-brand-primary hover:text-brand-accent transition-colors uppercase tracking-widest">
                            {props.isRegistering ? 'Login' : 'Crea tu Cuenta'}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    </div>
);

const AuthPage: React.FC = () => {
  const { login, register, resetPassword } = useAuth();
  const { showToast } = useToast();
  const isMobile = useIsMobile();
  
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');

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
