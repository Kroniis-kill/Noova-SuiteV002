import React from 'react';
import ProvidersMobile from '../../modules/mobile/providers/ProvidersMobile';

interface ProvidersPageProps {
  onBack?: () => void;
}

// #10: Unificado mobile/desktop — el desktop era un wrapper trivial.
const ProvidersPage: React.FC<ProvidersPageProps> = ({ onBack }) => {
  return <ProvidersMobile onBack={onBack} />;
};

export default ProvidersPage;
