# 학원 관리자 모바일 웹

React + Vite + TypeScript 기반 학원 관리자 모바일 웹 앱입니다.

## 빠른 시작

```bash
npm install
npm run dev
# → http://localhost:3000
```

## 프로젝트 구조

```
src/
├── main.tsx                   # 진입점
├── App.tsx                    # 라우터 설정
├── index.css                  # 전역 스타일
├── types/index.ts             # 타입 정의
├── store/dataStore.ts         # Zustand + 유틸
├── components/
│   ├── layout/Layout.tsx      # 폰 프레임 + 하단 탭
│   └── common/index.tsx       # TopBar, Toggle 등 공통 컴포넌트
└── pages/
    ├── home/HomePage.tsx
    ├── parents/               # 학부모·학생 관리
    ├── notice/NoticePage.tsx
    ├── payment/               # 수납현황
    └── message/MessagePage.tsx
```

## 라우터

| 경로 | 화면 |
|------|------|
| `/` | 홈 대시보드 |
| `/parents` | 학부모 목록 |
| `/parents/new` | 학부모 등록 |
| `/parents/:pid` | 학부모 상세 (3탭) |
| `/parents/:pid/edit` | 학부모 수정 |
| `/parents/:pid/student/new` | 학생 추가 |
| `/parents/:pid/student/:sid` | 학생 상세 |
| `/parents/:pid/student/:sid/edit` | 학생 수정 |
| `/notice` | 공지사항 |
| `/payment` | 수납현황 |
| `/payment/:sid` | 수납 상세 |
| `/message` | 메시지 발송 |

## 백엔드 연동

vite.config.ts 프록시: `/api/academy` → `http://localhost:8080`

현재는 Zustand mock 데이터 사용.
실제 연동 시 dataStore의 함수를 TanStack Query mutationFn으로 교체.
