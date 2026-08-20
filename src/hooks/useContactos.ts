
import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Client } from '../types';
import { sortClientsByDate } from '../utils/contactosUtils';
import { generateUUID } from '../utils/uuid';

export const useContactos = () => {
  const { clients, addClient, updateClient, deleteClient } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterActiveServices, setFilterActiveServices] = useState(false);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedQuery(searchQuery);
    }, 300); // 300ms delay

    return () => {
        clearTimeout(handler);
    };
  }, [searchQuery]);

  const filteredClients = useMemo(() => {
    let result = clients;

    // Search using DEBOUNCED query
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.phone || '').includes(q)
      );
    }

    // Filter
    if (filterActiveServices) {
      result = result.filter(c => c.activeServices > 0);
    }

    // Sort (Newest first)
    return sortClientsByDate(result);
  }, [clients, debouncedQuery, filterActiveServices]);

  const handleImport = (data: any[]) => {
    try {
      let count = 0;

      data.forEach(row => {
        const nombre = row.nombre;
        const telefono = row.telefono || row.phone; 
        
        if (nombre && telefono) {
          addClient({
            id: generateUUID(),
            name: nombre.trim(),
            phone: telefono.toString().trim(),
            registrationDate: row.fecha_registro || new Date().toISOString().split('T')[0],
            activeServices: Number(row.servicios_activos) || 0,
            notes: row.notas || ''
          });
          count++;
        }
      });
      return { success: true, count };
    } catch (e) {
      console.error(e);
      return { success: false, error: e };
    }
  };

  return {
    clients: filteredClients,
    searchQuery,
    setSearchQuery,
    filterActiveServices,
    setFilterActiveServices,
    addClient,
    updateClient,
    deleteClient,
    handleImport
  };
};
