import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'used' | 'expired' | 'submitted';
type ReviewType = 'class' | 'product' | 'offline' | 'other';

interface PublicReviewInvite {
  customer_name: string | null;
  review_type: ReviewType;
  product_name: string | null;
  class_name: string | null;
  expires_at: string;
  used_at: string | null;
  is_valid: boolean;
}

const reviewTypeLabels: Record<ReviewType, string> = {
  class: '클래스',
  product: '제품',
  offline: '오프라인 방문',
  other: '기타',
};

function getUrlReviewType() {
  if (typeof window === 'undefined') return null;

  const lastSegment = window.location.pathname.split('/').filter(Boolean).at(-1);

  if (
    lastSegment === 'class' ||
    lastSegment === 'product' ||
    lastSegment === 'offline' ||
    lastSegment === 'other'
  ) {
    return lastSegment;
  }

  return null;
}

export default function ReviewWritePage() {
  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('token') ?? '';
  }, []);
  const urlReviewType = useMemo(() => getUrlReviewType(), []);
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [invite, setInvite] = useState<PublicReviewInvite | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured || !token) {
      setStatus('invalid');
      return;
    }

    const supabaseClient = supabase;
    let mounted = true;

    const loadInvite = async () => {
      const { data, error } = await supabaseClient.rpc('get_review_invite', {
        invite_token: token,
      });

      if (!mounted) return;

      if (error || !data || data.length === 0) {
        setStatus('invalid');
        return;
      }

      const nextInvite = data[0] as PublicReviewInvite;
      setInvite(nextInvite);
      setDisplayName(nextInvite.customer_name ?? '');

      if (urlReviewType && nextInvite.review_type !== urlReviewType) {
        setStatus('invalid');
        return;
      }

      if (nextInvite.used_at) {
        setStatus('used');
        return;
      }

      if (new Date(nextInvite.expires_at).getTime() <= Date.now()) {
        setStatus('expired');
        return;
      }

      setStatus(nextInvite.is_valid ? 'valid' : 'invalid');
    };

    void loadInvite();

    return () => {
      mounted = false;
    };
  }, [token, urlReviewType]);

  const targetName =
    invite?.product_name || invite?.class_name || reviewTypeLabels[invite?.review_type ?? 'other'];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!supabase || !isSupabaseConfigured || status !== 'valid') return;

    if (displayName.trim().length < 1) {
      toast.error('작성자 이름을 입력해주세요.');
      return;
    }

    if (title.trim().length < 2 || content.trim().length < 10) {
      toast.error('제목은 2자 이상, 내용은 10자 이상 입력해주세요.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.rpc('submit_invite_review', {
      invite_token: token,
      display_name: displayName.trim(),
      rating,
      title: title.trim(),
      content: content.trim(),
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setStatus('submitted');
    toast.success('리뷰가 접수되었습니다. 확인 후 게시됩니다.');
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 md:pt-28">
        <section className="container max-w-3xl pb-32 pt-10 md:pt-16">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
            Review
          </p>
          <h1 className="mb-4 text-3xl font-semibold text-foreground md:text-5xl">
            리뷰 작성
          </h1>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-foreground/60">
            전달받은 리뷰 링크로만 작성할 수 있습니다. 작성한 리뷰는 관리자
            확인 후 메인 화면에 게시됩니다.
          </p>

          {status === 'loading' && (
            <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
              리뷰 링크를 확인하는 중입니다.
            </p>
          )}

          {status === 'invalid' && (
            <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
              유효하지 않은 리뷰 링크입니다.
            </p>
          )}

          {status === 'used' && (
            <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
              이미 사용된 리뷰 링크입니다.
            </p>
          )}

          {status === 'expired' && (
            <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
              만료된 리뷰 링크입니다.
            </p>
          )}

          {status === 'submitted' && (
            <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
              리뷰가 접수되었습니다. 감사합니다.
            </p>
          )}

          {status === 'valid' && invite && (
            <form
              onSubmit={handleSubmit}
              className="border border-foreground/10 bg-card/60 p-5 md:p-7"
            >
              <div className="mb-8 border-b border-foreground/10 pb-5">
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-accent">
                  {reviewTypeLabels[invite.review_type]}
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  {targetName}
                </h2>
              </div>

              <div className="space-y-6">
                <label className="block">
                  <span className="mb-2 block text-sm text-foreground/60">
                    작성자 이름
                  </span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={40}
                    className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-foreground/60">
                    평점
                  </span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setRating(score)}
                        className="p-1 text-accent"
                        aria-label={`${score}점`}
                      >
                        <Star
                          className={`size-6 ${
                            score <= rating ? 'fill-accent' : 'fill-transparent'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-foreground/60">
                    제목
                  </span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={80}
                    className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                    placeholder="짧은 한 줄 후기를 적어주세요"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-foreground/60">
                    내용
                  </span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={7}
                    maxLength={1000}
                    className="w-full resize-none border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                    placeholder="제품이나 클래스 경험을 남겨주세요"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {submitting ? '접수 중' : '리뷰 등록'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
