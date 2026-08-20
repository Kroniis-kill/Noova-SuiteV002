
import { useData } from '../context/DataContext';
import { DashboardWidgets } from '../types';

const DEFAULT_WIDGETS: DashboardWidgets = {
  showProfit: true,
  showSales: true,
  showClients: true,
  showInventory: true,
  showExchangeRate: true,
  showQuickActions: true,
  quickActions: ['sale', 'expense', 'stock', 'services'] 
};

export const useDashboardWidgets = () => {
  const { settings, updateSettings } = useData();

  // Use settings from Context (DB), fallback to default if missing
  const widgets: DashboardWidgets = settings.dashboardWidgets 
    ? { ...DEFAULT_WIDGETS, ...settings.dashboardWidgets } 
    : DEFAULT_WIDGETS;

  const toggleWidget = (key: keyof DashboardWidgets) => {
    // Optimistic update handled via react-query cache update in updateSettings
    const newWidgets = { ...widgets, [key]: !widgets[key] };
    updateSettings({ ...settings, dashboardWidgets: newWidgets });
  };

  const toggleQuickAction = (actionId: string) => {
    const currentActions = widgets.quickActions || [];
    let newActions;
    
    if (currentActions.includes(actionId)) {
       newActions = currentActions.filter(id => id !== actionId);
    } else {
       newActions = [...currentActions, actionId];
    }
    
    const newWidgets = { ...widgets, quickActions: newActions };
    updateSettings({ ...settings, dashboardWidgets: newWidgets });
  };

  return { widgets, toggleWidget, toggleQuickAction };
};
