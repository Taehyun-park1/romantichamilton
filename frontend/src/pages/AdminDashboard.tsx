import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const [reservationCount, setReservationCount] = useState(0);

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

    supabase
      .from('class_reservations')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setReservationCount(count ?? 0));
  }, [isAdmin, isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background pt-28">
        <div className="container py-20 text-foreground/60">
          권한을 확인하는 중입니다.
        </div>
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
        <h1 className="mb-10 text-3xl font-semibold text-foreground md:text-5xl">
          관리자 대시보드
        </h1>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="border border-foreground/10 p-6">
            <p className="mb-3 text-sm text-foreground/50">전체 예약 수</p>
            <p className="text-4xl font-semibold text-foreground">
              {reservationCount}
            </p>
          </div>
          <div className="border border-foreground/10 p-6">
            <p className="mb-3 text-sm text-foreground/50">문의 접수</p>
            <p className="text-lg font-semibold text-foreground">
              관리자 이메일로 직접 전달
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
