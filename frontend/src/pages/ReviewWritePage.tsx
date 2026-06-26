import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { getKoreanErrorMessage } from '@/lib/messages';
import {
  MAX_REVIEW_IMAGE_COUNT,
  uploadReviewImages,
  validateReviewImageFiles,
} from '@/lib/reviewImages';
import '@/styles/review-write.css';

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'used' | 'expired' | 'submitted';
type ReviewType = 'class' | 'product' | 'other';

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
  other: '기타',
};

function getUrlReviewType() {
  if (typeof window === 'undefined') return null;

  const lastSegment = window.location.pathname.split('/').filter(Boolean).at(-1);

  if (
    lastSegment === 'class' ||
    lastSegment === 'product' ||
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
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

    let imageUrls: string[] = [];

    try {
      imageUrls = await uploadReviewImages(supabase, imageFiles);
    } catch (error) {
      setSubmitting(false);
      toast.error(getKoreanErrorMessage(error, '사진을 업로드하지 못했습니다.'));
      return;
    }

    const { error } = await supabase.rpc('submit_invite_review', {
      invite_token: token,
      display_name: displayName.trim(),
      rating,
      title: title.trim(),
      content: content.trim(),
      image_urls: imageUrls,
    });

    setSubmitting(false);

    if (error) {
      toast.error(getKoreanErrorMessage(error));
      return;
    }

    setStatus('submitted');
    toast.success('리뷰가 접수되었습니다. 확인 후 게시됩니다.');
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = [
      ...imageFiles,
      ...Array.from(event.target.files ?? []),
    ].slice(0, MAX_REVIEW_IMAGE_COUNT);
    const validationMessage = validateReviewImageFiles(nextFiles);

    event.target.value = '';

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setImageFiles(nextFiles);
  };

  const removeImageFile = (targetIndex: number) => {
    setImageFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== targetIndex)
    );
  };

  return (
    <>
      <Header />
      {/* old: min-h-screen bg-background pt-24 md:pt-28 */}
      <main className="review-write">
        {/* old: container max-w-3xl pb-32 pt-10 md:pt-16 */}
        <section className="review-write__section">
          {/* old: mb-3 text-xs uppercase tracking-[0.16em] text-accent */}
          <p className="review-write__eyebrow">
            Review
          </p>
          {/* old: mb-4 text-3xl font-semibold text-foreground md:text-5xl */}
          <h1 className="review-write__title">
            리뷰 작성
          </h1>
          {/* old: mb-10 max-w-xl text-sm leading-relaxed text-foreground/60 */}
          <p className="review-write__intro">
            전달받은 리뷰 링크로만 작성할 수 있습니다. 작성한 리뷰는 관리자
            확인 후 메인 화면에 게시됩니다.
          </p>

          {status === 'loading' && (
            // old: border border-foreground/10 p-6 text-sm text-foreground/55
            <p className="review-write__message">
              리뷰 링크를 확인하는 중입니다.
            </p>
          )}

          {status === 'invalid' && (
            // old: border border-foreground/10 p-6 text-sm text-foreground/55
            <p className="review-write__message">
              유효하지 않은 리뷰 링크입니다.
            </p>
          )}

          {status === 'used' && (
            // old: border border-foreground/10 p-6 text-sm text-foreground/55
            <p className="review-write__message">
              이미 사용된 리뷰 링크입니다.
            </p>
          )}

          {status === 'expired' && (
            // old: border border-foreground/10 p-6 text-sm text-foreground/55
            <p className="review-write__message">
              만료된 리뷰 링크입니다.
            </p>
          )}

          {status === 'submitted' && (
            // old: border border-foreground/10 p-6 text-sm text-foreground/55
            <p className="review-write__message">
              리뷰가 접수되었습니다. 감사합니다.
            </p>
          )}

          {status === 'valid' && invite && (
            <form
              onSubmit={handleSubmit}
              /* old: border border-foreground/10 bg-card/60 p-5 md:p-7 */
              className="review-write__form"
            >
              {/* old: mb-8 border-b border-foreground/10 pb-5 */}
              <div className="review-write__summary">
                {/* old: mb-2 text-xs uppercase tracking-[0.16em] text-accent */}
                <p className="review-write__type">
                  {reviewTypeLabels[invite.review_type]}
                </p>
                {/* old: text-2xl font-semibold text-foreground */}
                <h2 className="review-write__target">
                  {targetName}
                </h2>
              </div>

              {/* old: space-y-6 */}
              <div className="review-write__fields">
                {/* old: block */}
                <label className="review-write__field">
                  {/* old: mb-2 block text-sm text-foreground/60 */}
                  <span className="review-write__label">
                    작성자 이름
                  </span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={40}
                    /* old: w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground */
                    className="review-write__input"
                  />
                </label>

                {/* old: block */}
                <label className="review-write__field">
                  {/* old: mb-2 block text-sm text-foreground/60 */}
                  <span className="review-write__label">
                    평점
                  </span>
                  {/* old: flex gap-2 */}
                  <div className="review-write__stars">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setRating(score)}
                        /* old: p-1 text-accent */
                        className="review-write__star-button"
                        aria-label={`${score}점`}
                      >
                        <Star
                          /* old: size-6 fill-accent/fill-transparent */
                          className={`review-write__star ${
                            score <= rating ? 'review-write__star--active' : ''
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </label>

                {/* old: block */}
                <label className="review-write__field">
                  {/* old: mb-2 block text-sm text-foreground/60 */}
                  <span className="review-write__label">
                    제목
                  </span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={80}
                    /* old: w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground */
                    className="review-write__input"
                    placeholder="짧은 한 줄 후기를 적어주세요"
                  />
                </label>

                {/* old: block */}
                <label className="review-write__field">
                  {/* old: mb-2 block text-sm text-foreground/60 */}
                  <span className="review-write__label">
                    내용
                  </span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={7}
                    maxLength={1000}
                    /* old: w-full resize-none border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground */
                    className="review-write__textarea"
                    placeholder="제품이나 클래스 경험을 남겨주세요"
                  />
                </label>

                <div className="review-write__field">
                  <span className="review-write__label">
                    사진 첨부
                  </span>
                  <label className="review-write__file-trigger">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="review-write__file-input"
                    />
                    사진 선택
                  </label>
                  <p className="review-write__help">
                    최대 {MAX_REVIEW_IMAGE_COUNT}장, 장당 5MB 이하
                  </p>
                  {imageFiles.length > 0 && (
                    <div className="review-write__preview-grid">
                      {imageFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="review-write__preview"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`첨부 사진 ${index + 1}`}
                            className="review-write__preview-image"
                          />
                          <button
                            type="button"
                            onClick={() => removeImageFile(index)}
                            className="review-write__preview-remove"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  /* old: btn-primary w-full disabled:opacity-50 */
                  className="btn-primary review-write__submit"
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
