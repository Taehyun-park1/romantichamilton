import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const classOptions = [
  'Card Wallet Class',
  'Couple Leather Class',
  'Custom Order Session',
];

export default function ReservationPage() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const [className, setClassName] = useState(classOptions[0]);
  const [preferredDate, setPreferredDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) {
    navigate('/auth');
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      navigate('/auth');
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      toast.error('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    if (!preferredDate) {
      toast.error('희망 날짜를 선택해 주세요.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('class_reservations').insert({
      user_id: user.id,
      class_name: className,
      preferred_date: preferredDate,
      note: note.trim() || null,
      status: 'pending',
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('클래스 예약 요청이 접수되었습니다.');
    navigate('/my');
  };

  return (
    <main className="min-h-screen bg-background pt-24 md:pt-28">
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-xl">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
            Reservation
          </p>
          <h1 className="mb-4 text-3xl md:text-5xl font-semibold text-foreground">
            클래스 예약
          </h1>
          <p className="mb-10 text-foreground/60">
            로그인한 사용자만 클래스 예약 요청을 남길 수 있습니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label htmlFor="className" className="mb-2 block text-sm text-foreground/60">
                클래스
              </label>
              <select
                id="className"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
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
              <label htmlFor="preferredDate" className="mb-2 block text-sm text-foreground/60">
                희망 날짜
              </label>
              <input
                id="preferredDate"
                type="date"
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
                className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
              />
            </div>

            <div>
              <label htmlFor="note" className="mb-2 block text-sm text-foreground/60">
                요청 사항
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={5}
                className="w-full resize-none border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                placeholder="인원, 원하는 시간대, 궁금한 점을 적어 주세요."
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? '접수 중' : '예약 요청하기'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
