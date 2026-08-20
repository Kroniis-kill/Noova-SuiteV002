import React, { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Sale, Account, ScreenProfile, Client, Service } from '../types';
import { groupSalesByClientAndDate, SalesGroup } from '../utils/salesUtils';
import { getDaysRemaining } from '../utils/expiredUtils';
import { generateUUID } from '../utils/uuid';
import { addTime, getLocalDateISO } from '../utils/contactosUtils';
import { loadXlsx } from '../utils/lazyXlsx';

export const useSalesLogic = () => {
  const { 
    sales, clients, resellers, accounts, services, settings, 
    deleteSale, addSale, addClient, updateAccount,
    loadMoreSales, hasMoreSales, isSalesLoading 
  } = useData();
  const { showToast } = useToast();

  // --- UI STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'warning' | 'expired'>('all');
  
  // --- MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isWAOpen, setIsWAOpen] = useState(false);

  // --- DATA SELECTION STATES ---
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [mobileSelectedGroup, setMobileSelectedGroup] = useState<SalesGroup | null>(null);

  const [salesForDeletion, setSalesForDeletion] = useState<Sale[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DATA PROCESSING ---
  const filteredGroups = useMemo(() => {
    let groups = groupSalesByClientAndDate(sales, clients, resellers);
    
    // 1. Filtro de Búsqueda
    if (deferredSearchQuery.trim()) {
      const lowerQ = deferredSearchQuery.toLowerCase();
      groups = groups.filter((g) => 
        g.clientName.toLowerCase().includes(lowerQ) ||
        (g.clientPhone && g.clientPhone.includes(lowerQ))
      );
    }

    // 2. Filtro de Estado (Considerando congelamiento por falla)
    if (statusFilter !== 'all') {
      groups = groups.filter((g) => {
        const groupSales = g.renewalGroups.flatMap(rg => rg.sales);
        
        // Calculamos el día mínimo de vencimiento de todo el grupo
        const minDays = Math.min(...groupSales.map(s => {
            const acc = accounts.find(a => a.id === s.accountId);
            return getDaysRemaining(s.expiryDate, acc);
        }));
        
        if (statusFilter === 'expired') return minDays < 0;
        if (statusFilter === 'warning') return minDays >= 0 && minDays <= 3;
        if (statusFilter === 'active') return minDays > 3;
        return true;
      });
    }
    
    // 3. Orden de Urgencia (Más pronto a vencer arriba)
    return groups.sort((a, b) => {
        const getMinDays = (group: SalesGroup) => {
            const daysList = group.renewalGroups.flatMap(g => g.sales).map(s => {
                const acc = accounts.find(acc => acc.id === s.accountId);
                return getDaysRemaining(s.expiryDate, acc);
            });
            return daysList.length > 0 ? Math.min(...daysList) : 9999;
        };
        return getMinDays(a) - getMinDays(b);
    });

  }, [sales, clients, resellers, deferredSearchQuery, statusFilter, accounts]);

  const desktopSelectedGroup = useMemo(() => {
      if (selectedClientId) return filteredGroups.find(g => g.clientId === selectedClientId) || null;
      return filteredGroups.length > 0 ? filteredGroups[0] : null;
  }, [filteredGroups, selectedClientId]);

  // --- ACCIONES ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const XLSX = await loadXlsx();
            const wb = XLSX.read(evt.target?.result, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            let count = 0;

            for (const row of data as any[]) {
                const norm: any = {};
                // Normalización agresiva de cabeceras
                Object.keys(row).forEach(k => norm[k.toLowerCase().trim().replace(/\s/g, '_')] = row[k]);

                const clientNameInput = norm.cliente || norm.nombre_cliente || norm.nombre;
                const serviceNameInput = norm.servicio || norm.plataforma;
                const accountEmailInput = norm.cuenta_correo || norm.correo || norm.email_maestra;

                if (!clientNameInput || !serviceNameInput) continue;

                // 1. Buscar o Crear Cliente
                let client = clients.find(c => c.name.toLowerCase() === String(clientNameInput).toLowerCase().trim());
                let finalClientId = client?.id;

                if (!client) {
                    finalClientId = generateUUID();
                    await addClient({
                        id: finalClientId,
                        name: String(clientNameInput).trim(),
                        phone: String(norm.telefono_cliente || norm.telefono || '').trim(),
                        registrationDate: getLocalDateISO(),
                        activeServices: 1
                    });
                }

                // 2. Buscar Servicio y Cuenta
                const service = services.find(s => s.name.toLowerCase() === String(serviceNameInput).toLowerCase().trim());
                const account = accounts.find(a => a.email.toLowerCase() === String(accountEmailInput || '').toLowerCase().trim());

                if (service && account) {
                    const months = parseInt(norm.duracion_meses || norm.meses) || 1;
                    const sale: Sale = {
                        id: generateUUID(),
                        clientId: finalClientId!,
                        accountId: account.id,
                        serviceName: service.name,
                        saleType: (norm.tipo_cuenta || norm.modalidad || 'por_pantalla') as any,
                        amount: parseFloat(norm.monto || norm.precio || norm.costo_venta) || 0,
                        date: getLocalDateISO(),
                        expiryDate: addTime(getLocalDateISO(), months, 0),
                        exchangeRate: settings.exchangeRate,
                        assignedProfiles: norm.perfil ? [{ name: norm.perfil, pin: String(norm.pin || '') }] : []
                    };
                    await addSale(sale);
                    count++;
                }
            }

            if (count > 0) showToast(`Importación exitosa: ${count} ventas registradas`, 'success');
            else showToast('No se encontraron datos que coincidan con servicios y cuentas activas', 'info');
            setIsImportModalOpen(false);
        } catch (error) {
            showToast('Error al procesar el archivo Excel', 'error');
        }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewSale = useCallback(() => { 
      setEditingSale(null); 
      setIsModalOpen(true); 
  }, []);
  
  const handleEditSale = useCallback((sale: Sale) => {
    setEditingSale(sale);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteGroup = useCallback((group: SalesGroup) => {
      const allSales = group.renewalGroups.flatMap(g => g.sales);
      setSalesForDeletion(allSales);
      setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (salesForDeletion.length === 0) return;
    try {
        for (const id of salesForDeletion.map(s => s.id)) {
            await deleteSale(id);
        }
        showToast('Eliminación completada', 'success');
        setSalesForDeletion([]);
        setIsDeleteModalOpen(false);
        if (isDetailOpen) setIsDetailOpen(false);
    } catch (error) {
        showToast('Error al eliminar', 'error');
    }
  }, [salesForDeletion, deleteSale, isDetailOpen, showToast]);

  const selectGroupMobile = useCallback((group: SalesGroup) => {
      setMobileSelectedGroup(group);
      setIsDetailOpen(true);
  }, []);

  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    isModalOpen, setIsModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    isImportModalOpen, setIsImportModalOpen,
    isFilterModalOpen, setIsFilterModalOpen,
    isDetailOpen, setIsDetailOpen,
    isDeleteModalOpen, setIsDeleteModalOpen,
    isWAOpen, setIsWAOpen,
    editingSale, setEditingSale,
    salesForDeletion,
    filteredGroups,
    desktopSelectedGroup,
    mobileSelectedGroup,
    setMobileSelectedGroup,
    fileInputRef,
    settings,
    handleFileUpload,
    loadMoreSales, hasMoreSales, isSalesLoading,
    handleNewSale, handleEditSale, handleDeleteSingleSale: (id: string) => deleteSale(id), 
    handleDeleteGroup, confirmDelete,
    selectGroupMobile
  };
};