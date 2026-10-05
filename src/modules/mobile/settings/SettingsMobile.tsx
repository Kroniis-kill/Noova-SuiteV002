import React, { useState, useEffect, useMemo } from 'react';
import { 
  AccountSecuritySettings, BusinessSettings, MessagesSection, 
  DataSection, ActivitySection, IntegrationsSection, LegalSection, NotificationSettings, BusinessIdentitySection
} from '../../../components/settings/SettingsComponents';
import ServicesMobile from '../services/ServicesMobile'; 
import {
  ChevronRight, Briefcase, MessageSquare, User, Database, Settings2, ShieldCheck, Bell,
  Building, Lock, Smartphone, History, Search, Crown, LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_VERSION } from '../../../version';
import { useUIStore } from '../../../store/uiStore';
import { useAuth } from '../../../context/AuthContext';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useHaptic } from '../../../hooks/useHaptic';

const SecurityHub = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="bg-status-success/10 border border-status-success/20 p-5 rounded-xl flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-status-success/20 flex items-center justify-center text-status-success-soft">
        <ShieldCheck size={24} />
      </div>
      <div>
        <h4 className="text-text-primary font-bold text-sm">Tu cuenta está protegida</h4>
        <p className="text-text-muted text-tiny">Encriptación de nivel bancario activa.</p>
      </div>
    </div>

    <div className="bg-surface-3 border border-border-subtle rounded-xl overflow-hidden">
      <div className="p-4 border-b border-hairline">
        <h3 className="text-tiny font-black text-text-faint uppercase tracking-[0.2em]">Protocolos de Privacidad</h3>
      </div>
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--fg-rgb))]/5">
          <div className="flex items-center gap-3">
            <Lock size={16} className="text-brand-primary" />
            <span className="text-sm text-text-secondary">Encriptación en Reposo</span>
          </div>
          <span className="text-tiny font-semibold text-status-success-soft uppercase">AES-256</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--fg-rgb))]/5">
          <div className="flex items-center gap-3">
            <Smartphone size={16} className="text-brand-primary" />
            <span className="text-sm text-text-secondary">Acceso al Portal</span>
          </div>
          <span className="text-tiny font-semibold text-status-success-soft uppercase">Protegido por PIN</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--fg-rgb))]/5">
          <div className="flex items-center gap-3">
            <Database size={16} className="text-brand-primary" />
            <span className="text-sm text-text-secondary">Sincronización Segura</span>
          </div>
          <span className="text-tiny font-semibold text-status-success-soft uppercase">SSL / TLS 1.3</span>
        </div>
      </div>
    </div>

    <div className="p-5 border border-hairline bg-surface-3 rounded-xl">
      <h3 className="text-text-primary font-bold text-sm mb-2 flex items-center gap-2">
        <Smartphone size={16} className="text-text-muted" /> Sesiones Activas
      </h3>
      <div className="space-y-4 mt-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs text-text-primary font-bold">Este dispositivo</span>
            <span className="text-tiny text-text-disabled">Activo ahora mismo</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-status-success shadow-dot-success" />
        </div>
      </div>
      <button className="w-full mt-6 py-3 border border-status-danger/30 text-status-danger-soft text-tiny font-semibold uppercase rounded-md active:bg-status-danger/10 transition-colors">
        Cerrar todas las demás sesiones
      </button>
    </div>
  </div>
);

interface SettingItem {
  id: string;
  label: string;
  icon: React.ElementType;
  desc: string;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Plan Gratis',
  pro: 'Plan Pro',
  lifetime: 'Plan Lifetime',
};

