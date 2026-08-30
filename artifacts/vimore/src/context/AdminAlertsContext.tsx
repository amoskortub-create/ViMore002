'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AdminAlertsContextType {
  pendingPayments: number;
  pendingWithdrawals: number;
  openTickets: number;
  totalAdminAlerts: number;
  economyAlerts: number;
  incrementPendingPayments: () => void;
  incrementPendingWithdrawals: () => void;
  incrementOpenTickets: () => void;
  resetPaymentsBadge: () => void;
  resetWithdrawalsBadge: () => void;
  resetTicketsBadge: () => void;
  resetEconomyBadge: () => void;
}

const AdminAlertsContext = createContext<AdminAlertsContextType | undefined>(undefined);

export function AdminAlertsProvider({ children }: { children: ReactNode }) {
  const [pendingPayments, setPendingPayments] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  const incrementPendingPayments   = useCallback(() => setPendingPayments(p => p + 1), []);
  const incrementPendingWithdrawals = useCallback(() => setPendingWithdrawals(p => p + 1), []);
  const incrementOpenTickets       = useCallback(() => setOpenTickets(p => p + 1), []);

  const resetPaymentsBadge    = useCallback(() => setPendingPayments(0), []);
  const resetWithdrawalsBadge = useCallback(() => setPendingWithdrawals(0), []);
  const resetTicketsBadge     = useCallback(() => setOpenTickets(0), []);
  const resetEconomyBadge     = useCallback(() => { setPendingPayments(0); setPendingWithdrawals(0); }, []);

  const economyAlerts   = pendingPayments + pendingWithdrawals;
  const totalAdminAlerts = economyAlerts + openTickets;

  return (
    <AdminAlertsContext.Provider value={{
      pendingPayments,
      pendingWithdrawals,
      openTickets,
      totalAdminAlerts,
      economyAlerts,
      incrementPendingPayments,
      incrementPendingWithdrawals,
      incrementOpenTickets,
      resetPaymentsBadge,
      resetWithdrawalsBadge,
      resetTicketsBadge,
      resetEconomyBadge,
    }}>
      {children}
    </AdminAlertsContext.Provider>
  );
}

export function useAdminAlerts() {
  const ctx = useContext(AdminAlertsContext);
  if (!ctx) throw new Error('useAdminAlerts must be used within AdminAlertsProvider');
  return ctx;
}
