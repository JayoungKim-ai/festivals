"""
공공데이터 원본 → 내부 Festival 필드 매핑
======================================
docs/API.md 출력 필드와 PRD §6.5 DB 필드를 연결한다.

필드 이름 매핑, external_id 조합, 날짜·빈 값 정규화를 담당한다.
UI의 “정보 없음” 표시는 DB에 None 으로 저장한 뒤 프론트에서 처리한다.
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

# 공공데이터 항목명 → Festival 모델 필드명
# (API 응답에 없는 id/created_at/updated_at 은 매핑 대상이 아님)
PUBLIC_TO_FESTIVAL_FIELDS: dict[str, str] = {
    "fstvlNm": "festival_name",
    "opar": "location",
    "fstvlStartDate": "start_date",
    "fstvlEndDate": "end_date",
    "fstvlCo": "description",
    "mnnstNm": "managing_org",
    "auspcInsttNm": "hosting_org",
    "suprtInsttNm": "sponsoring_org",
    "phoneNumber": "phone",
    "homepageUrl": "homepage_url",
    "relateInfo": "related_info",
    "rdnmadr": "road_address",
    "lnmadr": "parcel_address",
    "latitude": "latitude",
    "longitude": "longitude",
}

# 선택 문자열 필드 — 빈 값이면 None 으로 저장
_OPTIONAL_STR_FIELDS = (
    "location",
    "description",
    "managing_org",
    "hosting_org",
    "sponsoring_org",
    "phone",
    "homepage_url",
    "related_info",
    "road_address",
    "parcel_address",
)

# 공공데이터에 시도·시군구 전용 필드가 없어 주소 앞부분에서 시도를 추출한다.
# 긴 명칭을 먼저 매칭한다.
_SIDO_CANONICAL: list[tuple[str, str]] = [
    ("서울특별시", "서울특별시"),
    ("부산광역시", "부산광역시"),
    ("대구광역시", "대구광역시"),
    ("인천광역시", "인천광역시"),
    ("광주광역시", "광주광역시"),
    ("대전광역시", "대전광역시"),
    ("울산광역시", "울산광역시"),
    ("세종특별자치시", "세종특별자치시"),
    ("경기도", "경기도"),
    ("강원특별자치도", "강원특별자치도"),
    ("강원도", "강원특별자치도"),
    ("충청북도", "충청북도"),
    ("충청남도", "충청남도"),
    ("전북특별자치도", "전북특별자치도"),
    ("전라북도", "전북특별자치도"),
    ("전라남도", "전라남도"),
    ("경상북도", "경상북도"),
    ("경상남도", "경상남도"),
    ("제주특별자치도", "제주특별자치도"),
    ("제주도", "제주특별자치도"),
]

# DB 저장용으로 허용하는 날짜 문자열 형식 (우선순위 순)
_DATE_FORMATS = (
    "%Y-%m-%d",  # 2026-04-18 (공공데이터 확인 형식)
    "%Y.%m.%d",  # 2026.04.18
    "%Y/%m/%d",  # 2026/04/18
    "%Y%m%d",  # 20260418
)

# 숫자만 8자리인 경우도 YYYYMMDD로 본다
_DIGIT_DATE = re.compile(r"^\d{8}$")


def map_public_item_to_festival(raw: dict[str, Any]) -> dict[str, Any]:
    """
    공공데이터 축제 1건을 내부 필드 dict로 변환한다.

    빈 값 처리 기준 (PRD §6.6):
    - 누락 / null / "" / 공백만 → None (선택 필드)
    - festival_name 은 필수라 trim 후 문자열 유지 (비면 "")
    - 날짜·좌표는 해석 불가면 None
    """
    mapped: dict[str, Any] = {}

    for public_key, festival_key in PUBLIC_TO_FESTIVAL_FIELDS.items():
        if public_key in raw:
            mapped[festival_key] = raw[public_key]
        else:
            mapped[festival_key] = None

    # 필수 축제명
    mapped["festival_name"] = normalize_required_str(mapped.get("festival_name"))

    # 선택 문자열: 빈 문자열·공백을 None 으로 통일
    for field in _OPTIONAL_STR_FIELDS:
        mapped[field] = normalize_optional_str(mapped.get(field))

    # 날짜·좌표
    mapped["start_date"] = parse_date(mapped.get("start_date"))
    mapped["end_date"] = parse_date(mapped.get("end_date"))
    mapped["latitude"] = parse_float(mapped.get("latitude"))
    mapped["longitude"] = parse_float(mapped.get("longitude"))

    # 시도 지역: 도로명주소 → 지번주소 순으로 추출
    mapped["region"] = extract_region(
        mapped.get("road_address"),
        mapped.get("parcel_address"),
    )

    mapped["external_id"] = build_external_id(raw)
    # external_id 도 내용이 전혀 없으면 None (전부 빈 조합)
    if mapped["external_id"].strip("|") == "":
        mapped["external_id"] = None

    return mapped


def extract_region(*addresses: Any) -> str | None:
    """
    주소 문자열에서 시도명을 추출한다.
    공공데이터에 시도 전용 필드가 없을 때 사용.
    """
    for address in addresses:
        text = normalize_optional_str(address)
        if not text:
            continue
        for prefix, canonical in _SIDO_CANONICAL:
            if text.startswith(prefix):
                return canonical
    return None


def normalize_optional_str(value: Any) -> str | None:
    """
    선택 문자열 필드 정규화.
    None / 누락 / 빈 문자열 / 공백만 → None, 그 외는 strip 한 문자열.
    """
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def normalize_required_str(value: Any) -> str:
    """필수 문자열. 없으면 빈 문자열(동기화 단계에서 스킵 판단 가능)."""
    if value is None:
        return ""
    return str(value).strip()


def parse_float(value: Any) -> float | None:
    """위도·경도 등. 비어 있거나 숫자가 아니면 None."""
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)

    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def parse_date(value: Any) -> date | None:
    """
    다양한 날짜 문자열을 date 로 정규화한다.
    비어 있거나 해석 불가면 None.
    """
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()

    text = str(value).strip()
    if not text:
        return None

    # 앞뒤 불필요 문자 제거 후 시도
    candidates = [text, text.replace(" ", "")]

    for candidate in candidates:
        for fmt in _DATE_FORMATS:
            try:
                return datetime.strptime(candidate, fmt).date()
            except ValueError:
                continue

        # 구분자가 섞인 8자리 숫자
        digits = re.sub(r"\D", "", candidate)
        if _DIGIT_DATE.match(digits):
            try:
                return datetime.strptime(digits, "%Y%m%d").date()
            except ValueError:
                pass

    return None


def build_external_id(raw: dict[str, Any]) -> str:
    """
    공공데이터에 축제 고유 ID가 없으므로 중복 판단용 키를 만든다.

    조합: 축제명 | 시작일 | 개최장소 | 도로명주소
    (PRD §6.6 — 원본 식별자 없을 때 임시 중복 기준)
    """
    parts = [
        normalize_optional_str(raw.get("fstvlNm")) or "",
        normalize_optional_str(raw.get("fstvlStartDate")) or "",
        normalize_optional_str(raw.get("opar")) or "",
        normalize_optional_str(raw.get("rdnmadr")) or "",
    ]
    return "|".join(parts)


def _as_text(value: Any) -> str:
    """조합 키용 문자열화 (하위 호환)."""
    return normalize_optional_str(value) or ""