const SettingsMobile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { setBackAction, setBottomNavVisible } = useUIStore();
  const { user, logout } = useAuth();
  const { subscription, isAdmin } = useSubscription();
  const haptic = useHaptic();

  useEffect(() => {
    setBottomNavVisible(false);
    return () => setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  const MENU_GROUPS = useMemo<SettingGroup[]>(() => [
    {
      title: 'Negocio',
      items: [
        { id: 'business', label: 'Configuración General', icon: Briefcase, desc: 'Moneda, finanzas y categorías' },
        { id: 'identity', label: 'Identidad del Negocio', icon: Building, desc: 'Logo y nombre comercial' },
        { id: 'services', label: 'Catálogo de Servicios', icon: Settings2, desc: 'Plataformas y precios' },
        { id: 'messages', label: 'Mensajería', icon: MessageSquare, desc: 'Plantillas de WhatsApp' },
      ],
    },
    {
      title: 'Seguridad y alertas',
      items: [
        { id: 'security', label: 'Centro de Seguridad', icon: ShieldCheck, desc: 'Encriptación y sesiones' },
        { id: 'notifications', label: 'Notificaciones', icon: Bell, desc: 'Alertas en el dispositivo' },
      ],
    },
    {
      title: 'Datos',
      items: [
        { id: 'data', label: 'Datos y Copias', icon: Database, desc: 'Exportar información' },
        { id: 'activity', label: 'Historial de Cambios', icon: History, desc: 'Registro de operaciones' },
        { id: 'integrations', label: 'Integraciones', icon: Settings2, desc: 'Estado del sistema' },
      ],
    },
    {
      title: 'Cuenta',
      items: [
        { id: 'account', label: 'Cuenta y Perfil', icon: User, desc: 'Tu información y apariencia' },
        { id: 'legal', label: 'Legal y Privacidad', icon: ShieldCheck, desc: 'Términos y condiciones' },
      ],
    },
  ], []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MENU_GROUPS;
    return MENU_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [MENU_GROUPS, query]);

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
      case 'activity': return <ActivitySection />;
      case 'data': return <DataSection />;
      case 'integrations': return <IntegrationsSection />;
      case 'legal': return <LegalSection />;
      default: return null;
    }
  };

  const activeItem = MENU_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab);
  const planLabel = PLAN_LABELS[subscription?.plan ?? 'free'] ?? PLAN_LABELS.free;
  const displayName = user?.name || user?.email?.split('@')[0] || 'Mi Negocio';
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || 'NS';

  return (
    <div className="w-full min-h-screen pb-10 font-sans relative text-text-primary px-6 pt-safe mt-2">
      <div className="fixed inset-0 bg-surface-sunken z-0" />
      <AnimatePresence mode="wait">
        {!activeTab && (
          <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 relative z-10" >
            <div className="mt-6 mb-5">
               <h1 className="text-2xl font-black text-text-primary tracking-tight">Ajustes</h1>
               <p className="text-text-muted text-caption font-semibold uppercase tracking-[0.15em] mt-1">Personaliza tu Noova</p>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar un ajuste"
                className="w-full h-12 bg-surface-1 border border-border-subtle rounded-xl pl-11 pr-4 text-body-sm text-text-primary outline-none focus:border-brand-primary/40 placeholder:text-text-faint transition-all font-medium"
              />
            </div>

            <button
              type="button"
              onClick={() => { haptic('nav'); setActiveTab('account'); }}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-1 border border-border-subtle shadow-elev-sm active:scale-[0.98] transition-all"
            >
              <div className="w-14 h-14 shrink-0 rounded-full bg-brand-gradient shadow-glow-sm flex items-center justify-center text-white text-[16px] font-black">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[15px] font-bold text-text-primary truncate">{displayName}</div>
                {user?.email && <div className="text-caption text-text-muted truncate mt-0.5">{user.email}</div>}
                <span className="inline-flex items-center gap-1 mt-1.5 text-micro font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-brand-primary/10 border border-brand-primary/25 text-brand-primary-hi">
                  <Crown size={10} /> {isAdmin ? 'Admin' : planLabel}
                </span>
              </div>
              <ChevronRight size={18} className="text-text-faint shrink-0" />
            </button>

            <div className="space-y-6">
              {filteredGroups.length === 0 && (
                <p className="text-center text-label text-text-muted py-6">No se encontró ningún ajuste.</p>
              )}
              {filteredGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                   <h3 className="text-caption font-black text-text-faint uppercase tracking-[0.2em] px-1">{group.title}</h3>
                   <div className="rounded-xl bg-surface-1 border border-border-subtle shadow-elev-sm overflow-hidden">
                      {group.items.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => { haptic('nav'); setActiveTab(item.id); }}
                            className={`w-full min-h-[64px] p-3 flex items-center gap-3 active:bg-surface-2 transition-all ${idx > 0 ? 'border-t border-hairline' : ''}`}
                          >
                            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-brand-primary/10 text-brand-primary-hi">
                              <Icon size={18} strokeWidth={2.25} />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <span className="block text-[14px] font-semibold text-text-primary leading-tight truncate">{item.label}</span>
                              <span className="block text-caption text-text-muted mt-0.5 truncate">{item.desc}</span>
                            </div>
                            <ChevronRight size={18} className="text-text-faint shrink-0" />
                          </button>
                        );
                      })}
                   </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { haptic('heavy'); logout(); }}
              className="w-full min-h-[60px] p-3 flex items-center gap-3 rounded-xl bg-surface-1 border border-border-subtle shadow-elev-sm active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-status-danger/10 text-status-danger-soft">
                <LogOut size={18} strokeWidth={2.25} />
              </div>
              <span className="text-[14px] font-semibold text-status-danger-soft">Cerrar sesión</span>
            </button>

            <div className="py-10 text-center">
              <p className="text-tiny text-text-faint font-bold tracking-[0.3em] uppercase">Noova Suite v{APP_VERSION}</p>
            </div>
          </motion.div>
        )}
        {activeTab && activeItem && (
          <motion.div key="detail" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} className="relative z-10 h-full flex flex-col" >
            {activeTab !== 'services' && (
              <div className="mb-4 pt-2 px-2">
                <h2 className="text-2xl font-bold text-text-primary leading-tight tracking-tight">{activeItem.label}</h2>
                <p className="text-text-muted text-caption font-medium mt-0.5">{activeItem.desc}</p>
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
