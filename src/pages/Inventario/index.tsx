
import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import AccountsMobile from '../../modules/mobile/accounts/AccountsMobile';
import AccountsDesktop from '../../modules/desktop/accounts/AccountsDesktop';

interface InventarioPageProps {
  onBack?: () => void;
  initialView?: 'services' | 'accounts' | 'trash' | 'all_accounts';
}

const InventarioPage: React.FC<InventarioPageProps> = ({ onBack, initialView }) => {
  const isMobile = useIsMobile();
  return isMobile ? <AccountsMobile onBack={onBack} initialView={initialView} /> : <AccountsDesktop />;
};

export default InventarioPage;
