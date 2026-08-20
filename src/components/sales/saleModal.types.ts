import { Sale, ScreenProfile, ServiceType, Service, Account } from '../../types';

export interface CartItem {
  tempId: string;
  serviceId: string;
  serviceName: string;
  accountId: string;
  accountEmail: string;
  saleType: ServiceType;
  startDate: string;
  months: number;
  days: number;
  screens: number;
  amount: number;
  profiles: ScreenProfile[];
  invitedEmail?: string;
  invitedPassword?: string;
}

export interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Sale | null;
  zIndex?: number;
}

export interface ItemConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
  tempServiceId: string;
  services: Service[];
  tempAccountId: string;
  accounts: Account[];
  tempStartDate: string;
  tempMonths: number;
  tempDays: number;
  tempScreens: number;
  tempAmount: string;
  tempType: ServiceType;
  tempProfiles: ScreenProfile[];
  tempInvitedEmail: string;
  tempInvitedPassword: string;
  setTempInvitedEmail: (val: string) => void;
  setTempInvitedPassword: (val: string) => void;
  isResellerClient: boolean;
  setTempStartDate: (val: string) => void;
  setTempMonths: (val: number) => void;
  setTempDays: (val: number) => void;
  setTempScreens: (val: number) => void;
  setTempAmount: (val: string) => void;
  handleProfileChange: (idx: number, field: keyof ScreenProfile, value: string) => void;
  handleAddItem: () => void;
  openServiceSearch: () => void;
  openAccountSearch: () => void;
  onAutoAssign: () => void;
  isEditing?: boolean;
}
