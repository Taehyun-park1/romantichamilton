import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Image as ImageIcon,
  ImageUp,
  Link as LinkIcon,
  Mail,
  MessageSquareText,
  Package,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Star,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { fallbackHeroImages } from '@/components/Hero';
import { products as fallbackProducts, workshops as fallbackWorkshops } from '@/data/products';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePhoneNumber } from '@/lib/phone';
import { getKoreanErrorMessage } from '@/lib/messages';
import {
  applyDesignPreset,
  designPresets,
  type SiteDesignPresetId,
} from '@/lib/designPresets';
import {
  type ClassReservation,
  type ContactInquiry,
  isSupabaseConfigured,
  type Profile,
  type ReservationBlockedDate,
  type SiteHeroImage,
  type SiteProduct,
  supabase,
  type WorkshopClass,
  type WorkshopReview,
} from '@/lib/supabase';

type AdminTab =
  | 'design'
  | 'carousel'
  | 'products'
  | 'classes'
  | 'reviews'
  | 'reservations'
  | 'inquiries';
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

function toHeroImage(image: string, index: number): SiteHeroImage {
  return {
    id: `hero-${String(index + 1).padStart(3, '0')}`,
    image,
    alt: `Romantic Hamilton hero ${index + 1}`,
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

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
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
      groups[reservation.preferred_date] = [
        ...(groups[reservation.preferred_date] ?? []),
        reservation,
      ];

      return groups;
    },
    {}
  );
}

