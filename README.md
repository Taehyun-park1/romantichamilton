# Romantic Hamilton

React, Vite, Express 기반 웹 프로젝트입니다.

## 폴더 구조

```text
backend/
  index.ts              # Express 정적 파일 서버

frontend/
  index.html            # Vite HTML 진입점
  public/               # 정적 공개 파일
  src/
    App.tsx             # 라우팅 및 최상위 앱 구성
    main.tsx            # React 진입점
    index.css           # 전역 스타일 및 Tailwind 설정
    components/         # 화면 컴포넌트와 shadcn/ui 컴포넌트
    contexts/           # React context
    data/               # 화면 데이터
    hooks/              # 커스텀 훅
    lib/                # 공통 유틸리티
    pages/              # 페이지 컴포넌트

mysql/
  README.md             # MySQL 관련 파일 보관 위치

shared/
  const.ts              # 프론트엔드와 백엔드가 공유하는 상수
```

## 실행 명령어

```powershell
pnpm install
pnpm dev
```

## 검증 명령어

```powershell
pnpm check
pnpm build
```

## 참고

- 프론트엔드 소스는 `frontend/src`에 있습니다.
- 백엔드 진입점은 `backend/index.ts`입니다.
- Vite 별칭 `@`는 `frontend/src`를 가리킵니다.
- Vite 별칭 `@shared`는 `shared`를 가리킵니다.
