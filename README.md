# Romantic Hamilton

React, Vite, Express, Supabase 기반 웹 프로젝트입니다.

## 실행

```powershell
npm install --legacy-peer-deps
npm run dev
```

## 검증

```powershell
npm run check
npm run build
```

## Supabase 설정

`.env.local`에는 프론트에서 안전하게 사용 가능한 값만 넣습니다.

```text
VITE_SUPABASE_URL=Supabase Project URL
VITE_SUPABASE_ANON_KEY=Supabase anon public key
```

절대 프론트 코드나 `.env.local`에 `service_role key`를 넣지 마세요.

Supabase SQL Editor에서 아래 파일을 실행합니다.

```text
supabase/schema.sql
```

이 스키마는 다음 테이블과 RLS 정책을 만듭니다.

- `profiles`: 사용자 프로필과 `role`
- `contact_messages`: 문의 내역
- `class_reservations`: 클래스 예약

관리자는 Supabase SQL Editor에서 직접 지정합니다.

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

## Supabase Auth Provider

Supabase Dashboard에서 설정합니다.

1. Authentication
2. Providers
3. Email 활성화
4. Kakao 활성화
5. Site URL 설정

```text
https://romantichamilton.store
```

Redirect URL에는 최소 아래 값을 추가합니다.

```text
https://romantichamilton.store/my
http://localhost:3000/my
http://localhost:3001/my
```

## 네이버 로그인

Supabase 기본 OAuth provider에는 네이버가 없으므로 백엔드 연동 구조로 분리했습니다.

프론트 버튼:

```text
/api/auth/naver/start
```

Render 백엔드 환경변수:

```text
PUBLIC_SITE_URL=https://romantichamilton.store
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

현재 백엔드는 네이버 OAuth 토큰과 프로필을 받는 구조까지 준비되어 있습니다. 네이버 계정을 Supabase Auth 세션으로 완전히 변환하려면 Render 백엔드에서 `SUPABASE_SERVICE_ROLE_KEY`를 사용해 서버 전용 로직을 추가해야 합니다. 이 키는 프론트에 절대 넣으면 안 됩니다.

## 배포

### Vercel

프론트 정적 배포용입니다.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist/public`
- Install Command: `npm install --legacy-peer-deps`

환경변수:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### Render

Express 서버와 네이버 OAuth 백엔드용입니다.

- Runtime: `Node`
- Build Command: `npm install --legacy-peer-deps && npm run build`
- Start Command: `npm run start`

환경변수:

```text
NODE_ENV=production
PUBLIC_SITE_URL=https://romantichamilton.store
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

## 인증 기능

- 비로그인 사용자는 사이트를 자유롭게 볼 수 있습니다.
- 이메일 회원가입은 이름/닉네임, 이메일, 비밀번호만 받습니다.
- 전화번호는 회원가입에서 받지 않고 문의 폼에서만 입력합니다.
- 비밀번호는 `profiles` 테이블에 저장하지 않습니다.
- 로그인 사용자는 `/my`에서 내 문의와 예약을 볼 수 있습니다.
- 로그인 사용자는 `/reserve`에서 클래스 예약을 남길 수 있습니다.
- `profiles.role = 'admin'`인 사용자만 `/admin/*`에 접근할 수 있습니다.
