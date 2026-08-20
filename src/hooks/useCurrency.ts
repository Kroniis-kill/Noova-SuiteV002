
import { useCallback } from 'react';
import { useData } from '../context/DataContext';

export const useCurrency = () => {
  const { settings } = useData();

  const mainCurrency = settings.currency || 'USD';
  const subCurrency = settings.subCurrency || 'SEC';
  const exchangeRate = settings.exchangeRate || 1;

  const format = useCallback((amount: number, currency?: string) => {
    const curr = currency || mainCurrency;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD', // Usamos USD para el formato visual ($), aunque la etiqueta sea otra
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount).replace('$', '') + ` ${curr}`;
  }, [mainCurrency]);

  const convert = useCallback((amount: number, from: string, to: string) => {
    if (from === to) return amount;
    
    // Lógica estándar de la app:
    // Monedas Fuertes: USD, USDT, USDC, EUR
    const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
    const isFromStrong = strongCurrencies.includes(from);
    const isToStrong = strongCurrencies.includes(to);

    // Caso 1: De Fuerte (USD) a Débil (Bs/Pesos) -> Multiplicar
    if (isFromStrong && !isToStrong) {
      return amount * exchangeRate;
    }

    // Caso 2: De Débil a Fuerte -> Dividir
    if (!isFromStrong && isToStrong) {
      return exchangeRate > 0 ? amount / exchangeRate : 0;
    }

    // Caso 3: Entre iguales (Fuerte a Fuerte o Débil a Débil) -> 1:1 (Simplificación actual)
    return amount;
  }, [exchangeRate]);

  return {
    format,
    convert,
    mainCurrency,
    subCurrency,
    exchangeRate
  };
};
