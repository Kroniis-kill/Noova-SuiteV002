import React from 'react';
import ReportsMobile from '../../mobile/reports/ReportsMobile';
import { DateRangeType, ReportMetrics, ChartDataPoint, TopItem, ServiceBreakdown } from '../../../utils/reportUtils';

interface ReportsDesktopProps {
  metrics: ReportMetrics;
  trendData: ChartDataPoint[];
  topServices: TopItem[];
  topClients: TopItem[];
  topServicesProfit: TopItem[];
  breakdown: ServiceBreakdown[];
  range: DateRangeType;
  setRange: (r: DateRangeType) => void;
  onExport: () => void;
  currency: string;
}

const ReportsDesktop: React.FC<ReportsDesktopProps> = (props) => {
  return (
    <div className="animate-fade-in">
        <ReportsMobile {...props} />
    </div>
  );
};

export default ReportsDesktop;