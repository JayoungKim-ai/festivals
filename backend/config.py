"""
환경변수 설정 로드
================
backend/.env 값을 python-dotenv로 읽어 애플리케이션에서 사용한다.
비밀값(API 키)은 코드에 하드코딩하지 않는다.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# backend/ 디렉터리 기준 .env 경로 (실행 cwd와 무관하게 로드)
_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)


def _require(name: str) -> str:
    """필수 환경변수를 읽고, 비어 있으면 명확한 오류를 낸다."""
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(
            f"환경변수 '{name}'가 비어 있습니다. "
            f"backend/.env 파일을 확인하세요. (참고: .env.example)"
        )
    return value


def _optional(name: str, default: str) -> str:
    """선택 환경변수. 없으면 기본값을 사용한다."""
    value = os.getenv(name, "").strip()
    return value if value else default


# 공공데이터 API 설정 (.env / .env.example 키 이름과 동일)
FESTIVAL_API_KEY: str = _require("FESTIVAL_API_KEY")
FESTIVAL_API_BASE_URL: str = _optional(
    "FESTIVAL_API_BASE_URL",
    "https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api",
)
FESTIVAL_API_TYPE: str = _optional("FESTIVAL_API_TYPE", "json")
FESTIVAL_API_NUM_OF_ROWS: int = int(_optional("FESTIVAL_API_NUM_OF_ROWS", "100"))
