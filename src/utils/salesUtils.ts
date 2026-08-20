
import { Sale, Client, Account, Reseller, AppSettings } from '../types';
import { formatDate, generateClientSlug } from './contactosUtils';
import { getDaysInFailure } from './expiredUtils';

export interface SalesGroup {
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientTelegram?: string;
  reseller?: Reseller;
  clientTags?: string[];
  renewalGroups: {
    date: string;
    sales: Sale[];
  }[];
}

export const groupSalesByClientAndDate = (
  sales: Sale[], 
  clients: Client[], 
  resellers: Reseller[]
): SalesGroup[] => {
  const groups: Record<string, SalesGroup> = {};

  sales.forEach(sale => {
    if (!groups[sale.clientId]) {
      const client = clients.find(c => c.id === sale.clientId);
      const reseller = client?.resellerId ? resellers.find(r => r.id === client.resellerId) : undefined;
      
      if (client) {
        groups[sale.clientId] = {
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone || '',
          clientTelegram: client.telegram,
          reseller,
          clientTags: client.tags || [],
          renewalGroups: []
        };
      }
    }

    if (groups[sale.clientId]) {
      const group = groups[sale.clientId];
      let dateGroup = group.renewalGroups.find(g => g.date === sale.expiryDate);
      
      if (!dateGroup) {
        dateGroup = { date: sale.expiryDate, sales: [] };
        group.renewalGroups.push(dateGroup);
      }
      
      dateGroup.sales.push(sale);
    }
  });

  return Object.values(groups);
};

// --- LOGICA DE MENSAJERÍA UNIFICADA ---

export type WhatsAppTemplateType = 'data' | 'password' | 'replacement' | 'renewal_success' | 'warning2Days' | 'warning1Day' | 'expiration' | 'warrantyExtension' | 'failure' | 'failureSolved';

interface ServiceStats {
    count: number;       
    totalScreens: number; 
    forceScreenLabel: boolean; 
}

