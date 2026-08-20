import React from 'react';
import ResellersMobile from '../../modules/mobile/resellers/ResellersMobile';

interface RevendedoresPageProps {
  onBack?: () => void;
}

// #10: Unificado mobile/desktop — el desktop era un wrapper trivial.
const RevendedoresPage: React.FC<RevendedoresPageProps> = ({ onBack }) => {
  return <ResellersMobile onBack={onBack} />;
};

export default RevendedoresPage;
