import React from 'react';
import { Activity, Database, Server, Smartphone } from 'lucide-react';
import { styles, StatusRow } from './_shared';

export const IntegrationsSection = () => {
    return (
        <div className="animate-fade-in space-y-6">
             <div className={styles.card}>
                 <div className="flex items-center gap-2 mb-6 text-status-success-soft">
                    <Activity size={20} />
                    <h3 className="font-bold text-text-primary">Estado del Sistema</h3>
                 </div>

                 <StatusRow icon={Database} label="Base de Datos" status="OPERATIVO" color="text-status-success-soft bg-status-success/10 border-status-success/20" />
                 <StatusRow icon={Server} label="API Server" status="OPERATIVO" color="text-status-success-soft bg-status-success/10 border-status-success/20" />
                 <StatusRow icon={Smartphone} label="Notificaciones Push" status="ACTIVO" color="text-status-success-soft bg-status-success/10 border-status-success/20" />
             </div>
        </div>
    );
};
