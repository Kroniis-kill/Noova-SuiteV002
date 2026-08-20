
import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import SalesMobile from '../../modules/mobile/sales/SalesMobile';
import SalesDesktop from '../../modules/desktop/sales/SalesDesktop';

interface SalesPageProps {
  onBack?: () => void;
  initialView?: 'sales' | 'agenda';
}

const SalesPage: React.FC<SalesPageProps> = ({ onBack, initialView }) => {
  const isMobile = useIsMobile();
  // En Desktop no hay toggle de vista local igual que en mobile, pero permitimos la prop
  return isMobile ? <SalesMobile onBack={onBack} initialView={initialView} /> : <SalesDesktop />;
};

export default SalesPage;
