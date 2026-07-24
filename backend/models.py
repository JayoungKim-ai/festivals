"""
축제(Festival) 데이터 모델
========================
PRD §6.5 MVP 권장 DB 필드를 SQLModel로 정의한다.
서버 기동 시 SQLModel.metadata.create_all()로 테이블이 생성된다.
"""
from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Festival(SQLModel, table=True):
    """서비스 내부에서 사용하는 축제 정보 테이블."""

    __tablename__ = "festivals"

    # 서비스 내부 고유 식별자 (자동 증가)
    id: Optional[int] = Field(default=None, primary_key=True)

    # 공공데이터 원본 식별자 — 동기화 시 중복 방지 기준 (값 있을 때만 유니크, NULL은 여러 건 허용)
    external_id: Optional[str] = Field(default=None, max_length=255, unique=True)

    # 축제명 — 부분 일치 검색이 잦으므로 인덱스 적용
    festival_name: str = Field(max_length=255, index=True)
    location: Optional[str] = Field(default=None, max_length=255)
    start_date: Optional[date] = Field(default=None)
    end_date: Optional[date] = Field(default=None)
    description: Optional[str] = Field(default=None)

    managing_org: Optional[str] = Field(default=None, max_length=255)
    hosting_org: Optional[str] = Field(default=None, max_length=255)
    sponsoring_org: Optional[str] = Field(default=None, max_length=255)

    phone: Optional[str] = Field(default=None, max_length=100)
    homepage_url: Optional[str] = Field(default=None, max_length=500)
    related_info: Optional[str] = Field(default=None)

    road_address: Optional[str] = Field(default=None, max_length=500)
    parcel_address: Optional[str] = Field(default=None, max_length=500)

    # 시도 단위 지역 (주소에서 추출, 지역 필터용)
    region: Optional[str] = Field(default=None, max_length=50, index=True)

    # MVP UI에서는 미사용이어도, 향후 지도 기능을 위해 저장 가능하게 둔다.
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
