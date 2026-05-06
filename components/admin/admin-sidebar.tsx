'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Database, Settings, Menu, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navigationItems = [
  {
    category: 'Core',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Sessions', href: '/admin/sessions', icon: Database },
      { label: 'Agents', href: '/admin/agents', icon: Users },
      { label: 'Models', href: '/admin/models', icon: Database },
    ],
  },
  {
    category: 'System',
    items: [{ label: 'Settings', href: '/admin/settings', icon: Settings }],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      <div className="fixed top-4 left-4 z-40 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 w-10"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <aside
        className={`fixed left-0 top-0 z-30 h-screen w-64 border-r border-border bg-background transition-transform duration-200 md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {navigationItems.map(section => (
            <div key={section.category}>
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">v0.1.0</p>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
