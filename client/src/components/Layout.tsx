import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { LayoutDashboard, LogOut, Settings, ShieldAlert, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LayoutProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export function Layout({ children, isAdmin = false }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = isAdmin ? [
    { icon: ShieldAlert, label: 'Admin Overview', href: '/admin' },
    { icon: Settings, label: 'System Settings', href: '/admin/settings' },
  ] : [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: LineChart, label: 'My Analysis', href: '/dashboard/history' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/">
            <h1 className="text-2xl font-bold tracking-tighter cursor-pointer flex items-center gap-2">
              <span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-mono text-lg">F</span>
              FOREX<span className="text-primary">AI</span>
            </h1>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-3 ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-muted-foreground'}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name || 'Guest User'}</p>
              <p className="text-xs text-muted-foreground truncate">{isAdmin ? 'Administrator' : 'Pro Plan'}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground border-dashed"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header (visible only on small screens) */}
        <header className="md:hidden h-16 border-b border-border flex items-center justify-between px-4 bg-sidebar">
           <Link href="/">
            <span className="font-bold">FOREX<span className="text-primary">AI</span></span>
           </Link>
           <Button variant="ghost" size="icon">
             <Settings className="w-5 h-5" />
           </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}