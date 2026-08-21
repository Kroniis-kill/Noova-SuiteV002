import { Account } from '../types';

export const getDaysRemaining = (endDate: string | undefined | null): number => {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 3600 * 24));
};

export const getAccountStatus = (account: Account, warningDays: number = 5): 'activa' | 'por_vencer' | 'vencida' | 'inactiva' | 'fallando' | 'trash' => {
  // El estado físico 'trash' tiene prioridad absoluta
  if (account.status === 'trash') return 'trash';
  if (account.status === 'fallando') return 'fallando';
  if (account.status === 'inactiva') return 'inactiva';
  
  const days = getDaysRemaining(account.endDate);
  
  if (days <= 0) return 'vencida';
  if (days <= warningDays) return 'por_vencer';
  return 'activa';
};

/**
 * Calcula cuántos perfiles están ocupados.
 */
export const calculateOccupancy = (account: Account): number => {
  // Si la cuenta está en la papelera, no cuenta como ocupada para estadísticas generales
  if (account.status === 'trash') return 0;

  // Lógica para cuentas completas: si hay cualquier rastro de asignación, ocupa todos los slots
  if (account.account_type === 'cuenta_completa') {
     const hasAssignedProfile = account.profiles && account.profiles.some(p => p.name && p.name.trim() !== '' && p.name.toLowerCase() !== 'disponible');
     const isMarkedSold = account.status === 'vendida' || account.status === 'alquilada';
     const hasUsedCount = (account.usedScreens || 0) > 0;

     if (hasAssignedProfile || isMarkedSold || hasUsedCount) {
         return account.maxScreens || 1;
     }
     return 0; 
  }

  // Para perfiles, el array de perfiles es la fuente de verdad absoluta.
  // Un slot se considera ocupado si tiene un nombre que no sea 'disponible' o vacío.
  if (account.profiles && account.profiles.length > 0) {
    return account.profiles.filter(p => 
        p.name && 
        p.name.trim() !== '' && 
        p.name.toLowerCase() !== 'disponible'
    ).length;
  }

  // Fallback de seguridad al contador manual si el array de perfiles no existe
  return account.usedScreens || 0;
};

export const getStatusColor = (status: string | undefined) => {
  const s = status || 'activa';
  switch (s) {
    case 'activa': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    case 'por_vencer': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'vencida': return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'inactiva': return 'text-text-muted bg-zinc-500/10 border-zinc-500/20';
    case 'fallando': return 'text-orange-400 bg-orange-500/20 border-orange-500/40 shadow-[0_0_10px_rgba(249,115,22,0.1)]';
    case 'trash': return 'text-text-disabled bg-zinc-800/50 border-zinc-700';
    default: return 'text-text-muted bg-zinc-500/10 border-zinc-500/20';
  }
};

export const getStatusLabel = (status: string | undefined) => {
  const s = status || 'activa';
  switch (s) {
    case 'activa': return 'Activa';
    case 'por_vencer': return 'Por Vencer';
    case 'vencida': return 'Vencida';
    case 'inactiva': return 'Desactivada';
    case 'fallando': return 'Reporte Falla';
    case 'vendida': return 'Vendida';
    case 'alquilada': return 'Alquilada';
    case 'trash': return 'En Papelera';
    default: return s.charAt(0).toUpperCase() + s.slice(1);
  }
};