function getProfileDisplayName(profile: Profile | undefined, fallbackId: string) {
  return (
    profile?.display_name ||
    profile?.email ||
    fallbackId.slice(0, 8)
  );
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

function createDraftHeroImage(sortOrder: number): SiteHeroImage {
  return {
    id: createAdminItemId('hero'),
    image: '/rh-images/rh-01.png',
    alt: 'Romantic Hamilton hero',
    is_active: true,
    sort_order: sortOrder,
  };
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { session, loading, isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('design');
  const [heroImages, setHeroImages] = useState<SiteHeroImage[]>(
    fallbackHeroImages.map(toHeroImage)
  );
  const [products, setProducts] = useState<SiteProduct[]>(
    fallbackProducts.map(toSiteProduct)
  );
  const [classes, setClasses] = useState<WorkshopClass[]>(
    fallbackWorkshops.map(toWorkshopClass)
  );
  const [activeDesignPresetId, setActiveDesignPresetId] =
    useState<SiteDesignPresetId>('default');
  const [reservations, setReservations] = useState<ClassReservation[]>([]);
  const [blockedDates, setBlockedDates] = useState<ReservationBlockedDate[]>([]);
  const [reservationView, setReservationView] = useState<'calendar' | 'list'>(
    'calendar'
  );
  const [reservationCalendarMonth, setReservationCalendarMonth] = useState(
    () => new Date()
  );
  const [selectedReservationDate, setSelectedReservationDate] = useState(
    () => getLocalDateKey(new Date())
  );
  const [reviews, setReviews] = useState<WorkshopReview[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<
    ContactInquiry['status'] | 'all'
  >('all');
  const [inquirySearchTerm, setInquirySearchTerm] = useState('');
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
  const [generatedReviewTargetName, setGeneratedReviewTargetName] =
    useState('');
  const [generatedReviewType, setGeneratedReviewType] =
    useState<ReviewInviteType>('class');
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
      heroResult,
      productResult,
      classResult,
      reservationResult,
      blockedDateResult,
      reviewResult,
      inquiryResult,
      profileResult,
      designResult,
    ] =
      await Promise.all([
        supabaseClient
          .from('site_hero_images')
          .select('*')
          .order('sort_order', { ascending: true }),
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
          .from('reservation_blocked_dates')
          .select('*')
          .order('blocked_date', { ascending: true }),
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
        supabaseClient
          .from('site_design_settings')
          .select('*')
          .eq('id', 'active')
          .maybeSingle(),
      ]);

    if (!heroResult.error && heroResult.data?.length) {
      setHeroImages(heroResult.data as SiteHeroImage[]);
    }

    if (!productResult.error && productResult.data?.length) {
      setProducts(productResult.data as SiteProduct[]);
    }

    if (!classResult.error && classResult.data?.length) {
      setClasses(classResult.data as WorkshopClass[]);
    }

    if (reservationResult.error) {
      toast.error(getKoreanErrorMessage(reservationResult.error));
    } else {
      setReservations((reservationResult.data ?? []) as ClassReservation[]);
    }

    if (blockedDateResult.error) {
      toast.error(getKoreanErrorMessage(blockedDateResult.error));
    } else {
      setBlockedDates(
        (blockedDateResult.data ?? []) as ReservationBlockedDate[]
      );
    }

    if (reviewResult.error) {
      toast.error(getKoreanErrorMessage(reviewResult.error));
    } else {
      setReviews((reviewResult.data ?? []) as WorkshopReview[]);
    }

    if (inquiryResult.error) {
      toast.error(getKoreanErrorMessage(inquiryResult.error));
    } else {
      setInquiries((inquiryResult.data ?? []) as ContactInquiry[]);
    }

    if (profileResult.error) {
      toast.error(getKoreanErrorMessage(profileResult.error));
    } else {
      setProfiles((profileResult.data ?? []) as Profile[]);
    }

    if (!designResult.error && designResult.data?.preset_id) {
      const presetId = designResult.data.preset_id as SiteDesignPresetId;
      setActiveDesignPresetId(presetId);
      applyDesignPreset(presetId);
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

  const profilesById = useMemo(
    () =>
      profiles.reduce<Record<string, Profile>>((profileMap, profile) => {
        profileMap[profile.id] = profile;
        return profileMap;
      }, {}),
    [profiles]
  );

  const reservationsByDate = useMemo(
    () => groupReservationsByDate(reservations),
    [reservations]
  );

  const blockedDateKeys = useMemo(
    () => new Set(blockedDates.map((blockedDate) => blockedDate.blocked_date)),
    [blockedDates]
  );

  const reservationCalendarDays = useMemo(
    () => createCalendarDays(reservationCalendarMonth),
    [reservationCalendarMonth]
  );

  const selectedDateReservations =
    reservationsByDate[selectedReservationDate] ?? [];
  const selectedDateBlocked = blockedDateKeys.has(selectedReservationDate);

  const filteredInquiries = useMemo(() => {
    const normalizedSearchTerm = inquirySearchTerm.trim().toLowerCase();

    return inquiries.filter((inquiry) => {
      if (
        inquiryStatusFilter !== 'all' &&
        inquiry.status !== inquiryStatusFilter
      ) {
        return false;
      }

      if (!normalizedSearchTerm) return true;

      return [
        inquiry.name,
        inquiry.phone,
        inquiry.email,
        inquiry.message,
      ].some((value) => value.toLowerCase().includes(normalizedSearchTerm));
    });
  }, [inquiries, inquirySearchTerm, inquiryStatusFilter]);

  const updateHeroImage = (
    heroImageId: string,
    patch: Partial<SiteHeroImage>
  ) => {
    setHeroImages((currentHeroImages) =>
      currentHeroImages.map((heroImage) =>
        heroImage.id === heroImageId ? { ...heroImage, ...patch } : heroImage
      )
    );
  };

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

  const addHeroImage = () => {
    setHeroImages((currentHeroImages) => [
      createDraftHeroImage(currentHeroImages.length),
      ...currentHeroImages,
    ]);
  };

  const addClass = () => {
    setClasses((currentClasses) => [
      createDraftClass(currentClasses.length),
      ...currentClasses,
    ]);
  };

  const uploadAdminImage = async (
    file: File,
    folder: 'hero' | 'products' | 'classes'
  ) => {
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
      toast.error(getKoreanErrorMessage(error));
      return null;
    }

    const { data } = supabase.storage
      .from(ADMIN_IMAGE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const uploadHeroImage = async (heroImageId: string, file: File) => {
    setUploadingImageId(heroImageId);
    const publicUrl = await uploadAdminImage(file, 'hero');
    setUploadingImageId(null);

    if (!publicUrl) return;

    updateHeroImage(heroImageId, { image: publicUrl });
    toast.success('캐러셀 사진이 등록되었습니다. 저장을 눌러 반영해 주세요.');
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

  const saveHeroImage = async (heroImage: SiteHeroImage) => {
    if (!supabase) return;

    setUpdatingId(heroImage.id);

    const { error } = await supabase.from('site_hero_images').upsert({
      ...heroImage,
      updated_at: new Date().toISOString(),
    });

    setUpdatingId(null);

    if (error) {
      toast.error(getKoreanErrorMessage(error));
      return;
    }

    toast.success('캐러셀 이미지가 저장되었습니다.');
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
      toast.error(getKoreanErrorMessage(error));
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
      toast.error(getKoreanErrorMessage(error));
      return;
    }

    toast.success('클래스 정보가 저장되었습니다.');
  };

  const saveDesignPreset = async () => {
    if (!supabase) return;

    setUpdatingId('design-preset');

    const { error } = await supabase.from('site_design_settings').upsert({
      id: 'active',
      preset_id: activeDesignPresetId,
      updated_at: new Date().toISOString(),
    });

    setUpdatingId(null);

    if (error) {
      toast.error(getKoreanErrorMessage(error));
      return;
    }

    applyDesignPreset(activeDesignPresetId);
    window.dispatchEvent(
      new CustomEvent('site-design-preset-updated', {
        detail: { presetId: activeDesignPresetId },
      })
    );
    toast.success('디자인 프리셋이 저장되었습니다.');
  };

  const updateReservationStatus = async (
    reservationId: string,
    status: ClassReservation['status']
  ) => {
    if (!supabase) return;

    const targetReservation = reservations.find(
      (reservation) => reservation.id === reservationId
    );
    const previousStatus = targetReservation?.status;

    setUpdatingId(reservationId);

    const { error } = await supabase
      .from('class_reservations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reservationId);

    setUpdatingId(null);

    if (error) {
      toast.error(getKoreanErrorMessage(error));
      return;
    }

    setReservations((currentReservations) =>
      currentReservations.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, status } : reservation
      )
    );
    toast.success('예약 상태가 변경되었습니다.');

    if (
      status !== 'confirmed' ||
      previousStatus === 'confirmed' ||
      !targetReservation
    ) {
      return;
    }

    if (!session?.access_token) {
      toast.error('관리자 인증이 만료되어 확정 메일을 보내지 못했습니다.');
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl ?? ''}/api/reservations/confirmation-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            reservationId: targetReservation.id,
          }),
        }
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error || 'reservation_confirmation_email_failed'
        );
      }

      toast.success('예약 확정 메일을 보냈습니다.');
    } catch (emailError) {
      console.error('Reservation confirmation email failed', emailError);
      const message =
        emailError instanceof Error ? emailError.message : '';
      const errorMessage =
        message === 'reservation_email_missing'
          ? '예약자 이메일을 찾지 못해 확정 메일을 보내지 못했습니다.'
          : message === 'resend_not_configured'
            ? 'Resend 메일 환경변수가 설정되지 않았습니다.'
            : message === 'supabase_admin_not_configured'
              ? 'Supabase 관리자 키가 설정되지 않았습니다.'
              : '예약은 확정됐지만 확정 메일 발송에 실패했습니다.';

      toast.error(errorMessage);
    }
  };

  const updateReservationAdminNoteDraft = (
    reservationId: string,
    adminNote: string
  ) => {
    setReservations((currentReservations) =>
      currentReservations.map((reservation) =>
        reservation.id === reservationId
          ? { ...reservation, admin_note: adminNote }
          : reservation
      )
    );
  };

  const saveReservationAdminNote = async (reservation: ClassReservation) => {
    if (!supabase) return;

    setUpdatingId(reservation.id);

    const { error } = await supabase
      .from('class_reservations')
      .update({
        admin_note: reservation.admin_note?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservation.id);

    setUpdatingId(null);

    if (error) {
      toast.error(getKoreanErrorMessage(error));
      return;
    }

    toast.success('관리자 메모가 저장되었습니다.');
  };

  const moveReservationCalendarMonth = (amount: number) => {
    setReservationCalendarMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1)
    );
  };

  const selectReservationCalendarDate = (dateKey: string) => {
    setSelectedReservationDate(dateKey);
    const nextDate = parseLocalDate(dateKey);
    if (nextDate) setReservationCalendarMonth(nextDate);
  };

  const toggleReservationBlockedDate = async (dateKey: string) => {
    if (!supabase) return;

    setUpdatingId(`blocked-date-${dateKey}`);

    if (blockedDateKeys.has(dateKey)) {
      const { error } = await supabase
        .from('reservation_blocked_dates')
        .delete()
        .eq('blocked_date', dateKey);

      setUpdatingId(null);

      if (error) {
        toast.error(getKoreanErrorMessage(error));
        return;
      }

      setBlockedDates((currentDates) =>
        currentDates.filter((blockedDate) => blockedDate.blocked_date !== dateKey)
      );
      toast.success('예약 비활성화가 해제되었습니다.');
      return;
    }

    const { error } = await supabase.from('reservation_blocked_dates').insert({
      blocked_date: dateKey,
      reason: null,
    });

    setUpdatingId(null);

    if (error) {
      toast.error(getKoreanErrorMessage(error));
      return;
    }

    setBlockedDates((currentDates) => [
      ...currentDates,
      { blocked_date: dateKey, reason: null },
    ]);
    toast.success('해당 날짜 예약을 비활성화했습니다.');
  };

  const updateReviewStatus = async (
    reviewId: string,
    status: WorkshopReview['status']
  ) => {
    if (!session?.access_token) {
      toast.error('관리자 로그인이 필요합니다.');
      return;
    }

    setUpdatingId(reviewId);

    const response = await fetch(`${apiBaseUrl ?? ''}/api/admin/reviews/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        reviewId,
        status,
      }),
    });

    setUpdatingId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      toast.error(getKoreanErrorMessage(payload?.error || 'review_status_update_failed'));
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
    const targetName =
      inviteReviewType === 'product'
        ? inviteProductName.trim()
        : inviteClassName.trim();
    const token = createReviewToken();
    const { error } = await supabase.rpc('create_review_invite', {
      invite_token: token,
      customer_name: customerName,
      review_type: inviteReviewType,
      product_name: inviteProductName.trim(),
      class_name: inviteClassName.trim(),
    });

    if (error) {
      toast.error(getKoreanErrorMessage(error));
      return;
    }

    const reviewUrl = `${window.location.origin}/review/write/${inviteReviewType}?token=${token}`;
    setGeneratedReviewUrl(reviewUrl);
    setGeneratedReviewCustomerName(customerName);
    setGeneratedReviewTargetName(targetName);
    setGeneratedReviewType(inviteReviewType);
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

  const currentInviteTargetName =
    generatedReviewTargetName ||
    (inviteReviewType === 'product'
      ? inviteProductName.trim()
      : inviteClassName.trim());
  const currentInviteCustomerName =
    generatedReviewCustomerName || inviteCustomerName.trim() || '고객';
  const currentInviteTypeLabel =
    reviewTypeLabels[generatedReviewUrl ? generatedReviewType : inviteReviewType];
  const reviewInviteText = [
    `${currentInviteCustomerName}님, Romantic Hamilton ${currentInviteTypeLabel} 이용 후기를 부탁드립니다.`,
    currentInviteTargetName ? `대상: ${currentInviteTargetName}` : '',
    reviewInviteMessage.trim(),
    generatedReviewUrl,
    '리뷰 링크는 1회만 사용할 수 있으며 7일 후 만료됩니다.',
  ]
    .filter(Boolean)
    .join('\n\n');

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
      toast.error(getKoreanErrorMessage(error));
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
      toast.error(getKoreanErrorMessage(error));
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

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="border border-foreground/10 bg-card/60 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-foreground/55">캐러셀</p>
                <ImageIcon className="size-4 text-accent" />
              </div>
              <p className="text-4xl font-semibold text-foreground">
                {heroImages.length}
              </p>
            </div>
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
              ['design', '디자인'],
              ['carousel', '캐러셀 관리'],
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

          {activeTab === 'design' && (
            <section className="space-y-5">
              <div className="border border-foreground/10 bg-card/60 p-5">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-accent">
                      <Palette className="size-4" />
                      Design Preset
                    </p>
                    <h2 className="text-2xl font-semibold text-foreground">
                      시즌 디자인 프리셋
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/55">
                      계절이나 기념일에 맞춰 사이트 전체 색감을 빠르게 바꿀 수 있습니다.
                      저장하면 방문자 화면에도 같은 프리셋이 적용됩니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={updatingId === 'design-preset'}
                    onClick={() => void saveDesignPreset()}
                    className="inline-flex items-center justify-center gap-2 border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-40"
                  >
                    <Save className="size-4" />
                    저장
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {designPresets.map((preset) => {
                    const selected = activeDesignPresetId === preset.id;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setActiveDesignPresetId(preset.id);
                          applyDesignPreset(preset.id);
                        }}
                        className={`border p-4 text-left transition-colors ${
                          selected
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-foreground/10 bg-background/60 text-foreground hover:border-foreground/30'
                        }`}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <p
                              className={`text-xs uppercase tracking-[0.14em] ${
                                selected ? 'text-background/60' : 'text-accent'
                              }`}
                            >
                              {preset.season}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold">
                              {preset.name}
                            </h3>
                          </div>
                          {selected && (
                            <span className="border border-background/20 px-2 py-1 text-xs text-background/75">
                              선택됨
                            </span>
                          )}
                        </div>
                        <p
                          className={`mb-5 text-sm leading-relaxed ${
                            selected ? 'text-background/70' : 'text-foreground/55'
                          }`}
                        >
                          {preset.description}
                        </p>
                        <div className="flex gap-2">
                          {[
                            preset.variables['--background'],
                            preset.variables['--foreground'],
                            preset.variables['--primary'],
                            preset.variables['--accent'],
                            preset.variables['--secondary'],
                          ].map((color) => (
                            <span
                              key={color}
                              className={`size-7 border ${
                                selected
                                  ? 'border-background/25'
                                  : 'border-foreground/10'
                              }`}
                              style={{ backgroundColor: color }}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'carousel' && (
            <section className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addHeroImage}
                  className="inline-flex items-center gap-2 border border-foreground/15 px-4 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground"
                >
                  <Plus className="size-4" />
                  새 이미지 추가
                </button>
              </div>

              {heroImages.map((heroImage) => (
                <article
                  key={heroImage.id}
                  className="border border-foreground/10 bg-card/60 p-5"
                >
                  <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="space-y-3">
                      <img
                        src={heroImage.image}
                        alt={heroImage.alt ?? 'Romantic Hamilton hero'}
                        className="aspect-video w-full border border-foreground/10 bg-secondary object-cover"
                      />
                      <label className="flex cursor-pointer items-center justify-center gap-2 border border-foreground/15 px-3 py-2.5 text-sm text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground">
                        <ImageUp className="size-4" />
                        {uploadingImageId === heroImage.id
                          ? '업로드 중'
                          : '사진 등록'}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploadingImageId === heroImage.id}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (!file) return;
                            void uploadHeroImage(heroImage.id, file);
                          }}
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="md:col-span-2">
                        <span className="mb-2 block text-sm text-foreground/60">
                          이미지 URL
                        </span>
                        <input
                          value={heroImage.image}
                          onChange={(event) =>
                            updateHeroImage(heroImage.id, {
                              image: event.target.value,
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-sm text-foreground/60">
                          대체 텍스트
                        </span>
                        <input
                          value={heroImage.alt ?? ''}
                          onChange={(event) =>
                            updateHeroImage(heroImage.id, {
                              alt: event.target.value || null,
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <label>
                        <span className="mb-2 block text-sm text-foreground/60">
                          정렬
                        </span>
                        <input
                          type="number"
                          value={heroImage.sort_order}
                          onChange={(event) =>
                            updateHeroImage(heroImage.id, {
                              sort_order: Number(event.target.value),
                            })
                          }
                          className="w-full border-b border-foreground/20 bg-transparent py-2 outline-none focus:border-foreground"
                        />
                      </label>
                      <div className="flex items-center justify-between gap-3 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-foreground/65">
                          <input
                            type="checkbox"
                            checked={heroImage.is_active}
                            onChange={(event) =>
                              updateHeroImage(heroImage.id, {
                                is_active: event.target.checked,
                              })
                            }
                          />
                          노출
                        </label>
                        <button
                          type="button"
                          disabled={updatingId === heroImage.id}
                          onClick={() => void saveHeroImage(heroImage)}
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
                            : setReviewRecipientPhone(
                                normalizePhoneNumber(event.target.value)
                              )
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

                    {review.image_urls && review.image_urls.length > 0 && (
                      <div className="mb-4 grid grid-cols-3 gap-2 md:grid-cols-6">
                        {review.image_urls.map((imageUrl, index) => (
                          <a
                            key={imageUrl}
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="aspect-square overflow-hidden border border-foreground/10 bg-muted/20"
                          >
                            <img
                              src={imageUrl}
                              alt={`리뷰 사진 ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    )}

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
              <div className="grid gap-3 border border-foreground/10 bg-card/60 p-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <label>
                  <span className="mb-2 block text-xs text-foreground/45">
                    상태
                  </span>
                  <select
                    value={inquiryStatusFilter}
                    onChange={(event) =>
                      setInquiryStatusFilter(
                        event.target.value as ContactInquiry['status'] | 'all'
                      )
                    }
                    className="w-full border-b border-foreground/20 bg-transparent py-2 text-sm outline-none focus:border-foreground"
                  >
                    <option value="all">전체</option>
                    {(['new', 'read', 'replied'] as const).map((status) => (
                      <option key={status} value={status}>
                        {inquiryStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-2 block text-xs text-foreground/45">
                    검색
                  </span>
                  <input
                    value={inquirySearchTerm}
                    onChange={(event) => setInquirySearchTerm(event.target.value)}
                    placeholder="이름, 연락처, 이메일, 문의 내용"
                    className="w-full border-b border-foreground/20 bg-transparent py-2 text-sm outline-none focus:border-foreground"
                  />
                </label>
              </div>
              {filteredInquiries.length === 0 ? (
                <p className="border border-foreground/10 p-6 text-sm text-foreground/55">
                  문의 내역이 없습니다.
                </p>
              ) : (
                filteredInquiries.map((inquiry) => (
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
              <div className="flex flex-wrap gap-2">
                {(['calendar', 'list'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setReservationView(view)}
                    className={`border px-4 py-2 text-sm transition-colors ${
                      reservationView === view
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-foreground/15 text-foreground/60 hover:border-foreground/35 hover:text-foreground'
                    }`}
                  >
                    {view === 'calendar' ? '달력' : '리스트'}
                  </button>
                ))}
              </div>
              {reservationView === 'calendar' ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <section className="border border-foreground/10 bg-card/60">
                    <div className="flex items-center justify-between border-b border-foreground/10 p-4">
                      <button
                        type="button"
                        onClick={() => moveReservationCalendarMonth(-1)}
                        className="inline-flex size-10 items-center justify-center border border-foreground/10 text-foreground transition-colors hover:bg-foreground/5"
                        aria-label="이전 달"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <h2 className="text-xl font-semibold text-foreground">
                        {formatMonthLabel(reservationCalendarMonth)}
                      </h2>
                      <button
                        type="button"
                        onClick={() => moveReservationCalendarMonth(1)}
                        className="inline-flex size-10 items-center justify-center border border-foreground/10 text-foreground transition-colors hover:bg-foreground/5"
                        aria-label="다음 달"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 border-b border-foreground/10 bg-secondary/30">
                      {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => (
                        <div
                          key={weekday}
                          className={`px-2 py-3 text-center text-xs font-medium ${
                            weekday === '일'
                              ? 'text-rose-700/70'
                              : weekday === '토'
                                ? 'text-sky-700/70'
                                : 'text-foreground/60'
                          }`}
                        >
                          {weekday}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7">
                      {reservationCalendarDays.map(({ date, isCurrentMonth }) => {
                        const dateKey = getLocalDateKey(date);
                        const dayReservations = reservationsByDate[dateKey] ?? [];
                        const isSelected = selectedReservationDate === dateKey;
                        const isBlocked = blockedDateKeys.has(dateKey);
                        const dayOfWeek = date.getDay();

                        return (
                          <button
                            key={dateKey}
                            type="button"
                            onClick={() => selectReservationCalendarDate(dateKey)}
                            className={[
                              'relative min-h-24 border-b border-r border-foreground/10 p-2 pt-10 text-left transition-colors last:border-r-0 md:min-h-28',
                              isCurrentMonth
                                ? 'bg-background hover:bg-secondary/30'
                                : 'bg-muted/20 text-foreground/35 hover:bg-muted/30',
                              isBlocked ? 'bg-destructive/5' : '',
                              isSelected ? 'ring-2 ring-inset ring-primary' : '',
                            ].join(' ')}
                          >
                            <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
                              <span
                                className={[
                                  'text-sm',
                                  dayOfWeek === 0
                                    ? 'text-rose-700/70'
                                    : dayOfWeek === 6
                                      ? 'text-sky-700/70'
                                      : 'text-foreground/70',
                                ].join(' ')}
                              >
                                {date.getDate()}
                              </span>
                              <div className="flex items-center gap-1">
                                {isBlocked && (
                                  <span className="text-[11px] text-destructive">
                                    마감
                                  </span>
                                )}
                                {dayReservations.length > 0 && (
                                  <span className="text-xs text-accent">
                                    {dayReservations.length}건
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              {dayReservations.slice(0, 2).map((reservation) => (
                                <div
                                  key={reservation.id}
                                  className={`truncate border px-2 py-1 text-[11px] ${statusClassNames[reservation.status]}`}
                                >
                                  {reservation.class_name}
                                </div>
                              ))}
                              {dayReservations.length > 2 && (
                                <p className="text-xs text-foreground/45">
                                  +{dayReservations.length - 2}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <aside className="border border-foreground/10 bg-card/60 p-5">
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-accent">
                      Selected Date
                    </p>
                    <h2 className="mb-4 text-xl font-semibold text-foreground">
                      {formatDate(selectedReservationDate)}
                    </h2>
                    <button
                      type="button"
                      disabled={
                        updatingId === `blocked-date-${selectedReservationDate}`
                      }
                      onClick={() =>
                        void toggleReservationBlockedDate(selectedReservationDate)
                      }
                      className={`mb-5 w-full border px-4 py-2.5 text-sm transition-colors disabled:opacity-40 ${
                        selectedDateBlocked
                          ? 'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10'
                          : 'border-foreground/15 text-foreground/65 hover:border-foreground/35 hover:text-foreground'
                      }`}
                    >
                      {selectedDateBlocked ? '예약 비활성화 해제' : '이 날짜 예약 비활성화'}
                    </button>

                    {selectedDateReservations.length === 0 ? (
                      <p className="text-sm text-foreground/55">
                        선택한 날짜의 예약이 없습니다.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {selectedDateReservations.map((reservation) => (
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
                                {reservationStatusLabels[reservation.status]}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/55">
                              {getProfileDisplayName(
                                profilesById[reservation.user_id],
                                reservation.user_id
                              )}
                            </p>
                            {reservation.phone && (
                              <a
                                href={`tel:${reservation.phone}`}
                                className="mt-1 block text-sm text-foreground/55"
                              >
                                {reservation.phone}
                              </a>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </aside>
                </div>
              ) : reservations.length === 0 ? (
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
                        <p className="mt-2 text-sm text-foreground/55">
                          예약자: {getProfileDisplayName(
                            profilesById[reservation.user_id],
                            reservation.user_id
                          )}
                        </p>
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

                    <label className="mb-4 block">
                      <span className="mb-2 block text-sm text-foreground/60">
                        관리자 메모
                      </span>
                      <textarea
                        value={reservation.admin_note ?? ''}
                        onChange={(event) =>
                          updateReservationAdminNoteDraft(
                            reservation.id,
                            event.target.value
                          )
                        }
                        rows={3}
                        className="w-full resize-none border border-foreground/10 bg-background/60 p-3 text-sm leading-relaxed text-foreground/70 outline-none transition-colors focus:border-foreground/30"
                        placeholder="관리자만 확인하는 메모를 입력하세요."
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={updatingId === reservation.id}
                        onClick={() => void saveReservationAdminNote(reservation)}
                        className="border border-foreground/15 px-3 py-2 text-xs text-foreground/65 transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-40"
                      >
                        메모 저장
                      </button>
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
