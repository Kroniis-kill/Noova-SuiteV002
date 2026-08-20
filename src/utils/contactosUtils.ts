import { Client } from '../types';
import { AppLauncher } from '@capacitor/app-launcher';

/**
 * Convierte un string YYYY-MM-DD a un objeto Date en hora LOCAL estricta.
 */
export const parseLocalISO = (dateString: string | undefined | null): Date => {
  if (!dateString) return new Date(); 
  const cleanDate = dateString.split('T')[0];
  const [yearStr, monthStr, dayStr] = cleanDate.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; 
  const day = parseInt(dayStr);
  return new Date(year, month, day);
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD respetando la zona horaria local del dispositivo.
 * Soluciona el problema de que los calendarios marquen el día siguiente o anterior por UTC.
 */
export const getLocalDateISO = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formatea una fecha a DD-MMM-YY
 */
export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '---';
  try {
    const date = parseLocalISO(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateString || '---';
  }
};

export const addTime = (baseDateStr: string, monthsToAdd: number, daysToAdd: number): string => {
  const date = parseLocalISO(baseDateStr);
  if (monthsToAdd !== 0) date.setMonth(date.getMonth() + monthsToAdd);
  if (daysToAdd !== 0) date.setDate(date.getDate() + daysToAdd);
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/[\s\-\(\)\+]/g, '');
};

/**
 * Genera un alias único y amigable para el portal del cliente.
 * Formato: nombre-4digitos
 * Ejemplo: Juan Perez -> juan-perez-4821
 */
export const generateClientSlug = (name: string): string => {
  // 1. Normalizar nombre: minúsculas, sin acentos, reemplazar espacios/símbolos por guiones
  const normalized = name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres no alfanuméricos por guion
    .replace(/^-+|-+$/g, ''); // Quitar guiones al inicio/final

  // 2. Generar 4 dígitos aleatorios
  const code = Math.floor(1000 + Math.random() * 9000);

  return `${normalized}-${code}`;
};

/**
 * Función Centralizada para enviar WhatsApp
 * Soporta selección de app en Android (Personal vs Business)
 */
export const sendWhatsAppMessage = async (phone: string, message: string) => {
  if (!phone) return;

  const cleanedPhone = cleanPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  
  // Detección de entorno Capacitor (si window.Capacitor existe)
  const isCapacitor = (window as any).Capacitor !== undefined;

  if (!isCapacitor) {
    // En Web, comportamiento estándar
    const url = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
    window.open(url, '_blank');
    return;
  }

  // --- LÓGICA NATIVA ANDROID/IOS ---
  
  // 1. Verificar Preferencia Guardada
  const preference = localStorage.getItem('noova_wa_pref'); // 'personal', 'business', 'ask'
  
  if (preference === 'personal') {
     await AppLauncher.openUrl({ url: `whatsapp://send?phone=${cleanedPhone}&text=${encodedMessage}` });
     return;
  }
  
  if (preference === 'business') {
     await AppLauncher.openUrl({ url: `whatsapp-business://send?phone=${cleanedPhone}&text=${encodedMessage}` });
     return;
  }

  // 2. Si no hay preferencia (o es 'ask'), verificar qué apps están instaladas
  try {
     const canOpenPersonal = await AppLauncher.canOpenUrl({ url: 'whatsapp://' });
     const canOpenBusiness = await AppLauncher.canOpenUrl({ url: 'whatsapp-business://' });

     // Caso A: Solo Personal
     if (canOpenPersonal.value && !canOpenBusiness.value) {
        await AppLauncher.openUrl({ url: `whatsapp://send?phone=${cleanedPhone}&text=${encodedMessage}` });
        return;
     }

     // Caso B: Solo Business
     if (!canOpenPersonal.value && canOpenBusiness.value) {
        await AppLauncher.openUrl({ url: `whatsapp-business://send?phone=${cleanedPhone}&text=${encodedMessage}` });
        return;
     }

     // Caso C: Ambas instaladas (o ninguna detectada fiable, mejor mostrar selector)
     if (canOpenPersonal.value && canOpenBusiness.value) {
         // Disparar evento para que el componente React muestre el modal
         const event = new CustomEvent('open-whatsapp-selector', { 
            detail: { phone: cleanedPhone, message: encodedMessage } 
         });
         window.dispatchEvent(event);
         return;
     }

     // Fallback extremo si AppLauncher falla o no detecta nada: Intentar abrir esquema estándar
     await AppLauncher.openUrl({ url: `whatsapp://send?phone=${cleanedPhone}&text=${encodedMessage}` });

  } catch (error) {
     // Si falla la detección, fallback a web o intent genérico
     console.error("Error launching WA:", error);
     const url = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
     window.open(url, '_system');
  }
};

// Alias for backwards compatibility
export const openWhatsAppBusiness = (phone: string, message: string) => {
    sendWhatsAppMessage(phone, message);
};

export const sortClientsByDate = (clients: Client[]): Client[] => {
  return [...clients].sort((a, b) => {
    return new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
  });
};

export const getClientTags = (client: Client, activeServicesCount: number): string[] => {
    const manualTags = client.tags || [];
    const autoTags: string[] = [];
    const regDate = parseLocalISO(client.registrationDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - regDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) autoTags.push('Nuevo');
    if (diffDays > 180 && activeServicesCount > 0) autoTags.push('VIP');
    else if (diffDays > 90 && activeServicesCount > 0) autoTags.push('Frecuente');

    return Array.from(new Set([...manualTags, ...autoTags]));
};