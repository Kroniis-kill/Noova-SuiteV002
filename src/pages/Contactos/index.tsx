
import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import ClientsMobile from '../../modules/mobile/clients/ClientsMobile';
import ClientsDesktop from '../../modules/desktop/clients/ClientsDesktop';

interface ContactosPageProps {
  onBack?: () => void;
}

const ContactosPage: React.FC<ContactosPageProps> = ({ onBack }) => {
  const isMobile = useIsMobile();
  return isMobile ? <ClientsMobile onBack={onBack} /> : <ClientsDesktop />;
};

export default ContactosPage;
