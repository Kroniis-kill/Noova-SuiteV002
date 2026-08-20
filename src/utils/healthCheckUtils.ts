
import { Account, Sale, Service } from '../types';
import { getDaysRemaining } from './inventarioUtils';

export type HealthStatus = 'verde' | 'amarillo' | 'rojo';

export interface AccountHealth {
  accountId: string;
  accountEmail: string;
  status: HealthStatus;
  cost: number;
  revenue: number;
  profit: number;
  roi: number; // Return on Investment %
  occupancy: number;
  daysActive: number;
  daysRemaining: number;
  suggestion: string;
}

export const calculateAccountHealth = (
  account: Account,
  sales: Sale[],
  service?: Service
): AccountHealth => {
  // 1. Calcular Costos
  // Si el servicio tiene "investmentPrice" (Costo total de la cuenta), usamos eso.
  // Si no, intentamos estimar con costo unitario * pantallas.
  let cost = 0;
  if (service) {
    cost = service.investmentPrice > 0 
      ? service.investmentPrice 
      : (service.cost * (account.maxScreens || 1));
  }

  // 2. Calcular Ingresos (Ventas asociadas a esta cuenta)
  const accountSales = sales.filter(s => s.accountId === account.id);
  const revenue = accountSales.reduce((sum, s) => sum + s.amount, 0);
  const profit = revenue - cost;
  const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : (revenue > 0 ? 100 : 0);

  // 3. Calcular Tiempo
  const now = new Date();
  const start = new Date(account.startDate);
  const end = new Date(account.endDate);
  
  // Evitar división por cero o fechas inválidas
  const totalDuration = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  const daysElapsed = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 3600 * 24));
  const daysRemaining = getDaysRemaining(account.endDate);
  const timeProgress = Math.min(1, daysElapsed / totalDuration); // 0 a 1 (0% a 100% del tiempo consumido)

  // 4. Ocupación
  const totalSlots = account.maxScreens || 1;
  const usedSlots = account.usedScreens || 0;
  const occupancyPct = usedSlots / totalSlots;

  // 5. Determinar Estado (Semáforo) y Sugerencia
  let status: HealthStatus = 'verde';
  let suggestion = '';

  // LÓGICA DEL SEMÁFORO
  
  // CASO ROJO (Pérdida Crítica)
  if (profit < 0 && daysRemaining <= 2) {
      // Se acabó el tiempo y perdimos dinero
      status = 'rojo';
      suggestion = 'Esta cuenta generó pérdidas. No renovar bajo las mismas condiciones.';
  } else if (profit < 0 && timeProgress > 0.5 && occupancyPct < 0.3) {
      // Pasó la mitad del tiempo, tenemos pocos clientes y seguimos en negativo
      status = 'rojo';
      suggestion = 'Baja rotación crítica. Oferta los cupos restantes urgentemente o considera darla de baja.';
  } 
  
  // CASO AMARILLO (Riesgo / En Proceso)
  else if (profit < 0) {
      // Todavía en negativo, pero hay tiempo
      const needed = Math.abs(profit);
      // Estimamos precio promedio de venta
      const avgSale = accountSales.length > 0 ? (revenue / accountSales.length) : (cost / totalSlots * 1.2); // Fallback markup 20%
      const salesNeeded = Math.ceil(needed / (avgSale || 1));
      
      status = 'amarillo';
      suggestion = `Necesitas vender aprox. ${salesNeeded} perfil(es) más para cubrir el costo.`;
  } else if (profit >= 0 && profit < (cost * 0.2) && timeProgress > 0.8) {
      // Ganancia marginal y se acaba el tiempo
      status = 'amarillo';
      suggestion = 'Margen de ganancia bajo. Revisa el precio de venta para la próxima renovación.';
  }
  
  // CASO VERDE (Rentable)
  else {
      status = 'verde';
      if (occupancyPct === 1) {
          suggestion = 'Excelente rendimiento. Cuenta llena y generando ganancias.';
      } else {
          suggestion = 'Cuenta rentable. Aún tienes espacio para aumentar la ganancia pura.';
      }
  }

  // Override para inactivas
  if (account.status === 'inactiva') {
      suggestion = 'Cuenta pausada. Reactívala para generar ingresos.';
      status = profit >= 0 ? 'verde' : 'amarillo'; // Mantiene estado financiero
  }

  return {
    accountId: account.id,
    accountEmail: account.email,
    status,
    cost,
    revenue,
    profit,
    roi,
    occupancy: usedSlots,
    daysActive: Math.floor(daysElapsed),
    daysRemaining,
    suggestion
  };
};
