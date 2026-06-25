import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  MessageSquareText,
  Package,
  RefreshCw,
  Save,
  Star,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { products as fallbackProducts, workshops as fallbackWorkshops } from '@/data/products';
import { useAuth } from '@/contexts/AuthContext';
import {
  type ClassReservation,
  isSupabaseConfigured,
  type SiteProduct,
  supabase,
  type WorkshopClass,
  type WorkshopReview,
} from '@/lib/supabase';

type AdminTab = 'products' | 'classes' | 'reviews' | 'reservations';

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

const productCategoryLabels: Record<SiteProduct['category'], string> = {
  wallets: '지갑',
  bags: '가방',
  desk: '데스크',
  gifts: '선물',
};

const classLevelLabels: Record<WorkshopClass['level'], string> = {
  beginner: '입문',
  intermediate: '중급',
  advanced: '고급',
};

const statusClassNames = {
  pending: 'border-accent/25 bg-accent/10 text-accent',
  confirmed: 'border-primary/25 bg-primary/10 text-primary',
  cancelled: 'border-destructive/25 bg-destructive/10 text-destructive',
  approved: 'border-primary/25 bg-primary/10 text-primary',
  hidden: 'border-foreground/20 bg-foreground/5 text-foreground/55',
};

function toSiteProduct(product: (typeof fallbackProducts)[number], index: number): SiteProduct {
  return {
    ...product,
    badge: product.badge ?? null,
    is_active: true,
    sort_order: index,
  };
}

function toWorkshopClass(workshop: (typeof fallbackWorkshops)[number], index: number): WorkshopClass {
  return {
    ...workshop,
    is_active: true,
    sort_order: index,
  };
}

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

