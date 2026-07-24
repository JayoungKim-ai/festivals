# 전국 축제 정보 검색 서비스 (Festival Finder)

전국에서 열리는 축제 정보를 한곳에서 검색하고, 일정·장소·연락처·홈페이지 등 상세 정보를 확인할 수 있는 웹서비스입니다.

공공데이터포털의 [전국문화축제표준데이터](https://www.data.go.kr/) API에서 축제 데이터를 수집한 뒤 FastAPI 서버가 SQLite에 저장하고, React 프론트엔드가 서버 API만 호출해 화면에 표시합니다.

## 주요 기능

- 축제명 검색·목록 조회·상세 정보 확인
- 지역(시도) 필터
- 상세 페이지 지도 표시 (좌표가 있는 경우)
- 즐겨찾기 (브라우저 `localStorage`)
- 일자별·지역별 달력 검색

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React, Vite, React Router, Leaflet |
| Backend | FastAPI, SQLModel, SQLite |
| 데이터 | 공공데이터포털 전국문화축제표준데이터 |

## 프로젝트 구조

```
festivals0723/
├── backend/          # FastAPI 서버
├── frontend/         # React (Vite) 앱
└── docs/             # PRD, 작업 목록, API 문서
```

## 사전 준비

- [conda](https://docs.conda.io/) 환경 `festival` (프로젝트 규칙상 이 환경 사용)
- Node.js (프론트엔드)
- 공공데이터포털 API 인증키

## 환경 변수 설정

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

`.env`에 공공데이터 API 키를 넣습니다.

```env
FESTIVAL_API_KEY=발급받은_인증키
FESTIVAL_API_BASE_URL=https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api
FESTIVAL_API_TYPE=json
FESTIVAL_API_NUM_OF_ROWS=100
```

> API 키는 코드에 넣지 말고 `.env`에만 보관하세요. `.env`는 Git에 포함되지 않습니다.

## 실행 방법

### 1. 백엔드

```bash
conda activate festival
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

- 앱: http://localhost:5173

### 3. 축제 데이터 동기화

서버 기동 후 공공데이터를 DB에 한 번 가져옵니다.

```bash
# Swagger(/docs)에서 POST /api/festivals/sync 실행
# 또는
curl -X POST http://127.0.0.1:8000/api/festivals/sync
```

## 주요 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/festivals` | 목록·검색 (`search`, `region`, `page`, `size`) |
| GET | `/api/festivals/{id}` | 상세 |
| GET | `/api/regions` | 지역 목록 |
| GET | `/api/festivals/calendar` | 월별 일자별 건수 |
| GET | `/api/festivals/by-date` | 특정 날짜 축제 목록 |
| POST | `/api/festivals/sync` | 공공데이터 동기화 |
| GET | `/health` | 서버 상태 |

자세한 내용은 `docs/API.md`를 참고하세요.

## 아키텍처

1. FastAPI가 공공데이터 API를 호출한다.
2. 응답을 서비스 스키마에 맞게 정제한 뒤 SQLite에 저장한다.
3. React는 FastAPI가 제공하는 API만 호출한다. (공공데이터 API 직접 호출 없음)

```
공공데이터 API → FastAPI → SQLite → FastAPI API → React
```

## 문서

- `docs/PRD.md` — 제품 요구사항
- `docs/TASKS.md` — 작업 체크리스트
- `docs/DEVELOPMENT_PLAN.md` — 개발 계획
- `docs/API.md` — API 상세

## 라이선스·데이터 출처

- 축제 데이터: 공공데이터포털 전국문화축제표준데이터
- 서비스에 표시된 정보는 원본 제공 기관의 정책을 따릅니다.
