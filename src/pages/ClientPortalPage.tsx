
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { formatDate } from '../utils/contactosUtils';
import { Copy, MessageSquareWarning, ChevronRight, User, Lock, RefreshCw, LogOut, ShieldAlert, Layers, Calendar, Unlock, ArrowRight, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import { useToast } from '../context/ToastContext';

// --- TIPOS ---
type ViewState = 'loading' | 'error' | 'login' | 'setup_pin' | 'dashboard';

interface PortalService {
  id: string;
  service_name: string;
  sale_type: string;
  expiry_date: string;
  amount: number;
  account_email?: string;
  account_password?: string;
  invited_email?: string;
  invited_password?: string;
  profile_name?: string;
  profile_pin?: string;
}

interface ClientData {
  name: string;
  phone: string;
}

interface Branding {
  name?: string;
  logo?: string;
}

// --- SUB-COMPONENTS ---
const ServiceCard: React.FC<{ service: PortalService; onReport: (s: PortalService) => void; }> = ({ service, onReport }) => {
  const { showToast } = useToast();
  
  const daysLeft = (() => {
      if (!service.expiry_date) return 0;
      const now = new Date();
      const exp = new Date(service.expiry_date);
      const diff = exp.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 3600 * 24));
  })();

  const isExpired = daysLeft <= 0;
  const isWarning = daysLeft <= 3 && !isExpired;

  const copyToClipboard = (text: string) => {
    if(!text || text === '---') return;
    navigator.clipboard.writeText(text);
    showToast('Copiado', 'success');
  };

  const isUnique = service.sale_type === 'usuario_unico';
  const user = isUnique ? service.invited_email : service.account_email;
  const pass = isUnique ? service.invited_password : service.account_password;
  
  const pName = service.profile_name;
  const pPin = service.profile_pin;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl p-5 relative overflow-hidden shadow-lg mb-4"
    >
        <div className={`absolute top-0 bottom-0 left-0 w-1 ${isExpired ? 'bg-status-danger' : isWarning ? 'bg-status-warning' : 'bg-status-success'}`} />

        <div className="flex justify-between items-start mb-5 pl-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-surface-sunken flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 shrink-0">
                    <Layers size={18} className="text-text-muted" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary leading-tight">{service.service_name || 'Servicio'}</h3>
                  <p className="text-[10px] text-text-disabled uppercase tracking-wide mt-0.5">
                    {service.sale_type ? service.sale_type.replace('_', ' ') : 'Suscripción'}
                  </p>
                </div>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase border ${isExpired ? 'bg-status-danger/10 text-status-danger border-status-danger/20' : isWarning ? 'bg-status-warning/10 text-status-warning border-status-warning/20' : 'bg-status-success/10 text-status-success border-status-success/20'}`}>
              {isExpired ? 'Vencido' : `${daysLeft} días`}
            </div>
        </div>

        <div className="bg-surface-sunken rounded-lg p-4 border border-[rgb(var(--fg-rgb))]/5 space-y-3 mb-5 ml-2">
            <div className="flex justify-between items-center group cursor-pointer" onClick={() => copyToClipboard(user || '')}>
              <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[9px] font-bold text-text-disabled uppercase">Usuario</span>
                  <span className="text-xs font-medium text-text-primary truncate">{user || '---'}</span>
              </div>
              <Copy size={14} className="text-text-faint group-hover:text-text-primary transition-colors shrink-0" />
            </div>
            
            <div className="w-full h-px bg-[rgb(var(--fg-rgb))]/5" />
            
            <div className="flex justify-between items-center group cursor-pointer" onClick={() => copyToClipboard(pass || '')}>
              <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[9px] font-bold text-text-disabled uppercase">Contraseña</span>
                  <span className="text-xs font-medium text-text-primary truncate font-mono">{pass || '---'}</span>
              </div>
              <Copy size={14} className="text-text-faint group-hover:text-text-primary transition-colors shrink-0" />
            </div>
            
            {(pName || pPin) && (
                <>
                  <div className="w-full h-px bg-[rgb(var(--fg-rgb))]/5" />
                  <div className="flex gap-4 pt-1">
                    {pName && (
                        <div className="flex-1 bg-surface-1 rounded-md p-3 border border-[rgb(var(--fg-rgb))]/5">
                            <span className="text-[9px] font-bold text-text-disabled uppercase block mb-1">Perfil</span>
                            <span className="text-xs font-semibold text-text-primary truncate block">{pName}</span>
                        </div>
                    )}
                    {pPin && (
                        <div className="w-20 bg-surface-1 rounded-md p-3 border border-[rgb(var(--fg-rgb))]/5 text-center">
                            <span className="text-[9px] font-bold text-text-disabled uppercase block mb-1">PIN</span>
                            <span className="text-xs font-semibold text-text-primary font-mono">{pPin}</span>
                        </div>
                    )}
                  </div>
                </>
            )}
        </div>

        <div className="flex items-center justify-between pl-3">
            <div className="flex items-center gap-1.5 text-[10px] text-text-disabled font-medium">
              <Calendar size={12} />
              <span>Vence: <span className="text-text-secondary font-mono">{formatDate(service.expiry_date)}</span></span>
            </div>
            <button onClick={() => onReport(service)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 text-text-secondary font-semibold text-[10px] transition-colors border border-[rgb(var(--fg-rgb))]/5">
                <MessageSquareWarning size={12} /> Reportar
            </button>
        </div>
    </motion.div>
  );
};

import { withRetry } from '../utils/supabaseUtils';

// --- MAIN PAGE ---

const PortalPage: React.FC = () => {
  const { showToast } = useToast();
  
  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [services, setServices] = useState<PortalService[]>([]);
  const [supportPhone, setSupportPhone] = useState('');
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const getAliasFromPath = () => {
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean);
      const idx = parts.findIndex(p => p === 'portal' || p === 'portal-cliente');
      if (idx !== -1 && parts.length > idx + 1) {
          return parts[idx + 1];
      }
      return null;
  };
  
  const clientAlias = getAliasFromPath();

  useEffect(() => {
    // Configuración general
    withRetry(() => supabase.from('app_config').select('value').eq('key', 'support_phone').single())
        .then(({data}) => { if(data) setSupportPhone(data.value); });

    const checkAccess = async () => {
      await new Promise(r => setTimeout(r, 500));

      if (!clientAlias) {
        setErrorMessage("Enlace inválido o incompleto.");
        setView('error');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('portal-cliente', {
           method: 'POST',
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ 
               alias: clientAlias, 
               mode: 'check' 
           })
        });

        if (error) throw error;
        
        if (data.error) {
             if (data.error === "NOT_FOUND") {
                 setErrorMessage("Este portal no existe o el enlace es incorrecto.");
             } else {
                 setErrorMessage("Error: " + data.error);
             }
             setView('error');
             return;
        }

        if (data.status === 'setup_required') {
            setClientData({ name: data.name, phone: '' });
            setView('setup_pin');
        } else if (data.status === 'pin_required') {
            setClientData({ name: data.name, phone: '' });
            setView('login');
        } else if (data.status === 'authorized') {
            loadDashboard(data);
        }
      } catch (err: any) {
        console.error("Check Error:", err);
        setErrorMessage("No pudimos conectar con el servidor seguro.");
        setView('error');
      }
    };

    checkAccess();
  }, [clientAlias]);

  const callEdgeFunction = async (mode: 'login' | 'init', pinCode?: string) => {
    setLoadingAction(true);
    setPinError('');
    try {
      const { data, error } = await supabase.functions.invoke('portal-cliente', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            alias: clientAlias, 
            mode, 
            pin: pinCode 
        })
      });

      if (error) throw error;

      if (data?.error) {
           if (data.error === "PIN_INVALID") throw new Error("PIN Incorrecto");
           if (data.error === "PIN_REQUIRED") throw new Error("Se requiere PIN");
           if (data.error === "SETUP_REQUIRED") throw new Error("Configuración requerida");
           throw new Error(data.error);
      }
      return data;
    } catch (err: any) {
      setPinError(err.message || "Error al procesar solicitud");
      throw err;
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLogin = async () => {
    if (pin.length < 4) {
      setPinError('Ingresa un PIN válido (mínimo 4 dígitos)');
      return;
    }
    try {
      const response = await callEdgeFunction('login', pin);
      if (response && response.status === 'authorized') {
          loadDashboard(response);
      }
    } catch (err: any) {
       setPin(''); 
    }
  };

  const handleSetup = async () => {
    if (pin.length < 4 || pin.length > 8) {
      setPinError('El PIN debe tener entre 4 y 8 dígitos');
      return;
    }
    if (pin !== confirmPin) {
      setPinError('Los códigos no coinciden');
      return;
    }
    try {
      const response = await callEdgeFunction('init', pin);
      if (response && response.status === 'authorized') {
          showToast('PIN creado correctamente', 'success');
          loadDashboard(response);
      }
    } catch (err: any) {
    }
  };

  const loadDashboard = (data: any) => {
    const clientInfo = data.cliente || { name: 'Cliente', phone: '' };
    setClientData(clientInfo);
    setBranding(data.branding || null);

    const rawServices: any[] = data.servicios || [];
    const mappedServices: PortalService[] = rawServices.map(s => ({
        id: s.id || Math.random().toString(),
        service_name: s.service_name || 'Servicio',
        sale_type: s.sale_type || 'por_pantalla',
        expiry_date: s.expiry_date || new Date().toISOString(),
        amount: s.amount || 0,
        account_email: s.account_email,
        account_password: s.account_password,
        invited_email: s.invited_email,
        invited_password: s.invited_password,
        profile_name: s.profile_name,
        profile_pin: s.profile_pin
    }));

    setServices(mappedServices);
    setView('dashboard');
  };

  const handleLogout = () => {
      window.location.reload();
  };

  const handleReportIssue = (sale: PortalService) => {
      const message = `Hola, reporto un problema con mi servicio: ${sale.service_name}.`;
      const phone = supportPhone || '573000000000'; 
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleNum = (n: string) => { 
      setPinError(''); 
      if(pin.length < 8) setPin(p => p + n); 
  };
  
  const handleBackspace = () => {
      setPinError('');
      setPin(prev => prev.slice(0, -1));
      if (view === 'setup_pin' && confirmPin) setConfirmPin('');
  };

  const handleNextStep = () => {
      if (view === 'setup_pin') {
          if (!confirmPin) {
              if (pin.length < 4) { setPinError("Mínimo 4 dígitos"); return; }
              setConfirmPin(pin); 
              setPin(''); 
          } else {
              if (pin !== confirmPin) { setPinError("No coinciden"); setConfirmPin(''); setPin(''); return; }
              handleSetup(); 
          }
      } else {
          handleLogin(); 
      }
  };

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center">
         <AnimatedLogo size={80} showFill={false} />
         <p className="text-text-disabled text-xs mt-6 font-medium animate-pulse">Conectando seguro...</p>
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
         <div className="w-20 h-20 bg-status-danger/10 rounded-xl flex items-center justify-center mb-6 border border-status-danger/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
            <ShieldAlert size={32} className="text-status-danger" />
         </div>
         <h1 className="text-2xl font-bold text-text-primary mb-2">Acceso Denegado</h1>
         <p className="text-text-muted text-sm max-w-xs leading-relaxed">{errorMessage}</p>
         <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-[rgb(var(--fg-rgb))]/10 rounded-full text-text-primary font-semibold text-xs hover:bg-[rgb(var(--fg-rgb))]/20 transition-colors border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-2">
            <RefreshCw size={14} /> Reintentar
         </button>
      </div>
    );
  }

  if (view === 'login' || view === 'setup_pin') {
      const isSetup = view === 'setup_pin';
      const stepTitle = isSetup ? (!confirmPin ? 'Crea tu PIN' : 'Confirma tu PIN') : `Hola, ${clientData?.name?.split(' ')[0] || 'Cliente'}`;

      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center w-full max-w-xs mx-auto animate-fade-in py-6">
                <div className="mb-6 text-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-xl flex items-center justify-center mx-auto mb-6 shadow-glow p-px">
                        <div className="w-full h-full bg-bg rounded-xl flex items-center justify-center">
                            {isSetup ? <Unlock className="w-8 h-8 text-text-primary" /> : <Lock className="w-8 h-8 text-text-primary" />}
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">
                        {stepTitle}
                    </h2>
                    <p className="text-text-disabled text-sm">
                        {isSetup ? 'Define un código de seguridad personal.' : 'Ingresa tu PIN de seguridad.'}
                    </p>
                    
                    <div className="flex gap-3 justify-center mt-6 h-4">
                        {[...Array(isSetup && confirmPin ? confirmPin.length : Math.max(4, pin.length))].map((_, i) => (
                            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${i < (isSetup && confirmPin ? confirmPin.length : pin.length) ? 'bg-brand-primary scale-125 shadow-[0_0_10px_#6A2CFF]' : 'bg-zinc-800'}`} />
                        ))}
                    </div>

                    {pinError && <p className="text-status-danger-soft text-xs mt-6 font-bold bg-status-danger/10 py-2 px-4 rounded-full inline-block animate-pulse border border-status-danger/20">{pinError}</p>}
                </div>
                
                <div className="grid grid-cols-3 gap-3 w-full mb-6 select-none">
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                        <button key={n} onClick={() => handleNum(n.toString())} className="h-16 rounded-xl bg-surface-3 text-2xl font-medium text-text-primary hover:bg-[rgb(var(--fg-rgb))]/10 active:scale-90 transition-all border border-[rgb(var(--fg-rgb))]/5 shadow-sm">{n}</button>
                    ))}
                    <div />
                    <button onClick={() => handleNum('0')} className="h-16 rounded-xl bg-surface-3 text-2xl font-medium text-text-primary hover:bg-[rgb(var(--fg-rgb))]/10 active:scale-90 transition-all border border-[rgb(var(--fg-rgb))]/5 shadow-sm">0</button>
                    <button onClick={handleBackspace} className="h-16 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all"><ChevronRight className="rotate-180" size={28} /></button>
                </div>
                
                <button 
                    onClick={handleNextStep} 
                    disabled={loadingAction || (isSetup ? (!confirmPin ? pin.length < 4 : confirmPin.length < 4) : pin.length < 4)}
                    className="w-full h-14 bg-white text-black rounded-lg font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                >
                    {loadingAction ? <RefreshCw className="animate-spin" /> : (isSetup && !confirmPin ? 'Siguiente' : 'Continuar')}
                    {!loadingAction && <ArrowRight size={18} />}
                </button>
            </div>
        </div>
      );
  }

  // --- DASHBOARD ---
  // Fix scrolling: use h-full overflow-y-auto instead of hidden
  return (
      <div className="h-screen bg-bg font-sans text-text-primary flex flex-col selection:bg-brand-primary/30">
          {/* Header */}
          <div className="relative pt-8 pb-12 px-6 bg-surface-1 rounded-b-2xl border-b border-[rgb(var(--fg-rgb))]/10 shadow-2xl z-10 shrink-0">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-primary/10 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                     {branding?.logo ? (
                         <img src={branding.logo} alt="Logo" className="h-8 w-auto object-contain" />
                     ) : (
                         <AnimatedLogo size={24} isStatic showFill={false} />
                     )}
                     <span className="text-sm font-bold text-text-primary tracking-widest uppercase">{branding?.name || 'Portal'}</span>
                  </div>
                  <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors border border-[rgb(var(--fg-rgb))]/5">
                      <LogOut size={18} />
                  </button>
              </div>

              <div className="relative z-10 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent p-0.5 shadow-glow">
                     <div className="w-full h-full bg-surface-1 rounded-lg flex items-center justify-center overflow-hidden">
                         <User size={32} className="text-text-primary" />
                     </div>
                  </div>
                  <div>
                     <h1 className="text-2xl font-bold text-text-primary">{clientData?.name || 'Cliente'}</h1>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-status-success/10 border border-status-success/20 text-status-success-soft text-[10px] font-semibold rounded uppercase">
                            Activo
                        </span>
                        <span className="text-text-disabled text-xs font-mono">{clientData?.phone}</span>
                     </div>
                  </div>
              </div>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 -mt-6 pt-10 pb-12 relative z-0">
              {services.length === 0 ? (
                  <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl p-10 text-center flex flex-col items-center shadow-lg mt-4">
                      <WifiOff size={32} className="text-text-faint mb-4" />
                      <p className="text-text-secondary font-bold text-sm">Sin Servicios Activos</p>
                      <p className="text-text-disabled text-xs mt-1">Contacta a soporte si crees que es un error.</p>
                  </div>
              ) : (
                  services.map((service, idx) => (
                      <ServiceCard key={idx} service={service} onReport={handleReportIssue} />
                  ))
              )}
              
              <div className="mt-12 text-center opacity-40">
                 <p className="text-[10px] text-text-faint font-medium uppercase tracking-widest">Powered by Noova Suite</p>
              </div>
          </div>
      </div>
  );
};

export default PortalPage;
