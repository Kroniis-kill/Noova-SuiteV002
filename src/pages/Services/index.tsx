
import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import ServicesMobile from '../../modules/mobile/services/ServicesMobile';
import ServicesDesktop from '../../modules/desktop/services/ServicesDesktop';

interface ServicesPageProps {
  onBack?: () => void;
}

const ServicesPage: React.FC<ServicesPageProps> = ({ onBack }) => {
  const isMobile = useIsMobile();
  return isMobile ? <ServicesMobile onBack={onBack} /> : <ServicesDesktop />;
};

export default ServicesPage;
