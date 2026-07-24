# 시작 뼈대 (React + FastAPI) — 최소 동작 앱

새 프로젝트를 **처음부터 시작할 때 복사해서 쓰는 뼈대**입니다.
지금은 **서버가 살아있는지 확인하는 것**만 하는 "작동하는 빈 앱"이에요.
여기서부터 AI(Cursor)에게 시켜서 원하는 앱(데이터·API·화면)을 만들어 나갑니다.

## 무엇이 들어 있나
- **backend**: FastAPI 앱 + CORS + **DB 연결(SQLite)** + `/health` 엔드포인트 (데이터 모델·API는 아직 없음)
- **frontend**: Vite React. 화면이 열리면 `/health`를 불러 **"✅ 백엔드 연결됨"** 을 표시

> 서버·CORS·DB 연결 같은 **배선은 다 되어 있고**, 특정 주제(도메인)만 비어 있습니다.
> 그래서 어떤 주제로든 이 위에 **모델과 API만 얹으면** 됩니다.

> 도메인(특정 주제)이 없습니다. 그래서 어떤 주제로도 이 위에 새로 만들면 됩니다.

## 실행
```bash
# 백엔드 (터미널 1) — conda 환경 사용
conda activate festival
cd backend
pip install -r requirements.txt
uvicorn main:app --reload        # → http://127.0.0.1:8000/health

# 프론트 (터미널 2)
cd frontend
npm install
npm run dev                      # → http://localhost:5173
```
브라우저에서 **"✅ 백엔드 연결됨"** 이 보이면, 화면↔서버가 정상으로 연결된 거예요.

## 여기서부터 (AI에게 시키기)
이 뼈대 위에, Cursor 채팅으로 원하는 걸 만들어 나갑니다. 예:
```
@PRD_....md 이 기획서대로 만들 거야. 먼저 데이터를 담을 모델부터 만들어줘.
```
데이터 모델 → API → 화면 순서로, 한 번에 하나씩 시키면 됩니다.
