import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  type ClassReservation,
  type ContactMessage,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';

export default function MyPage() {
  const [, navigate] = useLocation();
  const { user, profile, loading, signOut } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
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

    Promise.all([
      supabase
        .from('contact_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('class_reservations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])
      .then(([messagesResult, reservationsResult]) => {
        if (messagesResult.error) throw messagesResult.error;
        if (reservationsResult.error) throw reservationsResult.error;
        setMessages((messagesResult.data ?? []) as ContactMessage[]);
        setReservations((reservationsResult.data ?? []) as ClassReservation[]);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : '내역을 불러오지 못했습니다.');
      })
      .finally(() => setDataLoading(false));
  }, [loading, navigate, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || dataLoading) {
    return (
      <main className="min-h-screen bg-background pt-28">
        <div className="container py-20 text-foreground/60">불러오는 중입니다.</div>
      </main>
    );
  }

  if (!user) return null;

  const displayName =
    profile?.display_name || user.user_metadata?.name || '카카오 사용자';
  const accountLabel = user.email || `카카오 계정 ${user.id.slice(0, 8)}`;

  return (
    <main className="min-h-screen bg-background pt-24 md:pt-28">
      <section className="container py-16 md:py-24">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
              My Page
            </p>
            <h1 className="mb-4 text-3xl md:text-5xl font-semibold text-foreground">
              {displayName}님의 내역
            </h1>
            <p className="text-foreground/60">{accountLabel}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/reserve" className="btn-primary">
              클래스 예약
            </Link>
            <button type="button" onClick={handleSignOut} className="btn-outline">
              로그아웃
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <section>
            <h2 className="mb-5 text-2xl font-semibold text-foreground">
              내 문의 내역
            </h2>
            <div className="space-y-4">
              {messages.length === 0 ? (
                <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
                  아직 로그인 상태로 남긴 문의가 없습니다.
                </p>
              ) : (
                messages.map((message) => (
                  <article key={message.id} className="border border-foreground/10 p-5">
                    <p className="mb-3 text-sm text-foreground/45">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                    <p className="mb-2 text-sm text-foreground/60">{message.phone}</p>
                    <p className="leading-relaxed text-foreground">{message.message}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-5 text-2xl font-semibold text-foreground">
              클래스 예약
            </h2>
            <div className="space-y-4">
              {reservations.length === 0 ? (
                <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
                  아직 예약 내역이 없습니다.
                </p>
              ) : (
                reservations.map((reservation) => (
                  <article key={reservation.id} className="border border-foreground/10 p-5">
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
        </div>
      </section>
    </main>
  );
}
