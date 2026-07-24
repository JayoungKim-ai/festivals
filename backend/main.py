"""
범용 보일러플레이트 - 백엔드 (FastAPI + SQLite)
================================================
'작동하는 최소 뼈대'입니다. 서버 실행 · CORS · DB 연결까지 다 되어 있어요.
여기에 **데이터 모델(도메인)만** AI(Cursor)에게 시켜서 추가하면 됩니다.

실행:
    pip install -r requirements.txt
    uvicorn main:app --reload
    → 브라우저에서 http://127.0.0.1:8000/health 로 확인
"""
from contextlib import asynccontextmanager
import logging
import threading
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine, col, func, select

# Festival 모델을 import해야 SQLModel.metadata에 등록되고, 기동 시 테이블이 생성된다.
from models import Festival  # noqa: F401

# .env 설정을 서버 기동 시점에 로드한다. (API 키는 config를 통해서만 접근)
import config
from db_schema import ensure_festival_schema
from calendar_service import festivals_on_date, month_day_counts
from public_api import PublicApiError
from sync_service import sync_festivals

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# [배선] DB 연결 (SQLite) — 이 부분은 그대로 두고, 아래에 모델만 추가하면 됩니다.
#   · check_same_thread=False : FastAPI에서 SQLite를 쓸 때 필요한 설정
#     (이걸 빠뜨리면 초보가 잡기 어려운 에러가 나서, 미리 넣어 둠)
# --------------------------------------------------------------------------
engine = create_engine("sqlite:///app.db", connect_args={"check_same_thread": False})


def _festival_count() -> int:
    """festivals 테이블 행 수를 반환한다."""
    with Session(engine) as session:
        return session.exec(select(func.count()).select_from(Festival)).one()


def _sync_festivals_in_background() -> None:
    """
    공공데이터 sync를 백그라운드에서 실행한다.
    실패해도 서버 기동은 유지한다 (로그로만 남김).
    """
    try:
        with Session(engine) as session:
            summary = sync_festivals(session)
        logger.info("기동 시 자동 동기화 완료: %s", summary)
    except Exception:
        logger.exception("기동 시 자동 동기화 실패 — 서버는 계속 동작합니다.")


def _maybe_start_startup_sync() -> None:
    """
    SYNC_ON_STARTUP 이고 DB가 비어 있으면 백그라운드 sync를 시작한다.
    Render처럼 재배포 시 SQLite가 초기화되는 환경을 위한다.
    """
    if not config.SYNC_ON_STARTUP:
        logger.info("SYNC_ON_STARTUP=false — 기동 시 자동 동기화를 건너뜁니다.")
        return

    try:
        count = _festival_count()
    except Exception:
        logger.exception("축제 건수 조회 실패 — 기동 시 자동 동기화를 건너뜁니다.")
        return

    if count > 0:
        logger.info("축제 %s건이 이미 있어 기동 시 자동 동기화를 건너뜁니다.", count)
        return

    logger.info("축제 DB가 비어 있어 기동 시 자동 동기화를 백그라운드에서 시작합니다.")
    thread = threading.Thread(
        target=_sync_festivals_in_background,
        name="startup-festival-sync",
        daemon=True,
    )
    thread.start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버가 켜질 때, 정의된 모델들의 테이블을 자동으로 만든다.
    SQLModel.metadata.create_all(engine)
    # 기존 DB에 region 컬럼이 없으면 추가·백필
    ensure_festival_schema(engine)
    # DB가 비어 있으면(배포 직후 등) 공공데이터 sync — 포트 바인딩을 막지 않도록 백그라운드
    _maybe_start_startup_sync()
    yield


app = FastAPI(title="My App API", lifespan=lifespan)

# [배선] 브라우저의 React(다른 포트)에서 이 API를 부를 수 있게 허용 (없으면 CORS 에러)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 교육용 전체 허용. 실무에선 도메인 지정
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "API 살아있음. /health 로 확인하세요."}


@app.get("/health")
def health():
    """서버가 살아있는지 확인하는 용도. 화면(React)이 이걸 불러서 '연결됨'을 표시한다."""
    return {"status": "ok"}


