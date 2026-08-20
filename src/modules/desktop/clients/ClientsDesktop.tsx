import React from 'react';
import ClientsMobile from '../../mobile/clients/ClientsMobile';

const ClientsDesktop: React.FC = () => {
  return (
    <div className="animate-fade-in">
        <ClientsMobile />
    </div>
  );
};

export default ClientsDesktop;