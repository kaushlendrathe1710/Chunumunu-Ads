import logo from '@client/public/logo.svg';
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Upload, Menu } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleDarkMode = () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', newIsDarkMode);
      localStorage.setItem('darkMode', newIsDarkMode.toString());
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="z-20 border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left section - Sidebar trigger & avatar */}
        <div className="flex items-center gap-3">
          <SidebarTrigger />
        </div>
        {/* Right section - User info & actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar ?? undefined} alt={user?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center p-2">
                  <Avatar className="mr-2 h-8 w-8">
                    <AvatarImage src={user?.avatar ?? undefined} alt={user?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.username}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <i className="ri-logout-box-line mr-2"></i> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/auth"
              className="flex items-center rounded-full border border-primary px-4 py-1.5 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
            >
              <i className="ri-user-line mr-2"></i>
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
