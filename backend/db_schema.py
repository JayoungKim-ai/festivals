"""
SQLite 스키마 보조
================
create_all 은 기존 테이블에 새 컬럼을 추가하지 않으므로,
region 등 추가 컬럼은 여기서 ALTER 한다.
"""
from __future__ import annotations

from sqlalchemy import text
from sqlmodel import Session, col, select

from models import Festival
from transform import extract_region


def ensure_festival_schema(engine) -> None:
    """festivals.region 컬럼이 없으면 추가하고, 비어 있는 행은 주소에서 채운다."""
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(festivals)")).fetchall()
        column_names = {row[1] for row in rows}
        if "region" not in column_names:
            conn.execute(text("ALTER TABLE festivals ADD COLUMN region VARCHAR(50)"))

    _backfill_regions(engine)


def _backfill_regions(engine) -> None:
    """region 이 비어 있는 기존 행을 주소에서 추출해 채운다."""
    with Session(engine) as session:
        festivals = session.exec(
            select(Festival).where(
                (col(Festival.region).is_(None)) | (col(Festival.region) == "")
            )
        ).all()
        updated = 0
        for festival in festivals:
            region = extract_region(festival.road_address, festival.parcel_address)
            if region:
                festival.region = region
                session.add(festival)
                updated += 1
        if updated:
            session.commit()
