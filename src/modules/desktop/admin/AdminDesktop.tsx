import React, { useEffect, useState, useMemo } from 'react';
import { useSubscription } from '../../../context/SubscriptionContext';
import { UserSubscription, PLAN_LABELS, PlanType, PLAN_PRICES } from '../../../types/subscriptionTypes';
import { Feedback, Announcement } from '../../../types/adminTypes';
import {
  Users, Search, ShieldCheck, Edit2, Trash2, UserPlus, BarChart3,
  DollarSign, TrendingUp, Settings, PlusCircle, AlertOctagon,
  Infinity, History, Calendar, Server, Shield, Crown, Smartphone,
  MessageSquare, Megaphone, ChevronRight, Activity, Zap, ShieldAlert, Tag
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AdminUserModal from '../../../components/admin/AdminUserModal';
import ExtensionModal from '../../../components/admin/ExtensionModal';
import AdminUserDetailModal from '../../../components/admin/AdminUserDetailModal';
import AdminDiscountCodesView from '../../../components/admin/AdminDiscountCodesView';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../context/ToastContext';
import { formatDate } from '../../../utils/contactosUtils';
import AdminHistoryMobile from '../../mobile/admin/history/AdminHistoryMobile';
import AdminAnalyticsMobile from '../../mobile/admin/analytics/AdminAnalyticsMobile';
import { motion } from 'framer-motion';

type AdminTab = 'main' | 'discounts' | 'feedback' | 'announcements' | 'history' | 'analytics';

const TAB_LABELS: Record<AdminTab, string> = {
  main: 'Suscripciones',
  discounts: 'Descuentos',
  feedback: 'Feedback',
  announcements: 'Anuncios',
  history: 'Auditoría',
  analytics: 'Analíticas',
};

const TAB_ICONS: Record<AdminTab, React.ElementType> = {
  main: Users,
  discounts: Tag,
  feedback: MessageSquare,
  announcements: Megaphone,
  history: History,
  analytics: BarChart3,
};

const AdminDesktop: React.FC = () => {
  const {
    getAllSubscriptions, registerTenant, updateSubscription, deleteSubscription,
    toggleBlockStatus, supportNumber, updateSupportNumber,
    getFeedback, markFeedbackAsRead, getAnnouncements, createAnnouncement, deleteAnnouncement,
  } = useSubscription();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('main');
  const [subs, setSubs] = useState<UserSubscription[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | PlanType>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserSubscription | null>(null);
  const [editingSub, setEditingSub] = useState<UserSubscription | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserSubscription | null>(null);
  const [extensionTarget, setExtensionTarget] = useState<UserSubscription | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [subsData, feedbackData, announcementsData] = await Promise.all([
      getAllSubscriptions(), getFeedback(), getAnnouncements(),
    ]);
    setSubs(subsData);
    setFeedback(feedbackData);
    setAnnouncements(announcementsData);
    setIsLoading(false);
  };

  const metrics = useMemo(() => {
    const active = subs.filter(s => s.is_active && s.plan !== 'free').length;
    const trial = subs.filter(s => s.plan === 'free').length;
    const totalMRR = subs.reduce((acc, sub) => acc + (sub.is_active && sub.plan !== 'free' ? PLAN_PRICES[sub.plan] : 0), 0);
    const banned = subs.filter(s => s.status === 'banned').length;
    return { active, trial, totalMRR, banned, total: subs.length };
  }, [subs]);

  const chartData = useMemo(() => ([
    { name: 'L', v: 12 }, { name: 'M', v: 19 }, { name: 'X', v: 15 },
    { name: 'J', v: 22 }, { name: 'V', v: 30 }, { name: 'S', v: 25 }, { name: 'D', v: 35 },
  ]), []);

  const handleSave = async (email: string, password: string, plan: PlanType, expiryDate: string) => {
    const res = editingSub
      ? await updateSubscription(editingSub.user_id, plan, expiryDate)
      : await registerTenant(email, password, plan, expiryDate);
    if (res.success) {
      showToast(editingSub ? 'Suscripción actualizada' : 'Tenant registrado', 'success');
      setIsModalOpen(false); setEditingSub(null); loadData();
    } else {
      showToast(res.message || 'Error en operación', 'error');
    }
  };

  const handleBlockToggle = async (sub: UserSubscription) => {
    const success = await toggleBlockStatus(sub.user_id, sub.status || 'active');
    if (success) {
      showToast(sub.status === 'banned' ? 'Acceso restaurado' : 'Usuario suspendido', 'info');
      loadData();
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await deleteSubscription(deleteConfirm.user_id);
    if (res.success) {
      showToast('Usuario eliminado permanentemente', 'success');
      setDeleteConfirm(null); loadData();
    }
  };

  const filteredSubs = useMemo(() => subs.filter(s =>
    (planFilter === 'all' || s.plan === planFilter) &&
    (s.user_email || s.full_name || '').toLowerCase().includes(search.toLowerCase())
  ), [subs, search, planFilter]);

  if (activeTab === 'history') return <AdminHistoryMobile onBack={() => setActiveTab('main')} />;
  if (activeTab === 'analytics') return <AdminAnalyticsMobile onBack={() => setActiveTab('main')} />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8 pb-12 animate-fade-in">

      {/* HEADER */}
      <div className="flex items-end justify-between flex-wrap gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-glow">
            <Shield size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Panel Administrativo</h1>
            <p className="text-text-muted text-sm mt-1.5">Gestiona suscripciones, usuarios y configuración del sistema.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setTempPhone(supportNumber); setIsConfigOpen(true); }}
            className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] text-text-secondary hover:text-text-primary hover:bg-surface-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <Settings size={16} /> Configuración
          </button>
          <button
            onClick={() => { setEditingSub(null); setIsModalOpen(true); }}
            className="bg-gradient-to-r from-brand-primary to-brand-accent text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-glow hover:opacity-90 transition-all flex items-center gap-2"
          >
            <UserPlus size={16} /> Nuevo usuario
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-1 w-fit">
        {(Object.keys(TAB_LABELS) as AdminTab[]).map(tab => {
          const Icon = TAB_ICONS[tab];
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                active ? 'bg-brand-primary text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon size={14} /> {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Ingresos (MRR)" value={`$${metrics.totalMRR.toFixed(0)}`} icon={DollarSign} accent="text-status-success-soft" bg="bg-status-success/10" />
        <KPICard title="Usuarios activos" value={metrics.active} icon={ShieldCheck} accent="text-brand-primary" bg="bg-brand-primary/10" />
        <KPICard title="Total registros" value={metrics.total} icon={Users} accent="text-status-info-soft" bg="bg-status-info/10" />
        <KPICard title="Bloqueados" value={metrics.banned} icon={AlertOctagon} accent="text-status-danger-soft" bg="bg-status-danger/10" />
      </div>

      {activeTab === 'discounts' && <AdminDiscountCodesView />}

      {activeTab === 'main' && (
        <div className="grid grid-cols-12 gap-6">
          {/* TABLA */}
          <div className="col-span-12 xl:col-span-8 bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[rgb(var(--fg-rgb))]/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-text-primary">Suscripciones</h3>
                <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--fg-rgb))]/5 text-text-muted text-[10px] font-semibold">{filteredSubs.length}</span>
              </div>
              <div className="flex gap-2 items-center">
                <select
                  value={planFilter}
                  onChange={e => setPlanFilter(e.target.value as any)}
                  className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg px-3 py-2 text-xs text-text-secondary outline-none focus:border-brand-primary/50"
                >
                  <option value="all">Todos los planes</option>
                  {(Object.keys(PLAN_LABELS) as PlanType[]).map(p => (
                    <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                  ))}
                </select>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar usuario..."
                    className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg pl-9 pr-3 py-2 text-xs text-text-primary outline-none w-64 focus:border-brand-primary/50"
                  />
                </div>
              </div>
            </div>

            <div className="max-h-[560px] overflow-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-16 text-center text-text-disabled text-sm animate-pulse">Cargando suscripciones...</div>
              ) : filteredSubs.length === 0 ? (
                <div className="p-16 text-center">
                  <Users size={32} className="mx-auto text-text-faint mb-3" />
                  <p className="text-text-disabled text-sm">No hay usuarios que coincidan.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-surface-1 z-10 border-b border-[rgb(var(--fg-rgb))]/[0.06]">
                    <tr className="text-[10px] font-semibold text-text-disabled uppercase tracking-wider">
                      <th className="px-5 py-3">Usuario</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Vencimiento</th>
                      <th className="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredSubs.map(sub => {
                      const isLifetime = sub.plan === 'lifetime';
                      const isExpired = !isLifetime && new Date(sub.expires_at) < new Date();
                      const isBanned = sub.status === 'banned';
                      const isPro = sub.plan !== 'free';

                      return (
                        <tr
                          key={sub.user_id}
                          onClick={() => { setSelectedUser(sub); setIsDetailModalOpen(true); }}
                          className={`group cursor-pointer hover:bg-[rgb(var(--fg-rgb))]/[0.02] transition-colors ${isBanned ? 'opacity-50' : ''}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-xs ${isPro ? 'bg-gradient-to-br from-brand-primary to-brand-accent' : 'bg-surface-3 border border-[rgb(var(--fg-rgb))]/[0.08]'}`}>
                                {(sub.full_name || sub.user_email || 'U').substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-text-primary text-sm font-medium truncate">{sub.full_name || 'Sin nombre'}</p>
                                <p className="text-[11px] text-text-disabled font-mono truncate">{sub.user_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${
                                isLifetime ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20'
                                : isPro ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                                : 'bg-zinc-500/10 text-text-muted border-zinc-500/20'
                              }`}>
                                {PLAN_LABELS[sub.plan]}
                              </span>
                              {isBanned && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-status-danger/10 text-status-danger-soft border border-status-danger/20 font-semibold uppercase">
                                  Bloqueado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-text-muted">
                              <Calendar size={13} className="text-text-faint" />
                              {isLifetime ? (
                                <span className="text-brand-accent text-xs font-semibold flex items-center gap-1"><Infinity size={14} /> Vitalicio</span>
                              ) : (
                                <span className={`text-xs font-mono ${isExpired ? 'text-status-danger-soft' : 'text-text-secondary'}`}>
                                  {formatDate(sub.expires_at)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); setExtensionTarget(sub); setIsExtensionModalOpen(true); }}
                                className="w-8 h-8 rounded-md bg-status-success/10 text-status-success-soft hover:bg-status-success/20 flex items-center justify-center transition-all"
                                title="Extender"
                              ><PlusCircle size={14} /></button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingSub(sub); setIsModalOpen(true); }}
                                className="w-8 h-8 rounded-md bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:bg-[rgb(var(--fg-rgb))]/10 hover:text-text-primary flex items-center justify-center transition-all"
                                title="Editar"
                              ><Edit2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="col-span-12 xl:col-span-4 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-6 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <TrendingUp size={15} className="text-brand-primary" /> Crecimiento semanal
                </h3>
                <span className="text-[10px] font-semibold text-status-success-soft bg-status-success/10 px-2 py-0.5 rounded">+12.5%</span>
              </div>
              <div className="h-32 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(106,44,255)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="rgb(106,44,255)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--surface-2))', border: '1px solid rgb(var(--fg-rgb) / 0.08)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="v" stroke="rgb(106,44,255)" strokeWidth={2.5} fill="url(#adminGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t border-[rgb(var(--fg-rgb))]/[0.06] flex gap-2 relative z-10">
                <button onClick={() => setActiveTab('analytics')} className="flex-1 text-xs font-medium text-text-secondary bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 py-2 rounded-lg transition-all flex items-center justify-center gap-2">
                  <BarChart3 size={13} /> Analíticas
                </button>
                <button onClick={() => setActiveTab('history')} className="flex-1 text-xs font-medium text-text-secondary bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 py-2 rounded-lg transition-all flex items-center justify-center gap-2">
                  <History size={13} /> Auditoría
                </button>
              </div>
            </motion.div>

            <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Server size={15} className="text-status-success-soft" /> Estado del sistema
              </h3>
              <div className="space-y-3">
                <HealthRow label="API Core" status="Operativo" color="emerald" />
                <HealthRow label="Base de datos" status="Sincronizada" color="emerald" />
                <HealthRow label="Notificaciones" status="99.9% uptime" color="emerald" />
                <HealthRow label="Autenticación" status="Optimizado" color="blue" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-6 shadow-sm space-y-3">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-brand-primary" /> Mensajes recibidos
          </h3>
          {feedback.length === 0 ? (
            <p className="text-text-disabled text-sm text-center py-12">No hay feedback aún.</p>
          ) : feedback.map(f => (
            <div key={f.id} className={`p-4 rounded-lg border ${f.status === 'read' ? 'bg-[rgb(var(--fg-rgb))]/[0.02] border-[rgb(var(--fg-rgb))]/[0.06]' : 'bg-brand-primary/5 border-brand-primary/20'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-text-muted">{f.user_email}</span>
                {f.status === 'pending' && (
                  <button onClick={() => { markFeedbackAsRead(f.id); loadData(); }} className="text-[10px] font-semibold text-brand-primary hover:underline">
                    Marcar leído
                  </button>
                )}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{f.message}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Megaphone size={16} className="text-brand-primary" /> Anuncios globales
          </h3>
          <div className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg p-4">
            <textarea
              value={newAnnouncement}
              onChange={e => setNewAnnouncement(e.target.value)}
              placeholder="Escribe un anuncio importante para todos los usuarios..."
              className="w-full bg-transparent text-text-primary text-sm outline-none resize-none min-h-[80px]"
            />
            <button
              onClick={async () => {
                if (!newAnnouncement.trim()) return;
                await createAnnouncement(newAnnouncement);
                setNewAnnouncement(''); loadData();
                showToast('Anuncio publicado', 'success');
              }}
              className="mt-3 px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-all"
            >
              Publicar
            </button>
          </div>
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="bg-[rgb(var(--fg-rgb))]/[0.02] border border-[rgb(var(--fg-rgb))]/[0.06] p-4 rounded-lg flex justify-between items-center gap-3">
                <p className="text-sm text-text-secondary flex-1">{a.message}</p>
                <button
                  onClick={async () => { await deleteAnnouncement(a.id); loadData(); }}
                  className="text-text-disabled hover:text-status-danger-soft transition-colors"
                ><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALES */}
      <AdminUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSave} initialData={editingSub} />
      <ExtensionModal isOpen={isExtensionModalOpen} onClose={() => { setIsExtensionModalOpen(false); loadData(); }} user={extensionTarget} />
      <AdminUserDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        user={selectedUser}
        onEdit={(u) => { setEditingSub(u); setIsModalOpen(true); }}
        onExtend={(u) => { setExtensionTarget(u); setIsExtensionModalOpen(true); }}
        onBlock={(u) => handleBlockToggle(u)}
        onDelete={(u) => setDeleteConfirm(u)}
      />

      {/* Config */}
      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title="Configuración global">
        <div className="space-y-5 pt-2">
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 block">WhatsApp de soporte</label>
            <div className="relative">
              <Smartphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                value={tempPhone}
                onChange={e => setTempPhone(e.target.value)}
                placeholder="573000000000"
                className="w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg pl-10 pr-4 py-3 text-sm text-text-primary outline-none focus:border-brand-primary/50"
              />
            </div>
            <p className="text-[11px] text-text-disabled mt-2">Se mostrará a usuarios bloqueados o con suscripción expirada.</p>
          </div>

          <div className="p-4 bg-status-warning/5 border border-status-warning/20 rounded-lg flex gap-3">
            <ShieldAlert size={18} className="text-status-warning-soft shrink-0 mt-0.5" />
            <div>
              <h4 className="text-amber-300 font-semibold text-xs">Modo mantenimiento</h4>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">Próximamente. Permitirá pausar el acceso a toda la plataforma.</p>
            </div>
          </div>

          <button
            onClick={async () => {
              await updateSupportNumber(tempPhone);
              showToast('Configuración guardada', 'success');
              setIsConfigOpen(false);
            }}
            className="w-full py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold text-sm rounded-lg shadow-glow hover:opacity-90 transition-all"
          >
            Guardar cambios
          </button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Eliminar usuario">
        <div className="space-y-5 pt-2">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-xl bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger-soft mb-4">
              <Trash2 size={28} />
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">
              ¿Eliminar permanentemente a <strong className="text-text-primary">{deleteConfirm?.user_email}</strong>?
            </p>
            <p className="text-[11px] text-status-danger-soft mt-2">Esta acción borra todos sus datos y es irreversible.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 text-text-secondary rounded-lg text-sm font-medium transition-all">Cancelar</button>
            <button onClick={handleDelete} className="flex-1 py-3 bg-status-danger hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-all">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, accent, bg }: any) => (
  <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-5 shadow-sm hover:border-[rgb(var(--fg-rgb))]/[0.14] transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg ${bg} ${accent} flex items-center justify-center`}>
        <Icon size={18} />
      </div>
    </div>
    <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
    <p className="text-[11px] font-medium text-text-disabled uppercase tracking-wider mt-1">{title}</p>
  </div>
);

const HealthRow = ({ label, status, color }: { label: string; status: string; color: 'emerald' | 'blue' }) => {
  const dot = color === 'emerald' ? 'bg-status-success-soft' : 'bg-status-info-soft';
  const text = color === 'emerald' ? 'text-status-success-soft' : 'text-status-info-soft';
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-[11px] font-semibold ${text} flex items-center gap-2`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} /> {status}
      </span>
    </div>
  );
};

export default AdminDesktop;
