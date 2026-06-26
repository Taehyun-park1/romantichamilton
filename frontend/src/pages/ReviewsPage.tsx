import { useEffect, useState } from "react";
import Header from "@/components/Header";
import {
  fallbackReviews,
  ReviewCard,
} from "@/components/Reviews";
import {
  isSupabaseConfigured,
  supabase,
  type WorkshopReview,
} from "@/lib/supabase";
import "@/styles/reviews-page.css";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<WorkshopReview[]>(fallbackReviews);
  const [loading, setLoading] = useState(Boolean(supabase && isSupabaseConfigured));

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    const supabaseClient = supabase;
    let mounted = true;

    const loadReviews = async () => {
      const { data, error } = await supabaseClient
        .from("workshop_reviews")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (!error && data && data.length > 0) {
        setReviews(data as WorkshopReview[]);
      }

      setLoading(false);
    };

    void loadReviews();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <Header />
      <main className="reviews-page">
        <section className="reviews-page__inner">
          <div className="reviews-page__header">
            <p className="reviews-page__eyebrow">Reviews</p>
            <h1 className="reviews-page__title">전체 리뷰</h1>
            <p className="reviews-page__description">
              클래스와 제품 경험을 바탕으로 남겨주신 리뷰입니다. 확인된 리뷰만
              게시됩니다.
            </p>
          </div>

          {loading ? (
            <p className="reviews-page__message">리뷰를 불러오는 중입니다.</p>
          ) : reviews.length === 0 ? (
            <p className="reviews-page__message">아직 게시된 리뷰가 없습니다.</p>
          ) : (
            <div className="reviews-page__grid">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
