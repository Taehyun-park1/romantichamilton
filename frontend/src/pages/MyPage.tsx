import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import {
  type ClassReservation,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';

export default function MyPage() {
  const [, navigate] = useLocation();
  const { user, profile, loading, signOut } = useAuth();
  const [reservations, setReservations] = useState<ClassReservation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setDataLoading(false);
      return;
    }

    const supabaseClient = supabase;

    const loadReservations = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('class_reservations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReservations((data ?? []) as ClassReservation[]);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : '예약 내역을 불러오지 못했습니다.'
        );
      } finally {
        setDataLoading(false);
      }
    };

    void loadReservations();
  }, [loading, navigate, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || dataLoading) {
    return (
      <main className="min-h-screen bg-background pt-28">
        <div className="container py-20 text-foreground/60">
          불러오는 중입니다.
        </div>
      </main>
    );
  }

  if (!user) return null;

  const displayName =
    profile?.display_name || user.user_metadata?.name || '소셜 로그인 사용자';
  const providerLabel =
    profile?.provider === 'naver'
      ? '네이버'
      : profile?.provider === 'kakao'
        ? '카카오'
        : '이메일';
  const accountLabel =
    profile?.email || `${providerLabel} 계정 ${user.id.slice(0, 8)}`;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 md:pt-28">
        <section className="container py-16 md:py-24">
          <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
                My Page
              </p>
              <h1 className="mb-4 text-3xl font-semibold text-foreground md:text-5xl">
                {displayName}님의 예약
              </h1>
              <p className="text-foreground/60">{accountLabel}</p>
            </div>
            <div className="flex gap-3">
              <Link href="/reserve" className="btn-primary">
                클래스 예약
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="btn-outline"
              >
                로그아웃
              </button>
            </div>
          </div>

          <section>
            <h2 className="mb-5 text-2xl font-semibold text-foreground">
              클래스 예약 내역
            </h2>
            <div className="space-y-4">
              {reservations.length === 0 ? (
                <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
                  아직 예약 내역이 없습니다.
                </p>
              ) : (
                reservations.map((reservation) => (
                  <article
                    key={reservation.id}
                    className="border border-foreground/10 p-5"
                  >
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        {reservation.class_name}
                      </h3>
                      <span className="text-xs uppercase tracking-[0.12em] text-accent">
                        {reservation.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/60">
                      희망일: {reservation.preferred_date}
                    </p>
                    {reservation.note && (
                      <p className="mt-3 leading-relaxed text-foreground/70">
                        {reservation.note}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
