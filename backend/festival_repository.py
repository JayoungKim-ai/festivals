"""
축제 upsert (external_id 기준)
============================
동기화 시 동일 축제가 중복 저장되지 않도록
external_id 로 조회한 뒤 없으면 insert, 있으면 update 한다.

external_id 는 transform.build_external_id() 가
축제명|시작일|개최장소|도로명주소 조합으로 만든다.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from sqlmodel import Session, select

from models import Festival

UpsertResult = Literal["created", "updated", "skipped"]

# insert/update 시 갱신할 데이터 필드 (id·created_at 제외)
_UPSERT_FIELDS = (
    "external_id",
    "festival_name",
    "location",
    "start_date",
    "end_date",
    "description",
    "managing_org",
    "hosting_org",
    "sponsoring_org",
    "phone",
    "homepage_url",
    "related_info",
    "road_address",
    "parcel_address",
    "region",
    "latitude",
    "longitude",
)


def upsert_festival(session: Session, data: dict[str, Any]) -> UpsertResult:
    """
    mapped Festival 필드 dict 를 DB에 반영한다.

    - festival_name 이 비어 있으면 skipped
    - external_id 가 없으면 skipped (중복 판단 불가)
    - 동일 external_id 존재 → 필드 갱신 + updated_at (updated)
    - 없으면 신규 행 추가 (created)
    """
    festival_name = (data.get("festival_name") or "").strip()
    external_id = data.get("external_id")

    if not festival_name:
        return "skipped"
    if not external_id:
        return "skipped"

    now = datetime.utcnow()
    existing = session.exec(
        select(Festival).where(Festival.external_id == external_id)
    ).first()

    if existing is None:
        payload = _pick_fields(data)
        payload["festival_name"] = festival_name
        payload["external_id"] = external_id
        payload["created_at"] = now
        payload["updated_at"] = now
        session.add(Festival(**payload))
        return "created"

    for field in _UPSERT_FIELDS:
        if field == "external_id":
            continue
        if field in data:
            setattr(existing, field, data[field])
    existing.festival_name = festival_name
    existing.updated_at = now
    session.add(existing)
    return "updated"


def _pick_fields(data: dict[str, Any]) -> dict[str, Any]:
    """모델에 넣을 필드만 골라낸다."""
    return {key: data.get(key) for key in _UPSERT_FIELDS}
