'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from './Sidebar';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!token && pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [pathname, token, mounted, router]);

  if (!mounted) return null;

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!token) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-[#0a0514]">
        {children}
      </main>
    </div>
  );
}
