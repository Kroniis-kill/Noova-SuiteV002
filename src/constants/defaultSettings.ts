import { AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  subCurrency: '',
  exchangeRate: 0,
  messageTemplates: {
    newSaleGlobal: `👋 ¡Hola *{cliente}*!\n\nGracias por tu compra. Aquí tienes el detalle de tu pedido:\n\n{lista_servicios}\n\n📅 *Vencimiento:* {fecha_corte}\n💰 *Total:* {moneda} {precio}\n\n⚠️ *Importante:*\n- No cambies los datos de la cuenta.\n- Si tienes problemas, avísanos para garantía.\n\n¡Que lo disfrutes! 🍿`,
    newSaleScreen: `📺 *{servicio}* (Pantalla)\n👤 Usuario: {correo}\n🔑 Clave: {password}\n📝 Perfil: {perfil}\n🔒 PIN: {pin}`,
    newSaleUnique: `👤 *{servicio}* (Tu Cuenta)\n📧 Correo: {correo_invitado}\n🔑 Clave: {password_invitado}`,
    newSaleFull: `💎 *{servicio}* (Completa)\n👤 Usuario: {correo}\n🔑 Clave: {password}`,
    warning2Days: `Hola {cliente} 👋, te recordamos que tu servicio de *{servicios_agrupados}* vence en 2 días ({fecha_corte}).`,
    warning1Day: `⏰ *Aviso de Vencimiento*\n\nHola {cliente}, tu servicio *{servicios_agrupados}* vence MAÑANA.`,
    expiration: `🚫 *Servicio Vencido*\n\nHola {cliente}, hoy finaliza tu suscripción de *{servicios_agrupados}*.`,
    renewal: `✅ *Renovación Exitosa*\n\nHola {cliente}, tu servicio *{servicio}* ha sido renovado hasta el *{fecha_corte}*.`,
    passwordChange: `🔐 *Cambio de Clave*\n\nHola {cliente}, nueva clave para *{servicio}*:\n{lista_servicios}`,
    replacement: `🛡️ *Garantía*\n\nHola {cliente}, reposición para *{servicio}*:\n{lista_servicios}`,
    failureReport: `📢 *Aviso de Servicio*\n\nHola {cliente}, te informamos que el servicio *{servicio}* presenta una falla masiva temporal. 🛠️\n\nNuestro equipo ya está trabajando en la solución. Te avisaremos apenas el acceso sea restablecido. Gracias por tu paciencia.`,
    failureSolved: `✅ *¡Inconveniente Resuelto!*\n\nHola *{cliente}*, te informamos que el reporte técnico para tu servicio *{servicio}* ha sido solucionado satisfactoriamente. 🚀\n\nYa puedes acceder a disfrutar de tu contenido. Gracias por tu paciencia y por confiar en nosotros. 🍿`
  },
  telegramMessageTemplates: {
    newSaleGlobal: `👋 ¡Hola *{cliente}*!\n\nGracias por tu compra. Aquí tienes el detalle de tu pedido:\n\n{lista_servicios}\n\n📅 *Vencimiento:* {fecha_corte}\n💰 *Total:* {moneda} {precio}\n\n⚠️ *Importante:*\n- No cambies los datos de la cuenta.\n- Si tienes problemas, avísanos para garantía.\n\n¡Que lo disfrutes! 🍿`,
    newSaleScreen: `📺 *{servicio}* (Pantalla)\n👤 Usuario: {correo}\n🔑 Clave: {password}\n📝 Perfil: {perfil}\n🔒 PIN: {pin}`,
    newSaleUnique: `👤 *{servicio}* (Tu Cuenta)\n📧 Correo: {correo_invitado}\n🔑 Clave: {password_invitado}`,
    newSaleFull: `💎 *{servicio}* (Completa)\n👤 Usuario: {correo}\n🔑 Clave: {password}`,
    warning2Days: `Hola {cliente} 👋, te recordamos que tu servicio de *{servicio}* vence en 2 días ({fecha_corte}).`,
    warning1Day: `⏰ *Aviso de Vencimiento*\n\nHola {cliente}, tu servicio *{servicio}* vence MAÑANA.`,
    expiration: `🚫 *Servicio Vencido*\n\nHola {cliente}, hoy finaliza tu suscripción de *{servicio}*.`,
    renewal: `✅ *Renovación Exitosa*\n\nHola {cliente}, tu servicio *{servicio}* ha sido renovado hasta el *{fecha_corte}*.`,
    passwordChange: `🔐 *Cambio de Clave*\n\nHola {cliente}, nueva clave para *{servicio}*:\n{lista_servicios}`,
    replacement: `🛡️ *Garantía*\n\nHola {cliente}, reposición para *{servicio}*:\n{lista_servicios}`,
    failureReport: `📢 *Aviso de Servicio*\n\nHola {cliente}, te informamos que el servicio *{servicio}* presenta una falla masiva temporal. 🛠️\n\nNuestro equipo ya está trabajando en la solución. Te avisaremos apenas el acceso sea restablecido. Gracias por tu paciencia.`,
    failureSolved: `✅ *¡Inconveniente Resuelto!*\n\nHola *{cliente}*, te informamos que el reporte técnico para tu servicio *{servicio}* ha sido solucionado satisfactoriamente. 🚀\n\nYa puedes acceder a disfrutar de tu contenido. Gracias por tu paciencia y por confiar en nosotros. 🍿`
  },
  salesPreferences: { defaultMode: 'screen', defaultDuration: 1, warningDays: 2, autoPin: true },
  analyticsPreferences: { dailyGoal: 0, monthlyGoal: 0, includeSuppliesAsCost: true, lowProfitWarning: 20 },
  notificationPreferences: { expiry: true, stock: true, payments: true, system: true },
  digestSettings: { enabled: false, interval_hours: 5, max_per_day: 3, include_today: true, include_1d: true, include_3d: true, include_overdue: true, include_accounts_risk: true },
  businessInfo: { name: '', whatsapp: '', logo: '' },
  dashboardWidgets: { showProfit: true, showSales: true, showClients: true, showInventory: true, showExchangeRate: true, showQuickActions: true, quickActions: ['sale', 'expense', 'stock', 'services'] },
  useBusinessLogo: false,
  theme: 'dark',
  backupPreferences: {
    autoBackup: false,
    frequency: 'weekly',
    driveEnabled: false
  }
};
