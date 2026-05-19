import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'login' | 'signup';

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    navigate('/my');
  }

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

    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });

        if (error) throw error;
        toast.success('회원가입이 완료되었습니다. 이메일 확인이 필요한 경우 메일을 확인해 주세요.');
        navigate('/my');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success('로그인되었습니다.');
      navigate('/my');
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
        redirectTo: `${window.location.origin}/my`,
      },
    });

    if (error) {
      toast.error(error.message);
    }
  };

  const handleNaverLogin = () => {
    window.location.href = '/api/auth/naver/start';
  };

  return (
    <main className="min-h-screen bg-background pt-24 md:pt-28">
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-md">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent">
            Account
          </p>
          <h1 className="mb-4 text-3xl md:text-4xl font-semibold text-foreground">
            {mode === 'login' ? '로그인' : '이메일 회원가입'}
          </h1>
          <p className="mb-10 text-sm leading-relaxed text-foreground/60">
            로그인은 선택 기능입니다. 로그인하면 내 문의 내역을 확인하고 클래스 예약을 남길 수 있습니다.
          </p>

          <div className="mb-8 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`border px-4 py-3 text-sm transition-colors ${
                mode === 'login'
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-foreground/15 text-foreground/65 hover:text-foreground'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`border px-4 py-3 text-sm transition-colors ${
                mode === 'signup'
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-foreground/15 text-foreground/65 hover:text-foreground'
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            {mode === 'signup' && (
              <div>
                <label htmlFor="displayName" className="mb-2 block text-sm text-foreground/60">
                  이름 또는 닉네임
                </label>
                <input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                  placeholder="표시할 이름"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-foreground/60">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm text-foreground/60">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border-b border-foreground/20 bg-transparent py-3 outline-none transition-colors focus:border-foreground"
                placeholder="비밀번호"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? '처리 중' : mode === 'login' ? '이메일 로그인' : '회원가입'}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-foreground/10" />
            <span className="text-xs text-foreground/45">또는</span>
            <div className="h-px flex-1 bg-foreground/10" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleKakaoLogin}
              className="w-full bg-[#FEE500] px-4 py-3 text-sm font-medium text-[#191919]"
            >
              카카오로 계속하기
            </button>
            <button
              type="button"
              onClick={handleNaverLogin}
              className="w-full bg-[#03C75A] px-4 py-3 text-sm font-medium text-white"
            >
              네이버로 계속하기
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
