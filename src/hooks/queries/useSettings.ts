import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { withRetry } from '../../utils/supabaseUtils';
import { cacheUtils } from '../../utils/cacheUtils';
import { AppSettings } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants/defaultSettings';
import { useOfflineSync } from '../useOfflineSync';
import { useToast } from '../../context/ToastContext';
import { resolveUserId } from './queryHelpers';

/**
 * Settings entity: query + upsert mutation.
 * Extracted from useSupabaseData (god-hook split).
 */
export function useSettings(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { addToSyncQueue, isNetworkError } = useOfflineSync(userId);
  const { showToast } = useToast();

  const settingsQ = useQuery({
    queryKey: ['settings', userId],
    queryFn: async () => {
      if (!userId || userId === 'offline-user-id') return DEFAULT_SETTINGS;
      const { data, error } = await withRetry(() =>
        supabase.from('settings').select('*').eq('user_id', userId).maybeSingle()
      );
      if (error) {
        console.error('Error fetching settings:', error);
        return DEFAULT_SETTINGS;
      }
      if (!data) return DEFAULT_SETTINGS;

      const settings: AppSettings = {
        currency: data.currency || DEFAULT_SETTINGS.currency,
        subCurrency: data.sub_currency || DEFAULT_SETTINGS.subCurrency,
        exchangeRate: data.exchange_rate ?? DEFAULT_SETTINGS.exchangeRate,
        messageTemplates: { ...DEFAULT_SETTINGS.messageTemplates, ...(data.message_templates || {}) },
        telegramMessageTemplates: { ...DEFAULT_SETTINGS.telegramMessageTemplates, ...(data.telegram_message_templates || {}) },
        salesPreferences: data.sales_preferences || DEFAULT_SETTINGS.salesPreferences,
        analyticsPreferences: data.analytics_preferences || DEFAULT_SETTINGS.analyticsPreferences,
        notificationPreferences: data.notification_preferences || DEFAULT_SETTINGS.notificationPreferences,
        digestSettings: data.digest_settings || DEFAULT_SETTINGS.digestSettings,
        businessInfo: data.business_info || DEFAULT_SETTINGS.businessInfo,
        useBusinessLogo: data.use_business_logo || false,
        dashboardWidgets: data.dashboard_widgets || DEFAULT_SETTINGS.dashboardWidgets,
        theme: data.theme || DEFAULT_SETTINGS.theme,
        backupPreferences: data.backup_preferences || DEFAULT_SETTINGS.backupPreferences || {
          autoBackup: false,
          frequency: 'weekly',
          driveEnabled: false,
        },
      };
      cacheUtils.save('settings', settings, userId);
      return settings;
    },
    initialData: () => cacheUtils.load<AppSettings>('settings', userId) || undefined,
    enabled: !!userId,
    staleTime: 0,
  });

  const updateSettings = useMutation({
    mutationFn: async (s: AppSettings) => {
      const activeId = await resolveUserId(userId);
      if (!activeId) throw new Error('Authentication required');
      const dbData: any = {
        user_id: activeId,
        currency: s.currency,
        sub_currency: s.subCurrency,
        exchange_rate: s.exchangeRate,
        message_templates: s.messageTemplates,
        telegram_message_templates: s.telegramMessageTemplates,
        sales_preferences: s.salesPreferences,
        analytics_preferences: s.analyticsPreferences,
        notification_preferences: s.notificationPreferences,
        digest_settings: s.digestSettings,
        business_info: s.businessInfo,
        use_business_logo: s.useBusinessLogo,
        dashboard_widgets: s.dashboardWidgets,
        theme: s.theme,
      };
      if (s.backupPreferences) dbData.backup_preferences = s.backupPreferences;

      try {
        const { error } = await withRetry(() =>
          supabase.from('settings').upsert(dbData, { onConflict: 'user_id' })
        );
        if (error) {
          if (error.message?.includes('backup_preferences')) {
            const { backup_preferences, ...cleanData } = dbData;
            await supabase.from('settings').upsert(cleanData, { onConflict: 'user_id' });
            console.warn('backup_preferences column missing in DB. Savings settings without it.');
          } else {
            throw error;
          }
        }
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'FINANCE', dbData);
          showToast('Configuración guardada localmente', 'info');
          return;
        }
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', userId] }),
  }).mutateAsync;

  return { settingsQ, updateSettings };
}
