
import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Account, Service } from '../types';
import { getAccountStatus, calculateOccupancy } from '../utils/inventarioUtils';
import { generateUUID } from '../utils/uuid';

export const useInventario = () => {
  const { services, accounts, addAccount, updateAccount, deleteAccount, addService, settings } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'activa' | 'por_vencer' | 'vencida' | 'inactiva' | 'fallando'>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Configured threshold
  const warningThreshold = settings.salesPreferences?.warningDays || 5;

  // Group accounts by service for the main dashboard (Excluyendo Papelera)
  const serviceStats = useMemo(() => {
    return services.map(service => {
      const serviceAccounts = accounts.filter(a => a.serviceId === service.id && a.status !== 'trash');
      
      const stats: { 
        total: number; 
        activa: number; 
        por_vencer: number; 
        vencida: number; 
        inactiva: number; 
        fallando: number;
        totalScreens: number;
      } = {
        total: serviceAccounts.length,
        activa: 0,
        por_vencer: 0,
        vencida: 0,
        inactiva: 0,
        fallando: 0,
        totalScreens: 0
      };

      serviceAccounts.forEach(acc => {
        const computedStatus = getAccountStatus(acc, warningThreshold);
        if (acc.status === 'inactiva') {
          stats.inactiva++;
        } else if (computedStatus !== 'trash') {
          stats[computedStatus as keyof typeof stats]++;
        }
        
        if (acc.status !== 'inactiva' && acc.status !== 'trash') {
            const capacity = acc.maxScreens || service.screens;
            const used = calculateOccupancy(acc);
            stats.totalScreens += Math.max(0, capacity - used);
        }
      });

      return { service, stats };
    });
  }, [services, accounts, warningThreshold]);

  // Filter accounts (Excluyendo Papelera por defecto)
  const filteredAccounts = useMemo(() => {
    if (!selectedServiceId) return [];
    
    let filtered = accounts.filter(a => a.serviceId === selectedServiceId && a.status !== 'trash');

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.email.toLowerCase().includes(lowerQ) || 
        a.notes?.toLowerCase().includes(lowerQ)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => getAccountStatus(a, warningThreshold) === statusFilter);
    }

    return filtered;
  }, [selectedServiceId, accounts, searchQuery, statusFilter, warningThreshold]);

  const analyzeImportData = (data: any[]) => {
      const duplicates: { existing: Account, incoming: any, serviceId: string }[] = [];
      const newEntries: { incoming: any, serviceId: string }[] = [];

      data.forEach(row => {
          const norm: any = {};
          Object.keys(row).forEach(k => norm[k.toLowerCase().trim()] = row[k]);
          if (!norm.servicio || !norm.correo) return;
          let serviceId = services.find(s => s.name.toLowerCase() === norm.servicio.toString().toLowerCase())?.id;
          if (!serviceId) {
             newEntries.push({ incoming: norm, serviceId: 'CREATE_NEW' });
             return;
          }
          const existing = accounts.find(a => 
              a.email.toLowerCase() === norm.correo.toString().toLowerCase() && 
              a.serviceId === serviceId
          );
          if (existing) duplicates.push({ existing, incoming: norm, serviceId });
          else newEntries.push({ incoming: norm, serviceId });
      });
      return { duplicates, newEntries };
  };

  const processImportBatch = async (
      newEntries: { incoming: any, serviceId: string }[], 
      duplicates: { existing: Account, incoming: any, serviceId: string }[],
      strategy: 'update' | 'skip'
  ) => {
      let createdCount = 0;
      let updatedCount = 0;
      for (const item of newEntries) {
          let finalServiceId = item.serviceId;
          if (finalServiceId === 'CREATE_NEW') {
              const newService: Service = {
                  id: generateUUID(),
                  name: item.incoming.servicio,
                  cost: 0,
                  screens: Number(item.incoming.pantallas) || 1,
                  type: (item.incoming.type as any) || 'por_pantalla',
                  investmentPrice: 0, publicPrice: 0, resellerPrice: 0
              };
              addService(newService);
              finalServiceId = newService.id;
          }
          const newAccount: Account = {
            id: generateUUID(),
            serviceId: finalServiceId,
            email: item.incoming.correo,
            password: item.incoming.contraseña || '123456',
            country: item.incoming.pais || 'Global',
            status: (item.incoming.estado as any) || 'activa',
            startDate: item.incoming.fecha_inicio || new Date().toISOString().split('T')[0],
            endDate: item.incoming.fecha_fin || new Date().toISOString().split('T')[0],
            notes: item.incoming.notas || '',
            maxScreens: Number(item.incoming.pantallas) || 1,
            account_type: (item.incoming.type as any) || 'por_pantalla',
            profiles: []
          };
          addAccount(newAccount);
          createdCount++;
      }
      if (strategy === 'update') {
          for (const item of duplicates) {
              const updatedAccount: Account = {
                  ...item.existing,
                  password: item.incoming.contraseña || item.existing.password,
                  country: item.incoming.pais || item.existing.country,
                  endDate: item.incoming.fecha_fin || item.existing.endDate,
                  notes: (item.existing.notes || '') + (item.incoming.notas ? `\n${item.incoming.notas}` : ''),
                  status: 'activa'
              };
              updateAccount(updatedAccount);
              updatedCount++;
          }
      }
      return { createdCount, updatedCount };
  };

  return {
    services, accounts, serviceStats, selectedServiceId, setSelectedServiceId,
    filteredAccounts, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    addAccount, updateAccount, deleteAccount, analyzeImportData, processImportBatch
  };
};
