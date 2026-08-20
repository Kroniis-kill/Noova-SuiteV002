
import { create } from 'zustand';
import { ViewState, Sale } from '../types';

interface UIState {
  isSidebarOpen: boolean;
  currentView: ViewState;
  viewHistory: ViewState[];
  searchQuery: string;
  filterStatus: string;
  
  // Balance Visibility Persistence
  showBalance: boolean;
  setShowBalance: (show: boolean) => void;
  
  // Bottom Nav Visibility
  isBottomNavVisible: boolean;
  
  // Dashboard Mode
  dashboardMode: 'lite' | 'pro';
  
  // Modals
  activeModal: string | null; 

  // Active Sync State
  isSyncing: boolean;
  syncError: string | null;
  setSyncing: (val: boolean) => void;
  setSyncError: (error: string | null) => void;
  
  // Sales Editing State for Page View
  editingSale: Sale | null;
  setEditingSale: (sale: Sale | null) => void;

  // Navigation Override
  backAction: (() => void) | null;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setView: (view: ViewState) => void;
  goBack: () => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: string) => void;
  setActiveModal: (modal: string | null) => void;
  setBackAction: (callback: (() => void) | null) => void;
  setDashboardMode: (mode: 'lite' | 'pro') => void;
  setBottomNavVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  currentView: 'dashboard',
  viewHistory: [],
  searchQuery: '',
  filterStatus: 'all',
  isBottomNavVisible: true,
  activeModal: null,
  backAction: null,
  dashboardMode: 'lite',
  editingSale: null,
  
  // Sync Actions
  isSyncing: false,
  syncError: null,
  setSyncing: (isSyncing) => set({ isSyncing }),
  setSyncError: (syncError) => set({ syncError, isSyncing: false }),
  
  // Initialize from localStorage (default to true)
  showBalance: localStorage.getItem('noova_show_balance') !== 'false',

  setShowBalance: (show: boolean) => set(() => {
    localStorage.setItem('noova_show_balance', String(show));
    return { showBalance: show };
  }),

  setEditingSale: (sale) => set({ editingSale: sale }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  setView: (view) => set((state) => {
    if (state.currentView === view) return state;
    
    if (view === 'dashboard') {
        return { 
            currentView: view, 
            viewHistory: [],
            backAction: null, 
            isBottomNavVisible: true 
        };
    }

    return { 
      currentView: view, 
      viewHistory: [...state.viewHistory, state.currentView],
      backAction: null, 
      isBottomNavVisible: view !== 'settings' 
    };
  }),

  goBack: () => set((state) => {
    if (state.viewHistory.length === 0) {
        return { currentView: 'dashboard' };
    }
    
    const newHistory = [...state.viewHistory];
    const prevView = newHistory.pop() || 'dashboard';
    
    return {
      currentView: prevView,
      viewHistory: newHistory,
      isBottomNavVisible: prevView !== 'settings'
    };
  }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setBackAction: (callback) => set({ backAction: callback }),
  setDashboardMode: (mode) => set({ dashboardMode: mode }),
  setBottomNavVisible: (visible) => set({ isBottomNavVisible: visible }),
}));
