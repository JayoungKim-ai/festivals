"""
일자·월 기준 축제 조회
====================
달력용 일자별 건수 집계와 특정 날짜 축제 목록을 제공한다.
축제가 해당 일에 포함되는 조건: start_date <= day <= end_date
(end_date 가 없으면 start_date 당일만 포함)
"""
from __future__ import annotations

import calendar
from datetime import date, timedelta
from typing import Any

from sqlmodel import Session, col, select

from models import Festival


def month_day_counts(
    session: Session,
    *,
    year: int,
    month: int,
    region: str | None = None,
) -> dict[str, Any]:
    """
    해당 월의 각 날짜별 축제 건수와, 월에 겹치는 축제 목록을 반환한다.

    Returns:
        {
          "year": 2026,
          "month": 4,
          "region": "서울특별시" | null,
          "total": 12,
          "items": [Festival, ...],
          "days": [{"date": "2026-04-01", "count": 2}, ...]
        }
    """
    month_start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    month_end = date(year, month, last_day)

    festivals = _festivals_overlapping_range(
        session,
        range_start=month_start,
        range_end=month_end,
        region=region,
    )

    counts = {month_start + timedelta(days=i): 0 for i in range(last_day)}

    for festival in festivals:
        start = festival.start_date
        if start is None:
            continue
        end = festival.end_date or start
        # 월 범위와 교집합
        overlap_start = max(start, month_start)
        overlap_end = min(end, month_end)
        if overlap_start > overlap_end:
            continue
        day = overlap_start
        while day <= overlap_end:
            counts[day] += 1
            day += timedelta(days=1)

    # 월 목록용 정렬: 시작일 → 이름
    festivals.sort(
        key=lambda f: (
            f.start_date or date.max,
            f.festival_name or "",
        )
    )

    return {
        "year": year,
        "month": month,
        "region": region,
        # 해당 월과 기간이 겹치는 축제 수 (일자별 count 합이 아님)
        "total": len(festivals),
        "items": festivals,
        "days": [
            {"date": day.isoformat(), "count": counts[day]}
            for day in sorted(counts.keys())
        ],
    }


def festivals_on_date(
    session: Session,
    *,
    target: date,
    region: str | None = None,
) -> dict[str, Any]:
    """
    특정 날짜에 진행 중인 축제 목록 (좌표 포함).

    Returns:
        { "date", "region", "total", "items": [Festival, ...] }
    """
    festivals = _festivals_overlapping_range(
        session,
        range_start=target,
        range_end=target,
        region=region,
    )
    # 목록 정렬: 시작일 → 이름
    festivals.sort(
        key=lambda f: (
            f.start_date or date.max,
            f.festival_name or "",
        )
    )
    return {
        "date": target.isoformat(),
        "region": region,
        "total": len(festivals),
        "items": festivals,
    }


def _festivals_overlapping_range(
    session: Session,
    *,
    range_start: date,
    range_end: date,
    region: str | None,
) -> list[Festival]:
    """
    [range_start, range_end] 와 기간이 겹치는 축제.
    겹침: start_date <= range_end AND coalesce(end_date, start_date) >= range_start
    """
    # end_date 가 NULL 이면 start_date 를 종료일로 본다.
    effective_end = func_coalesce_end()

    stmt = (
        select(Festival)
        .where(col(Festival.start_date).is_not(None))
        .where(col(Festival.start_date) <= range_end)
        .where(effective_end >= range_start)
    )
    if region:
        stmt = stmt.where(col(Festival.region) == region)

    return list(session.exec(stmt).all())


def func_coalesce_end():
    """SQL: COALESCE(end_date, start_date)"""
    from sqlalchemy import func as sa_func

    return sa_func.coalesce(Festival.end_date, Festival.start_date)
