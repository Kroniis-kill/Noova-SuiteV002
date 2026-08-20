
// Fix: Added ViewState type definition
export type ViewState = 'dashboard' | 'inventory' | 'sales' | 'contacts' | 'resellers' | 'providers' | 'expired' | 'accounts' | 'reports' | 'services' | 'settings' | 'admin' | 'admin_history' | 'admin_analytics' | 'my_plan' | 'expired_plan' | 'agenda' | 'trash' | 'refund';

// Fix: Added ServiceType type definition
export type ServiceType = 'por_pantalla' | 'cuenta_completa' | 'usuario_unico';

// Fix: Added ScreenProfile interface
export interface ScreenProfile {
  name: string;
  pin: string;
}

// Nueva interfaz para Agenda de Fallas
export interface ServiceFailure {
  id: string;
  userId: string;
  saleId: string;
  notes: string;
  createdAt: string;
}

// Fix: Added missing properties to Account interface
export interface Account {
  id: string;
  serviceId: string;
  email: string;
  password: string;
  country?: string;
  startDate: string;
  endDate: string;
  status: 'activa' | 'vencida' | 'por_vencer' | 'inactiva' | 'vendida' | 'alquilada' | 'fallando' | 'trash';
  notes?: string;
  maxScreens: number;
  usedScreens?: number;
  profiles?: ScreenProfile[];
  plan?: string;
  account_type: ServiceType;
  providerId?: string;
  autoRenewal?: boolean;
  failure_started_at?: string; // Nuevo campo para congelamiento
  health_status?: 'good' | 'at_risk' | 'down';
  is_down?: boolean;
  down_at?: string;
  down_reason?: string;
}

// Fix: Added Service interface with image_url
export interface Service {
  id: string;
  name: string;
  cost: number;
  screens: number;
  type: ServiceType;
  investmentPrice: number;
  publicPrice: number;
  resellerPrice: number;
  image_url?: string;
}

// Fix: Added ClientTag type definition
export type ClientTag = 'Nuevo' | 'Frecuente' | 'VIP' | 'Problemático';

// Fix: Added Client interface
export interface Client {
  id: string;
  name: string;
  phone?: string; // Opcional
  telegram?: string;
  registrationDate: string;
  activeServices: number;
  notes?: string;
  resellerId?: string;
  tags?: ClientTag[];
  isBlocked?: boolean;
  portalAlias?: string;
  portalPin?: string;
  originalName?: string;
  originalPhone?: string;
  slug?: string;
  portalToken?: string;
  loyalty_points?: number;
  portal_pin_hash?: string;
}

// Fix: Added Sale interface
export interface Sale {
  id: string;
  clientId: string;
  accountId: string;
  serviceName: string;
  saleType: ServiceType;
  amount: number;
  date: string;
  expiryDate: string;
  screensCount?: number;
  assignedProfiles?: ScreenProfile[];
  exchangeRate: number;
  isPartial?: boolean;
  initialPayment?: number;
  invitedEmail?: string;
  invitedPassword?: string;
  resellerId?: string;
  notes?: string;
  investment_cost?: number;
}

// Fix: Added PaymentMethod interface
export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
}

// Fix: Added FinancialAccount interface
export interface FinancialAccount {
  id: string;
  name: string;
  currency: string;
  balance: number;
  paymentMethods: PaymentMethod[];
  isActive?: boolean;
}

// Fix: Added MovementType and Movement interface
export type MovementType = 'funding' | 'withdrawal' | 'transfer_in' | 'transfer_out';

export interface Movement {
  id: string;
  accountId: string;
  relatedAccountId?: string;
  type: MovementType;
  amount: number;
  currency: string;
  exchangeRate: number;
  usdEquivalent: number;
  date: string;
  description: string;
  paymentMethod: string;
  reconciled?: boolean;
  reconciled_at?: string;
  reconciled_by?: string;
  verified?: boolean;
}

// Fix: Added Reseller interface
export interface Reseller {
  id: string;
  name: string;
  code: string;
  whatsapp: string;
  telegram?: string;
  color: string;
  registrationDate: string;
}

// Fix: Added Provider interface
export interface Provider {
  id: string;
  name: string;
  whatsapp: string;
  telegram?: string;
  color: string;
  registrationDate: string;
  qualityScore?: number;
}

// Fix: Added MessageTemplates with index signature to allow string indexing
export interface MessageTemplates {
  newSaleGlobal: string;
  newSaleScreen: string;
  newSaleUnique: string;
  newSaleFull: string;
  warning2Days: string;
  warning1Day: string;
  expiration: string;
  renewal: string;
  passwordChange: string;
  replacement: string;
  failureReport: string;
  failureSolved?: string;
  warrantyExtension?: string;
  [key: string]: string | undefined;
}

