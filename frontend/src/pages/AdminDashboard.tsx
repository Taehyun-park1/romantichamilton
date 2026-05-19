import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const [counts, setCounts] = useState({
    messages: 0,
    reservations: 0,
  });

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (!isAdmin) {
      navigate('/404');
      return;
    }

    if (!supabase) return;

    Promise.all([
      supabase.from('contact_messages').select('id', { count: 'exact', head: true }),
      supabase.from('class_reservations').select('id', { count: 'exact', head: true }),
    ]).then(([messages, reservations]) => {
      setCounts({
        messages: messages.count ?? 0,
        reservations: reservations.count ?? 0,
      });
    });
  }, [isAdmin, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background pt-28">
        <div className="container py-20 text-foreground/60">권한을 확인하는 중입니다.</div>
      </main>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <main className="min-h-screen bg-background pt-24 md:pt-28">
      <section className="container py-16 md:py-24">
        <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
          Admin
        </p>
        <h1 className="mb-10 text-3xl md:text-5xl font-semibold text-foreground">
          관리자 대시보드
        </h1>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="border border-foreground/10 p-6">
            <p className="mb-3 text-sm text-foreground/50">문의 수</p>
            <p className="text-4xl font-semibold text-foreground">{counts.messages}</p>
          </div>
          <div className="border border-foreground/10 p-6">
            <p className="mb-3 text-sm text-foreground/50">예약 수</p>
            <p className="text-4xl font-semibold text-foreground">{counts.reservations}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
