
import React, { useState, useEffect } from 'react';
import { 
  AccountSecuritySettings, BusinessSettings, MessagesSection, 
  DataSection, ActivitySection, IntegrationsSection, LegalSection, NotificationSettings, BusinessIdentitySection, SalesConfigSection
} from '../../../components/settings/SettingsComponents';
import ServicesMobile from '../services/ServicesMobile'; 
import { ChevronRight, Briefcase, MessageSquare, User, Database, Settings2, ShieldCheck, Bell, Building, ShieldAlert, Lock, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_VERSION } from '../../../version';
import { useUIStore } from '../../../store/uiStore';

const SecurityHub = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="bg-status-success/10 border border-status-success/20 p-5 rounded-xl flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-status-success/20 flex items-center justify-center text-status-success-soft">
        <ShieldCheck size={24} />
      </div>
      <div>
        <h4 className="text-text-primary font-bold text-sm">Tu cuenta está protegida</h4>
        <p className="text-text-muted text-[10px]">Encriptación de nivel bancario activa.</p>
      </div>
    </div>

    <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[rgb(var(--fg-rgb))]/5">
        <h3 className="text-text-primary font-semibold text-xs uppercase tracking-widest">Protocolos de Privacidad</h3>
      </div>
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--fg-rgb))]/5">
          <div className="flex items-center gap-3">
            <Lock size={16} className="text-brand-primary" />
            <span className="text-sm text-text-secondary">Encriptación en Reposo</span>
          </div>
          <span className="text-[10px] font-semibold text-status-success-soft uppercase">AES-256</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--fg-rgb))]/5">
          <div className="flex items-center gap-3">
            <Smartphone size={16} className="text-brand-primary" />
            <span className="text-sm text-text-secondary">Acceso al Portal</span>
          </div>
          <span className="text-[10px] font-semibold text-status-success-soft uppercase">Protegido por PIN</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--fg-rgb))]/5">
          <div className="flex items-center gap-3">
            <Database size={16} className="text-brand-primary" />
            <span className="text-sm text-text-secondary">Sincronización Segura</span>
          </div>
          <span className="text-[10px] font-semibold text-status-success-soft uppercase">SSL / TLS 1.3</span>
        </div>
      </div>
    </div>

    <div className="p-5 border border-[rgb(var(--fg-rgb))]/5 bg-surface-3 rounded-xl">
      <h3 className="text-text-primary font-bold text-sm mb-2 flex items-center gap-2">
        <Smartphone size={16} className="text-text-muted" /> Sesiones Activas
      </h3>
      <div className="space-y-4 mt-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs text-text-primary font-bold">Este dispositivo</span>
            <span className="text-[10px] text-text-disabled">Activo ahora mismo</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-status-success shadow-[0_0_8px_#10b981]" />
        </div>
      </div>
      <button className="w-full mt-6 py-3 border border-status-danger/30 text-status-danger-soft text-[10px] font-semibold uppercase rounded-xl active:bg-status-danger/10 transition-colors">
        Cerrar todas las demás sesiones
      </button>
    </div>
  </div>
);

