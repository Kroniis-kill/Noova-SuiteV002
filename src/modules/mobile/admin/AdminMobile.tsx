import React, { useEffect, useState, useMemo } from 'react';
import { useSubscription } from '../../../context/SubscriptionContext';
import { UserSubscription, PLAN_LABELS, PlanType, PLAN_PRICES } from '../../../types/subscriptionTypes';
import { Feedback, Announcement } from '../../../types/adminTypes';
import {
  Users, Search, Plus, Edit2, Trash2, History, BarChart3,
  Shield, ShieldCheck, Infinity, ChevronRight, DollarSign, Crown,
  Smartphone, MessageSquare, Megaphone, RefreshCw, Settings,
  ShieldAlert, Calendar, AlertOctagon, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminUserModal from '../../../components/admin/AdminUserModal';
import ExtensionModal from '../../../components/admin/ExtensionModal';
import AdminUserDetailModal from '../../../components/admin/AdminUserDetailModal';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../context/ToastContext';
import AdminHistoryMobile from './history/AdminHistoryMobile';
import AdminAnalyticsMobile from './analytics/AdminAnalyticsMobile';
import { formatDate } from '../../../utils/contactosUtils';

type AdminTab = 'overview' | 'users' | 'feedback' | 'announcements' | 'system' | 'history' | 'analytics';

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Inicio', icon: TrendingUp },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'announcements', label: 'Anuncios', icon: Megaphone },
  { id: 'system', label: 'Sistema', icon: ShieldCheck },
];

