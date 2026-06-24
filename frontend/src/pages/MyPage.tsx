import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import {
  type ClassReservation,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const statusLabels: Record<ClassReservation['status'], string> = {
  pending: '대기',
  confirmed: '확정',
  cancelled: '취소',
};

const statusClassNames: Record<ClassReservation['status'], string> = {
  pending: 'border-accent/25 bg-accent/10 text-accent',
  confirmed: 'border-primary/25 bg-primary/10 text-primary',
  cancelled: 'border-destructive/25 bg-destructive/10 text-destructive',
};

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseReservationDate(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatDisplayDate(dateKey: string) {
  const date = parseReservationDate(dateKey);

  if (!date) return dateKey;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

function createCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);
  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  for (let index = firstDate.getDay(); index > 0; index -= 1) {
    days.push({
      date: new Date(year, month, 1 - index),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= lastDate.getDate(); day += 1) {
    days.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  const remainingDays = (7 - (days.length % 7)) % 7;

  for (let day = 1; day <= remainingDays; day += 1) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return days;
}

function groupReservationsByDate(reservations: ClassReservation[]) {
  return reservations.reduce<Record<string, ClassReservation[]>>(
    (groups, reservation) => {
      const dateKey = reservation.preferred_date;
      groups[dateKey] = [...(groups[dateKey] ?? []), reservation];

      return groups;
    },
    {}
  );
}

function getInitialCalendarMonth(reservations: ClassReservation[]) {
  const upcomingReservation = reservations.find((reservation) => {
    const reservationDate = parseReservationDate(reservation.preferred_date);

    return reservationDate
      ? getLocalDateKey(reservationDate) >= getLocalDateKey(new Date())
      : false;
  });

  const firstReservation = upcomingReservation ?? reservations[0];
  const firstReservationDate = firstReservation
    ? parseReservationDate(firstReservation.preferred_date)
    : null;

  return firstReservationDate ?? new Date();
}

export default function MyPage() {
  const [, navigate] = useLocation();
  const { user, profile, loading, signOut } = useAuth();
  const [reservations, setReservations] = useState<ClassReservation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(getLocalDateKey(new Date()));

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
          .order('preferred_date', { ascending: true })
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

  useEffect(() => {
    if (reservations.length === 0) return;

    const initialMonth = getInitialCalendarMonth(reservations);
    const initialDateKey = getLocalDateKey(initialMonth);

    setCalendarMonth(initialMonth);
    setSelectedDateKey(initialDateKey);
  }, [reservations]);

  const calendarDays = useMemo(
    () => createCalendarDays(calendarMonth),
    [calendarMonth]
  );

  const reservationsByDate = useMemo(
    () => groupReservationsByDate(reservations),
    [reservations]
  );

  const selectedReservations = reservationsByDate[selectedDateKey] ?? [];

  const moveCalendarMonth = (amount: number) => {
    setCalendarMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1)
    );
  };

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
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  클래스 예약 내역
                </h2>
                <p className="mt-2 text-sm text-foreground/55">
                  예약된 날짜를 달력에서 한눈에 확인할 수 있습니다.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/55">
                <CalendarDays className="size-4 text-accent" />
                총 {reservations.length}건
              </div>
            </div>

            {reservations.length === 0 ? (
              <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
                아직 예약 내역이 없습니다.
              </p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="border border-foreground/10 bg-card/60">
                  <div className="flex items-center justify-between border-b border-foreground/10 p-4">
                    <button
                      type="button"
                      onClick={() => moveCalendarMonth(-1)}
                      className="inline-flex size-10 items-center justify-center border border-foreground/10 text-foreground transition-colors hover:bg-foreground/5"
                      aria-label="이전 달"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <h3 className="text-xl font-semibold text-foreground md:text-2xl">
                      {formatMonthLabel(calendarMonth)}
                    </h3>
                    <button
                      type="button"
                      onClick={() => moveCalendarMonth(1)}
                      className="inline-flex size-10 items-center justify-center border border-foreground/10 text-foreground transition-colors hover:bg-foreground/5"
                      aria-label="다음 달"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 border-b border-foreground/10 bg-secondary/30">
                    {WEEKDAYS.map((weekday) => (
                      <div
                        key={weekday}
                        className="px-2 py-3 text-center text-xs font-medium text-foreground/60"
                      >
                        {weekday}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {calendarDays.map(({ date, isCurrentMonth }) => {
                      const dateKey = getLocalDateKey(date);
                      const dayReservations = reservationsByDate[dateKey] ?? [];
                      const isSelected = selectedDateKey === dateKey;
                      const isToday = dateKey === getLocalDateKey(new Date());

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => setSelectedDateKey(dateKey)}
                          className={[
                            'min-h-28 border-b border-r border-foreground/10 p-2 text-left transition-colors last:border-r-0 md:min-h-32',
                            isCurrentMonth
                              ? 'bg-background hover:bg-secondary/30'
                              : 'bg-muted/20 text-foreground/35 hover:bg-muted/30',
                            isSelected ? 'ring-2 ring-inset ring-primary' : '',
                          ].join(' ')}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span
                              className={[
                                'flex size-7 items-center justify-center text-sm',
                                isToday
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-foreground/70',
                              ].join(' ')}
                            >
                              {date.getDate()}
                            </span>
                            {dayReservations.length > 0 && (
                              <span className="text-xs text-accent">
                                {dayReservations.length}건
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            {dayReservations.slice(0, 2).map((reservation) => (
                              <div
                                key={reservation.id}
                                className={`truncate border px-2 py-1 text-xs ${statusClassNames[reservation.status]}`}
                                title={reservation.class_name}
                              >
                                {reservation.class_name}
                              </div>
                            ))}
                            {dayReservations.length > 2 && (
                              <div className="text-xs text-foreground/45">
                                +{dayReservations.length - 2}개 더보기
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <aside className="border border-foreground/10 bg-card/60 p-5">
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-accent">
                    Selected Date
                  </p>
                  <h3 className="mb-5 text-xl font-semibold text-foreground">
                    {formatDisplayDate(selectedDateKey)}
                  </h3>

                  {selectedReservations.length === 0 ? (
                    <p className="text-sm text-foreground/55">
                      선택한 날짜에는 예약이 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {selectedReservations.map((reservation) => (
                        <article
                          key={reservation.id}
                          className="border border-foreground/10 p-4"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <h4 className="text-base font-semibold text-foreground">
                              {reservation.class_name}
                            </h4>
                            <span
                              className={`shrink-0 border px-2 py-1 text-xs ${statusClassNames[reservation.status]}`}
                            >
                              {statusLabels[reservation.status]}
                            </span>
                          </div>
                          {reservation.note && (
                            <p className="text-sm leading-relaxed text-foreground/70">
                              {reservation.note}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </aside>
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}
