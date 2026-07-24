"""
축제 데이터 동기화 서비스
========================
공공데이터 API → 정제(transform) → SQLite upsert.
일반 사용자 UI에는 노출하지 않고, 개발/수동 실행용 API에서 호출한다.

개별 건 처리 중 오류가 나도 나머지 건 동기화는 계속한다.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlmodel import Session

from festival_repository import upsert_festival
from public_api import PublicApiError, fetch_all_festivals
from transform import map_public_item_to_festival

logger = logging.getLogger(__name__)

# 응답에 넣을 개별 오류 메시지 최대 개수 (로그에는 전부 남김)
_MAX_ERROR_SAMPLES = 10


def sync_festivals(session: Session) -> dict[str, Any]:
    """
    공공데이터 전체 축제를 가져와 DB에 반영한다.

    Returns:
        created / updated / skipped / failed / fetched 건수 요약
        errors: 일부 실패 샘플 메시지
    """
    try:
        raw_items = fetch_all_festivals()
    except PublicApiError:
        logger.exception("공공데이터 수집 실패로 동기화를 중단합니다.")
        raise

    created = 0
    updated = 0
    skipped = 0
    failed = 0
    error_samples: list[str] = []

    for index, raw in enumerate(raw_items):
        festival_label = raw.get("fstvlNm") or f"index={index}"
        try:
            # SAVEPOINT: 한 건 실패해도 세션 전체 롤백을 막는다
            with session.begin_nested():
                mapped = map_public_item_to_festival(raw)
                result = upsert_festival(session, mapped)
                if result == "created":
                    created += 1
                elif result == "updated":
                    updated += 1
                else:
                    skipped += 1
        except Exception as exc:
            failed += 1
            message = f"{festival_label}: {exc}"
            logger.exception(
                "축제 1건 동기화 실패 — 계속 진행 (index=%s, name=%s)",
                index,
                festival_label,
            )
            if len(error_samples) < _MAX_ERROR_SAMPLES:
                error_samples.append(message)

    session.commit()

    summary: dict[str, Any] = {
        "fetched": len(raw_items),
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "failed": failed,
        "errors": error_samples,
    }
    logger.info("축제 동기화 완료: %s", {k: v for k, v in summary.items() if k != "errors"})
    return summary
