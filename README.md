# 🏆 종합평가시스템 (Comprehensive Evaluation System)

공정하고 투명한 평가 프로세스를 위한 웹 기반 평가 시스템입니다.

## ✨ 주요 기능

### 🔐 역할 기반 접근 제어
- **관리자**: 시스템 전체 관리, 후보자/평가위원 관리, 결과 집계
- **평가위원**: 후보자 평가 및 점수 입력
- **공개**: 평가 결과 조회

### 📊 핵심 기능
- **엑셀 업로드**: 후보자 및 평가위원 정보 일괄 등록
- **실시간 집계**: 평가 진행 상황 실시간 모니터링
- **자동 결과 계산**: 평가 완료 시 자동으로 최종 결과 생성
- **반응형 UI**: 모바일/데스크톱 모든 기기에서 최적화된 사용자 경험

### 🛠️ 기술 스택
- **프론트엔드**: React 18 + TypeScript + TailwindCSS + Vite
- **백엔드**: Supabase (PostgreSQL + Auth + Real-time)
- **상태 관리**: React Context API
- **라우팅**: React Router DOM
- **UI 라이브러리**: Headless UI + Heroicons

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd evaluation-system
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경변수 설정
```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일에 다음 정보를 입력하세요:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 데이터베이스 설정
1. Supabase 프로젝트 생성
2. `database/schema.sql` 파일의 스키마를 Supabase SQL 편집기에서 실행
3. 환경변수에 Supabase URL과 API 키 입력

### 5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하세요.

## 📁 프로젝트 구조

```
src/
├── components/          # 공통 컴포넌트
│   ├── ExcelUpload.tsx  # 엑셀 업로드 컴포넌트
│   ├── Header.tsx       # 헤더 컴포넌트
│   ├── LoadingSpinner.tsx # 로딩 스피너
│   └── ProtectedRoute.tsx # 인증 보호 라우트
├── contexts/            # React Context
│   ├── AuthContext.tsx  # 인증 상태 관리
│   └── SystemNameContext.tsx # 시스템명 관리
├── pages/               # 페이지 컴포넌트
│   ├── admin/           # 관리자 페이지
│   ├── evaluator/       # 평가위원 페이지
│   ├── HomePage.tsx     # 홈페이지
│   └── ResultsPage.tsx  # 결과 페이지
├── lib/                 # 라이브러리 설정
│   └── supabase.ts      # Supabase 클라이언트
└── utils/               # 유틸리티 함수
    └── index.ts
```

## 👥 사용자 계정

### 테스트 계정
- **관리자**: admin@test.com / admin123
- **평가위원**: evaluator@test.com / evaluator123

## 🔧 주요 기능 사용법

### 후보자 관리
1. 관리자로 로그인
2. "후보자 관리" 메뉴 선택
3. 엑셀 파일 업로드 또는 수동 등록
4. 후보자 정보 수정/삭제 가능

### 평가위원 관리
1. 관리자로 로그인
2. "평가위원 관리" 메뉴 선택
3. 평가위원 등록 및 권한 설정

### 평가 진행
1. 평가위원으로 로그인
2. "평가" 메뉴에서 후보자 선택
3. 평가 항목별 점수 입력
4. 평가 완료 시 자동 저장

### 결과 확인
1. 홈페이지에서 "결과 보기" 선택
2. 평가 완료된 후보자들의 최종 결과 확인

## 🐛 문제 해결

### TailwindCSS 스타일이 적용되지 않는 경우
```bash
# 캐시 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Supabase 연결 오류
1. 환경변수가 올바르게 설정되었는지 확인
2. Supabase 프로젝트가 활성화되어 있는지 확인
3. API 키가 올바른지 확인

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요. 