const generateSaleMessage = (
  sales: Sale[], 
  clientName: string, 
  accounts: Account[], 
  settings?: AppSettings, 
  templatesSource?: any,
  useSecondaryCurrency: boolean = false,
  type: WhatsAppTemplateType = 'data',
  withReceipt: boolean = false,
  forcedTotal?: number
) => {
  if (!settings || !templatesSource) return '';

  const currency = useSecondaryCurrency ? (settings?.subCurrency || 'Bs') : (settings?.currency || '$');
  const rate = settings?.exchangeRate || 1;
  
  let totalAmount = forcedTotal !== undefined ? forcedTotal : 0;
  let maxCompensatedDays = 0;
  const serviceStats: Record<string, ServiceStats> = {};
  
  const firstSale = sales[0];
  const firstAccount = accounts.find(a => a.id === firstSale?.accountId);
  const globalAccountEmail = firstAccount?.email || '---';
  const globalAccountPass = firstAccount?.password || '---';
  
  const portalSlug = generateClientSlug(clientName);
  const portalLink = `https://noova-suite.vercel.app/portal-cliente/${portalSlug}`;

  sales.forEach(s => {
      if (forcedTotal === undefined) {
          let amountToAdd = s.amount;
          if (useSecondaryCurrency) {
               const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
               const isMainStrong = strongCurrencies.includes(settings.currency);
               if(isMainStrong) amountToAdd = s.amount * rate;
               else amountToAdd = rate > 0 ? s.amount / rate : 0;
          }
          totalAmount += amountToAdd;
      }
      
      // Calcular días compensados si aplica
      if (type === 'warrantyExtension') {
          const acc = accounts.find(a => a.id === s.accountId);
          if (acc && acc.status === 'fallando') {
              const days = getDaysInFailure(acc.failure_started_at);
              if (days > maxCompensatedDays) maxCompensatedDays = days;
          }
      }

      const name = s.serviceName.trim();
      if (!serviceStats[name]) {
          serviceStats[name] = { count: 0, totalScreens: 0, forceScreenLabel: false };
      }
      serviceStats[name].count += 1;
      const screens = s.screensCount || 1;
      serviceStats[name].totalScreens += screens;
      if (screens > 1 && s.saleType !== 'cuenta_completa') {
          serviceStats[name].forceScreenLabel = true;
      }
  });

  const groupedServicesList = Object.entries(serviceStats)
    .map(([name, stats]) => {
        if (stats.forceScreenLabel) {
            return `${stats.totalScreens}P - ${name}`;
        } else {
            return stats.count > 1 ? `${stats.count} ${name}` : name;
        }
    })
    .join(', ');
  
  const commonDate = formatDate(sales[0].expiryDate);
  const limitedSales = sales.slice(0, 10);
  
  const serviceListBlock = limitedSales.map(sale => {
      const account = accounts.find(a => a.id === sale.accountId);
      const profile = sale.assignedProfiles?.[0];
      const isUnique = sale.saleType === 'usuario_unico';
      const isFull = sale.saleType === 'cuenta_completa';

      let itemTemplate = '';
      if (isUnique) itemTemplate = templatesSource.newSaleUnique;
      else if (isFull) itemTemplate = templatesSource.newSaleFull;
      else itemTemplate = templatesSource.newSaleScreen; 

      if (!itemTemplate) itemTemplate = templatesSource.newSaleScreen || '';

      return itemTemplate
        .replace(/{servicio}/g, sale.serviceName.toUpperCase())
        .replace(/{correo}/g, account?.email || '---')
        .replace(/{password}/g, account?.password || '---')
        .replace(/{perfil}/g, profile?.name || '---')
        .replace(/{pin}/g, profile?.pin || '---')
        .replace(/{correo_invitado}/g, sale.invitedEmail || '---')
        .replace(/{password_invitado}/g, sale.invitedPassword || '---')
        .replace(/{cliente}/g, sale.saleType === 'por_pantalla' && profile?.name ? profile.name : clientName);
  }).join('\n\n------------------------\n\n'); 

  let globalTemplate = templatesSource.newSaleGlobal;
  if (type === 'replacement') globalTemplate = templatesSource.replacement;
  if (type === 'password') globalTemplate = templatesSource.passwordChange;
  if (type === 'renewal_success') globalTemplate = templatesSource.renewal;
  if (type === 'warrantyExtension') globalTemplate = templatesSource.warrantyExtension || "Hola {cliente}, servicio extendido {dias_compensados} días.";
  if (type === 'failure') globalTemplate = templatesSource.failureReport || "Hola {cliente}, te informamos que el servicio *{servicio}* presenta una falla masiva temporal. 🛠️";
  if (type === 'failureSolved') globalTemplate = templatesSource.failureSolved || "✅ *¡Inconveniente Resuelto!*\n\nHola *{cliente}*, el reporte de *{servicio}* ha sido solucionado. 🚀";
  
  if (withReceipt) {
      globalTemplate += `\n\n🧾 *Ver Comprobante:*\n${portalLink}`;
  }

  let finalMsg = globalTemplate
    .replace(/{lista_servicios}/g, serviceListBlock)
    .replace(/{cliente}/g, clientName)
    .replace(/{servicios_agrupados}/g, groupedServicesList) 
    .replace(/{servicio}/g, groupedServicesList) 
    .replace(/{fecha_corte}/g, commonDate)
    .replace(/{precio}/g, totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}))
    .replace(/{moneda}/g, currency)
    .replace(/{correo}/g, globalAccountEmail)
    .replace(/{password}/g, globalAccountPass)
    .replace(/{link_portal}/g, portalLink)
    .replace(/{dias_compensados}/g, maxCompensatedDays.toString());

  return finalMsg;
};

