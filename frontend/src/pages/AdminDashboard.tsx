import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Copy,
  ImageUp,
  Link as LinkIcon,
  Mail,
  MessageSquareText,
  Package,
  Plus,
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
  type ContactInquiry,
  isSupabaseConfigured,
  type Profile,
  type SiteProduct,
  supabase,
  type WorkshopClass,
  type WorkshopReview,
} from '@/lib/supabase';

type AdminTab = 'products' | 'classes' | 'reviews' | 'reservations' | 'inquiries';
type ReviewDeliveryChannel = 'email' | 'sms';
type ReviewInviteType = Extract<
  NonNullable<WorkshopReview['review_type']>,
  'class' | 'product'
>;

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?.replace(/\/+$/, '');

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

const inquiryStatusLabels: Record<ContactInquiry['status'], string> = {
  new: '신규',
  read: '확인',
  replied: '답변 완료',
};

const reviewTypeLabels: Record<
  NonNullable<WorkshopReview['review_type']>,
  string
> = {
  class: '클래스',
  product: '제품',
  other: '기타',
};

const reviewInviteTypeOptions: Array<{
  value: ReviewInviteType;
  label: string;
}> = [
  { value: 'class', label: reviewTypeLabels.class },
  { value: 'product', label: reviewTypeLabels.product },
];

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
  new: 'border-accent/25 bg-accent/10 text-accent',
  read: 'border-primary/25 bg-primary/10 text-primary',
  replied: 'border-foreground/20 bg-foreground/5 text-foreground/55',
};

const ADMIN_IMAGE_BUCKET = 'admin-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

function createAdminItemId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getSafeFileName(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const baseName = fileName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return `${baseName || 'image'}-${Date.now()}.${extension}`;
}

function createReviewToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createDraftProduct(sortOrder: number): SiteProduct {
  return {
    id: createAdminItemId('prod'),
    name: 'New Product',
    description: '',
    price: 0,
    colors: ['#7C4F38'],
    badge: null,
    image: '/rh-images/rh-01.png',
    category: 'wallets',
    is_active: true,
    sort_order: sortOrder,
  };
}

