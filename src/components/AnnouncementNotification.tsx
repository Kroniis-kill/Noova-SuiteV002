import React, { useEffect, useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X } from 'lucide-react';

export const AnnouncementNotification: React.FC = () => {
    const { getAnnouncements } = useSubscription();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getAnnouncements();
            setAnnouncements(data.filter(a => a.is_active));
        };
        load();
    }, [getAnnouncements]);

    if (announcements.length === 0 || !visible) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className="fixed top-4 left-4 right-4 z-50 bg-status-warning text-black p-4 rounded-lg shadow-2xl flex items-center gap-4"
            >
                <Megaphone size={24} />
                <div className="flex-1">
                    <h4 className="font-bold text-sm uppercase">Anuncio Importante</h4>
                    <p className="text-xs font-medium">{announcements[0].message}</p>
                </div>
                <button onClick={() => setVisible(false)}><X size={20} /></button>
            </motion.div>
        </AnimatePresence>
    );
};
