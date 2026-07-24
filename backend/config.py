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


def _optional_bool(name: str, default: bool) -> bool:
    """선택 bool 환경변수. true/1/yes 또는 false/0/no (대소문자 무시)."""
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    value = raw.strip().lower()
    if value in ("true", "1", "yes"):
        return True
    if value in ("false", "0", "no"):
        return False
    return default


# 공공데이터 API 설정 (.env / .env.example 키 이름과 동일)
FESTIVAL_API_KEY: str = _require("FESTIVAL_API_KEY")
FESTIVAL_API_BASE_URL: str = _optional(
    "FESTIVAL_API_BASE_URL",
    "https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api",
)
FESTIVAL_API_TYPE: str = _optional("FESTIVAL_API_TYPE", "json")
FESTIVAL_API_NUM_OF_ROWS: int = int(_optional("FESTIVAL_API_NUM_OF_ROWS", "100"))

# 기동 시 festivals 테이블이 비어 있으면 공공데이터 sync (Render 재배포용)
SYNC_ON_STARTUP: bool = _optional_bool("SYNC_ON_STARTUP", True)

# CORS 허용 Origin (로컬 Vite + 배포 프론트)
# CORS_ORIGINS 에 쉼표로 추가 Origin을 넣을 수 있다.
_DEFAULT_CORS_ORIGINS: tuple[str, ...] = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",  # vite preview
    "http://127.0.0.1:4173",
    "https://festivals-sigma.vercel.app",
)


def _cors_origins() -> list[str]:
    """기본 Origin + 환경변수 CORS_ORIGINS(쉼표 구분)를 합친다."""
    seen: set[str] = set()
    origins: list[str] = []
    extra = [
        part.strip().rstrip("/")
        for part in _optional("CORS_ORIGINS", "").split(",")
        if part.strip()
    ]
    for origin in (*_DEFAULT_CORS_ORIGINS, *extra):
        if origin not in seen:
            seen.add(origin)
            origins.append(origin)
    return origins


CORS_ORIGINS: list[str] = _cors_origins()
# Vercel 프리뷰 배포(프로젝트명 festivals-…)도 허용
CORS_ORIGIN_REGEX: str = r"https://festivals[\w-]*\.vercel\.app"
