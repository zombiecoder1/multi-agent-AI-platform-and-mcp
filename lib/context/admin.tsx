'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LogEntry } from '@/lib/types/api';

export interface AdminContextType {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  isLogsVisible: boolean;
  setIsLogsVisible: (visible: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3001');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLogsVisible, setIsLogsVisible] = useState(false);

  const addLog = (log: LogEntry) => {
    setLogs(prev => [log, ...prev].slice(0, 1000));
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <AdminContext.Provider
      value={{
        apiUrl,
        setApiUrl,
        logs,
        addLog,
        clearLogs,
        isLogsVisible,
        setIsLogsVisible,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
