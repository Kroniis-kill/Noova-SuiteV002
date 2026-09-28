-- ============================================================
-- Dashboard widgets: "Personaliza tu inicio"
-- Seguro de ejecutar aunque la columna ya exista (idempotente).
-- ============================================================

-- 1) Asegura que la columna exista como jsonb (no-op si ya existe).
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS dashboard_widgets jsonb;

-- 2) Rellena las nuevas llaves de widgets en las filas existentes,
--    sin tocar las preferencias que el usuario ya haya guardado.
UPDATE public.settings
SET dashboard_widgets = COALESCE(dashboard_widgets, '{}'::jsonb) || jsonb_build_object(
  'showExpiringSales', true,
  'showExpiringAccounts', true,
  'showMovements', true,
  'showStock', true,
  'showAgenda', true
)
WHERE dashboard_widgets IS NULL
   OR NOT (dashboard_widgets ? 'showExpiringSales');