function parseColors(value: string) {
  return value
    .split(',')
    .map((color) => color.trim())
    .filter(Boolean);
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [products, setProducts] = useState<SiteProduct[]>(
    fallbackProducts.map(toSiteProduct)
  );
  const [classes, setClasses] = useState<WorkshopClass[]>(
    fallbackWorkshops.map(toWorkshopClass)
  );
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

    const [productResult, classResult, reservationResult, reviewResult] =
      await Promise.all([
        supabaseClient
          .from('site_products')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabaseClient
          .from('workshop_classes')
          .select('*')
          .order('sort_order', { ascending: true }),
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

    if (!productResult.error && productResult.data?.length) {
      setProducts(productResult.data as SiteProduct[]);
    }

    if (!classResult.error && classResult.data?.length) {
      setClasses(classResult.data as WorkshopClass[]);
    }

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

  const updateProduct = (productId: string, patch: Partial<SiteProduct>) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, ...patch } : product
      )
    );
  };

  const updateClass = (classId: string, patch: Partial<WorkshopClass>) => {
    setClasses((currentClasses) =>
      currentClasses.map((workshopClass) =>
        workshopClass.id === classId
          ? { ...workshopClass, ...patch }
          : workshopClass
      )
    );
  };

  const saveProduct = async (product: SiteProduct) => {
    if (!supabase) return;

    setUpdatingId(product.id);

    const { error } = await supabase.from('site_products').upsert({
      ...product,
      updated_at: new Date().toISOString(),
    });

    setUpdatingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('제품 정보가 저장되었습니다.');
  };

  const saveClass = async (workshopClass: WorkshopClass) => {
    if (!supabase) return;

    setUpdatingId(workshopClass.id);

    const { error } = await supabase.from('workshop_classes').upsert({
      ...workshopClass,
      updated_at: new Date().toISOString(),
    });

    setUpdatingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('클래스 정보가 저장되었습니다.');
  };

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

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="border border-foreground/10 bg-card/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-foreground/55">제품</p>
                <Package className="size-4 text-accent" />
              </div>
              <p className="text-4xl font-semibold text-foreground">
                {products.length}
              </p>
            </div>
            <div className="border border-foreground/10 bg-card/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-foreground/55">클래스</p>
                <BookOpen className="size-4 text-accent" />
              </div>
              <p className="text-4xl font-semibold text-foreground">
                {classes.length}
              </p>
            </div>
            <div className="border border-foreground/10 bg-card/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-foreground/55">대기 리뷰</p>
                <MessageSquareText className="size-4 text-accent" />
              </div>
              <p className="text-4xl font-semibold text-foreground">
                {pendingReviewCount}
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
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto border-b border-foreground/10">
            {[
              ['products', '제품 관리'],
              ['classes', '클래스 관리'],
              ['reviews', '리뷰 관리'],
              ['reservations', '예약 관리'],
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as AdminTab)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-foreground/50 hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'products' && (
            <section className="space-y-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="border border-foreground/10 bg-card/60 p-5"
                >
                  <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="aspect-[4/5] w-full bg-secondary object-cover"
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm text-foreground/60">
                          제품명
                        </span>
                        <input
                          value={product.name}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              name: event.target.value,
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm text-foreground/60">
                          가격
                        </span>
                        <input
                          type="number"
                          value={product.price}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              price: Number(event.target.value),
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="mb-2 block text-sm text-foreground/60">
                          설명
                        </span>
                        <textarea
                          value={product.description}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              description: event.target.value,
                            })
                          }
                          rows={3}
                          className="w-full resize-none border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm text-foreground/60">
                          이미지 경로
                        </span>
                        <input
                          value={product.image}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              image: event.target.value,
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm text-foreground/60">
                          색상 HEX
                        </span>
                        <input
                          value={product.colors.join(', ')}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              colors: parseColors(event.target.value),
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <div className="grid grid-cols-3 gap-3 md:col-span-2">
                        <label>
                          <span className="mb-2 block text-sm text-foreground/60">
                            카테고리
                          </span>
                          <select
                            value={product.category}
                            onChange={(event) =>
                              updateProduct(product.id, {
                                category: event.target
                                  .value as SiteProduct['category'],
                              })
                            }
                            className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                          >
                            {Object.entries(productCategoryLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                        <label>
                          <span className="mb-2 block text-sm text-foreground/60">
                            배지
                          </span>
                          <select
                            value={product.badge ?? ''}
                            onChange={(event) =>
                              updateProduct(product.id, {
                                badge:
                                  event.target.value === ''
                                    ? null
                                    : (event.target
                                        .value as SiteProduct['badge']),
                              })
                            }
                            className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                          >
                            <option value="">없음</option>
                            <option value="NEW">NEW</option>
                            <option value="BEST">BEST</option>
                            <option value="CUSTOM">CUSTOM</option>
                          </select>
                        </label>
                        <label>
                          <span className="mb-2 block text-sm text-foreground/60">
                            정렬
                          </span>
                          <input
                            type="number"
                            value={product.sort_order}
                            onChange={(event) =>
                              updateProduct(product.id, {
                                sort_order: Number(event.target.value),
                              })
                            }
                            className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-between gap-3 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-foreground/65">
                          <input
                            type="checkbox"
                            checked={product.is_active}
                            onChange={(event) =>
                              updateProduct(product.id, {
                                is_active: event.target.checked,
                              })
                            }
                          />
                          노출
                        </label>
                        <button
                          type="button"
                          disabled={updatingId === product.id}
                          onClick={() => void saveProduct(product)}
                          className="inline-flex items-center gap-2 border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-40"
                        >
                          <Save className="size-4" />
                          저장
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}

          {activeTab === 'classes' && (
            <section className="space-y-4">
              {classes.map((workshopClass) => (
                <article
                  key={workshopClass.id}
                  className="border border-foreground/10 bg-card/60 p-5"
                >
                  <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
                    <img
                      src={workshopClass.image}
                      alt={workshopClass.name}
                      className="aspect-[4/5] w-full bg-secondary object-cover"
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <label>
                        <span className="mb-2 block text-sm text-foreground/60">
                          클래스명
                        </span>
                        <input
                          value={workshopClass.name}
                          onChange={(event) =>
                            updateClass(workshopClass.id, {
                              name: event.target.value,
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-sm text-foreground/60">
                          가격
                        </span>
                        <input
                          type="number"
                          value={workshopClass.price}
                          onChange={(event) =>
                            updateClass(workshopClass.id, {
                              price: Number(event.target.value),
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label className="md:col-span-2">
                        <span className="mb-2 block text-sm text-foreground/60">
                          설명
                        </span>
                        <textarea
                          value={workshopClass.description}
                          onChange={(event) =>
                            updateClass(workshopClass.id, {
                              description: event.target.value,
                            })
                          }
                          rows={3}
                          className="w-full resize-none border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-sm text-foreground/60">
                          이미지 경로
                        </span>
                        <input
                          value={workshopClass.image}
                          onChange={(event) =>
                            updateClass(workshopClass.id, {
                              image: event.target.value,
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-sm text-foreground/60">
                          소요 시간
                        </span>
                        <input
                          value={workshopClass.duration}
                          onChange={(event) =>
                            updateClass(workshopClass.id, {
                              duration: event.target.value,
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3 md:col-span-2">
                        <label>
                          <span className="mb-2 block text-sm text-foreground/60">
                            난이도
                          </span>
                          <select
                            value={workshopClass.level}
                            onChange={(event) =>
                              updateClass(workshopClass.id, {
                                level: event.target
                                  .value as WorkshopClass['level'],
                              })
                            }
                            className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                          >
                            {Object.entries(classLevelLabels).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                        <label>
                          <span className="mb-2 block text-sm text-foreground/60">
                            정렬
                          </span>
                          <input
                            type="number"
                            value={workshopClass.sort_order}
                            onChange={(event) =>
                              updateClass(workshopClass.id, {
                                sort_order: Number(event.target.value),
                              })
                            }
                            className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-between gap-3 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-foreground/65">
                          <input
                            type="checkbox"
                            checked={workshopClass.is_active}
                            onChange={(event) =>
                              updateClass(workshopClass.id, {
                                is_active: event.target.checked,
                              })
                            }
                          />
                          노출
                        </label>
                        <button
                          type="button"
                          disabled={updatingId === workshopClass.id}
                          onClick={() => void saveClass(workshopClass)}
                          className="inline-flex items-center gap-2 border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-40"
                        >
                          <Save className="size-4" />
                          저장
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}

          {activeTab === 'reviews' && (
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
                              <Star key={index} className="size-4 fill-accent" />
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

          {activeTab === 'reservations' && (
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
          )}
        </section>
      </main>
    </>
  );
}