const generateSimpleMessage = (
  template: string,
  sales: Sale[], 
  clientName: string, 
  settings?: AppSettings,
  useSecondaryCurrency: boolean = false,
  forcedTotal?: number
) => {
  const currency = useSecondaryCurrency ? (settings?.subCurrency || 'Bs') : (settings?.currency || '$');
  const rate = settings?.exchangeRate || 1;
  
  let totalAmount = forcedTotal !== undefined ? forcedTotal : 0;
  const serviceStats: Record<string, ServiceStats> = {};

  sales.forEach(s => {
      if (forcedTotal === undefined) {
          let amountToAdd = s.amount;
          if (useSecondaryCurrency) {
               const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
               const isMainStrong = strongCurrencies.includes(settings?.currency || 'USD');
               if(isMainStrong) amountToAdd = s.amount * rate;
               else amountToAdd = rate > 0 ? s.amount / rate : 0;
          }
          totalAmount += amountToAdd;
      }
      const name = s.serviceName.trim();
      if (!serviceStats[name]) {
          serviceStats[name] = { count: 0, totalScreens: 0, forceScreenLabel: false };
      }
      serviceStats[name].count += 1;
      const screens = s.screensCount || 1;
      serviceStats[name].totalScreens += screens;
      if (screens > 1 && s.saleType !== 'cuenta_completa') {
          serviceStats[name].forceScreenLabel = true;
      }
  });

  const commonDate = formatDate(sales[0].expiryDate);
  const portalSlug = generateClientSlug(clientName);
  const portalLink = `https://noova-suite.vercel.app/portal-cliente/${portalSlug}`;
  
  const serviceListSimple = Object.entries(serviceStats)
    .map(([name, stats]) => {
        if (stats.forceScreenLabel) {
            return `${stats.totalScreens}P - ${name}`;
        } else {
            return stats.count > 1 ? `${stats.count} ${name}` : name;
        }
    })
    .join(', ');
  
  // LOGIC: Use Profile Name for 'por_pantalla', else Client Name
  const firstSale = sales[0];
  const isScreen = firstSale?.saleType === 'por_pantalla';
  const displayClientName = (isScreen && firstSale.assignedProfiles?.[0]?.name) 
    ? firstSale.assignedProfiles[0].name 
    : clientName;

  return template
    .replace(/{cliente}/g, displayClientName)
    .replace(/{servicios_agrupados}/g, serviceListSimple) 
    .replace(/{servicio}/g, serviceListSimple) 
    .replace(/{fecha_corte}/g, commonDate)
    .replace(/{precio}/g, totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}))
    .replace(/{moneda}/g, currency)
    .replace(/{lista_servicios}/g, serviceListSimple)
    .replace(/{link_portal}/g, portalLink);
};

export const getCombinedWhatsAppTemplate = (
  type: WhatsAppTemplateType,
  sales: Sale[],
  clientName: string,
  accounts: Account[],
  settings?: AppSettings,
  platform: 'whatsapp' | 'telegram' = 'whatsapp',
  useSecondaryCurrency: boolean = false,
  withReceipt: boolean = false,
  forcedTotal?: number
): string => {
  if (!settings || sales.length === 0) return '';
  const templateSource = platform === 'telegram' && settings.telegramMessageTemplates 
    ? settings.telegramMessageTemplates 
    : settings.messageTemplates;

  if (type === 'data' || type === 'replacement' || type === 'password' || type === 'renewal_success' || type === 'warrantyExtension' || type === 'failure' || type === 'failureSolved') {
      return generateSaleMessage(sales, clientName, accounts, settings, templateSource, useSecondaryCurrency, type, withReceipt, forcedTotal);
  }

  let rawTemplate = '';
  switch (type) {
    case 'expiration': rawTemplate = templateSource.expiration; break;
    case 'warning1Day': rawTemplate = templateSource.warning1Day; break;
    case 'warning2Days': rawTemplate = templateSource.warning2Days; break;
    default: return '';
  }
  return generateSimpleMessage(rawTemplate, sales, clientName, settings, useSecondaryCurrency, forcedTotal);
};
