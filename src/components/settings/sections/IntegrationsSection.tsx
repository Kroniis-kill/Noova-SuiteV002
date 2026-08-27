import React, { useEffect, useState } from 'react';
import { Activity, Database, Wifi, WifiOff, Bell, BellOff, RefreshCw } from 'lucide-react';
import { styles, StatusRow } from './_shared';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { useAuth } from '../../../context/AuthContext';

const OK = 'text-status-success-soft bg-status-success/10 border-status-success/20';
const WARN = 'text-status-warning-soft bg-status-warning/10 border-status-warning/20';
const DANGER = 'text-status-danger-soft bg-status-danger/10 border-status-danger/20';

/** Estado real de los permisos de notificación del navegador. */
const useNotificationPermission = () => {
    const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
    );
    useEffect(() => {
        if (!('Notification' in window) || !('permissions' in navigator)) return;
        let sub: PermissionStatus | null = null;
        navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
            sub = status;
            setPerm(Notification.permission);
            status.onchange = () => setPerm(Notification.permission);
        }).catch(() => {});
        return () => { if (sub) sub.onchange = null; };
    }, []);
    return perm;
};

export const IntegrationsSection = () => {
    const { user } = useAuth();
    const { isOnline, isSyncing, pendingCount } = useOfflineSync(user?.id);
    const pushPermission = useNotificationPermission();

    return (
        <div className="animate-fade-in space-y-6">
             <div className={styles.card}>
                 <div className="flex items-center gap-2 mb-6 text-status-success-soft">
                    <Activity size={20} />
                    <h3 className="font-bold text-text-primary">Estado del Sistema</h3>
                 </div>

                 <StatusRow
                    icon={isOnline ? Wifi : WifiOff}
                    label="Conexión"
                    status={isOnline ? 'EN LÍNEA' : 'SIN CONEXIÓN'}
                    color={isOnline ? OK : DANGER}
                 />
                 <StatusRow
                    icon={isSyncing ? RefreshCw : Database}
                    label="Sincronización"
                    status={isSyncing ? 'SINCRONIZANDO' : pendingCount > 0 ? `${pendingCount} PENDIENTE${pendingCount === 1 ? '' : 'S'}` : 'AL DÍA'}
                    color={isSyncing ? WARN : pendingCount > 0 ? WARN : OK}
                 />
                 <StatusRow
                    icon={pushPermission === 'granted' ? Bell : BellOff}
                    label="Notificaciones Push"
                    status={pushPermission === 'granted' ? 'ACTIVO' : pushPermission === 'denied' ? 'BLOQUEADO' : 'SIN CONFIGURAR'}
                    color={pushPermission === 'granted' ? OK : pushPermission === 'denied' ? DANGER : WARN}
                 />

                 {!isOnline && (
                    <p className="text-[10px] text-text-disabled mt-4 px-1 leading-relaxed">
                        Estás trabajando sin conexión. Los cambios se guardan en el dispositivo y se sincronizan automáticamente al recuperar internet.
                    </p>
                 )}
                 {isOnline && pendingCount > 0 && !isSyncing && (
                    <p className="text-[10px] text-text-disabled mt-4 px-1 leading-relaxed">
                        Hay cambios esperando a subirse a la nube — se sincronizarán en breve.
                    </p>
                 )}
             </div>
        </div>
    );
};