export interface AppSettings {
  currency: string;
  subCurrency: string;
  exchangeRate: number;
  messageTemplates: MessageTemplates;
  telegramMessageTemplates?: MessageTemplates;
  salesPreferences: {
    defaultMode: string;
    defaultDuration: number;
    warningDays: number;
    autoPin: boolean;
  };
  analyticsPreferences: {
    dailyGoal: number;
    monthlyGoal: number;
    includeSuppliesAsCost: boolean;
    lowProfitWarning: number;
    accountingStartDate?: string;
  };
  notificationPreferences: {
    expiry: boolean;
    stock: boolean;
    payments: boolean;
    system: boolean;
  };
  digestSettings: {
    enabled: boolean;
    interval_hours: number;
    max_per_day: number;
    include_today: boolean;
    include_1d: boolean;
    include_3d: boolean;
    include_overdue: boolean;
    include_accounts_risk: boolean;
  };
  businessInfo: {
    name: string;
    whatsapp: string;
    logo: string;
    website?: string;
  };
  useBusinessLogo: boolean;
  dashboardWidgets: DashboardWidgets;
  theme: 'dark' | 'light' | 'system';
  backupPreferences?: {
    lastBackup?: string;
    autoBackup?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
    driveEnabled?: boolean;
  };
}

// Fix: Added DashboardWidgets interface
export interface DashboardWidgets {
  showProfit: boolean;
  showSales: boolean;
  showClients: boolean;
  showInventory: boolean;
  showExchangeRate: boolean;
  showQuickActions: boolean;
  quickActions?: string[];
  onboardingDismissed?: boolean;
}

// Fix: Added PayableExpense interface
export interface PayableExpense {
  id: string;
  name: string;
  amount: number;
  currency: string;
  dueDate: string;
  recurrence?: string;
}

// Fix: Added ExpenseCategoryName and Expense interface
export type ExpenseCategoryName = 'operativo' | 'personal' | 'servicio' | 'impuesto' | 'otro' | string;

export interface Expense {
  id: string;
  userId: string;
  date: string;
  amount: number;
  exchangeRate?: number;
  category: ExpenseCategoryName;
  categoryId?: string;
  description: string;
  paymentMethod: 'efectivo' | 'transferencia' | 'binance' | 'zelle' | 'tarjeta' | 'otro';
  financialAccountId?: string;
  createdAt: string;
}

// Fix: Added SupplyPurchase interface
export interface SupplyPurchase {
  id: string;
  userId: string;
  providerName: string;
  itemType: 'pin' | 'other';
  label: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  exchangeRate: number;
  date: string;
  paymentMethod: 'efectivo' | 'transferencia' | 'binance' | 'zelle' | 'tarjeta' | 'otro';
  financialAccountId?: string;
  createdAt: string;
}

// Fix: Added FinancialSummary interface
export interface FinancialSummary {
  period: string;
  from: string;
  to: string;
  income: number;
  expenses: number;
  suppliesCost: number;
  fixedCosts: number;
  netProfit: number;
}

// Fix: Added LogAction, LogEntity and ActivityLog types
export type LogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
export type LogEntity = 'SALE' | 'CLIENT' | 'INVENTORY' | 'ACCOUNT' | 'FINANCE' | 'SERVICE' | 'EXPENSE' | 'SUPPLY' | 'PROVIDER' | 'RESELLER' | 'PAYABLE' | 'CATEGORY' | 'MOVEMENT';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: LogAction;
  entity: LogEntity;
  details: string;
  timestamp: string;
}

// Fix: Added AppNotification and PendingAction types
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'expiry' | 'stock' | 'payment' | 'system';
  priority: 'high' | 'medium' | 'low';
  date: string;
  read: boolean;
  linkTo?: ViewState;
  metadata?: any;
  actionId?: string;
}

export type PendingActionType = 'OPEN_RENEWAL' | 'OPEN_ACCOUNT_DETAIL' | 'OPEN_PAYABLE' | 'OPEN_SERVICE_ACCOUNTS';

export interface PendingAction {
  type: PendingActionType;
  targetId: string;
}

// Fix: Added ProfileHistoryEntry, ExpenseCategory, UserData and User types
export interface ProfileHistoryEntry {
  id: string;
  userId: string;
  accountId: string;
  profileName: string;
  clientName: string;
  pin: string;
  actionType: 'ASSIGNED' | 'RELEASED' | 'MODIFIED';
  createdAt: string;
  notes?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
}

export interface UserData {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  plan: string;
  client_limit: number;
  created_at: string;
  updated_at?: string;
  plan_expiry?: string;
  is_active?: boolean;
  auto_renewal?: boolean;
  status?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  plan: string;
  userData?: UserData;
}
