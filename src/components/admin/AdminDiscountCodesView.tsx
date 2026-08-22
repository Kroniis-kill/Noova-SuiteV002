import React, { useEffect, useState } from 'react';
import { Tag, Plus, Trash2, Power, Copy, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  DiscountCode, getDiscountCodes, createDiscountCode,
  toggleDiscountCodeActive, deleteDiscountCode,
} from '../../services/platformAdminApi';

const TYPE_LABELS: Record<DiscountCode['discount_type'], string> = {
  percent: '% de descuento',
  fixed_days: 'Días extra',
  fixed_amount: 'Monto fijo ($)',
};

const formatValue = (c: DiscountCode) => {
  if (c.discount_type === 'percent') return `${c.value}%`;
  if (c.discount_type === 'fixed_days') return `+${c.value} días`;
  return `$${c.value}`;
};

const AdminDiscountCodesView: React.FC = () => {
  const { showToast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '', discount_type: 'fixed_days' as DiscountCode['discount_type'],
    value: '', max_uses: '', expires_at: '', note: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setCodes(await getDiscountCodes());
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value) {
      showToast('Completá el código y el valor.', 'error');
      return;
    }
    setIsSaving(true);
    const res = await createDiscountCode({
      code: form.code,
      discount_type: form.discount_type,
      value: Number(form.value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      note: form.note || null,
    });
    setIsSaving(false);
    if (res.success) {
      showToast('Código creado', 'success');
      setForm({ code: '', discount_type: 'fixed_days', value: '', max_uses: '', expires_at: '', note: '' });
      setIsCreateOpen(false);
      load();
    } else {
      showToast(res.message || 'Error creando el código', 'error');
    }
  };

  const handleToggle = async (c: DiscountCode) => {
    const ok = await toggleDiscountCodeActive(c.id, c.is_active);
    if (ok) {
      setCodes(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
    } else {
      showToast('No se pudo actualizar el código', 'error');
    }
  };

  const handleDelete = async (c: DiscountCode) => {
    if (!window.confirm(`¿Eliminar el código "${c.code}"? Esta acción no se puede deshacer.`)) return;
    const ok = await deleteDiscountCode(c.id);
    if (ok) {
      setCodes(prev => prev.filter(x => x.id !== c.id));
      showToast('Código eliminado', 'success');
    } else {
      showToast('No se pudo eliminar el código', 'error');
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Códigos de descuento</h3>
          <p className="text-xs text-text-muted mt-1">
            Se aplican a mano al activar o renovar la suscripción de un negocio desde este panel.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(v => !v)}
          className="bg-gradient-to-r from-brand-primary to-brand-accent text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-glow hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Nuevo código
        </button>
      </div>

      {isCreateOpen && (
        <form onSubmit={handleCreate} className="bg-surface-1 border border-border-subtle rounded-xl p-5 shadow-elev-sm grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">Código</label>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="BIENVENIDA20"
              className="w-full"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">Tipo</label>
            <select
              value={form.discount_type}
              onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as DiscountCode['discount_type'] }))}
              className="w-full"
            >
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">Valor</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              placeholder={form.discount_type === 'percent' ? '20' : form.discount_type === 'fixed_days' ? '15' : '5'}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">Usos máximos (opcional)</label>
            <input
              type="number"
              min="1"
              value={form.max_uses}
              onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
              placeholder="Ilimitado"
              className="w-full"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">Vence (opcional)</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1 block">Nota interna (opcional)</label>
            <input
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Para quién es este código"
              className="w-full"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="bg-brand-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
              {isSaving ? 'Creando...' : 'Crear código'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden shadow-elev-sm">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted text-sm">Cargando...</div>
        ) : codes.length === 0 ? (
          <div className="p-10 text-center">
            <Tag size={28} className="mx-auto text-text-disabled mb-3" />
            <p className="text-sm text-text-muted">Todavía no creaste ningún código de descuento.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left">
                <th className="p-3.5 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Código</th>
                <th className="p-3.5 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Beneficio</th>
                <th className="p-3.5 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Usos</th>
                <th className="p-3.5 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Vence</th>
                <th className="p-3.5 text-[11px] font-semibold text-text-muted uppercase tracking-wide">Estado</th>
                <th className="p-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {codes.map(c => (
                <tr key={c.id} className="border-b border-hairline last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-text-primary">{c.code}</span>
                      <button onClick={() => handleCopy(c.code)} className="text-text-disabled hover:text-text-primary transition-colors" title="Copiar">
                        {copiedCode === c.code ? <Check size={13} className="text-status-success-soft" /> : <Copy size={13} />}
                      </button>
                    </div>
                    {c.note && <p className="text-[11px] text-text-faint mt-0.5">{c.note}</p>}
                  </td>
                  <td className="p-3.5 text-text-secondary font-medium">{formatValue(c)}</td>
                  <td className="p-3.5 text-text-muted">{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td className="p-3.5 text-text-muted">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Sin vencimiento'}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold uppercase border ${c.is_active ? 'bg-status-success/10 text-status-success-soft border-status-success/20' : 'bg-status-danger/10 text-status-danger-soft border-status-danger/20'}`}>
                      {c.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggle(c)} className="w-8 h-8 rounded-sm flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors" title={c.is_active ? 'Desactivar' : 'Activar'}>
                        <Power size={14} />
                      </button>
                      <button onClick={() => handleDelete(c)} className="w-8 h-8 rounded-sm flex items-center justify-center text-text-muted hover:text-status-danger-soft hover:bg-status-danger/10 transition-colors" title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDiscountCodesView;
