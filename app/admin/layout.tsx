import { ReactNode } from 'react';
import { AdminProvider } from '@/lib/context/admin';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminNavbar } from '@/components/admin-navbar';
import { LogPanel } from '@/components/admin/log-panel';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <AdminNavbar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 min-h-0 overflow-y-auto md:ml-0">
            <div className="p-6">{children}</div>
          </main>
        </div>
        <LogPanel />
      </div>
    </AdminProvider>
  );
}
