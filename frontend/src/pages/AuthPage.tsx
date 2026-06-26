import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import '@/styles/auth.css';

type AuthMode = 'login' | 'signup';

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get('error');

    if (error) {
      toast.error(`로그인 처리 중 오류가 발생했습니다: ${error}`);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/reserve');
    }
  }, [isAuthenticated, navigate]);

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!supabase || !isSupabaseConfigured) {
      toast.error('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      toast.error('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      toast.error('이름 또는 닉네임을 입력해 주세요.');
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    if (mode === 'signup' && normalizedPhone && !isValidPhoneNumber(normalizedPhone)) {
      toast.error('전화번호 형식을 확인해 주세요.');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              phone: normalizedPhone || null,
            },
          },
        });

        if (error) throw error;
        toast.success('회원가입이 완료되었습니다. 이메일 확인이 필요한 경우 메일을 확인해 주세요.');
        navigate('/reserve');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success('로그인되었습니다.');
      navigate('/reserve');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (!supabase || !isSupabaseConfigured) {
      toast.error('Supabase 환경변수가 설정되지 않았습니다.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/reserve`,
        queryParams: {
          scope: 'profile_nickname profile_image',
        },
      },
    });

    if (error) {
      toast.error(error.message);
    }
  };

  const handleNaverLogin = () => {
    const naverAuthUrl =
      import.meta.env.VITE_NAVER_AUTH_URL || '/api/auth/naver/start';

    window.location.href = naverAuthUrl;
  };

  return (
    // old: min-h-screen bg-background pt-24 md:pt-28
    <main className="auth-page">
      {/* old: container py-16 md:py-24 */}
      <section className="auth-page__section">
        {/* old: mx-auto max-w-md */}
        <div className="auth-page__panel">
          {/* old: mb-3 text-xs uppercase tracking-[0.16em] text-accent */}
          <p className="auth-page__eyebrow">
            Account
          </p>
          {/* old: mb-4 text-3xl md:text-4xl font-semibold text-foreground */}
          <h1 className="auth-page__title">
            {mode === 'login' ? '로그인' : '이메일 회원가입'}
          </h1>
          {/* old: mb-10 text-sm leading-relaxed text-foreground/60 */}
          <p className="auth-page__intro">
            문의는 로그인 없이 이메일로 보낼 수 있습니다. 로그인하면 클래스 예약을 신청하고 내 예약 내역을 확인할 수 있습니다.
          </p>

          {/* old: mb-8 grid grid-cols-2 gap-2 */}
          <div className="auth-page__mode-tabs">
            <button
              type="button"
              onClick={() => setMode('login')}
              /* old: border px-4 py-3 text-sm transition-colors + active/inactive */
              className={`auth-page__mode-button ${
                mode === 'login'
                  ? 'auth-page__mode-button--active'
                  : 'auth-page__mode-button--inactive'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              /* old: border px-4 py-3 text-sm transition-colors + active/inactive */
              className={`auth-page__mode-button ${
                mode === 'signup'
                  ? 'auth-page__mode-button--active'
                  : 'auth-page__mode-button--inactive'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* old: space-y-6 */}
          <form onSubmit={handleEmailAuth} className="auth-form">
            {mode === 'signup' && (
              <>
                <div>
                  {/* old: mb-2 block text-sm text-foreground/60 */}
                  <label htmlFor="displayName" className="auth-form__label">
                    이름 또는 닉네임
                  </label>
                  <input
                    id="displayName"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    /* old: w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground */
                    className="auth-form__input"
                    placeholder="표시할 이름"
                  />
                </div>

                <div>
                  {/* old: mb-2 block text-sm text-foreground/60 */}
                  <label htmlFor="signupPhone" className="auth-form__label">
                    전화번호 선택
                  </label>
                  <input
                    id="signupPhone"
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(normalizePhoneNumber(event.target.value))
                    }
                    /* old: w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground */
                    className="auth-form__input"
                    placeholder="010-1234-5678"
                  />
                </div>
              </>
            )}

            <div>
              {/* old: mb-2 block text-sm text-foreground/60 */}
              <label htmlFor="email" className="auth-form__label">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                /* old: w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground */
                className="auth-form__input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              {/* old: mb-2 block text-sm text-foreground/60 */}
              <label htmlFor="password" className="auth-form__label">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                /* old: w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground */
                className="auth-form__input"
                placeholder="비밀번호"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              /* old: btn-primary w-full */
              className="btn-primary auth-form__submit"
            >
              {submitting ? '처리 중' : mode === 'login' ? '이메일 로그인' : '회원가입'}
            </button>
          </form>

          {/* old: my-8 flex items-center gap-4 */}
          <div className="auth-page__divider">
            {/* old: h-px flex-1 bg-foreground/10 */}
            <div className="auth-page__divider-line" />
            {/* old: text-xs text-foreground/45 */}
            <span className="auth-page__divider-label">또는</span>
            {/* old: h-px flex-1 bg-foreground/10 */}
            <div className="auth-page__divider-line" />
          </div>

          {/* old: space-y-3 */}
          <div className="auth-page__socials">
            <button
              type="button"
              onClick={handleKakaoLogin}
              /* old: w-full bg-[#FEE500] px-4 py-3 text-sm font-medium text-[#191919] */
              className="auth-page__kakao"
            >
              카카오로 계속하기
            </button>
            <button
              type="button"
              onClick={handleNaverLogin}
              /* old: w-full bg-[#03C75A] px-4 py-3 text-sm font-medium text-white */
              className="auth-page__naver"
            >
              네이버로 계속하기
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