function createDraftClass(sortOrder: number): WorkshopClass {
  return {
    id: createAdminItemId('ws'),
    name: 'New Class',
    description: '',
    duration: '2시간',
    level: 'beginner',
    price: 0,
    image: '/rh-images/rh-08.png',
    is_active: true,
    sort_order: sortOrder,
  };
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { session, loading, isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [products, setProducts] = useState<SiteProduct[]>(
    fallbackProducts.map(toSiteProduct)
  );
  const [classes, setClasses] = useState<WorkshopClass[]>(
    fallbackWorkshops.map(toWorkshopClass)
  );
  const [reservations, setReservations] = useState<ClassReservation[]>([]);
  const [reviews, setReviews] = useState<WorkshopReview[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [inviteCustomerName, setInviteCustomerName] = useState('');
  const [inviteReviewType, setInviteReviewType] =
    useState<ReviewInviteType>('class');
  const [inviteProductName, setInviteProductName] = useState('');
  const [inviteClassName, setInviteClassName] = useState('');
  const [generatedReviewUrl, setGeneratedReviewUrl] = useState('');
  const [generatedReviewCustomerName, setGeneratedReviewCustomerName] =
    useState('');
  const [reviewDeliveryChannel, setReviewDeliveryChannel] =
    useState<ReviewDeliveryChannel>('email');
  const [reviewRecipientEmail, setReviewRecipientEmail] = useState('');
  const [reviewRecipientPhone, setReviewRecipientPhone] = useState('');
  const [reviewInviteMessage, setReviewInviteMessage] = useState(
    'Romantic Hamilton을 이용해주셔서 감사합니다. 아래 링크에서 후기를 남겨주세요.'
  );
  const [sendingReviewInvite, setSendingReviewInvite] = useState(false);

  const loadAdminData = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const supabaseClient = supabase;

    const [
      productResult,
      classResult,
      reservationResult,
      reviewResult,
      inquiryResult,
      profileResult,
    ] =
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
        supabaseClient
          .from('contact_inquiries')
          .select('*')
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('profiles')
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

    if (inquiryResult.error) {
      toast.error(inquiryResult.error.message);
    } else {
      setInquiries((inquiryResult.data ?? []) as ContactInquiry[]);
    }

    if (profileResult.error) {
      toast.error(profileResult.error.message);
    } else {
      setProfiles((profileResult.data ?? []) as Profile[]);
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

  const newInquiryCount = useMemo(
    () => inquiries.filter((inquiry) => inquiry.status === 'new').length,
    [inquiries]
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

  const addProduct = () => {
    setProducts((currentProducts) => [
      createDraftProduct(currentProducts.length),
      ...currentProducts,
    ]);
  };

  const addClass = () => {
    setClasses((currentClasses) => [
      createDraftClass(currentClasses.length),
      ...currentClasses,
    ]);
  };

  const uploadAdminImage = async (file: File, folder: 'products' | 'classes') => {
    if (!supabase) {
      toast.error('Supabase 설정이 필요합니다.');
      return null;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return null;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('이미지는 5MB 이하만 업로드할 수 있습니다.');
      return null;
    }

    const filePath = `${folder}/${getSafeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from(ADMIN_IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      toast.error(error.message);
      return null;
    }

    const { data } = supabase.storage
      .from(ADMIN_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const uploadProductImage = async (productId: string, file: File) => {
    setUploadingImageId(productId);
    const publicUrl = await uploadAdminImage(file, 'products');
    setUploadingImageId(null);

    if (!publicUrl) return;

    updateProduct(productId, { image: publicUrl });
    toast.success('제품 사진이 등록되었습니다. 저장을 눌러 반영해주세요.');
  };

  const uploadClassImage = async (classId: string, file: File) => {
    setUploadingImageId(classId);
    const publicUrl = await uploadAdminImage(file, 'classes');
    setUploadingImageId(null);

    if (!publicUrl) return;

    updateClass(classId, { image: publicUrl });
    toast.success('클래스 사진이 등록되었습니다. 저장을 눌러 반영해주세요.');
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

  const createReviewInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!supabase) return;

    const customerName = inviteCustomerName.trim();
    const token = createReviewToken();
    const { error } = await supabase.rpc('create_review_invite', {
      invite_token: token,
      customer_name: customerName,
      review_type: inviteReviewType,
      product_name: inviteProductName.trim(),
      class_name: inviteClassName.trim(),
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const reviewUrl = `${window.location.origin}/review/write/${inviteReviewType}?token=${token}`;
    setGeneratedReviewUrl(reviewUrl);
    setGeneratedReviewCustomerName(customerName);
    setInviteCustomerName('');
    setInviteProductName('');
    setInviteClassName('');
    toast.success('리뷰 링크가 생성되었습니다.');
  };

  const copyReviewInviteUrl = async () => {
    if (!generatedReviewUrl) return;

    await navigator.clipboard.writeText(generatedReviewUrl);
    toast.success('리뷰 링크를 복사했습니다.');
  };

  const reviewInviteText = `${reviewInviteMessage.trim()}\n\n${generatedReviewUrl}\n\n리뷰 링크는 1회만 사용할 수 있으며 7일 후 만료됩니다.`;

  const sendReviewInviteEmail = async () => {
    if (!generatedReviewUrl) {
      toast.error('먼저 리뷰 링크를 생성해주세요.');
      return;
    }

    if (!reviewRecipientEmail.trim()) {
      toast.error('받는 이메일을 입력해주세요.');
      return;
    }

    if (!session?.access_token) {
      toast.error('관리자 로그인이 필요합니다.');
      return;
    }

    setSendingReviewInvite(true);

    try {
      const response = await fetch(`${apiBaseUrl ?? ''}/api/review-invite/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: reviewRecipientEmail.trim(),
          customerName: generatedReviewCustomerName,
          reviewUrl: generatedReviewUrl,
          message: reviewInviteMessage.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('review_invite_email_failed');
      }

      toast.success('리뷰 요청 메일을 보냈습니다.');
    } catch (error) {
      console.error('Review invite email failed', error);
      toast.error('리뷰 요청 메일을 보내지 못했습니다.');
    } finally {
      setSendingReviewInvite(false);
    }
  };

  const copyReviewInviteMessage = async () => {
    if (!generatedReviewUrl) {
      toast.error('먼저 리뷰 링크를 생성해주세요.');
      return;
    }

    await navigator.clipboard.writeText(reviewInviteText);
    toast.success('리뷰 요청 문구를 복사했습니다.');
  };

  const updateReviewAuthor = async (reviewId: string, userId: string | null) => {
    if (!supabase) return;

    setUpdatingId(reviewId);

    const { error } = await supabase
      .from('workshop_reviews')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', reviewId);

    setUpdatingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setReviews((currentReviews) =>
      currentReviews.map((review) =>
        review.id === reviewId ? { ...review, user_id: userId } : review
      )
    );
    toast.success('리뷰 작성자가 변경되었습니다.');
  };

  const updateInquiryStatus = async (
    inquiryId: string,
    status: ContactInquiry['status']
  ) => {
    if (!supabase) return;

    setUpdatingId(inquiryId);

    const { error } = await supabase
      .from('contact_inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', inquiryId);

    setUpdatingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setInquiries((currentInquiries) =>
      currentInquiries.map((inquiry) =>
        inquiry.id === inquiryId ? { ...inquiry, status } : inquiry
      )
    );
    toast.success('문의 상태가 변경되었습니다.');
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

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-5">
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
            <div className="border border-foreground/10 bg-card/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-foreground/55">신규 문의</p>
                <Mail className="size-4 text-accent" />
              </div>
              <p className="text-4xl font-semibold text-foreground">
                {newInquiryCount}
              </p>
            </div>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto border-b border-foreground/10">
            {[
              ['products', '제품 관리'],
              ['classes', '클래스 관리'],
              ['reviews', '리뷰 관리'],
              ['reservations', '예약 관리'],
              ['inquiries', '문의 관리'],
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addProduct}
                  className="inline-flex items-center gap-2 border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground"
                >
                  <Plus className="size-4" />
                  새 제품 추가
                </button>
              </div>
              {products.map((product) => (
                <article
                  key={product.id}
                  className="border border-foreground/10 bg-card/60 p-5"
                >
                  <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="space-y-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="aspect-[4/5] w-full border border-foreground/10 bg-secondary object-cover"
                      />
                      <label className="flex cursor-pointer items-center justify-center gap-2 border border-foreground/15 px-3 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground">
                        <ImageUp className="size-4" />
                        {uploadingImageId === product.id ? '업로드 중' : '사진 등록'}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploadingImageId === product.id}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (!file) return;
                            void uploadProductImage(product.id, file);
                          }}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs text-foreground/45">
                          이미지 URL
                        </span>
                        <input
                          value={product.image}
                          onChange={(event) =>
                            updateProduct(product.id, {
                              image: event.target.value,
                            })
                          }
                          className="w-full truncate border-b border-foreground/20 bg-transparent py-1.5 text-xs text-foreground/55 outline-none focus:border-foreground"
                        />
                      </label>
                    </div>
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addClass}
                  className="inline-flex items-center gap-2 border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground"
                >
                  <Plus className="size-4" />
                  새 클래스 추가
                </button>
              </div>
              {classes.map((workshopClass) => (
                <article
                  key={workshopClass.id}
                  className="border border-foreground/10 bg-card/60 p-5"
                >
                  <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="space-y-3">
                      <img
                        src={workshopClass.image}
                        alt={workshopClass.name}
                        className="aspect-[4/5] w-full border border-foreground/10 bg-secondary object-cover"
                      />
                      <label className="flex cursor-pointer items-center justify-center gap-2 border border-foreground/15 px-3 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground">
                        <ImageUp className="size-4" />
                        {uploadingImageId === workshopClass.id
                          ? '업로드 중'
                          : '사진 등록'}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploadingImageId === workshopClass.id}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (!file) return;
                            void uploadClassImage(workshopClass.id, file);
                          }}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs text-foreground/45">
                          이미지 URL
                        </span>
                        <input
                          value={workshopClass.image}
                          onChange={(event) =>
                            updateClass(workshopClass.id, {
                              image: event.target.value,
                            })
                          }
                          className="w-full truncate border-b border-foreground/20 bg-transparent py-1.5 text-xs text-foreground/55 outline-none focus:border-foreground"
                        />
                      </label>
                    </div>
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
              <form
                onSubmit={createReviewInvite}
                className="border border-foreground/10 bg-card/60 p-5"
              >
                <div className="mb-5 flex items-start gap-3">
                  <LinkIcon className="mt-1 size-4 text-accent" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      리뷰 링크 만들기
                    </h2>
                    <p className="mt-1 text-sm text-foreground/55">
                      로그인 없이 작성 가능한 1회용 리뷰 링크입니다. 생성 후 7일 동안만 사용할 수 있습니다.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <label>
                    <span className="mb-2 block text-sm text-foreground/60">
                      고객명
                    </span>
                    <input
                      value={inviteCustomerName}
                      onChange={(event) =>
                        setInviteCustomerName(event.target.value)
                      }
                      className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-foreground/60">
                      리뷰 유형
                    </span>
                    <select
                      value={inviteReviewType}
                      onChange={(event) =>
                        setInviteReviewType(
                          event.target.value as ReviewInviteType
                        )
                      }
                      className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                    >
                      {reviewInviteTypeOptions.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-foreground/60">
                      제품명
                    </span>
                    <input
                      value={inviteProductName}
                      onChange={(event) =>
                        setInviteProductName(event.target.value)
                      }
                      disabled={inviteReviewType !== 'product'}
                      className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground disabled:opacity-35"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm text-foreground/60">
                      클래스명
                    </span>
                    <input
                      value={inviteClassName}
                      onChange={(event) =>
                        setInviteClassName(event.target.value)
                      }
                      disabled={inviteReviewType !== 'class'}
                      className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground disabled:opacity-35"
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground"
                  >
                    <LinkIcon className="size-4" />
                    링크 생성
                  </button>
                  {generatedReviewUrl && (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        value={generatedReviewUrl}
                        readOnly
                        className="min-w-0 flex-1 truncate border-b border-foreground/20 bg-transparent py-2 text-xs text-foreground/55 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void copyReviewInviteUrl()}
                        className="inline-flex shrink-0 items-center gap-2 border border-foreground/15 px-3 py-2 text-xs text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground"
                      >
                        <Copy className="size-3.5" />
                        복사
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-foreground/10 pt-5">
                  <div className="mb-4 flex gap-2">
                    {(['email', 'sms'] as const).map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => setReviewDeliveryChannel(channel)}
                        className={`border px-3 py-2 text-xs transition-colors ${
                          reviewDeliveryChannel === channel
                            ? 'border-foreground text-foreground'
                            : 'border-foreground/15 text-foreground/55 hover:border-foreground/35 hover:text-foreground'
                        }`}
                      >
                        {channel === 'email' ? '메일 폼' : '문자 폼'}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
                    <label>
                      <span className="mb-2 block text-sm text-foreground/60">
                        {reviewDeliveryChannel === 'email'
                          ? '받는 이메일'
                          : '휴대폰 번호'}
                      </span>
                      <input
                        type={reviewDeliveryChannel === 'email' ? 'email' : 'tel'}
                        value={
                          reviewDeliveryChannel === 'email'
                            ? reviewRecipientEmail
                            : reviewRecipientPhone
                        }
                        onChange={(event) =>
                          reviewDeliveryChannel === 'email'
                            ? setReviewRecipientEmail(event.target.value)
                            : setReviewRecipientPhone(event.target.value)
                        }
                        placeholder={
                          reviewDeliveryChannel === 'email'
                            ? 'name@example.com'
                            : '010-1234-5678'
                        }
                        className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                      />
                    </label>

                    <label>
                      <span className="mb-2 block text-sm text-foreground/60">
                        요청 문구
                      </span>
                      <textarea
                        value={reviewInviteMessage}
                        onChange={(event) =>
                          setReviewInviteMessage(event.target.value)
                        }
                        rows={3}
                        className="w-full resize-none border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <span className="mb-2 block text-sm text-foreground/60">
                      {reviewDeliveryChannel === 'email'
                        ? '메일 미리보기'
                        : '문자 문구'}
                    </span>
                    <textarea
                      value={reviewInviteText}
                      readOnly
                      rows={5}
                      className="w-full resize-none border border-foreground/10 bg-background/60 p-3 text-sm leading-relaxed text-foreground/60 outline-none"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {reviewDeliveryChannel === 'email' ? (
                      <button
                        type="button"
                        disabled={sendingReviewInvite}
                        onClick={() => void sendReviewInviteEmail()}
                        className="inline-flex items-center gap-2 border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-40"
                      >
                        메일 발송
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void copyReviewInviteMessage()}
                        className="inline-flex items-center gap-2 border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground"
                      >
                        문자 문구 복사
                      </button>
                    )}
                  </div>
                </div>
              </form>

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

                    <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="text-xs text-foreground/50">
                        <span className="mr-2">
                          {reviewTypeLabels[review.review_type ?? 'class']}
                        </span>
                        {review.product_name && <span>{review.product_name}</span>}
                        {review.class_name && <span>{review.class_name}</span>}
                      </div>
                      <label>
                        <span className="mb-1 block text-xs text-foreground/45">
                          작성자 연결
                        </span>
                        <select
                          value={review.user_id ?? ''}
                          disabled={updatingId === review.id}
                          onChange={(event) =>
                            void updateReviewAuthor(
                              review.id,
                              event.target.value || null
                            )
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 text-sm outline-none focus:border-foreground disabled:opacity-40"
                        >
                          <option value="">작성자 없음</option>
                          {profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.display_name ||
                                profile.email ||
                                profile.id}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

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

          {activeTab === 'inquiries' && (
            <section className="space-y-4">
              {inquiries.length === 0 ? (
                <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
                  문의 내역이 없습니다.
                </p>
              ) : (
                inquiries.map((inquiry) => (
                  <article
                    key={inquiry.id}
                    className="border border-foreground/10 bg-card/60 p-5"
                  >
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="mb-2 text-sm text-foreground/55">
                          {formatDateTime(inquiry.created_at)}
                        </p>
                        <h2 className="text-xl font-semibold text-foreground">
                          {inquiry.name}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/55">
                          <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
                          <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                          <span>
                            메일 {inquiry.email_sent ? '발송 완료' : '발송 실패'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`w-fit border px-2 py-1 text-xs ${statusClassNames[inquiry.status]}`}
                      >
                        {inquiryStatusLabels[inquiry.status]}
                      </span>
                    </div>

                    <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
                      {inquiry.message}
                    </p>

                    {inquiry.email_error && (
                      <p className="mb-4 border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                        메일 오류: {inquiry.email_error}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {(['new', 'read', 'replied'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={
                            updatingId === inquiry.id ||
                            inquiry.status === status
                          }
                          onClick={() =>
                            void updateInquiryStatus(inquiry.id, status)
                          }
                          className="border border-foreground/15 px-3 py-2 text-xs text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-40"
                        >
                          {inquiryStatusLabels[status]}
                        </button>
                      ))}
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
                        {reservation.phone && (
                          <a
                            href={`tel:${reservation.phone}`}
                            className="mt-2 block text-sm text-foreground/55"
                          >
                            {reservation.phone}
                          </a>
                        )}
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
