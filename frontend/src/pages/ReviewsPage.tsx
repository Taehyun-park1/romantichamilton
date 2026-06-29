import { useEffect, useMemo, useState } from "react";
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

type ReviewFilter = "all" | "class" | "product";
type ReviewSort = "rating-desc" | "rating-asc" | "newest" | "oldest";

const REVIEWS_PER_PAGE = 9;

const reviewFilters: Array<{ label: string; value: ReviewFilter }> = [
  { label: "전체", value: "all" },
  { label: "클래스", value: "class" },
  { label: "제품", value: "product" },
];

const reviewSortOptions: Array<{ label: string; value: ReviewSort }> = [
  { label: "별점 높은순", value: "rating-desc" },
  { label: "별점 낮은순", value: "rating-asc" },
  { label: "최신순", value: "newest" },
  { label: "오래된순", value: "oldest" },
];

function getReviewTime(review: WorkshopReview) {
  return new Date(review.created_at).getTime();
}

function sortReviews(reviews: WorkshopReview[], sort: ReviewSort) {
  return [...reviews].sort((left, right) => {
    if (sort === "rating-desc") {
      if (right.rating !== left.rating) return right.rating - left.rating;
      return getReviewTime(right) - getReviewTime(left);
    }

    if (sort === "rating-asc") {
      if (left.rating !== right.rating) return left.rating - right.rating;
      return getReviewTime(right) - getReviewTime(left);
    }

    if (sort === "oldest") {
      return getReviewTime(left) - getReviewTime(right);
    }

    return getReviewTime(right) - getReviewTime(left);
  });
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<WorkshopReview[]>(fallbackReviews);
  const [loading, setLoading] = useState(
    Boolean(supabase && isSupabaseConfigured)
  );
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>("all");
  const [activeSort, setActiveSort] = useState<ReviewSort>("rating-desc");
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, activeSort]);

  const filteredReviews = useMemo(
    () =>
      activeFilter === "all"
        ? reviews
        : reviews.filter((review) => review.review_type === activeFilter),
    [activeFilter, reviews]
  );

  const sortedReviews = useMemo(
    () => sortReviews(filteredReviews, activeSort),
    [activeSort, filteredReviews]
  );

  const totalPages = Math.max(1, Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE));
  const paginatedReviews = sortedReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  const movePage = (nextPage: number) => {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

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
              게시합니다.
            </p>
          </div>

          <div className="reviews-page__toolbar">
            <div className="reviews-page__filters" aria-label="리뷰 유형 선택">
              {reviewFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`reviews-page__filter ${
                    activeFilter === filter.value
                      ? "reviews-page__filter--active"
                      : ""
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <label className="reviews-page__sort">
              <span className="reviews-page__sort-label">정렬</span>
              <select
                value={activeSort}
                onChange={(event) =>
                  setActiveSort(event.target.value as ReviewSort)
                }
                className="reviews-page__sort-select"
              >
                {reviewSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="reviews-page__message">리뷰를 불러오는 중입니다.</p>
          ) : paginatedReviews.length === 0 ? (
            <p className="reviews-page__message">
              아직 게시된 리뷰가 없습니다.
            </p>
          ) : (
            <>
              <div className="reviews-page__grid">
                {paginatedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="reviews-page__pagination" aria-label="리뷰 페이지">
                  <button
                    type="button"
                    onClick={() => movePage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="reviews-page__page-button"
                  >
                    이전
                  </button>
                  <div className="reviews-page__page-numbers">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => movePage(page)}
                          className={`reviews-page__page-number ${
                            currentPage === page
                              ? "reviews-page__page-number--active"
                              : ""
                          }`}
                          aria-current={currentPage === page ? "page" : undefined}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => movePage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="reviews-page__page-button"
                  >
                    다음
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}
