
import React from 'react';
import DashboardMobile from '../../mobile/dashboard/DashboardMobile';
import { useUIStore } from '../../../store/uiStore';

const DashboardDesktop: React.FC = () => {
  const { setView } = useUIStore();
  
  // En escritorio, usamos DashboardMobile que es el componente con toda la lógica 
  // de widgets personalizables, garantizando paridad total de funciones.
  return (
    <div className="animate-fade-in w-full h-full">
        <DashboardMobile setView={setView} />
    </div>
  );
};

export default DashboardDesktop;
