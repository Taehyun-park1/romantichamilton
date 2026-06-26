import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import {
  type ClassReservation,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';
import { isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const classOptions = [
  'Card Wallet Class',
  'Couple Leather Class',
  'Custom Order Session',
];

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

function parseLocalDate(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);

  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatDisplayDate(dateKey: string) {
  const date = parseLocalDate(dateKey);

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

function getNearestReservations(
  reservations: ClassReservation[],
  todayKey: string
) {
  const todayDate = parseLocalDate(todayKey);
  const todayTime = todayDate?.getTime() ?? Date.now();

  return [...reservations]
    .sort((left, right) => {
      const leftDate = parseLocalDate(left.preferred_date);
      const rightDate = parseLocalDate(right.preferred_date);
      const leftDiff = leftDate
        ? Math.abs(leftDate.getTime() - todayTime)
        : Number.POSITIVE_INFINITY;
      const rightDiff = rightDate
        ? Math.abs(rightDate.getTime() - todayTime)
        : Number.POSITIVE_INFINITY;

      if (leftDiff !== rightDiff) return leftDiff - rightDiff;

      return left.preferred_date.localeCompare(right.preferred_date);
    })
    .slice(0, 4);
}

function getInitialCalendarMonth(reservations: ClassReservation[]) {
  const upcomingReservation = reservations.find((reservation) => {
    const reservationDate = parseLocalDate(reservation.preferred_date);

    return reservationDate
      ? getLocalDateKey(reservationDate) >= getLocalDateKey(new Date())
      : false;
  });

  return upcomingReservation
    ? parseLocalDate(upcomingReservation.preferred_date) ?? new Date()
    : new Date();
}

function ReservationNoteDisclosure({
  note,
  expanded,
  onToggle,
  className,
}: {
  note: string;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement) return;

    const measureOverflow = () => {
      const previousWhiteSpace = textElement.style.whiteSpace;
      const previousOverflow = textElement.style.overflow;
      const previousTextOverflow = textElement.style.textOverflow;

      textElement.style.whiteSpace = 'nowrap';
      textElement.style.overflow = 'hidden';
      textElement.style.textOverflow = 'ellipsis';
      setCanExpand(textElement.scrollWidth > textElement.clientWidth + 1);

      textElement.style.whiteSpace = previousWhiteSpace;
      textElement.style.overflow = previousOverflow;
      textElement.style.textOverflow = previousTextOverflow;
    };

    measureOverflow();

    const resizeObserver = new ResizeObserver(measureOverflow);
    resizeObserver.observe(textElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [note]);

  return (
    <div className={`flex items-start gap-2 ${className ?? ''}`}>
      <p
        ref={textRef}
        className={`min-w-0 flex-1 text-sm text-foreground/70 ${
          expanded ? 'leading-relaxed' : 'truncate'
        }`}
      >
        {note}
      </p>
      {canExpand && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className="grid size-7 shrink-0 place-items-center text-foreground/55 transition-colors hover:bg-foreground/5 hover:text-foreground"
          aria-label={expanded ? '요청사항 접기' : '요청사항 펼치기'}
        >
          <ChevronDown
            className={`size-4 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}
    </div>
  );
}

export default function ReservationPage() {
  const [, navigate] = useLocation();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [reservations, setReservations] = useState<ClassReservation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isReservationCardOpen, setIsReservationCardOpen] = useState(false);
  const [reviewReservation, setReviewReservation] =
    useState<ClassReservation | null>(null);
  const [reservationClassName, setReservationClassName] = useState(
    classOptions[0]
  );
  const [reservationDate, setReservationDate] = useState(() =>
    getLocalDateKey(new Date())
  );
  const [reservationPhone, setReservationPhone] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [reservationNote, setReservationNote] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [expandedReservationIds, setExpandedReservationIds] = useState<
    string[]
  >([]);

  const loadReservations = useCallback(async () => {
    if (!user || !supabase || !isSupabaseConfigured) {
      setDataLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
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
  }, [user]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    void loadReservations();
  }, [loadReservations, loading, navigate, user]);

  useEffect(() => {
    if (reservations.length === 0) return;

    setCalendarMonth(getInitialCalendarMonth(reservations));
  }, [reservations]);

  const calendarDays = useMemo(
    () => createCalendarDays(calendarMonth),
    [calendarMonth]
  );

  const reservationsByDate = useMemo(
    () => groupReservationsByDate(reservations),
    [reservations]
  );

  const todayKey = getLocalDateKey(new Date());
  const todayDate = startOfDay(new Date());
  const selectedReservationDate = parseLocalDate(reservationDate);
  const isSelectedDatePast = selectedDateKey ? selectedDateKey < todayKey : false;
  const selectedReservations = selectedDateKey
    ? (reservationsByDate[selectedDateKey] ?? [])
    : [];
  const nearestReservations = useMemo(
    () => getNearestReservations(reservations, todayKey),
    [reservations, todayKey]
  );
  const displayName =
    profile?.display_name || user?.user_metadata?.name || '소셜 로그인 사용자';
  const accountLabel = profile?.email || user?.email || user?.id.slice(0, 8);

  const moveCalendarMonth = (amount: number) => {
    setCalendarMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1)
    );
  };

  const selectCalendarDate = (
    dateKey: string,
    canSelectDate: boolean,
    isPastDate: boolean
  ) => {
    if (!canSelectDate) return;

    setSelectedDateKey((currentDateKey) => {
      const nextDateKey = currentDateKey === dateKey ? null : dateKey;

      if (isReservationCardOpen && nextDateKey && !isPastDate) {
        setReservationDate(nextDateKey);
      }

      return nextDateKey;
    });
  };

  const openReservationCard = () => {
    setReviewReservation(null);
    setReservationDate(selectedDateKey ?? todayKey);
    setReservationPhone(profile?.phone ?? '');
    setReservationClassName(classOptions[0]);
    setReservationNote('');
    setIsReservationCardOpen(true);
  };

  const openReviewCard = (reservation: ClassReservation) => {
    if (reservation.preferred_date >= todayKey) return;

    setIsReservationCardOpen(false);
    setReviewReservation(reservation);
    setReviewRating(5);
    setReviewTitle(`${reservation.class_name} 후기`);
    setReviewContent('');
    setDatePickerOpen(false);
  };

  const closeReservationCard = () => {
    setIsReservationCardOpen(false);
    setDatePickerOpen(false);
  };

  const closeReviewCard = () => {
    setReviewReservation(null);
    setReviewRating(5);
    setReviewTitle('');
    setReviewContent('');
  };

  const toggleReservationText = (reservationId: string) => {
    setExpandedReservationIds((currentIds) =>
      currentIds.includes(reservationId)
        ? currentIds.filter((id) => id !== reservationId)
        : [...currentIds, reservationId]
    );
  };

  const handleReservationSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      navigate('/auth');
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      toast.error('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    if (!reservationDate) {
      toast.error('희망 날짜를 선택해 주세요.');
      return;
    }

    if (reservationDate < todayKey) {
      toast.error('지난 날짜는 선택할 수 없습니다.');
      return;
    }

    const normalizedPhone = normalizePhoneNumber(reservationPhone);

    if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
      toast.error('예약자 전화번호를 정확히 입력해 주세요.');
      return;
    }

    setSubmitting(true);

    const currentProfilePhone = normalizePhoneNumber(profile?.phone ?? '');

    if (normalizedPhone !== currentProfilePhone) {
      const shouldUpdateProfilePhone = window.confirm(
        currentProfilePhone
          ? '입력한 전화번호가 기존 전화번호와 다릅니다. 기본 전화번호로 등록할까요?'
          : '입력한 전화번호를 기본 전화번호로 등록할까요?'
      );

      if (shouldUpdateProfilePhone) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone: normalizedPhone, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (profileError) {
          toast.error('기본 전화번호 저장은 실패했지만 예약은 계속 진행합니다.');
        } else {
          await refreshProfile();
        }
      }
    }

    const { error } = await supabase.from('class_reservations').insert({
      user_id: user.id,
      class_name: reservationClassName,
      preferred_date: reservationDate,
      phone: normalizedPhone,
      note: reservationNote.trim() || null,
      status: 'pending',
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('클래스 예약 요청이 접수되었습니다.');
    setSelectedDateKey(reservationDate);
    const nextDate = parseLocalDate(reservationDate);
    if (nextDate) setCalendarMonth(nextDate);
    closeReservationCard();
    await loadReservations();
  };

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !reviewReservation) return;

    if (!supabase || !isSupabaseConfigured) {
      toast.error('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    if (reviewTitle.trim().length < 2 || reviewContent.trim().length < 10) {
      toast.error('제목은 2자 이상, 내용은 10자 이상 입력해 주세요.');
      return;
    }

    setReviewSubmitting(true);

    const { error } = await supabase.from('workshop_reviews').insert({
      user_id: user.id,
      display_name: displayName,
      rating: reviewRating,
      title: reviewTitle.trim(),
      content: reviewContent.trim(),
      review_type: 'class',
      class_name: reviewReservation.class_name,
      status: 'pending',
    });

    setReviewSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('리뷰가 접수되었습니다. 확인 후 게시됩니다.');
    closeReviewCard();
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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 md:pt-28">
        <section className="container pb-64 pt-10 md:pt-14">
          <div className="mb-8">
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
              Reservation
            </p>
            <h1 className="mb-3 text-3xl font-semibold text-foreground md:text-5xl">
              클래스 예약
            </h1>
            <p className="text-foreground/60">
              {displayName} · {accountLabel}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="border border-foreground/10 bg-card/60">
              <div className="flex items-center justify-between border-b border-foreground/10 p-4">
                <button
                  type="button"
                  onClick={() => moveCalendarMonth(-1)}
                  className="inline-flex size-10 items-center justify-center border border-foreground/10 text-foreground transition-colors hover:bg-foreground/5"
                  aria-label="이전 달"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <h2 className="text-xl font-semibold text-foreground md:text-2xl">
                  {formatMonthLabel(calendarMonth)}
                </h2>
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
                    className={[
                      'px-2 py-3 text-center text-xs font-medium',
                      weekday === '일'
                        ? 'text-rose-700/70'
                        : weekday === '토'
                          ? 'text-sky-700/70'
                          : 'text-foreground/60',
                    ].join(' ')}
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
                  const isToday = dateKey === todayKey;
                  const isPastDate = dateKey < todayKey;
                  const canSelectDate =
                    !isPastDate || dayReservations.length > 0;
                  const dayOfWeek = date.getDay();

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled={!canSelectDate}
                      onClick={() =>
                        selectCalendarDate(dateKey, canSelectDate, isPastDate)
                      }
                      className={[
                        'relative min-h-28 border-b border-r border-foreground/10 p-2 pt-11 text-left transition-colors last:border-r-0 md:min-h-32',
                        isPastDate
                          ? 'bg-muted/20 text-foreground/30 opacity-55'
                          : isCurrentMonth
                            ? 'bg-background hover:bg-secondary/30'
                            : 'bg-muted/20 text-foreground/35 hover:bg-muted/30',
                        isSelected && canSelectDate
                          ? 'ring-2 ring-inset ring-primary'
                          : '',
                      ].join(' ')}
                    >
                      <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
                        <span
                          className={[
                            'flex size-7 items-center justify-center text-sm',
                            isToday
                              ? 'border border-accent/55 text-foreground'
                              : dayOfWeek === 0
                                ? 'text-rose-700/70'
                                : dayOfWeek === 6
                                  ? 'text-sky-700/70'
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

                      <div className="space-y-1 pb-5">
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
                          <div className="absolute bottom-2 right-2 text-xs text-foreground/45">
                            +{dayReservations.length - 2}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="border border-foreground/10 bg-card/60 p-5">
              {isReservationCardOpen ? (
                <section>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-accent">
                        Reservation
                      </p>
                      <h2 className="text-2xl font-semibold text-foreground">
                        예약하기
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={closeReservationCard}
                      className="grid size-9 place-items-center border border-foreground/10 text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
                      aria-label="예약 카드 닫기"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <form onSubmit={handleReservationSubmit} className="space-y-6">
                    <div>
                      <label
                        htmlFor="className"
                        className="mb-2 block text-sm text-foreground/60"
                      >
                        클래스
                      </label>
                      <select
                        id="className"
                        value={reservationClassName}
                        onChange={(event) =>
                          setReservationClassName(event.target.value)
                        }
                        className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                      >
                        {classOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="reservationDate"
                        className="mb-2 block text-sm text-foreground/60"
                      >
                        희망 날짜
                      </label>
                      <Popover
                        open={datePickerOpen}
                        onOpenChange={setDatePickerOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            id="reservationDate"
                            type="button"
                            variant="outline"
                            className={cn(
                              'h-auto w-full justify-start rounded-none border-0 border-b border-foreground/20 bg-transparent px-0 py-3 text-left font-normal shadow-none hover:bg-transparent focus-visible:ring-0',
                              !reservationDate && 'text-foreground/45'
                            )}
                          >
                            <CalendarDays className="size-4 text-accent" />
                            {reservationDate
                              ? formatDisplayDate(reservationDate)
                              : '날짜를 선택해 주세요'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={selectedReservationDate}
                            defaultMonth={selectedReservationDate ?? todayDate}
                            disabled={(date) => startOfDay(date) < todayDate}
                            modifiers={{
                              saturday: (date) => date.getDay() === 6,
                              sunday: (date) => date.getDay() === 0,
                            }}
                            modifiersClassNames={{
                              saturday:
                                '[&:not([data-selected-single=true])]:text-sky-700/70',
                              sunday:
                                '[&:not([data-selected-single=true])]:text-rose-700/70',
                            }}
                            onSelect={(date) => {
                              if (!date) return;

                              const nextDateKey = getLocalDateKey(date);
                              setReservationDate(nextDateKey);
                              setSelectedDateKey(nextDateKey);
                              setCalendarMonth(date);
                              setDatePickerOpen(false);
                            }}
                            className="p-4"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <label
                        htmlFor="reservationPhone"
                        className="mb-2 block text-sm text-foreground/60"
                      >
                        예약자 전화번호
                      </label>
                      <input
                        id="reservationPhone"
                        type="tel"
                        value={reservationPhone}
                        onChange={(event) =>
                          setReservationPhone(
                            normalizePhoneNumber(event.target.value)
                          )
                        }
                        required
                        className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                        placeholder="010-1234-5678"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="note"
                        className="mb-2 block text-sm text-foreground/60"
                      >
                        요청 사항
                      </label>
                      <textarea
                        id="note"
                        value={reservationNote}
                        onChange={(event) =>
                          setReservationNote(event.target.value)
                        }
                        rows={5}
                        className="w-full resize-none border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                        placeholder="인원, 원하는 시간대, 궁금한 점을 적어 주세요."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full"
                    >
                      {submitting ? '접수 중' : '예약 요청하기'}
                    </button>
                  </form>
                </section>
              ) : reviewReservation ? (
                <section>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-accent">
                        Review
                      </p>
                      <h2 className="text-2xl font-semibold text-foreground">
                        리뷰 남기기
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={closeReviewCard}
                      className="grid size-9 place-items-center border border-foreground/10 text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground"
                      aria-label="리뷰 카드 닫기"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="mb-6 border border-foreground/10 p-4">
                    <p className="text-base font-semibold text-foreground">
                      {reviewReservation.class_name}
                    </p>
                    <p className="mt-1 text-sm text-foreground/60">
                      {formatDisplayDate(reviewReservation.preferred_date)}
                    </p>
                  </div>

                  <form onSubmit={handleReviewSubmit} className="space-y-6">
                    <div>
                      <label
                        htmlFor="reviewRating"
                        className="mb-2 block text-sm text-foreground/60"
                      >
                        평점
                      </label>
                      <select
                        id="reviewRating"
                        value={reviewRating}
                        onChange={(event) =>
                          setReviewRating(Number(event.target.value))
                        }
                        className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                      >
                        {[5, 4, 3, 2, 1].map((score) => (
                          <option key={score} value={score}>
                            {score}점
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="reviewTitle"
                        className="mb-2 block text-sm text-foreground/60"
                      >
                        제목
                      </label>
                      <input
                        id="reviewTitle"
                        value={reviewTitle}
                        onChange={(event) => setReviewTitle(event.target.value)}
                        maxLength={80}
                        className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                        placeholder="후기를 한 줄로 적어 주세요."
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="reviewContent"
                        className="mb-2 block text-sm text-foreground/60"
                      >
                        내용
                      </label>
                      <textarea
                        id="reviewContent"
                        value={reviewContent}
                        onChange={(event) =>
                          setReviewContent(event.target.value)
                        }
                        rows={5}
                        maxLength={1000}
                        className="w-full resize-none border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                        placeholder="클래스 경험을 남겨 주세요."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="btn-primary w-full"
                    >
                      {reviewSubmitting ? '접수 중' : '리뷰 등록'}
                    </button>
                  </form>
                </section>
              ) : (
                <section>
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-accent">
                    Selected Date
                  </p>
                  {selectedDateKey ? (
                    <>
                      <h2 className="mb-5 text-xl font-semibold text-foreground">
                        {formatDisplayDate(selectedDateKey)}
                      </h2>

                      {selectedReservations.length === 0 ? (
                        <p className="text-sm text-foreground/55">
                          선택한 날짜에는 예약이 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {selectedReservations.map((reservation) => (
                            <article
                              key={reservation.id}
                              onClick={() => openReviewCard(reservation)}
                              onKeyDown={(event) => {
                                if (
                                  reservation.preferred_date >= todayKey ||
                                  (event.key !== 'Enter' && event.key !== ' ')
                                ) {
                                  return;
                                }

                                event.preventDefault();
                                openReviewCard(reservation);
                              }}
                              role={
                                reservation.preferred_date < todayKey
                                  ? 'button'
                                  : undefined
                              }
                              tabIndex={
                                reservation.preferred_date < todayKey
                                  ? 0
                                  : undefined
                              }
                              className={[
                                'border border-foreground/10 p-4',
                                reservation.preferred_date < todayKey
                                  ? 'transition-colors hover:bg-foreground/3'
                                  : '',
                              ].join(' ')}
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <h3 className="text-base font-semibold text-foreground">
                                  {reservation.class_name}
                                </h3>
                                <span
                                  className={`shrink-0 border px-2 py-1 text-xs ${statusClassNames[reservation.status]}`}
                                >
                                  {statusLabels[reservation.status]}
                                </span>
                              </div>
                              {reservation.note && (
                                <ReservationNoteDisclosure
                                  note={reservation.note}
                                  expanded={expandedReservationIds.includes(
                                    reservation.id
                                  )}
                                  onToggle={() =>
                                    toggleReservationText(reservation.id)
                                  }
                                />
                              )}
                            </article>
                          ))}
                        </div>
                      )}

                      {!isSelectedDatePast && (
                        <button
                          type="button"
                          onClick={openReservationCard}
                          className="btn-primary mt-6 w-full"
                        >
                          이 날짜로 예약하기
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="mb-3 text-xl font-semibold text-foreground">
                        가까운 예약
                      </h2>
                      <p className="mb-5 text-sm text-foreground/55">
                        날짜를 선택하면 해당 날짜의 예약 내역과 예약 버튼이
                        표시됩니다.
                      </p>

                      {nearestReservations.length === 0 ? (
                        <p className="text-sm text-foreground/55">
                          아직 예약 내역이 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {nearestReservations.map((reservation) => (
                            <article
                              key={reservation.id}
                              className="border border-foreground/10 p-4"
                            >
                              <div className="mb-2 flex items-start justify-between gap-3">
                                <h3 className="text-base font-semibold text-foreground">
                                  {reservation.class_name}
                                </h3>
                                <span
                                  className={`shrink-0 border px-2 py-1 text-xs ${statusClassNames[reservation.status]}`}
                                >
                                  {statusLabels[reservation.status]}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/60">
                                {formatDisplayDate(reservation.preferred_date)}
                              </p>
                              {reservation.note && (
                                <ReservationNoteDisclosure
                                  note={reservation.note}
                                  expanded={expandedReservationIds.includes(
                                    reservation.id
                                  )}
                                  onToggle={() =>
                                    toggleReservationText(reservation.id)
                                  }
                                  className="mt-3"
                                />
                              )}
                            </article>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
