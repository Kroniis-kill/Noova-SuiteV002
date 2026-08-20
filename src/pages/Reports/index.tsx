
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { calculateReportData, DateRangeType } from '../../utils/reportUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import ReportsMobile from '../../modules/mobile/reports/ReportsMobile';
import ReportsDesktop from '../../modules/desktop/reports/ReportsDesktop';

const ReportsPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { sales, movements, services, clients, resellers, settings, accounts } = useData();
  
  const [range, setRange] = useState<DateRangeType>('current_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { metrics, trendData, topServices, topServicesProfit, topClients, breakdown } = useMemo(() => {
    return calculateReportData(
      sales, movements, services, clients, resellers, accounts,
      range, settings, customStart, customEnd
    );
  }, [sales, movements, services, clients, resellers, accounts, range, settings, customStart, customEnd]);

  const handleExport = () => {
     const dataToExport = breakdown.map((item) => ({
        Servicio: item.name,
        Ventas: item.salesCount,
        Ingresos: item.totalRevenue,
        Costo: item.totalCost,
        Ganancia: item.profit,
        Margen: `${item.margin.toFixed(2)}%`
     }));
     const ws = (window as any).XLSX.utils.json_to_sheet(dataToExport);
     const wb = (window as any).XLSX.utils.book_new();
     (window as any).XLSX.utils.book_append_sheet(wb, ws, "Reporte");
     (window as any).XLSX.writeFile(wb, `reporte_${range}.xlsx`);
  };

  const sharedProps = {
    metrics,
    trendData,
    topServices,
    topClients,
    topServicesProfit,
    breakdown,
    range,
    setRange,
    onExport: handleExport,
    currency: settings.currency || '$'
  };

  if (isMobile) {
    return <ReportsMobile {...sharedProps} />;
  }

  return <ReportsDesktop {...sharedProps} />;
};

export default ReportsPage;
