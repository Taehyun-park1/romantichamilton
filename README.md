# Romantic Hamilton

React, Vite, Express 기반의 Romantic Hamilton 웹사이트입니다. 프론트엔드는 Vite로 빌드하고, 백엔드는 Express가 빌드된 정적 파일을 서빙합니다.

## 실행

```powershell
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3000`을 사용하고, 이미 사용 중이면 다음 포트로 자동 실행됩니다.

## 검증

```powershell
npm run check
npm run build
```

## 주요 폴더

```text
backend/
  index.ts              # Render 배포용 Express 정적 파일 서버

frontend/
  public/rh-images/     # 사이트에 사용하는 Romantic Hamilton 이미지
  src/
    components/         # 화면 컴포넌트
    data/products.ts    # 제품, 클래스, 이미지 데이터
    pages/Home.tsx      # 메인 화면 섹션 순서

dist/
  public/               # Vite 빌드 결과
```

## 배포 구조

권장 구조는 아래처럼 역할을 나누는 방식입니다.

```text
Vercel   -> 프론트엔드 정적 사이트 배포
Supabase -> 데이터베이스, 인증, 스토리지
Render   -> Express 백엔드 또는 API 서버 배포
```

현재 사이트는 정적 화면 중심이라 Supabase 연결 코드는 아직 없습니다. 이후 상품 관리, 문의 저장, 관리자 로그인 같은 기능을 붙일 때 Supabase를 연결하면 됩니다.

## Vercel 배포

Vercel은 `vercel.json`을 사용합니다.

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public"
}
```

Vercel 프로젝트 설정:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist/public`
- Install Command: `npm install`

환경변수가 필요하면 Vercel Project Settings의 Environment Variables에 등록합니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## Supabase 준비

Supabase 프로젝트를 만든 뒤 아래 값을 `.env`와 배포 환경변수에 넣습니다.

```powershell
Copy-Item .env.example .env
```

```text
VITE_SUPABASE_URL=Supabase Project URL
VITE_SUPABASE_ANON_KEY=Supabase anon public key
```

추후 연결하기 좋은 테이블 예시는 다음과 같습니다.

```sql
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  message text not null,
  created_at timestamptz not null default now()
);
```

주의할 점:

- 프론트엔드에 넣는 키는 `anon public key`만 사용합니다.
- `service_role key`는 절대 브라우저 코드나 Vercel 프론트 환경변수에 넣지 않습니다.
- 관리자 기능이나 비공개 데이터 처리는 Render 백엔드에서 처리합니다.

## Render 배포

Render는 `render.yaml`을 사용할 수 있습니다.

```yaml
services:
  - type: web
    name: romantic-hamilton
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm run start
```

Render Web Service 설정:

- Runtime: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Environment: `NODE_ENV=production`

Render는 `PORT`를 자동으로 주입하므로 별도로 고정하지 않아도 됩니다.

## 배포 선택 기준

- 정적 소개 사이트만 필요하면 Vercel만으로 충분합니다.
- 문의 저장, 로그인, 관리자 페이지가 필요하면 Supabase를 추가합니다.
- 비공개 API, 결제 웹훅, 관리자 서버 로직이 필요하면 Render 백엔드를 사용합니다.
