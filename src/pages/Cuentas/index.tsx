
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { FinancialAccount, PayableExpense, Movement, Expense } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { generateUUID } from '../../utils/uuid';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getDaysRemaining } from '../../utils/inventarioUtils';
import { calculateReportData, DateRangeType } from '../../utils/reportUtils';

// Views
import FinanceMobile from '../../modules/mobile/finance/FinanceMobile';
import FinanceDesktop from '../../modules/desktop/finance/FinanceDesktop';

// Modals
import AccountFormModal from '../../components/cuentas/AccountFormModal';
import TransactionModal from '../../components/cuentas/TransactionModal';
import MovementsModal from '../../components/cuentas/MovementsModal';
import PayableModal from '../../components/cuentas/PayableModal';
import ExpenseModal from '../../components/accounting/ExpenseModal';
import PayPayableModal from '../../components/cuentas/PayPayableModal';

const CuentasPage: React.FC = () => {
  const isMob = useIsMobile();
  const { user } = useAuth();
  const { 
    financialAccounts, addFinancialAccount, updateFinancialAccount, deleteFinancialAccount, settings,
    payableExpenses, addPayable, updatePayable, deletePayable, executeTransaction, addExpense,
    movements, getSummaryForPeriod, sales, services, clients, resellers, accounts, 
    pendingAction, setPendingAction
  } = useData();
  const { showToast } = useToast();

  const [initialFinanceTab, setInitialFinanceTab] = useState<'summary' | 'wallets' | 'movements' | 'payables'>('summary');

  // Handle Notifications Deep Links
  useEffect(() => {
    if (pendingAction?.type === 'OPEN_PAYABLE') {
      setInitialFinanceTab('payables');
      setPendingAction(null);
    }
  }, [pendingAction, setPendingAction]);

  // --- MODALS STATE ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [transactionAccount, setTransactionAccount] = useState<FinancialAccount | null>(null);
  const [transactionMode, setTransactionMode] = useState<'fund' | 'withdraw' | 'transfer'>('fund');
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<FinancialAccount | null>(null);
  
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<PayableExpense | null>(null);
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPayPayableOpen, setIsPayPayableOpen] = useState(false);
  const [payableToPay, setPayableToPay] = useState<PayableExpense | null>(null);

  const [reportRange, setReportRange] = useState<DateRangeType>('current_month');

  // --- DATA PROCESSING ---
  const walletStats = useMemo(() => {
    let totalMain = 0;
    financialAccounts.forEach(acc => {
       if (acc.isActive !== false) { 
          if (acc.currency === settings.currency) totalMain += acc.balance;
          else {
             const rate = settings.exchangeRate || 1;
             totalMain += settings.currency === 'USD' ? (acc.balance / rate) : (acc.balance * rate);
          }
       }
    });
    const secondaryTotal = settings.currency === 'USD' ? totalMain * (settings.exchangeRate || 1) : totalMain / (settings.exchangeRate || 1);
    return { totalMain, secondaryTotal };
  }, [financialAccounts, settings]);

  const summaryData = useMemo(() => getSummaryForPeriod('month'), [getSummaryForPeriod, movements]);

  const combinedPayables = useMemo(() => {
    return payableExpenses.map(exp => ({
        id: exp.id,
        type: 'manual',
        title: exp.name,
        subtitle: exp.recurrence || 'Pago único',
        amount: exp.amount,
        currency: exp.currency,
        dueDate: exp.dueDate,
        daysRemaining: getDaysRemaining(exp.dueDate),
        originalData: exp
    })).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [payableExpenses]);

  const reportData = useMemo(() => {
    return calculateReportData(sales, movements, services, clients, resellers, accounts, reportRange, settings);
  }, [sales, movements, services, clients, resellers, accounts, reportRange, settings]);

  // --- HANDLERS ---
  const handleAccountSubmit = (data: FinancialAccount) => {
    if (editingAccount) updateFinancialAccount(data);
    else addFinancialAccount(data);
    setIsFormOpen(false);
  };

  const handleConfirmPayment = (payable: PayableExpense, accountId: string, category: string, amountPaid: number) => {
      if (!user) return;
      const account = financialAccounts.find(a => a.id === accountId);
      if (!account) return;
      
      executeTransaction({
         id: generateUUID(), accountId, type: 'withdrawal', amount: amountPaid,
         currency: account.currency, exchangeRate: settings.exchangeRate,
         usdEquivalent: account.currency === 'USD' ? amountPaid : (amountPaid / settings.exchangeRate),
         date: new Date().toISOString(), description: `Pago: ${payable.name}`, paymentMethod: 'Manual'
      });

      addExpense({
         id: generateUUID(), userId: user.id, date: new Date().toISOString().split('T')[0],
         amount: amountPaid, category, description: payable.name,
         paymentMethod: 'otro', financialAccountId: accountId, createdAt: new Date().toISOString()
      });
      
      deletePayable(payable.id);
      showToast('Pago procesado correctamente', 'success');
  };

  const sharedProps = {
    financialAccounts, combinedPayables, settings, walletStats,
    incomeStats: { month: summaryData.income },
    expenseStats: { month: summaryData.expenses + summaryData.suppliesCost },
    recentMovements: movements.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50),
    chartData: [], 
    onFund: (a: FinancialAccount) => { setTransactionAccount(a); setTransactionMode('fund'); setIsTransactionOpen(true); },
    onWithdraw: (a: FinancialAccount) => { setTransactionAccount(a); setTransactionMode('withdraw'); setIsTransactionOpen(true); },
    onTransfer: (a: FinancialAccount) => { setTransactionAccount(a); setTransactionMode('transfer'); setIsTransactionOpen(true); },
    onHistory: (a: FinancialAccount) => { setHistoryAccount(a); setIsHistoryOpen(true); },
    onEditAccount: (a: FinancialAccount) => { setEditingAccount(a); setIsFormOpen(true); },
    onDeleteAccount: deleteFinancialAccount,
    onToggleStatus: (a: FinancialAccount) => updateFinancialAccount({...a, isActive: !a.isActive}),
    onPayPayable: (i: any) => { setPayableToPay(i.originalData); setIsPayPayableOpen(true); },
    onEditPayable: (i: any) => { setEditingPayable(i.originalData); setIsPayableModalOpen(true); },
    onDeletePayable: deletePayable,
    onNewAccount: () => { setEditingAccount(null); setIsFormOpen(true); },
    onNewPayable: () => { setEditingPayable(null); setIsPayableModalOpen(true); },
    onNewExpense: () => setIsExpenseModalOpen(true),
    reportData, reportRange, setReportRange, onExportReport: () => {},
    sales, movements, clients
  };

  return (
    <>
      {isMob ? <FinanceMobile {...sharedProps} initialTab={initialFinanceTab} /> : <FinanceDesktop {...sharedProps} />}

      <AccountFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleAccountSubmit} initialData={editingAccount} />
      <TransactionModal isOpen={isTransactionOpen} onClose={() => setIsTransactionOpen(false)} account={transactionAccount} mode={transactionMode} />
      <MovementsModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} account={historyAccount} />
      <PayableModal isOpen={isPayableModalOpen} onClose={() => setIsPayableModalOpen(false)} onSubmit={addPayable} initialData={editingPayable} />
      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} />
      <PayPayableModal isOpen={isPayPayableOpen} onClose={() => setIsPayPayableOpen(false)} payable={payableToPay} onConfirm={handleConfirmPayment} />
    </>
  );
};

export default CuentasPage;
