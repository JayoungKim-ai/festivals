"""
공공데이터 축제 API 클라이언트
============================
docs/API.md 기준으로 FastAPI 서버에서만 외부 API를 호출한다.
프론트엔드는 이 모듈을 직접 사용하지 않는다.

호출 실패 시 로그를 남기고, 일시적 오류에 한해 재시도한다.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import requests

import config

logger = logging.getLogger(__name__)

# 공공데이터 정상 응답 코드
_NORMAL_CODE = "00"

# 일시적 오류로 보고 재시도할 공공데이터 resultCode
# 05: 서비스 연결실패(타임아웃), 21: 일시적으로 사용할 수 없는 서비스 키
_RETRYABLE_RESULT_CODES = frozenset({"05", "21"})

# HTTP/네트워크 재시도 기본값
_DEFAULT_MAX_RETRIES = 3
_DEFAULT_RETRY_BACKOFF_SEC = 1.0


class PublicApiError(Exception):
    """공공데이터 API 호출 또는 응답 처리 실패."""

    def __init__(
        self,
        message: str,
        *,
        result_code: str | None = None,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.result_code = result_code
        self.retryable = retryable


def fetch_festival_page(
    page_no: int = 1,
    num_of_rows: int | None = None,
    *,
    timeout: float = 30.0,
    max_retries: int = _DEFAULT_MAX_RETRIES,
) -> dict[str, Any]:
    """
    축제 목록 1페이지를 조회한다.

    Returns:
        {
            "items": [dict, ...],   # 원본 축제 객체 목록
            "page_no": int,
            "num_of_rows": int,
            "total_count": int,
        }
    """
    if page_no < 1:
        raise ValueError("page_no는 1 이상이어야 합니다.")

    rows = num_of_rows if num_of_rows is not None else config.FESTIVAL_API_NUM_OF_ROWS
    if rows < 1 or rows > 1000:
        raise ValueError("num_of_rows는 1 이상 1000 이하여야 합니다.")

    params = {
        "serviceKey": config.FESTIVAL_API_KEY,
        "pageNo": page_no,
        "numOfRows": rows,
        "type": config.FESTIVAL_API_TYPE,
    }

    last_error: Exception | None = None
    attempts = max(1, max_retries)

    for attempt in range(1, attempts + 1):
        try:
            return _request_festival_page(
                params=params,
                page_no=page_no,
                rows=rows,
                timeout=timeout,
            )
        except PublicApiError as exc:
            last_error = exc
            if not exc.retryable or attempt >= attempts:
                logger.error(
                    "공공데이터 API 페이지 조회 실패 (page=%s, attempt=%s/%s): %s",
                    page_no,
                    attempt,
                    attempts,
                    exc,
                )
                raise

            logger.warning(
                "공공데이터 API 일시 오류 — 재시도 예정 (page=%s, attempt=%s/%s): %s",
                page_no,
                attempt,
                attempts,
                exc,
            )
            time.sleep(_DEFAULT_RETRY_BACKOFF_SEC * attempt)

    # 루프가 비정상적으로 끝난 경우 방어
    assert last_error is not None
    raise last_error


def fetch_all_festivals(
    num_of_rows: int | None = None,
    *,
    timeout: float = 30.0,
    max_retries: int = _DEFAULT_MAX_RETRIES,
) -> list[dict[str, Any]]:
    """
    페이지를 순회해 전체 축제 원본 목록을 가져온다.
    (정제·DB 저장은 동기화 단계에서 처리)
    """
    rows = num_of_rows if num_of_rows is not None else config.FESTIVAL_API_NUM_OF_ROWS
    first_page = fetch_festival_page(
        page_no=1,
        num_of_rows=rows,
        timeout=timeout,
        max_retries=max_retries,
    )
    items = list(first_page["items"])
    total_count = first_page["total_count"]

    if total_count <= len(items):
        return items

    # 남은 페이지 계산 (예: 1300건 / 100행 = 13페이지)
    total_pages = (total_count + rows - 1) // rows
    for page_no in range(2, total_pages + 1):
        try:
            page = fetch_festival_page(
                page_no=page_no,
                num_of_rows=rows,
                timeout=timeout,
                max_retries=max_retries,
            )
            items.extend(page["items"])
        except PublicApiError:
            # 개별 페이지 실패는 이미 fetch_festival_page에서 로그됨
            logger.error(
                "전체 수집 중단: page=%s/%s 까지 수집됨 (items=%s)",
                page_no - 1,
                total_pages,
                len(items),
            )
            raise

    return items


def _request_festival_page(
    *,
    params: dict[str, Any],
    page_no: int,
    rows: int,
    timeout: float,
) -> dict[str, Any]:
    """실제 HTTP 1회 호출. 재시도 여부는 PublicApiError.retryable로 표시한다."""
    try:
        response = requests.get(
            config.FESTIVAL_API_BASE_URL,
            params=params,
            timeout=timeout,
        )
        response.raise_for_status()
    except requests.Timeout as exc:
        raise PublicApiError(
            f"공공데이터 API 요청 타임아웃 (page={page_no}): {exc}",
            retryable=True,
        ) from exc
    except requests.ConnectionError as exc:
        raise PublicApiError(
            f"공공데이터 API 연결 실패 (page={page_no}): {exc}",
            retryable=True,
        ) from exc
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else None
        # 5xx는 일시적 장애로 재시도, 4xx는 재시도하지 않음
        retryable = status is not None and status >= 500
        raise PublicApiError(
            f"공공데이터 API HTTP 오류 (page={page_no}, status={status}): {exc}",
            retryable=retryable,
        ) from exc
    except requests.RequestException as exc:
        raise PublicApiError(
            f"공공데이터 API HTTP 요청 실패 (page={page_no}): {exc}",
            retryable=True,
        ) from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise PublicApiError(
            f"공공데이터 API 응답이 JSON이 아닙니다 (page={page_no}).",
            retryable=True,
        ) from exc

    return _parse_page_payload(payload, requested_page=page_no, requested_rows=rows)


def _parse_page_payload(
    payload: dict[str, Any],
    *,
    requested_page: int,
    requested_rows: int,
) -> dict[str, Any]:
    """JSON 응답을 내부에서 쓰기 쉬운 형태로 정리한다."""
    response = payload.get("response")
    if not isinstance(response, dict):
        raise PublicApiError(
            "응답에 response 객체가 없습니다.",
            retryable=False,
        )

    header = response.get("header") or {}
    result_code = str(header.get("resultCode", ""))
    result_msg = str(header.get("resultMsg", ""))

    if result_code != _NORMAL_CODE:
        retryable = result_code in _RETRYABLE_RESULT_CODES
        raise PublicApiError(
            f"공공데이터 API 오류: code={result_code}, msg={result_msg}",
            result_code=result_code,
            retryable=retryable,
        )

    body = response.get("body") or {}
    raw_items = body.get("items", [])

    # items가 없거나 빈 문자열인 경우(데이터 없음) 빈 목록으로 처리
    if raw_items in (None, "", []):
        items: list[dict[str, Any]] = []
    elif isinstance(raw_items, list):
        items = [item for item in raw_items if isinstance(item, dict)]
    elif isinstance(raw_items, dict):
        # 일부 API는 1건일 때 객체로 주는 경우가 있어 방어적으로 처리
        items = [raw_items]
    else:
        raise PublicApiError(
            "응답 body.items 형식을 해석할 수 없습니다.",
            retryable=False,
        )

    return {
        "items": items,
        "page_no": _as_int(body.get("pageNo"), default=requested_page),
        "num_of_rows": _as_int(body.get("numOfRows"), default=requested_rows),
        "total_count": _as_int(body.get("totalCount"), default=0),
    }


def _as_int(value: Any, *, default: int) -> int:
    """응답 숫자가 문자열로 와도 int로 변환한다."""
    if value is None or value == "":
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
