# 요청URL

- https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api

# 요청변수(Request Parameter)

항목명 샘플데이터 항목설명
pageNo 1 페이지 번호
numOfRows 100 한 페이지 결과 수 (최대 값 : 1000)
type xml XML/JSON 여부
fstvlNm 축제명
opar 개최장소
fstvlStartDate 축제시작일자
fstvlEndDate 축제종료일자
fstvlCo 축제내용
mnnstNm 주관기관명
auspcInsttNm 주최기관명
suprtInsttNm 후원기관명
phoneNumber 전화번호
homepageUrl 홈페이지주소
relateInfo 관련정보
rdnmadr 소재지도로명주소
lnmadr 소재지지번주소
latitude 위도
longitude 경도
referenceDate 데이터기준일자
instt_code 제공기관코드
instt_nm 제공기관기관명

# 출력결과(Response Element)

항목명 샘플데이터 항목설명
fstvlNm 축제명
opar 개최장소
fstvlStartDate 축제시작일자
fstvlEndDate 축제종료일자
fstvlCo 축제내용
mnnstNm 주관기관명
auspcInsttNm 주최기관명
suprtInsttNm 후원기관명
phoneNumber 전화번호
homepageUrl 홈페이지주소
relateInfo 관련정보
rdnmadr 소재지도로명주소
lnmadr 소재지지번주소
latitude 위도
longitude 경도
referenceDate 데이터기준일자
instt_code 제공기관코드
instt_nm 제공기관기관명
에러메시지(에러코드별 조치방안 확인)

# 에러코드 에러 메시지 설명

22 LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR 서비스 요청제한횟수 초과에러
00 NORMAL_CODE 정상
01 APPLICATION_ERROR 어플리케이션 에러
02 DB_ERROR 데이터베이스 에러
03 NODATA_ERROR 데이터없음 에러
04 HTTP_ERROR HTTP 에러
05 SERVICETIMEOUT_ERROR 서비스 연결실패 에러
10 INVALID_REQUEST_PARAMETER_ERROR 잘못된 요청 파라메터 에러
11 NO_MANDATORY_REQUEST_PARAMETERS_ERROR 필수요청 파라메터가 없음
12 NO_OPENAPI_SERVICE_ERROR 해당 오픈API서비스가 없거나 폐기됨
20 SERVICE_ACCESS_DENIED_ERROR 서비스 접근거부
21 TEMPORARILY_DISABLE_THE_SERVICEKEY_ERROR 일시적으로 사용할 수 없는 서비스 키
22 LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR 서비스 요청제한횟수 초과에러
30 SERVICE_KEY_IS_NOT_REGISTERED_ERROR 등록되지 않은 서비스키
31 DEADLINE_HAS_EXPIRED_ERROR 기한만료된 서비스키
32 UNREGISTERED_IP_ERROR 등록되지 않은 IP
33 UNSIGNED_CALL_ERROR 서명되지 않은 호출
99 UNKNOWN_ERROR 기타에러

---

# 실제 호출 확인 결과 (2026-07-23)

인증키는 `.env`의 `FESTIVAL_API_KEY`를 `serviceKey` 파라미터로 전달해 확인했다.

## 응답 형식

| `type` | HTTP Content-Type | 결과 |
| ------ | ----------------- | ---- |
| `json` | `application/json;charset=UTF-8` | 정상 (`resultCode=00`) |
| `xml` | `application/xml;charset=UTF-8` | 정상 (`resultCode=00`) |

서비스 구현 시 **JSON**을 사용한다 (`.env`의 `FESTIVAL_API_TYPE=json`).

### JSON 응답 구조

```text
response
  header
    resultCode   # "00" 이면 정상
    resultMsg
    type
  body
    items        # 축제 객체 배열 (1건이어도 배열)
    totalCount   # 전체 건수 (문자열로 올 수 있음)
    numOfRows
    pageNo
```

- XML은 `body/items/item` 형태이고, JSON은 `body.items`가 **바로 배열**이다.
- 문서의 `instt_code` / `instt_nm` 표기와 달리, 실제 필드는 `insttCode` / `insttNm`(camelCase)이다.
- 위도·경도(`latitude`, `longitude`)가 문자열로 포함되는 경우가 있다.
- 별도 축제 고유 ID 필드는 없다. (동기화 시 `external_id`는 조합 키로 만들 필요 있음)
- 시도·시군구 전용 필드는 없다. 서비스는 `rdnmadr`/`lnmadr` 주소 앞부분에서 시도명을 추출해 `region` 컬럼에 저장한다.

## 지도(좌표) 전략

- 공공데이터 응답의 `latitude`/`longitude`를 DB에 저장해 사용한다.
- 확인 시점 기준 약 80% 이상 축제에 좌표가 있다.
- 좌표가 없는 축제는 지오코딩하지 않고, 상세 화면에서 지도 대신 안내 문구를 표시한다.
- 지도 타일: OpenStreetMap (`tile.openstreetmap.org`), Leaflet 사용. 이용 시 OSM 저작권 표기 필요.

## 일자·월 기준 조회 API

### 월별 일자별 건수

`GET /api/festivals/calendar?year=2026&month=4&region=서울특별시`

- `region` 생략 시 전체 지역
- 응답 예:

```json
{
  "year": 2026,
  "month": 4,
  "region": null,
  "days": [
    { "date": "2026-04-01", "count": 2 },
    { "date": "2026-04-02", "count": 0 }
  ]
}
```

- 집계 기준: `start_date <= 해당일 <= end_date` (`end_date` 없으면 `start_date` 당일만)

### 특정 날짜 축제 목록

`GET /api/festivals/by-date?date=2026-04-18&region=서울특별시`

- 응답: `{ "date", "region", "total", "items": [ Festival... ] }`
- `items`에 위도·경도 포함 (지도 마커용)

## 페이지네이션

- 요청: `pageNo`, `numOfRows` (문서상 최대 **1000**)
- 응답: `totalCount`, `pageNo`, `numOfRows`
- 확인 시점 전체 건수: **약 1300건** (`totalCount=1300`)
- `pageNo=1`과 `pageNo=2`의 첫 축제명이 달라, 페이지 이동이 동작함을 확인
- 전체 수집 시: `numOfRows`를 크게(예: 100~1000) 잡고 `pageNo`를 올려 반복 호출

예시 (1300건, 100건씩): 페이지 1~13회 호출

## 요청 제한

- 초과 시 에러코드 **22** (`LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR`)
- 일일 호출 한도는 공공데이터포털 활용신청(트래픽) 설정에 따르며, API 응답만으로는 잔여 횟수가 오지 않음
- 동기화는 페이지 단위로 나누고, 실패 시 재시도·로그만 남기도록 구현할 것

