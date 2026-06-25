import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, MessageSquareText, RefreshCw, Star } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import {
  type ClassReservation,
  isSupabaseConfigured,
  supabase,
  type WorkshopReview,
} from '@/lib/supabase';

type AdminTab = 'reservations' | 'reviews';

const reservationStatusLabels: Record<ClassReservation['status'], string> = {
  pending: '대기',
  confirmed: '확정',
  cancelled: '취소',
};

const reviewStatusLabels: Record<WorkshopReview['status'], string> = {
  pending: '대기',
  approved: '게시',
  hidden: '숨김',
};

const statusClassNames = {
  pending: 'border-accent/25 bg-accent/10 text-accent',
  confirmed: 'border-primary/25 bg-primary/10 text-primary',
  cancelled: 'border-destructive/25 bg-destructive/10 text-destructive',
  approved: 'border-primary/25 bg-primary/10 text-primary',
  hidden: 'border-foreground/20 bg-foreground/5 text-foreground/55',
};

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(dateValue));
}

function formatDateTime(dateValue: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('reservations');
  const [reservations, setReservations] = useState<ClassReservation[]>([]);
  const [reviews, setReviews] = useState<WorkshopReview[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    const supabaseClient = supabase;

    const [reservationResult, reviewResult] = await Promise.all([
      supabaseClient
        .from('class_reservations')
        .select('*')
        .order('preferred_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabaseClient
        .from('workshop_reviews')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    if (reservationResult.error) {
      toast.error(reservationResult.error.message);
    } else {
      setReservations((reservationResult.data ?? []) as ClassReservation[]);
    }

    if (reviewResult.error) {
      toast.error(reviewResult.error.message);
    } else {
      setReviews((reviewResult.data ?? []) as WorkshopReview[]);
    }

    setDataLoading(false);
  }, []);

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

    void loadAdminData();
  }, [isAdmin, isAuthenticated, loadAdminData, loading, navigate]);

  const pendingReservationCount = useMemo(
    () =>
      reservations.filter((reservation) => reservation.status === 'pending')
        .length,
    [reservations]
  );

  const pendingReviewCount = useMemo(
    () => reviews.filter((review) => review.status === 'pending').length,
    [reviews]
  );

  const updateReservationStatus = async (
    reservationId: string,
    status: ClassReservation['status']
  ) => {
    if (!supabase) return;

    setUpdatingId(reservationId);

    const { error } = await supabase
      .from('class_reservations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reservationId);

    setUpdatingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setReservations((currentReservations) =>
      currentReservations.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, status } : reservation
      )
    );
    toast.success('예약 상태가 변경되었습니다.');
  };

  const updateReviewStatus = async (
    reviewId: string,
    status: WorkshopReview['status']
  ) => {
    if (!supabase) return;

    setUpdatingId(reviewId);

    const { error } = await supabase
      .from('workshop_reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reviewId);

    setUpdatingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setReviews((currentReviews) =>
      currentReviews.map((review) =>
        review.id === reviewId ? { ...review, status } : review
      )
    );
    toast.success('리뷰 상태가 변경되었습니다.');
  };

  if (loading || dataLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background pt-28">
          <div className="container py-20 text-foreground/60">
            관리자 정보를 불러오는 중입니다.
          </div>
        </main>
      </>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 md:pt-28">
        <section className="container pb-32 pt-10 md:pt-14">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
                Admin
              </p>
              <h1 className="text-3xl font-semibold text-foreground md:text-5xl">
                관리자 대시보드
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void loadAdminData()}
              className="inline-flex items-center gap-2 self-start border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground md:self-auto"
            >
              <RefreshCw className="size-4" />
              새로고침
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="border border-foreground/10 bg-card/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-foreground/55">전체 예약</p>
                <CalendarDays className="size-4 text-accent" />
              </div>
              <p className="text-4xl font-semibold text-foreground">
                {reservations.length}
              </p>
            </div>
            <div className="border border-foreground/10 bg-card/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-foreground/55">대기 예약</p>
                <CalendarDays className="size-4 text-accent" />
              </div>
              <p className="text-4xl font-semibold text-foreground">
                {pendingReservationCount}
              </p>
            </div>
            <div className="border border-foreground/10 bg-card/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-foreground/55">승인 대기 리뷰</p>
                <MessageSquareText className="size-4 text-accent" />
              </div>
              <p className="text-4xl font-semibold text-foreground">
                {pendingReviewCount}
              </p>
            </div>
          </div>

          <div className="mb-6 flex gap-2 border-b border-foreground/10">
            <button
              type="button"
              onClick={() => setActiveTab('reservations')}
              className={`border-b-2 px-4 py-3 text-sm transition-colors ${
                activeTab === 'reservations'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-foreground/50 hover:text-foreground'
              }`}
            >
              예약 관리
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`border-b-2 px-4 py-3 text-sm transition-colors ${
                activeTab === 'reviews'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-foreground/50 hover:text-foreground'
              }`}
            >
              리뷰 관리
            </button>
          </div>

          {activeTab === 'reservations' ? (
            <section className="space-y-4">
              {reservations.length === 0 ? (
                <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
                  예약 내역이 없습니다.
                </p>
              ) : (
                reservations.map((reservation) => (
                  <article
                    key={reservation.id}
                    className="border border-foreground/10 bg-card/60 p-5"
                  >
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="mb-2 text-sm text-foreground/55">
                          {formatDate(reservation.preferred_date)}
                        </p>
                        <h2 className="text-xl font-semibold text-foreground">
                          {reservation.class_name}
                        </h2>
                      </div>
                      <span
                        className={`w-fit border px-2 py-1 text-xs ${statusClassNames[reservation.status]}`}
                      >
                        {reservationStatusLabels[reservation.status]}
                      </span>
                    </div>

                    {reservation.note && (
                      <p className="mb-4 text-sm leading-relaxed text-foreground/70">
                        {reservation.note}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {(['pending', 'confirmed', 'cancelled'] as const).map(
                        (status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={
                              updatingId === reservation.id ||
                              reservation.status === status
                            }
                            onClick={() =>
                              void updateReservationStatus(
                                reservation.id,
                                status
                              )
                            }
                            className="border border-foreground/15 px-3 py-2 text-xs text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-40"
                          >
                            {reservationStatusLabels[status]}
                          </button>
                        )
                      )}
                    </div>
                  </article>
                ))
              )}
            </section>
          ) : (
            <section className="space-y-4">
              {reviews.length === 0 ? (
                <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
                  리뷰 내역이 없습니다.
                </p>
              ) : (
                reviews.map((review) => (
                  <article
                    key={review.id}
                    className="border border-foreground/10 bg-card/60 p-5"
                  >
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex items-center gap-0.5 text-accent">
                            {Array.from({ length: review.rating }, (_, index) => (
                              <Star
                                key={index}
                                className="size-4 fill-accent"
                              />
                            ))}
                          </div>
                          <span className="text-xs text-foreground/45">
                            {formatDateTime(review.created_at)}
                          </span>
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">
                          {review.title}
                        </h2>
                        <p className="mt-1 text-sm text-foreground/55">
                          {review.display_name}
                        </p>
                      </div>
                      <span
                        className={`w-fit border px-2 py-1 text-xs ${statusClassNames[review.status]}`}
                      >
                        {reviewStatusLabels[review.status]}
                      </span>
                    </div>

                    <p className="mb-4 text-sm leading-relaxed text-foreground/70">
                      {review.content}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(['pending', 'approved', 'hidden'] as const).map(
                        (status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={
                              updatingId === review.id ||
                              review.status === status
                            }
                            onClick={() =>
                              void updateReviewStatus(review.id, status)
                            }
                            className="border border-foreground/15 px-3 py-2 text-xs text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-40"
                          >
                            {reviewStatusLabels[status]}
                          </button>
                        )
                      )}
                    </div>
                  </article>
                ))
              )}
            </section>
          )}
        </section>
      </main>
    </>
  );
}
