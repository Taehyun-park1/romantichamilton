import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Link } from "wouter";
import {
  isSupabaseConfigured,
  supabase,
  type WorkshopReview,
} from "@/lib/supabase";
import "@/styles/reviews.css";

export const fallbackReviews: WorkshopReview[] = [
  {
    id: "fallback-1",
    user_id: null,
    display_name: "Jiwon",
    rating: 5,
    title: "가죽을 다루는 시간이 정말 좋았어요",
    content:
      "처음 해보는 작업이었는데 설명을 차분하게 해주셔서 따라가기 쉬웠고 완성품도 오래 쓰고 싶은 물건으로 남았습니다.",
    status: "approved",
    created_at: "2026-05-12T00:00:00.000Z",
  },
  {
    id: "fallback-2",
    user_id: null,
    display_name: "Minseo",
    rating: 5,
    title: "선물용으로 만족감이 높았습니다",
    content:
      "커플 클래스를 신청했는데 제작 과정이 조용하고 집중하기 좋았습니다. 바로 선물하기에도 좋았어요.",
    status: "approved",
    created_at: "2026-05-20T00:00:00.000Z",
  },
  {
    id: "fallback-3",
    user_id: null,
    display_name: "Hyun",
    rating: 4,
    title: "작업 공간 분위기가 좋습니다",
    content:
      "재료 고르는 과정부터 마감까지 직접 해볼 수 있어서 기억에 남았습니다. 다음에는 지갑 클래스로 다시 예약하려고요.",
    status: "approved",
    created_at: "2026-06-04T00:00:00.000Z",
  },
];

export function ReviewStars({ rating }: { rating: number }) {
  return (
    // old: flex items-center gap-1
    <div className="review-stars" aria-label={`${rating}점`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          /* old: size-4 fill-accent text-accent / fill-transparent text-foreground/20 */
          className={`review-stars__star ${
            index < rating ? "review-stars__star--active" : ""
          }`}
        />
      ))}
    </div>
  );
}

export function ReviewCard({ review }: { review: WorkshopReview }) {
  const imageUrls = review.image_urls ?? [];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const hasMultipleImages = imageUrls.length > 1;
  const activeImageUrl = imageUrls[activeImageIndex];

  const showPreviousImage = () => {
    setActiveImageIndex((currentIndex) =>
      currentIndex === 0 ? imageUrls.length - 1 : currentIndex - 1
    );
  };

  const showNextImage = () => {
    setActiveImageIndex((currentIndex) =>
      currentIndex === imageUrls.length - 1 ? 0 : currentIndex + 1
    );
  };

  return (
    <article
      key={review.id}
      /* old: border border-foreground/10 bg-background p-5 */
      className="reviews-section__card"
    >
      {/* old: mb-4 flex items-start justify-between gap-4 */}
      <div className="reviews-section__card-head">
        <div>
          {/* old: text-base font-semibold text-foreground */}
          <h3 className="reviews-section__card-title">{review.title}</h3>
          {/* old: mt-1 text-sm text-foreground/50 */}
          <p className="reviews-section__name">{review.display_name}</p>
        </div>
        <ReviewStars rating={review.rating} />
      </div>
      {/* old: text-sm leading-relaxed text-foreground/70 */}
      <p className="reviews-section__content">{review.content}</p>
      {activeImageUrl && (
        <div className="reviews-section__carousel">
          <img
            src={activeImageUrl}
            alt={`${review.title} 사진 ${activeImageIndex + 1}`}
            className="reviews-section__carousel-image"
            loading="lazy"
          />

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={showPreviousImage}
                className="reviews-section__carousel-button reviews-section__carousel-button--prev"
                aria-label="이전 사진"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={showNextImage}
                className="reviews-section__carousel-button reviews-section__carousel-button--next"
                aria-label="다음 사진"
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          )}

          {hasMultipleImages && (
            <div className="reviews-section__carousel-dots">
              {imageUrls.map((imageUrl, index) => (
                <button
                  key={imageUrl}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`reviews-section__carousel-dot ${
                    index === activeImageIndex
                      ? "reviews-section__carousel-dot--active"
                      : ""
                  }`}
                  aria-label={`${index + 1}번째 사진 보기`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function Reviews() {
  const [reviews, setReviews] = useState<WorkshopReview[]>(fallbackReviews);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    const supabaseClient = supabase;
    let mounted = true;

    const loadReviews = async () => {
      const { data, error } = await supabaseClient
        .from("workshop_reviews")
        .select("*")
        .eq("status", "approved")
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      if (!mounted || error || !data || data.length === 0) return;

      setReviews(data as WorkshopReview[]);
    };

    void loadReviews();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section
      id="reviews"
      /* old: scroll-mt-20 bg-[#f4f0ea] py-24 md:scroll-mt-24 md:py-36 */
      className="reviews-section"
    >
      {/* old: container */}
      <div className="reviews-section__inner">
        {/* old: mb-12 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between */}
        <div className="reviews-section__header">
          <div>
            {/* old: mb-3 text-xs uppercase tracking-[0.16em] text-accent */}
            <p className="reviews-section__eyebrow">Reviews</p>
            {/* old: text-3xl font-semibold text-foreground md:text-5xl */}
            <h2 className="reviews-section__title">손님들이 남긴 이야기</h2>
          </div>
          <Link href="/reviews" className="btn-outline reviews-section__more">
            전체 리뷰 보기
          </Link>
        </div>

        {/* old: grid gap-4 md:grid-cols-2 lg:grid-cols-3 */}
        <div className="reviews-section__grid">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
