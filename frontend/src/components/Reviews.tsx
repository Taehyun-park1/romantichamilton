import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  isSupabaseConfigured,
  supabase,
  type WorkshopReview,
} from '@/lib/supabase';

const fallbackReviews: WorkshopReview[] = [
  {
    id: 'fallback-1',
    user_id: 'fallback',
    display_name: 'Jiwon',
    rating: 5,
    title: '가죽을 다루는 시간이 정말 좋았어요',
    content:
      '처음 해보는 작업이었는데 설명이 차분해서 따라가기 쉬웠고, 완성품도 오래 쓰고 싶은 느낌으로 나왔습니다.',
    status: 'approved',
    created_at: '2026-05-12T00:00:00.000Z',
  },
  {
    id: 'fallback-2',
    user_id: 'fallback',
    display_name: 'Minseo',
    rating: 5,
    title: '선물용으로 만족도가 높았습니다',
    content:
      '커플 클래스를 신청했는데 제작 과정이 조용하고 집중하기 좋았습니다. 포장까지 깔끔해서 바로 선물하기 좋았어요.',
    status: 'approved',
    created_at: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'fallback-3',
    user_id: 'fallback',
    display_name: 'Hyun',
    rating: 4,
    title: '작업 공간 분위기가 좋습니다',
    content:
      '재료 고르는 과정부터 마감까지 직접 해볼 수 있어서 기억에 남았습니다. 다음에는 지갑 클래스로 다시 예약하려고요.',
    status: 'approved',
    created_at: '2026-06-04T00:00:00.000Z',
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating}점`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`size-4 ${
            index < rating
              ? 'fill-accent text-accent'
              : 'fill-transparent text-foreground/20'
          }`}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  const { user, profile, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<WorkshopReview[]>(fallbackReviews);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    const supabaseClient = supabase;
    let mounted = true;

    const loadReviews = async () => {
      const { data, error } = await supabaseClient
        .from('workshop_reviews')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!mounted) return;

      if (error) {
        console.error('Failed to load workshop reviews', error);
        return;
      }

      if (data && data.length > 0) {
        setReviews(data as WorkshopReview[]);
      }
    };

    void loadReviews();

    return () => {
      mounted = false;
    };
  }, []);

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      '예약 고객',
    [profile?.display_name, user]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      toast.error('로그인 후 리뷰를 작성할 수 있습니다.');
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      toast.error('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    if (title.trim().length < 2 || content.trim().length < 10) {
      toast.error('제목은 2자 이상, 내용은 10자 이상 입력해 주세요.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('workshop_reviews').insert({
      user_id: user.id,
      display_name: displayName,
      rating,
      title: title.trim(),
      content: content.trim(),
      status: 'pending',
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('리뷰가 접수되었습니다. 확인 후 게시됩니다.');
    setRating(5);
    setTitle('');
    setContent('');
  };

  return (
    <section
      id="reviews"
      className="scroll-mt-20 bg-[#f4f0ea] py-24 md:scroll-mt-24 md:py-36"
    >
      <div className="container">
        <div className="mb-12 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
              Reviews
            </p>
            <h2 className="text-3xl font-semibold text-foreground md:text-5xl">
              다녀간 사람들이 남긴 이야기
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-foreground/60">
            클래스와 제작 경험을 기준으로 정리한 후기입니다. 작성된 리뷰는
            확인 후 게시됩니다.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="border border-foreground/10 bg-background p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {review.title}
                    </h3>
                    <p className="mt-1 text-sm text-foreground/50">
                      {review.display_name}
                    </p>
                  </div>
                  <Stars rating={review.rating} />
                </div>
                <p className="text-sm leading-relaxed text-foreground/70">
                  {review.content}
                </p>
              </article>
            ))}
          </div>

          <aside className="border border-foreground/10 bg-background p-5">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-accent">
              Write
            </p>
            <h3 className="mb-5 text-xl font-semibold text-foreground">
              리뷰 작성
            </h3>

            {isAuthenticated ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="review-rating"
                    className="mb-2 block text-sm text-foreground/60"
                  >
                    평점
                  </label>
                  <select
                    id="review-rating"
                    value={rating}
                    onChange={(event) => setRating(Number(event.target.value))}
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
                    htmlFor="review-title"
                    className="mb-2 block text-sm text-foreground/60"
                  >
                    제목
                  </label>
                  <input
                    id="review-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={80}
                    className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                    placeholder="후기를 한 줄로 적어 주세요."
                  />
                </div>

                <div>
                  <label
                    htmlFor="review-content"
                    className="mb-2 block text-sm text-foreground/60"
                  >
                    내용
                  </label>
                  <textarea
                    id="review-content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={5}
                    maxLength={1000}
                    className="w-full resize-none border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                    placeholder="클래스나 제작 경험을 남겨 주세요."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full"
                >
                  {submitting ? '접수 중' : '리뷰 등록'}
                </button>
              </form>
            ) : (
              <div>
                <p className="mb-5 text-sm leading-relaxed text-foreground/60">
                  리뷰 작성은 로그인한 사용자만 가능합니다.
                </p>
                <Link href="/auth" className="btn-primary inline-flex">
                  로그인하고 작성
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
