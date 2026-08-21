
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { withRetry } from '../utils/supabaseUtils';
import { formatDate } from '../utils/contactosUtils';
/* Add missing ChevronRight to imports */
import { Copy, MessageSquareWarning, ChevronDown, ChevronRight, User, Lock, RefreshCw, LogOut, ShieldAlert, Layers, Calendar, Unlock, ArrowRight, WifiOff, Monitor, Key, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import { useToast } from '../context/ToastContext';

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

const ServiceCard: React.FC<{ service: PortalService; onReport: (s: PortalService) => void; }> = ({ service, onReport }) => {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const daysLeft = (() => {
      if (!service.expiry_date) return 0;
      const now = new Date();
      const exp = new Date(service.expiry_date);
      const diff = exp.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 3600 * 24));
  })();

  const isExpired = daysLeft <= 0;
  const isWarning = daysLeft <= 3 && !isExpired;

  const copyToClipboard = (text: string, label: string) => {
    if(!text || text === '---') return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado`, 'success');
  };

  const isUnique = service.sale_type === 'usuario_unico';
  const user = isUnique ? service.invited_email : service.account_email;
  const pass = isUnique ? service.invited_password : service.account_password;
  const pName = service.profile_name;
  const pPin = service.profile_pin;

  return (
    <div className={`bg-surface-1 border transition-all duration-300 rounded-xl overflow-hidden mb-4 shadow-lg ${isExpanded ? 'border-[rgb(var(--fg-rgb))]/20' : 'border-[rgb(var(--fg-rgb))]/[0.08]'}`}>
        {/* Header Compacto (Siempre visible) */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4 flex items-center justify-between cursor-pointer active:bg-[rgb(var(--fg-rgb))]/5"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-surface-3 flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 shrink-0 overflow-hidden">
                    <Layers size={18} className="text-text-muted" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary leading-tight">{service.service_name || 'Servicio'}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] font-bold uppercase ${isExpired ? 'text-status-danger-soft' : isWarning ? `Vence en ${daysLeft}d` : `${daysLeft} días`} text-brand-primary`}>
                        {isExpired ? 'Expirado' : isWarning ? `Vence en ${daysLeft}d` : `${daysLeft} días`}
                    </span>
                  </div>
                </div>
            </div>
            <motion.div 
              animate={{ rotate: isExpanded ? 180 : 0 }}
              className="text-text-faint"
            >
              <ChevronDown size={20} />
            </motion.div>
        </div>

        {/* Detalle Expandible */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="px-4 pb-5 pt-1 space-y-4">
                  <div className="bg-surface-3 rounded-lg p-4 border border-[rgb(var(--fg-rgb))]/5 space-y-3">
                      <div className="flex justify-between items-center group cursor-pointer" onClick={() => copyToClipboard(user || '', 'Usuario')}>
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                            <Mail size={14} className="text-text-disabled" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-text-disabled uppercase">Usuario</span>
                              <span className="text-xs font-medium text-text-primary truncate">{user || '---'}</span>
                            </div>
                        </div>
                        <Copy size={12} className="text-text-faint group-hover:text-text-primary transition-colors shrink-0" />
                      </div>
                      
                      <div className="w-full h-px bg-[rgb(var(--fg-rgb))]/5" />
                      
                      <div className="flex justify-between items-center group cursor-pointer" onClick={() => copyToClipboard(pass || '', 'Contraseña')}>
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                            <Key size={14} className="text-text-disabled" />
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-text-disabled uppercase">Contraseña</span>
                              <span className="text-xs font-medium text-text-primary truncate font-mono">{pass || '---'}</span>
                            </div>
                        </div>
                        <Copy size={12} className="text-text-faint group-hover:text-text-primary transition-colors shrink-0" />
                      </div>
                      
                      {(pName || pPin) && (
                          <>
                            <div className="w-full h-px bg-[rgb(var(--fg-rgb))]/5" />
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              {pName && (
                                  <div className="bg-surface-1 rounded-md p-2.5 border border-[rgb(var(--fg-rgb))]/5" onClick={() => copyToClipboard(pName, 'Perfil')}>
                                      <span className="text-[8px] font-bold text-text-disabled uppercase block mb-0.5">Perfil</span>
                                      <span className="text-xs font-semibold text-text-primary truncate block">{pName}</span>
                                  </div>
                              )}
                              {pPin && (
                                  <div className="bg-surface-1 rounded-md p-2.5 border border-[rgb(var(--fg-rgb))]/5 text-center" onClick={() => copyToClipboard(pPin, 'PIN')}>
                                      <span className="text-[8px] font-bold text-text-disabled uppercase block mb-0.5">PIN</span>
                                      <span className="text-xs font-semibold text-text-primary font-mono">{pPin}</span>
                                  </div>
                              )}
                            </div>
                          </>
                      )}
                  </div>

                  <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-text-disabled font-medium">
                        <Calendar size={12} />
                        <span>Vence: <span className="text-text-secondary font-mono">{formatDate(service.expiry_date)}</span></span>
                      </div>
                      <button onClick={() => onReport(service)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[rgb(var(--fg-rgb))]/5 hover:bg-status-danger/10 text-text-muted hover:text-status-danger-soft font-bold text-[9px] transition-colors border border-[rgb(var(--fg-rgb))]/5">
                          <MessageSquareWarning size={12} /> Reportar Falla
                      </button>
                  </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

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
      if (idx !== -1 && parts.length > idx + 1) return parts[idx + 1];
      return null;
  };
  const clientAlias = getAliasFromPath();

  useEffect(() => {
    withRetry(() => 
      supabase.from('app_config')
        .select('value')
        .eq('key', 'support_phone')
        .single()
    ).then(({data}) => { if(data) setSupportPhone(data.value); });
    const checkAccess = async () => {
      await new Promise(r => setTimeout(r, 500));
      if (!clientAlias) { setErrorMessage("Enlace inválido."); setView('error'); return; }
      try {
        const { data, error } = await supabase.functions.invoke('portal-cliente', { method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alias: clientAlias, mode: 'check' }) });
        if (error) throw error;
        if (data.error) { setErrorMessage(data.error === "NOT_FOUND" ? "Portal no encontrado." : "Error: " + data.error); setView('error'); return; }
        if (data.status === 'setup_required') { setClientData({ name: data.name, phone: '' }); setView('setup_pin'); }
        else if (data.status === 'pin_required') { setClientData({ name: data.name, phone: '' }); setView('login'); }
        else if (data.status === 'authorized') { loadDashboard(data); }
      } catch (err: any) { setErrorMessage("Error de conexión segura."); setView('error'); }
    };
    checkAccess();
  }, [clientAlias]);

  const callEdgeFunction = async (mode: 'login' | 'init', pinCode?: string) => {
    setLoadingAction(true); setPinError('');
    try {
      const { data, error } = await supabase.functions.invoke('portal-cliente', { method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alias: clientAlias, mode, pin: pinCode }) });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (err: any) { 
        const msg = err.message === "PIN_INVALID" ? "PIN Incorrecto" : "Error al procesar";
        setPinError(msg); 
        throw err; 
    } finally { setLoadingAction(false); }
  };

  const handleLogin = async () => {
    if (pin.length !== 4) { setPinError('El PIN debe ser de 4 dígitos'); return; }
    try { 
        const response = await callEdgeFunction('login', pin); 
        if (response && response.status === 'authorized') loadDashboard(response); 
    } catch (err: any) { setPin(''); }
  };

  const handleSetup = async () => {
    if (pin.length !== 4) { setPinError('PIN debe ser de 4 dígitos'); return; }
    if (pin !== confirmPin) { setPinError('Los PIN no coinciden'); return; }
    try { 
        const response = await callEdgeFunction('init', pin); 
        if (response && response.status === 'authorized') { 
            showToast('PIN configurado', 'success'); 
            loadDashboard(response); 
        } 
    } catch (err: any) {}
  };

  const loadDashboard = (data: any) => {
    setClientData(data.cliente || { name: 'Cliente', phone: '' });
    if (data.branding) setBranding(data.branding);
    setServices(data.servicios || []);
    setView('dashboard');
  };

  /* Add handleLogout to resolve 'Cannot find name handleLogout' */
  const handleLogout = () => {
      window.location.reload();
  };

  const handleReportIssue = (service: PortalService) => {
      const message = `Hola, reporto una falla con mi servicio ${service.service_name}.`;
      window.open(`https://wa.me/${supportPhone || '573000000000'}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleNum = (n: string) => { setPinError(''); if(pin.length < 4) setPin(p => p + n); };
  const handleBackspace = () => { setPinError(''); setPin(prev => prev.slice(0, -1)); };
  
  const handleNextStep = () => { 
      if (view === 'setup_pin') { 
          if (!confirmPin) { 
              if (pin.length < 4) { setPinError("Ingresa 4 dígitos"); return; } 
              setConfirmPin(pin); 
              setPin(''); 
          } else { 
              if (pin !== confirmPin) { setPinError("PIN no coincide"); setConfirmPin(''); setPin(''); return; } 
              handleSetup(); 
          } 
      } else { 
          handleLogin(); 
      } 
  };

  if (view === 'loading') return <div className="min-h-screen bg-bg flex flex-col items-center justify-center"><AnimatedLogo size={80} showFill={false} /><p className="text-text-disabled text-xs mt-6 font-medium animate-pulse">Autenticando...</p></div>;
  if (view === 'error') return <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center"><div className="w-16 h-16 bg-status-danger/10 rounded-lg flex items-center justify-center mb-6 border border-status-danger/20"><ShieldAlert size={28} className="text-status-danger" /></div><h1 className="text-xl font-bold text-text-primary mb-2">Acceso restringido</h1><p className="text-text-muted text-sm max-w-[250px] mx-auto">{errorMessage}</p></div>;

  if (view === 'login' || view === 'setup_pin') {
      const isSetup = view === 'setup_pin';
      return (
        <div className="min-h-screen h-screen bg-bg flex flex-col items-center justify-center p-4 overflow-hidden">
            <div className="flex flex-col items-center w-full max-w-sm mx-auto animate-fade-in">
                <div className="mb-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-lg flex items-center justify-center mx-auto mb-4 shadow-glow p-px">
                        <div className="w-full h-full bg-bg rounded-lg flex items-center justify-center">
                            {isSetup ? <Unlock className="w-6 h-6 text-text-primary" /> : <Lock className="w-6 h-6 text-text-primary" />}
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-1 tracking-tight">{isSetup ? (!confirmPin ? 'Crea tu PIN' : 'Confirma tu PIN') : `Hola, ${clientData?.name?.split(' ')[0]}`}</h2>
                    <p className="text-text-disabled text-xs">{isSetup ? 'Define un código de 4 dígitos.' : 'Ingresa tu código de seguridad.'}</p>
                    <div className="flex gap-4 justify-center mt-6 h-3">
                        {[0,1,2,3].map((i) => (<div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i < pin.length ? 'bg-brand-primary scale-125 shadow-[0_0_8px_#6A2CFF]' : 'bg-surface-3'}`} />))}
                    </div>
                    <div className="h-6 mt-4">
                        {pinError && <p className="text-status-danger-soft text-[10px] font-semibold bg-status-danger/10 py-1 px-3 rounded-full inline-block border border-status-danger/20">{pinError}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 w-full mb-6 select-none px-4">
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                        <button key={n} onClick={() => handleNum(n.toString())} className="h-14 rounded-lg bg-surface-1 text-xl font-bold text-text-primary hover:bg-[rgb(var(--fg-rgb))]/5 active:bg-[rgb(var(--fg-rgb))]/10 transition-all border border-[rgb(var(--fg-rgb))]/[0.08] shadow-sm">{n}</button>
                    ))}
                    <div />
                    <button onClick={() => handleNum('0')} className="h-14 rounded-lg bg-surface-1 text-xl font-bold text-text-primary hover:bg-[rgb(var(--fg-rgb))]/5 active:bg-[rgb(var(--fg-rgb))]/10 transition-all border border-[rgb(var(--fg-rgb))]/[0.08] shadow-sm">0</button>
                    <button onClick={handleBackspace} className="h-14 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary active:bg-[rgb(var(--fg-rgb))]/10 transition-all"><ChevronRight className="rotate-180" size={24} /></button>
                </div>
                <button onClick={handleNextStep} disabled={loadingAction || pin.length < 4} className="w-full max-w-[280px] h-14 bg-white text-black rounded-lg font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {loadingAction ? <RefreshCw className="animate-spin" size={18} /> : (isSetup && !confirmPin ? 'Siguiente' : 'Acceder')} 
                    {!loadingAction && <ArrowRight size={16} strokeWidth={3} />}
                </button>
            </div>
        </div>
      );
  }

  return (
      <div className="min-h-screen h-screen bg-bg font-sans text-text-primary flex flex-col overflow-hidden selection:bg-brand-primary/30">
          {/* Header Fijo */}
          <div className="relative pt-8 pb-12 px-6 bg-surface-1 rounded-b-2xl border-b border-[rgb(var(--fg-rgb))]/[0.08] overflow-hidden shadow-2xl z-10 shrink-0">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-primary/10 to-transparent pointer-events-none" />
              <div className="relative z-10 flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                     {branding?.logo ? (<img src={branding.logo} alt="Logo" className="h-8 w-auto object-contain" />) : (<AnimatedLogo size={24} isStatic showFill={false} />)}
                     <span className="text-xs font-semibold text-text-primary tracking-[0.2em] uppercase">{branding?.name || 'Noova Suite'}</span>
                  </div>
                  <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted hover:text-text-primary border border-[rgb(var(--fg-rgb))]/5 active:scale-90 transition-all"><LogOut size={18} /></button>
              </div>
              <div className="relative z-10 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent p-0.5 shadow-glow"><div className="w-full h-full bg-surface-1 rounded-lg flex items-center justify-center overflow-hidden"><User size={32} className="text-white" /></div></div>
                  <div><h1 className="text-xl font-bold text-text-primary tracking-tight">{clientData?.name}</h1><div className="flex items-center gap-2 mt-1"><span className="px-2.5 py-0.5 bg-status-success/10 border border-status-success/20 text-status-success-soft text-[9px] font-bold rounded-lg uppercase tracking-wider">Acceso Verificado</span></div></div>
              </div>
          </div>

          {/* Área de Scroll de Servicios */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 -mt-6 pt-10 pb-24 relative z-0">
              {services.length === 0 ? (
                  <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-12 text-center flex flex-col items-center shadow-lg">
                    <WifiOff size={40} className="text-text-faint mb-4" />
                    <p className="text-text-muted font-bold text-sm">Sin suscripciones activas</p>
                  </div>
              ) : (
                  services.map((service, idx) => <ServiceCard key={idx} service={service} onReport={handleReportIssue} />)
              )}
              
              <div className="mt-12 text-center opacity-30 pb-8"><p className="text-[10px] text-text-disabled font-semibold uppercase tracking-[0.3em]">Noova Suite • Client Portal</p></div>
          </div>
      </div>
  );
};

export default PortalPage;
