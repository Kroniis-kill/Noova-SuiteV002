
import { Sale, Service, AppSettings, Account } from '../types';
import { parseLocalISO, formatDate } from './contactosUtils';

/**
 * Calcula días restantes. Si se pasa una cuenta y está fallando, congela el tiempo.
 */
export const getDaysRemaining = (dateStr: string | undefined | null, account?: Account): number => {
  if (!dateStr) return 0;
  
  const target = parseLocalISO(dateStr);
  let referenceDate = new Date();

  // Lógica de congelamiento: Si la cuenta maestra está fallando, 
  // calculamos los días restantes basados en el momento que empezó la falla.
  if (account && account.status === 'fallando' && account.failure_started_at) {
      referenceDate = new Date(account.failure_started_at);
  }
  
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffTime = target.getTime() - today.getTime();
  
  return Math.round(diffTime / (1000 * 3600 * 24));
};

/**
 * Calcula cuántos días lleva una cuenta en estado de falla (Días a reponer).
 */
export const getDaysInFailure = (failureStartedAt: string | undefined): number => {
    if (!failureStartedAt) return 0;
    const start = new Date(failureStartedAt);
    const now = new Date();
    
    // Solo contamos días completos desde el inicio de la falla hasta hoy
    const diffTime = now.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 3600 * 24)));
};

export const getUrgencyColor = (days: number) => {
  if (days < 0) return 'border-red-900/50 bg-red-900/10 text-red-400'; 
  if (days === 0) return 'border-red-500/50 bg-red-500/10 text-red-500'; 
  if (days === 1) return 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400';
  return 'border-yellow-600/30 bg-yellow-600/5 text-yellow-600'; 
};

export const getUrgencyLabel = (days: number) => {
  if (days < 0) return `Vencida hace ${Math.abs(days)} días`;
  if (days === 0) return 'Vence HOY';
  if (days === 1) return '1 día restante';
  return `${days} días restantes`;
};

export const calculateProfit = (sale: Sale, service?: Service): number => {
  if (!service) return 0;
  let totalCostForSale = 0;
  const accountTotalCost = service.investmentPrice > 0 ? service.investmentPrice : (service.cost * (service.screens || 1));
  const unitCost = service.cost;

  switch (sale.saleType) {
    case 'cuenta_completa':
      totalCostForSale = accountTotalCost;
      break;
    case 'usuario_unico':
    case 'por_pantalla':
    default:
      const quantitySold = sale.screensCount || 1;
      totalCostForSale = unitCost * quantitySold;
      break;
  }
  return parseFloat((sale.amount - totalCostForSale).toFixed(2));
};

export const getExpirationMessage = (
  clientName: string,
  sales: Sale[],
  days: number,
  settings?: AppSettings
): string => {
  if (!settings) return '';
  const processTemplate = (template: string) => {
    const serviceCounts: Record<string, number> = {};
    sales.forEach(s => {
        serviceCounts[s.serviceName] = (serviceCounts[s.serviceName] || 0) + 1;
    });
    const dateStr = formatDate(sales[0].expiryDate);
    const servicesList = Object.entries(serviceCounts)
        .map(([name, count]) => {
            const label = count > 1 ? `${count} ${name}` : name;
            return `${label} (${dateStr})`;
        })
        .join(', ');
    return template
      .replace(/{cliente}/g, clientName)
      .replace(/{servicio}/g, servicesList)
      .replace(/{fecha_corte}/g, dateStr)
      .replace(/{moneda}/g, settings.currency);
  };
  if (days === 0) return processTemplate(settings.messageTemplates.expiration);
  else if (days === 1) return processTemplate(settings.messageTemplates.warning1Day);
  else return processTemplate(settings.messageTemplates.warning2Days);
};