const SettingsMobile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { setBackAction, setBottomNavVisible } = useUIStore();

  useEffect(() => {
    setBottomNavVisible(false);
    return () => setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  const MENU_GROUPS = [
    {
      title: 'Negocio',
      items: [
        { id: 'business', label: 'Configuracion General', icon: Briefcase, desc: 'Moneda, Finanzas y Categorias' },
        { id: 'identity', label: 'Identidad del Negocio', icon: Building, desc: 'Logo y Nombre comercial' },
        { id: 'services', label: 'Catálogo de Servicio', icon: Settings2, desc: 'Plataformas y precios' }
      ]
    },
    {
      title: 'Ayuda y Soporte',
      items: [
        { id: 'security', label: 'Centro de Seguridad', icon: ShieldCheck, desc: 'Encriptación y Sesiones' },
        { id: 'messages', label: 'Mensajeria', icon: MessageSquare, desc: 'Plantillas de Whatsapp' },
        { id: 'notifications', label: 'Notificaciones', icon: Bell, desc: 'Alertas en dispositivo' }
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'account', label: 'Cuenta y Perfil', icon: User, desc: 'Tu Informacion y apariencia' },
        { id: 'data', label: 'Datos y Copias', icon: Database, desc: 'Exportacion Informacion' },
        { id: 'integrations', label: 'Integraciones', icon: Settings2, desc: 'Estado del sistema' },
        { id: 'legal', label: 'Legal y Privacidad', icon: ShieldCheck, desc: 'Terminos y Condiciones' }
      ]
    }
  ];

  useEffect(() => {
    if (activeTab) {
        setBackAction(() => setActiveTab(null));
    } else {
        setBackAction(null);
    }
    return () => setBackAction(null);
  }, [activeTab, setBackAction]);

  const renderContent = () => {
    switch(activeTab) {
      case 'business': return <BusinessSettings />;
      case 'identity': return <BusinessIdentitySection />;
      case 'services': return <ServicesMobile onBack={() => setActiveTab(null)} />;
      case 'security': return <SecurityHub />;
      case 'messages': return <MessagesSection />;
      case 'notifications': return <NotificationSettings />;
      case 'account': return <AccountSecuritySettings />;
      case 'data': return <DataSection />;
      case 'integrations': return <IntegrationsSection />;
      case 'legal': return <LegalSection />;
      default: return null;
    }
  };

  const activeItem = MENU_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab);

  return (
    <div className="w-full min-h-screen pb-10 font-sans relative text-text-primary px-6 pt-safe mt-2">
      <div className="fixed inset-0 bg-surface-sunken z-0" />
      <AnimatePresence mode="wait">
        {!activeTab && (
          <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 relative z-10" >
            <div className="mt-6 mb-10">
               <h1 className="text-2xl font-black text-text-primary tracking-tight">Ajustes</h1>
               <p className="text-text-disabled text-[12px] font-medium mt-0.5">Personaliza tu Noova</p>
            </div>
            <div className="space-y-6">
              {MENU_GROUPS.map((group, idx) => (
                <div key={idx} className="space-y-2.5">
                   <h3 className="text-[10px] font-semibold text-text-faint uppercase tracking-[0.2em] px-1">{group.title}</h3>
                   <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button key={item.id} onClick={() => setActiveTab(item.id)} className="w-full p-3 rounded-xl flex items-center gap-3 bg-surface-1 border border-border-subtle shadow-elev-sm active:scale-[0.98] transition-all hover:bg-surface-2 group" >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-sunken text-text-primary shrink-0 border border-border-subtle">
                              <Icon size={14} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 text-left">
                              <span className="block text-[13px] font-semibold text-text-primary/90 leading-tight">{item.label}</span>
                              <span className="block text-[9px] text-text-faint mt-0.5 font-medium uppercase tracking-wider">{item.desc}</span>
                            </div>
                            <ChevronRight size={16} className="text-text-faint group-active:text-text-muted transition-colors" />
                          </button>
                        );
                      })}
                   </div>
                </div>
              ))}
            </div>
            <div className="py-12 text-center">
              <p className="text-[9px] text-text-faint font-bold tracking-[0.3em] uppercase">Noova Suite v{APP_VERSION}</p>
            </div>
          </motion.div>
        )}
        {activeTab && activeItem && (
          <motion.div key="detail" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="relative z-10 h-full flex flex-col" >
            {activeTab !== 'services' && (
              <div className="mb-4 pt-2 px-2">
                <h2 className="text-2xl font-bold text-text-primary leading-tight tracking-tight">{activeItem.label}</h2>
                <p className="text-text-muted text-[11px] font-medium mt-0.5">{activeItem.desc}</p>
              </div>
            )}
            <div className="pb-40 animate-fade-in">{renderContent()}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsMobile;
