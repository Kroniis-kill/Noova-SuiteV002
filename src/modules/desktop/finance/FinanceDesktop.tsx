import React from 'react';
import FinanceMobile, { FinanceProps } from '../../mobile/finance/FinanceMobile';

const FinanceDesktop: React.FC<FinanceProps> = (props) => {
  // En la versión desktop, simplemente reutilizamos el layout móvil
  // pero dentro del contenedor Desktop que ya maneja el sidebar fijo.
  return (
    <div className="animate-fade-in">
        <FinanceMobile {...props} />
    </div>
  );
};

export default FinanceDesktop;