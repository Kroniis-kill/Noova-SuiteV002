import { useEffect } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'noova-theme-preference';
const THEME_COLOR_DARK = '#0a0a0a';
const THEME_COLOR_LIGHT = '#f6f6f8';

function resolveTheme(pref: ThemePreference): 'dark' | 'light' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return pref;
}

function applyTheme(pref: ThemePreference) {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.classList.toggle('light', resolved === 'light');
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'light' ? THEME_COLOR_LIGHT : THEME_COLOR_DARK);
}

/**
 * Aplica en vivo la preferencia de tema (Oscuro / Claro / Sistema) elegida
 * en Ajustes > Cuenta y Perfil > Apariencia. Guarda una copia en
 * localStorage para que el script inline de index.html pueda pintar el
 * tema correcto antes de que React monte (evita el "flash" del tema
 * equivocado al abrir la app).
 */
export function useThemeSync(preference: ThemePreference | undefined) {
  useEffect(() => {
    const pref = preference || 'dark';
    applyTheme(pref);
    try { localStorage.setItem(STORAGE_KEY, pref); } catch {}

    if (pref === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const handler = () => applyTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [preference]);
}
