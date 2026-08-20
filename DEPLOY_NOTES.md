# Cómo aplicar estos cambios

## 1. Base de datos (Supabase) — HACER PRIMERO
Antes de subir el código nuevo, corre el SQL en tu proyecto de Supabase, **en este orden**:

1. Entra al **SQL Editor** de tu proyecto (idealmente uno de staging/pruebas primero, no producción directo).
2. Pega y ejecuta `supabase/migrations/0001_transactional_rpcs.sql` completo.
3. Pega y ejecuta `supabase/migrations/0002_update_sale_sync.sql` completo (depende del anterior, va después).
4. Verifica que las funciones se crearon en Database → Functions: `create_sale_with_sync`, `delete_sale_with_sync`, `update_sale_with_sync`, `execute_transfer`, `recalculate_account_balance`, `execute_single_movement`, `_release_sale_profiles`, `_occupy_sale_profiles`.
5. Si el código nuevo se sube ANTES de correr este SQL, las ventas van a fallar (llaman a funciones que aún no existen). Orden correcto: **SQL primero, código después**.

## 2. Código
Sube el resto del proyecto a tu repo de GitHub (el que Lovable sincroniza). No hay pasos manuales adicionales — los cambios son retrocompatibles con el esquema de tablas existente, solo agregan funciones nuevas e índices.

## 3. Verificación después de desplegar
- Registra una venta "por pantalla" de prueba y confirma en la tabla `accounts` que el perfil asignado quedó marcado (columna `profiles`) y que `used_screens` subió.
- **Edita** esa venta de prueba (cambia el perfil asignado o la cuenta) y confirma que el perfil viejo se liberó y el nuevo quedó ocupado.
- Borra esa venta de prueba y confirma que el perfil volvió a "Disponible" y `used_screens` bajó.
- Revisa el dashboard / resumen financiero: los ingresos ya deberían reflejar las ventas reales (antes quedaban en $0).
- Haz una transferencia entre dos cuentas financieras y confirma que ambos balances se actualizaron.
- Provoca un error a propósito (por ejemplo, intenta guardar algo con datos inválidos) y confirma que aparece un toast de error — antes varias mutaciones fallaban en silencio.

## 4. Pendiente que requiere que tú lo hagas (no lo puedo hacer yo)
- **Confirmar RLS**: entra a Authentication → Policies (o Database → Tables → cada tabla → RLS) y confirma que `sales`, `clients`, `accounts`, `movements`, `financial_accounts`, `resellers`, `providers`, `expenses`, `payable_expenses`, `expense_categories`, `services` tienen RLS **activo** con una policy que filtre por `user_id = auth.uid()`. Si alguna tabla no tiene RLS activo, cualquier usuario autenticado podría leer/escribir datos de otros usuarios.
- **Versionar el esquema**: de ahora en adelante, cualquier cambio de estructura de tablas debería ir como un archivo nuevo en `supabase/migrations/`, no hecho a mano en el SQL Editor sin registro.
- Recuperar o reconstruir `src/admin_setup.sql` (estaba vacío) si tenía lógica de administración que aún necesitas — no tengo forma de saber qué contenía originalmente.

## 5. Qué quedó pendiente de la auditoría original (no incluido en este paquete)
- Dividir otros archivos grandes que son pantallas completas (`DashboardMobile.tsx`, `WarrantyModal.tsx`, `SaleDetailPage.tsx`) — `SaleModal.tsx` ya se dividió porque era el peor caso (varios componentes redefiniéndose en cada render); estos otros son pantallas más normales en tamaño, menor prioridad.
- Resolución de conflictos en la sincronización offline (hoy sigue siendo "gana el último que escribe" al reconciliar; lo que sí se agregó es un chequeo real de conectividad antes de intentar sincronizar, para no fallar de entrada en redes falsamente "online"). Definir el comportamiento deseado (¿avisar al usuario? ¿fusionar cambios?) requiere una decisión de producto, no solo de código.

## 6. Corregido en esta última pasada
- **Un error real que cometí yo**: al limpiar Zustand, borré por accidente `src/store/uiStore.ts` (estado de UI real, usado en toda la app) junto con `useAppStore.ts` (que sí era código muerto). Ya está recuperado y restaurado; también reviertí la eliminación de `zustand` de `package.json`. Se verificó el árbol completo de archivos contra el original y todos los imports del proyecto para confirmar que no falta nada más.
- El mismo bug de sincronización de perfiles que se corrigió en crear/borrar ventas, ahora también en **editar** una venta existente (`update_sale_with_sync`, migración 0002).
- La sincronización offline ahora hace un chequeo real de conectividad (ping corto a Supabase) antes de vaciar la cola, en vez de confiar solo en `navigator.onLine` (que da falsos positivos en redes sin internet real).
- Manejo de errores unificado: se agregó un manejador global en react-query que muestra un toast ante cualquier mutación fallida que no lo tuviera ya cubierto (antes ~20 mutaciones del hook legacy fallaban en silencio).