@app.get("/api/festivals")
def list_festivals(
    page: Annotated[int, Query(ge=1, description="페이지 번호 (1부터)")] = 1,
    size: Annotated[int, Query(ge=1, le=100, description="페이지당 건수 (최대 100)")] = 10,
    search: Annotated[
        str | None,
        Query(description="축제명 부분 검색어 (앞뒤 공백 제거, 대소문자 무시)"),
    ] = None,
    region: Annotated[
        str | None,
        Query(description="시도 지역 필터 (예: 서울특별시). 비우면 전체"),
    ] = None,
):
    """SQLite에 저장된 축제 목록을 페이지 단위로 반환한다. search·region 을 함께 적용할 수 있다."""
    keyword = (search or "").strip()
    region_name = (region or "").strip()

    with Session(engine) as session:
        base_stmt = select(Festival)
        count_stmt = select(func.count()).select_from(Festival)

        if keyword:
            name_filter = _festival_name_contains(keyword)
            base_stmt = base_stmt.where(name_filter)
            count_stmt = count_stmt.where(name_filter)

        if region_name:
            region_filter = col(Festival.region) == region_name
            base_stmt = base_stmt.where(region_filter)
            count_stmt = count_stmt.where(region_filter)

        total = session.exec(count_stmt).one()
        offset = (page - 1) * size
        items = session.exec(
            base_stmt.order_by(
                col(Festival.start_date).desc(),
                col(Festival.id).desc(),
            )
            .offset(offset)
            .limit(size)
        ).all()

    return {
        "items": items,
        "page": page,
        "size": size,
        "total": total,
        "search": keyword or None,
        "region": region_name or None,
    }


@app.get("/api/regions")
def list_regions():
    """지역 필터용 시도 목록 (DB에 저장된 값 기준, 이름 오름차순)."""
    with Session(engine) as session:
        rows = session.exec(
            select(Festival.region)
            .where(col(Festival.region).is_not(None))
            .where(col(Festival.region) != "")
            .distinct()
            .order_by(col(Festival.region))
        ).all()
    return {"items": list(rows)}


@app.get("/api/festivals/calendar")
def festival_calendar(
    year: Annotated[int, Query(ge=2000, le=2100, description="연도")],
    month: Annotated[int, Query(ge=1, le=12, description="월 (1~12)")],
    region: Annotated[
        str | None,
        Query(description="시도 지역 필터. 비우면 전체"),
    ] = None,
):
    """
    선택한 월의 일자별 축제 건수를 반환한다.
    각 날짜에 대해 start_date~end_date 구간에 포함되는 축제를 센다.
    """
    region_name = (region or "").strip() or None
    with Session(engine) as session:
        return month_day_counts(
            session,
            year=year,
            month=month,
            region=region_name,
        )


@app.get("/api/festivals/by-date")
def festivals_by_date(
    date: Annotated[
        str,
        Query(description="조회 날짜 (YYYY-MM-DD)", examples=["2026-04-18"]),
    ],
    region: Annotated[
        str | None,
        Query(description="시도 지역 필터. 비우면 전체"),
    ] = None,
):
    """
    특정 날짜에 진행 중인 축제 목록을 반환한다 (위도·경도 포함).
    """
    try:
        target = date_from_iso(date)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="date 는 YYYY-MM-DD 형식이어야 합니다.",
        ) from exc

    region_name = (region or "").strip() or None
    with Session(engine) as session:
        return festivals_on_date(session, target=target, region=region_name)


def date_from_iso(value: str):
    """YYYY-MM-DD 문자열을 date 로 변환."""
    from datetime import date as date_cls

    return date_cls.fromisoformat(value.strip())


def _festival_name_contains(keyword: str):
    """
    축제명 부분 일치 조건 (ORM 파라미터 바인딩).

    검색어를 SQL 문자열에 직접 이어붙이지 않고, 바인드 변수로 전달한다.
    LIKE 와일드카드(%, _)도 이스케이프해 의도치 않은 패턴 확장을 막는다.
    """
    escaped = (
        keyword.replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )
    # ilike 패턴 전체(%...%)가 바인드 파라미터로 전달됨 → SQL 인젝션 방지
    return col(Festival.festival_name).ilike(f"%{escaped}%", escape="\\")


@app.get("/api/festivals/{festival_id}")
def get_festival(festival_id: int):
    """축제 상세 정보를 내부 Festival 스키마로 반환한다."""
    with Session(engine) as session:
        festival = session.get(Festival, festival_id)

    if festival is None:
        raise HTTPException(status_code=404, detail="축제를 찾을 수 없습니다.")

    return festival


@app.post("/api/festivals/sync")
def sync_festivals_endpoint():
    """
    공공데이터 API에서 축제 정보를 가져와 SQLite에 저장/갱신한다.
    개발·수동 실행용이며 일반 사용자 화면에는 노출하지 않는다.
    """
    try:
        with Session(engine) as session:
            summary = sync_festivals(session)
    except PublicApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"message": "동기화 완료", **summary}


# ==========================================================================
# 여기서부터 여러분이 (AI에게 시켜서) 만듭니다.
#   DB 연결은 위에 이미 되어 있으니, 데이터 모델과 API만 추가하면 됩니다.
#   예: "축제(Festival) 모델을 만들어줘. 이름·장소·기간·좌표를 담고 SQLite에 저장되게."
# ==========================================================================