const AdminMobile: React.FC = () => {
  const {
    getAllSubscriptions, registerTenant, updateSubscription, deleteSubscription,
    toggleBlockStatus, supportNumber, updateSupportNumber,
    getFeedback, markFeedbackAsRead, getAnnouncements, createAnnouncement, deleteAnnouncement,
  } = useSubscription();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [subs, setSubs] = useState<UserSubscription[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserSubscription | null>(null);
  const [editingSub, setEditingSub] = useState<UserSubscription | null>(null);
  const [extensionTarget, setExtensionTarget] = useState<UserSubscription | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserSubscription | null>(null);
  const [tempPhone, setTempPhone] = useState(supportNumber);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsSyncing(true);
    const [subsData, feedbackData, announcementsData] = await Promise.all([
      getAllSubscriptions(), getFeedback(), getAnnouncements(),
    ]);
    setSubs(subsData);
    setFeedback(feedbackData);
    setAnnouncements(announcementsData);
    setTimeout(() => setIsSyncing(false), 400);
  };

  const handleSave = async (email: string, password: string, plan: PlanType, expiryDate: string) => {
    const res = editingSub
      ? await updateSubscription(editingSub.user_id, plan, expiryDate)
      : await registerTenant(email, password, plan, expiryDate);
    if (res.success) {
      showToast(editingSub ? 'Suscripción actualizada' : 'Usuario registrado', 'success');
      setIsModalOpen(false); setEditingSub(null); loadData();
    } else {
      showToast(res.message || 'Error', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await deleteSubscription(deleteConfirm.user_id);
    if (res.success) {
      showToast('Usuario eliminado', 'success');
      setDeleteConfirm(null); loadData();
    }
  };

  const handleBlockToggle = async (sub: UserSubscription) => {
    const success = await toggleBlockStatus(sub.user_id, sub.status || 'active');
    if (success) {
      showToast(sub.status === 'banned' ? 'Acceso restaurado' : 'Usuario bloqueado', 'info');
      loadData();
    }
  };

  const metrics = useMemo(() => {
    const active = subs.filter(s => s.is_active && s.plan !== 'free').length;
    const trial = subs.filter(s => s.plan === 'free').length;
    const totalRev = subs.reduce((acc, s) => acc + (s.is_active && s.plan !== 'free' ? PLAN_PRICES[s.plan] : 0), 0);
    const banned = subs.filter(s => s.status === 'banned').length;
    return { active, trial, totalRev, banned, total: subs.length };
  }, [subs]);

  const filteredSubs = useMemo(() => subs.filter(s =>
    (s.user_email || s.full_name || '').toLowerCase().includes(search.toLowerCase())
  ), [subs, search]);

  if (activeTab === 'history') return <AdminHistoryMobile onBack={() => setActiveTab('overview')} />;
  if (activeTab === 'analytics') return <AdminAnalyticsMobile onBack={() => setActiveTab('overview')} />;

  return (
    <div className="pb-32 pt-3 text-primary min-h-screen bg-bg">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-5 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-glow">
            <Shield size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight">Panel Admin</h1>
            <p className="text-disabled text-[10px]">Gestión de suscripciones</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className={`w-9 h-9 rounded-lg bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] flex items-center justify-center text-muted active:scale-90 transition-all ${isSyncing ? 'animate-spin text-brand-primary' : ''}`}
          ><RefreshCw size={16} /></button>
          <button
            onClick={() => { setEditingSub(null); setIsModalOpen(true); }}
            className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent text-white flex items-center justify-center shadow-glow active:scale-95 transition-all"
          ><Plus size={18} strokeWidth={2.5} /></button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-1 mb-5 overflow-x-auto custom-scrollbar">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[70px] py-2 px-2 rounded-lg text-[10px] font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                active ? 'bg-brand-primary text-white' : 'text-muted'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Ingresos" value={`$${metrics.totalRev.toFixed(0)}`} icon={DollarSign} accent="text-status-success-soft" bg="bg-status-success/10" />
              <MetricCard label="PRO activos" value={metrics.active} icon={Crown} accent="text-brand-primary" bg="bg-brand-primary/10" />
              <MetricCard label="Total" value={metrics.total} icon={Users} accent="text-status-info-soft" bg="bg-status-info/10" />
              <MetricCard label="Bloqueados" value={metrics.banned} icon={AlertOctagon} accent="text-status-danger-soft" bg="bg-status-danger/10" />
            </div>

            {/* Shortcuts */}
            <div className="grid grid-cols-2 gap-3">
              <ShortcutCard label="Analíticas" icon={BarChart3} onClick={() => setActiveTab('analytics')} />
              <ShortcutCard label="Auditoría" icon={History} onClick={() => setActiveTab('history')} />
              <ShortcutCard label="Configuración" icon={Settings} onClick={() => { setTempPhone(supportNumber); setIsConfigOpen(true); }} />
              <ShortcutCard label="Sistema" icon={ShieldCheck} onClick={() => setActiveTab('system')} />
            </div>

            {/* Recent users preview */}
            <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-primary">Últimos usuarios</h3>
                <button onClick={() => setActiveTab('users')} className="text-[11px] font-semibold text-brand-primary">Ver todos</button>
              </div>
              <div className="space-y-2">
                {subs.slice(0, 4).map(sub => (
                  <UserRow key={sub.user_id} sub={sub} onClick={() => { setSelectedUser(sub); setIsDetailModalOpen(true); }} />
                ))}
                {subs.length === 0 && (
                  <p className="text-disabled text-xs text-center py-6">Aún no hay usuarios registrados.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar usuario..."
                className="w-full h-11 bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg pl-10 pr-4 text-sm text-primary outline-none focus:border-brand-primary/50"
              />
            </div>
            <div className="space-y-2">
              {filteredSubs.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={28} className="mx-auto text-faint mb-2" />
                  <p className="text-disabled text-sm">Sin resultados</p>
                </div>
              ) : filteredSubs.map(sub => (
                <UserRow key={sub.user_id} sub={sub} onClick={() => { setSelectedUser(sub); setIsDetailModalOpen(true); }} />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'feedback' && (
          <motion.div key="feedback" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
            {feedback.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare size={28} className="mx-auto text-faint mb-2" />
                <p className="text-disabled text-sm">No hay mensajes.</p>
              </div>
            ) : feedback.map(f => (
              <div key={f.id} className={`p-4 rounded-xl border ${f.status === 'read' ? 'bg-surface-1 border-[rgb(var(--fg-rgb))]/[0.06]' : 'bg-brand-primary/5 border-brand-primary/20'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[11px] font-semibold text-muted">{f.user_email}</span>
                  {f.status === 'pending' && (
                    <button onClick={() => { markFeedbackAsRead(f.id); loadData(); }} className="text-[10px] font-semibold text-brand-primary">
                      Leído
                    </button>
                  )}
                </div>
                <p className="text-sm text-secondary leading-relaxed">{f.message}</p>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'announcements' && (
          <motion.div key="announcements" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-3">
            <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-4">
              <textarea
                value={newAnnouncement}
                onChange={e => setNewAnnouncement(e.target.value)}
                placeholder="Escribe un anuncio..."
                className="w-full bg-transparent text-sm text-primary outline-none resize-none min-h-[80px]"
              />
              <button
                onClick={async () => {
                  if (!newAnnouncement.trim()) return;
                  await createAnnouncement(newAnnouncement);
                  setNewAnnouncement(''); loadData();
                  showToast('Anuncio publicado', 'success');
                }}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg text-xs font-semibold"
              >
                Publicar anuncio
              </button>
            </div>
            {announcements.map(a => (
              <div key={a.id} className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.06] p-4 rounded-xl flex justify-between items-center gap-3">
                <p className="text-sm text-secondary flex-1">{a.message}</p>
                <button onClick={async () => { await deleteAnnouncement(a.id); loadData(); }} className="text-disabled active:text-status-danger-soft">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'system' && (
          <motion.div key="system" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Settings size={15} className="text-brand-primary" /> Configuración global
              </h3>
              <div>
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2 block">WhatsApp de soporte</label>
                <div className="relative">
                  <Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled" />
                  <input
                    value={tempPhone}
                    onChange={e => setTempPhone(e.target.value)}
                    className="w-full h-11 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg pl-10 pr-4 text-sm text-primary outline-none focus:border-brand-primary/50"
                  />
                </div>
                <p className="text-[10px] text-disabled mt-1.5">Visible para usuarios bloqueados o expirados.</p>
              </div>

              <div className="p-3 bg-status-warning/5 border border-status-warning/20 rounded-lg flex gap-3 items-start">
                <ShieldAlert size={16} className="text-status-warning-soft shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-amber-300 font-semibold text-xs">Kill switch</h4>
                  <p className="text-[10px] text-muted mt-0.5 leading-relaxed">Pausará el acceso a toda la plataforma. Próximamente.</p>
                </div>
              </div>

              <button
                onClick={async () => {
                  await updateSupportNumber(tempPhone);
                  showToast('Configuración guardada', 'success');
                }}
                className="w-full py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold text-sm rounded-lg active:scale-95 transition-all"
              >
                Guardar cambios
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALES */}
      <AdminUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSave} initialData={editingSub} />
      <ExtensionModal isOpen={isExtensionModalOpen} onClose={() => { setIsExtensionModalOpen(false); loadData(); }} user={extensionTarget} />
      <AdminUserDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        user={selectedUser}
        onEdit={(u: UserSubscription) => { setEditingSub(u); setIsModalOpen(true); }}
        onExtend={(u: UserSubscription) => { setExtensionTarget(u); setIsExtensionModalOpen(true); }}
        onBlock={(u: UserSubscription) => handleBlockToggle(u)}
        onDelete={(u: UserSubscription) => setDeleteConfirm(u)}
      />

      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Configuración">
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2 block">WhatsApp de soporte</label>
            <div className="relative">
              <Smartphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled" />
              <input
                value={tempPhone}
                onChange={e => setTempPhone(e.target.value)}
                className="w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm text-primary outline-none focus:border-brand-primary/50"
              />
            </div>
          </div>
          <button
            onClick={async () => {
              await updateSupportNumber(tempPhone);
              showToast('Configuración guardada', 'success');
              setIsConfigOpen(false);
            }}
            className="w-full py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold text-sm rounded-lg"
          >
            Guardar
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Eliminar usuario">
        <div className="space-y-4 pt-2">
          <div className="bg-status-danger/10 border border-status-danger/20 p-4 rounded-lg flex gap-3 items-start">
            <Trash2 size={20} className="text-status-danger-soft shrink-0" />
            <p className="text-sm text-secondary leading-relaxed">
              ¿Eliminar permanentemente a <strong className="text-primary">{deleteConfirm?.user_email}</strong>? Borrará todos sus datos.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-[rgb(var(--fg-rgb))]/5 rounded-lg text-secondary text-sm font-medium">Cancelar</button>
            <button onClick={handleDelete} className="flex-1 py-3 bg-status-danger rounded-lg text-white text-sm font-semibold">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, accent, bg }: any) => (
  <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-4">
    <div className={`w-8 h-8 rounded-lg ${bg} ${accent} flex items-center justify-center mb-3`}>
      <Icon size={15} />
    </div>
    <p className="text-xl font-bold text-primary tracking-tight">{value}</p>
    <p className="text-[10px] font-medium text-disabled uppercase tracking-wider mt-0.5">{label}</p>
  </div>
);

const ShortcutCard = ({ label, icon: Icon, onClick }: any) => (
  <button
    onClick={onClick}
    className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-4 flex items-center gap-3 active:scale-[0.97] transition-all"
  >
    <div className="w-9 h-9 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-secondary">
      <Icon size={16} />
    </div>
    <span className="text-xs font-semibold text-secondary">{label}</span>
  </button>
);

const UserRow = ({ sub, onClick }: { sub: UserSubscription; onClick: () => void }) => {
  const isLifetime = sub.plan === 'lifetime';
  const isExpired = !isLifetime && new Date(sub.expires_at) < new Date();
  const isBanned = sub.status === 'banned';
  const isPro = sub.plan !== 'free';
  const displayName = sub.full_name || sub.user_email?.split('@')[0] || 'Usuario';

  return (
    <div
      onClick={onClick}
      className={`bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.06] rounded-xl p-3 flex items-center justify-between gap-3 active:scale-[0.98] transition-all ${isBanned ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-[11px] shrink-0 ${isPro ? 'bg-gradient-to-br from-brand-primary to-brand-accent' : 'bg-surface-3 border border-[rgb(var(--fg-rgb))]/[0.08]'}`}>
          {displayName.substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary truncate">{displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase ${
              isLifetime ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
              : isPro ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
              : 'bg-zinc-500/10 text-muted border-zinc-500/20'
            }`}>
              {sub.plan}
            </span>
            {isBanned ? (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-status-danger/10 text-status-danger-soft border border-status-danger/20 uppercase">Bloq</span>
            ) : isExpired ? (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-status-danger/10 text-status-danger-soft border border-status-danger/20 uppercase">Exp</span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className="text-[9px] text-disabled uppercase tracking-wider">Vence</p>
          <p className="text-[10px] font-mono text-muted">
            {isLifetime ? '∞' : formatDate(sub.expires_at)}
          </p>
        </div>
        <ChevronRight size={14} className="text-faint" />
      </div>
    </div>
  );
};

export default AdminMobile;
