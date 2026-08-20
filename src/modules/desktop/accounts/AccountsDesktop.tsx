import React from 'react';
import AccountsMobile from '../../mobile/accounts/AccountsMobile';

const AccountsDesktop: React.FC = () => {
  return (
    <div className="animate-fade-in">
        {/* Reutilizamos el diseño móvil que maneja la navegación por categorías y listas */}
        <AccountsMobile />
    </div>
  );
};

export default AccountsDesktop;