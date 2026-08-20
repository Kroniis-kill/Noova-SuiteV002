
import { Sale, Movement, Service, Reseller, Client, AppSettings, Account, Expense, SupplyPurchase } from '../types';

export type DateRangeType = 'current_month' | 'last_month' | 'year' | 'all' | 'custom';

export interface ReportMetrics {
  totalSales: number;
  totalProfit: number;
  totalExpenses: number;
  netMargin: number;
  salesGrowth: number;
  profitGrowth: number;
  
  // New Advanced Metrics
  activeClients: number;
  activeClientsGrowth: number;
  activeAccounts: number;
  expiredAccounts: number;
  balanceTotal: number;
  balanceGrowth: number;
}

export interface ChartDataPoint {
  name: string; // Label
  income: number;
  expense: number;
  salesCount: number; // Changed from optional (?) to required
  dateObj: Date;
}

export interface TopItem {
  id: string;
  name: string;
  value: number; // Revenue or Sales Count
  subValue?: string | number;
  image?: string; // For services logos if available
}

export interface ServiceBreakdown {
  id: string;
  name: string;
  salesCount: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
  percentage: number; // Share of total
}

// --- HELPERS ---

const getDateRangeBounds = (range: DateRangeType, customStart?: string, customEnd?: string) => {
  const now = new Date();
  let start = new Date(0); // Epoch
  let end = new Date(); // Now

  switch (range) {
    case 'current_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;
    case 'custom':
      if (customStart) start = new Date(customStart);
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59);
      }
      break;
    case 'all':
      // Default covers everything
      break;
  }
  return { start, end };
};

export const filterByDate = <T extends { date: string }>(items: T[], start: Date, end: Date): T[] => {
  return items.filter(item => {
    const d = new Date(item.date);
    return d >= start && d <= end;
  });
};

// Helper to convert any currency amount to main currency
// UPDATED: Now supports historicalRate (e.g., stored in transaction)
const convertToMain = (amount: number, fromCurrency: string | undefined, settings: AppSettings, historicalRate?: number) => {
    if (!fromCurrency || fromCurrency === settings.currency) return amount;
    
    // Use stored rate if available, else fallback to current setting
    const rate = (historicalRate !== undefined && historicalRate !== null) ? historicalRate : (settings.exchangeRate || 1);
    
    const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
    const isMainStrong = strongCurrencies.includes(settings.currency);
    const isFromStrong = strongCurrencies.includes(fromCurrency);

    if (isMainStrong && !isFromStrong) {
      return rate > 0 ? amount / rate : 0;
    } 
    if (!isMainStrong && isFromStrong) {
      return amount * rate;
    }
    // Fallback: If currency matches or both are weak/strong in same way (unlikely but safe)
    return amount;
};

// --- MAIN CALCULATIONS ---

