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

## Supabase 기본 설정

`.env.local`에는 아래 두 값만 넣습니다.

```text
VITE_SUPABASE_URL=Supabase Project URL
VITE_SUPABASE_ANON_KEY=Supabase anon public key
```

프론트 코드나 `.env.local`에 `service_role key`, DB 비밀번호, OAuth secret을 넣지 마세요.

Supabase SQL Editor에서 아래 파일 내용을 실행합니다.

```text
supabase/schema.sql
```

관리자는 Supabase SQL Editor에서 직접 지정합니다.

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

## 카카오 로그인 연결

카카오는 Supabase 내장 OAuth provider를 사용합니다. 앱 코드는 이미 `supabase.auth.signInWithOAuth({ provider: 'kakao' })`로 연결되어 있습니다.

### Kakao Developers

1. Kakao Developers에서 애플리케이션 생성
2. 제품 설정 > 카카오 로그인 활성화
3. Redirect URI 등록

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
```

4. 동의항목에서 이메일을 활성화합니다.
5. 가능하면 이메일을 필수 동의로 설정합니다.

### Supabase

1. Authentication > Providers > Kakao
2. Kakao REST API Key 입력
3. Kakao Client Secret을 사용한다면 같이 입력
4. `Allow users without email`은 끄는 것을 권장합니다.
5. Authentication > URL Configuration 설정

Site URL:

```text
https://romantichamilton.store
```

Redirect URLs:

```text
https://romantichamilton.store/my
https://www.romantichamilton.store/my
http://localhost:3000/my
http://localhost:3001/my
```

## 네이버 로그인 연결

네이버는 Supabase 기본 provider가 아니므로 Express 백엔드 OAuth 흐름으로 분리되어 있습니다.

프론트 버튼은 아래 엔드포인트로 이동합니다.

```text
/api/auth/naver/start
```

백엔드 콜백 엔드포인트는 아래입니다.

```text
/api/auth/naver/callback
```

### Naver Developers

1. Naver Developers에서 애플리케이션 생성
2. 네이버 로그인 API 추가
3. 서비스 URL 등록

```text
https://romantichamilton.store
```

4. Callback URL 등록

같은 도메인에서 Render Express 서버까지 운영하는 경우:

```text
https://romantichamilton.store/api/auth/naver/callback
```

Render 기본 도메인을 그대로 쓰는 경우:

```text
https://<YOUR_RENDER_SERVICE>.onrender.com/api/auth/naver/callback
```

### Render 환경변수

```text
NODE_ENV=production
PUBLIC_SITE_URL=https://romantichamilton.store
NAVER_CLIENT_ID=네이버 Client ID
NAVER_CLIENT_SECRET=네이버 Client Secret
```

현재 백엔드는 네이버 OAuth 토큰과 프로필을 받는 구조까지 준비되어 있습니다. 네이버 계정을 Supabase Auth 세션으로 완전히 변환하려면 Render 백엔드에서 `SUPABASE_SERVICE_ROLE_KEY`를 사용하는 서버 전용 로직을 추가해야 합니다. 이 키는 프론트에 절대 넣으면 안 됩니다.

## Vercel 배포

- Framework Preset: `Vite`
- Install Command: `npm install --legacy-peer-deps`
- Build Command: `npm run build`
- Output Directory: `dist/public`

Vercel 환경변수:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_NAVER_AUTH_URL=https://<YOUR_RENDER_SERVICE>.onrender.com/api/auth/naver/start
```

## Render 배포

- Runtime: `Node`
- Build Command: `npm install --legacy-peer-deps --include=dev && npm run build`
- Start Command: `npm run start`

Render는 네이버 로그인 백엔드가 필요할 때 사용합니다.

## 인증 기능

- 비로그인 사용자는 사이트를 자유롭게 볼 수 있습니다.
- 이메일 회원가입은 이름/닉네임, 이메일, 비밀번호만 받습니다.
- 전화번호는 회원가입에서 받지 않고 문의 폼에서만 입력합니다.
- 비밀번호는 `profiles` 테이블에 저장하지 않습니다.
- 로그인 사용자는 `/my`에서 내 문의와 예약을 볼 수 있습니다.
- 로그인 사용자는 `/reserve`에서 클래스 예약을 남길 수 있습니다.
- `profiles.role = 'admin'`인 사용자만 `/admin/*`에 접근할 수 있습니다.