export const calculateReportData = (
  sales: Sale[],
  movements: Movement[],
  services: Service[],
  clients: Client[],
  resellers: Reseller[],
  accounts: Account[],
  range: DateRangeType,
  settings: AppSettings,
  customStart?: string,
  customEnd?: string
) => {
  const { start, end } = getDateRangeBounds(range, customStart, customEnd);
  
  // Filter Data by Range
  const filteredSales = filterByDate(sales, start, end);
  const filteredMovements = filterByDate(movements, start, end);

  // 1. METRICS & GROWTH
  // Sales: Assuming sales stored in main currency OR simplified logic. 
  // If multi-currency sales support is fully enabled, update here using sale.exchangeRate
  // NOTE: Sales usually record amount in main currency value at time of sale if using single field, 
  // or logic handles it. Assuming sales.amount IS already normalized or in main currency.
  // If sales are in mixed currencies without normalization, we should apply convertToMain here too.
  // For safety, assuming sales are recorded in Main Currency context or properly normalized by user input.
  const totalSales = filteredSales.reduce((acc, s) => acc + s.amount, 0);
  
  // Expenses: Prioritize usdEquivalent (which acts as main currency snapshot) or historical rate
  const totalExpenses = filteredMovements
    .filter(m => m.type === 'withdrawal' || m.type === 'transfer_out')
    .reduce((acc, m) => {
        // If movement has explicit equivalent, use it (Snapshot pattern)
        if (m.usdEquivalent !== undefined && m.usdEquivalent > 0) return acc + m.usdEquivalent;
        return acc + convertToMain(m.amount, m.currency, settings, m.exchangeRate);
    }, 0);

  const netProfit = totalSales - totalExpenses; 
  const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // Growth Comparison (Previous Period)
  let prevSales = 0;
  let prevProfit = 0;
  let prevExpenses = 0;
  
  // Determine Previous Range
  let prevStart = new Date(start);
  let prevEnd = new Date(end);
  if (range === 'current_month') {
      prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59);
  } else {
      // General fallback: shift back by same duration
      const duration = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - duration);
  }

  const pSales = filterByDate(sales, prevStart, prevEnd);
  const pMovs = filterByDate(movements, prevStart, prevEnd);
  
  prevSales = pSales.reduce((acc, s) => acc + s.amount, 0);
  prevExpenses = pMovs
    .filter(m => m.type === 'withdrawal' || m.type === 'transfer_out')
    .reduce((acc, m) => {
        if (m.usdEquivalent !== undefined && m.usdEquivalent > 0) return acc + m.usdEquivalent;
        return acc + convertToMain(m.amount, m.currency, settings, m.exchangeRate);
    }, 0);
  prevProfit = prevSales - prevExpenses;

  const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
  };

  const salesGrowth = calculateGrowth(totalSales, prevSales);
  const profitGrowth = calculateGrowth(netProfit, prevProfit);
  // const expenseGrowth = calculateGrowth(totalExpenses, prevExpenses);

  // Active Clients Logic
  const activeClientsCount = clients.filter(c => c.activeServices > 0).length;
  const activeClientsGrowth = 0; 

  // Accounts Status
  const activeAccounts = accounts.filter(a => a.status === 'activa').length;
  const expiredAccounts = accounts.filter(a => a.status === 'vencida').length;

  const metrics: ReportMetrics = {
    totalSales,
    totalProfit: netProfit,
    totalExpenses,
    netMargin,
    salesGrowth,
    profitGrowth,
    activeClients: activeClientsCount,
    activeClientsGrowth,
    activeAccounts,
    expiredAccounts,
    balanceTotal: netProfit, // Simplified balance for period
    balanceGrowth: profitGrowth
  };

  // 2. TREND DATA (Charts)
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
  const groupByMonth = daysDiff > 60; 

  const trendMap = new Map<string, { income: number, expense: number, salesCount: number, dateObj: Date }>();

  // Fill Income & Count
  filteredSales.forEach(s => {
    const d = new Date(s.date);
    const key = groupByMonth 
       ? `${d.getFullYear()}-${d.getMonth()}`
       : d.toISOString().split('T')[0];
    
    if (!trendMap.has(key)) {
        trendMap.set(key, { 
            income: 0, 
            expense: 0, 
            salesCount: 0,
            dateObj: groupByMonth ? new Date(d.getFullYear(), d.getMonth(), 1) : new Date(s.date) 
        });
    }
    const entry = trendMap.get(key)!;
    entry.income += s.amount;
    entry.salesCount += 1;
  });

  // Fill Expense
  filteredMovements.forEach(m => {
    if (m.type !== 'withdrawal' && m.type !== 'transfer_out') return;
    const d = new Date(m.date);
    const key = groupByMonth 
       ? `${d.getFullYear()}-${d.getMonth()}`
       : d.toISOString().split('T')[0];

    if (!trendMap.has(key)) {
        trendMap.set(key, { 
            income: 0, 
            expense: 0, 
            salesCount: 0,
            dateObj: groupByMonth ? new Date(d.getFullYear(), d.getMonth(), 1) : new Date(m.date) 
        });
    }
    
    // Use snapshot if available
    const val = (m.usdEquivalent !== undefined && m.usdEquivalent > 0) 
        ? m.usdEquivalent 
        : convertToMain(m.amount, m.currency, settings, m.exchangeRate);
        
    trendMap.get(key)!.expense += val;
  });

  const trendData: ChartDataPoint[] = Array.from(trendMap.values())
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .map(item => ({
       ...item,
       name: groupByMonth 
          ? item.dateObj.toLocaleDateString('es-ES', { month: 'short' })
          : item.dateObj.getDate().toString()
    }));

  // 3. TOPS (Services & Clients)
  const serviceCounts: Record<string, number> = {};
  const serviceRevenue: Record<string, number> = {};
  
  filteredSales.forEach(s => {
      serviceCounts[s.serviceName] = (serviceCounts[s.serviceName] || 0) + 1;
      serviceRevenue[s.serviceName] = (serviceRevenue[s.serviceName] || 0) + s.amount;
  });

  const topServices: TopItem[] = Object.entries(serviceCounts)
    .map(([name, count], idx) => ({ 
        id: idx.toString(), 
        name, 
        value: count, 
        subValue: serviceRevenue[name] 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const topServicesProfit: TopItem[] = Object.entries(serviceRevenue)
    .map(([name, rev], idx) => {
        return {
            id: `profit_${idx}`,
            name,
            value: rev
        };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const clientSpending: Record<string, number> = {};
  filteredSales.forEach(s => {
      const clientName = clients.find(c => c.id === s.clientId)?.name || 'Desconocido';
      clientSpending[clientName] = (clientSpending[clientName] || 0) + s.amount;
  });
  
  const topClients: TopItem[] = Object.entries(clientSpending)
    .map(([name, val], idx) => ({ id: idx.toString(), name, value: val }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // 4. DISTRIBUTION
  const breakdownMap = new Map<string, ServiceBreakdown>();
  let totalSalesCount = 0;

  filteredSales.forEach(s => {
     totalSalesCount++;
     if (!breakdownMap.has(s.serviceName)) {
        breakdownMap.set(s.serviceName, {
           id: s.serviceName,
           name: s.serviceName,
           salesCount: 0,
           totalRevenue: 0,
           totalCost: 0,
           profit: 0,
           margin: 0,
           percentage: 0
        });
     }
     
     const entry = breakdownMap.get(s.serviceName)!;
     entry.salesCount++;
     entry.totalRevenue += s.amount;
     
     const svc = services.find(serv => serv.name === s.serviceName);
     let cost = 0;
     if (svc) {
       if (s.saleType === 'cuenta_completa') cost = svc.cost;
       else cost = svc.screens > 0 ? svc.cost / svc.screens : 0;
     }
     entry.totalCost += cost;
     entry.profit = entry.totalRevenue - entry.totalCost;
     entry.margin = entry.totalRevenue > 0 ? (entry.profit / entry.totalRevenue) * 100 : 0;
  });

  const breakdown = Array.from(breakdownMap.values())
    .map(b => ({ ...b, percentage: totalSalesCount > 0 ? (b.salesCount / totalSalesCount) * 100 : 0 }))
    .sort((a, b) => b.salesCount - a.salesCount); // Sort by popularity

  return {
     metrics,
     trendData,
     topServices,
     topServicesProfit,
     topClients,
     breakdown
  };
};
