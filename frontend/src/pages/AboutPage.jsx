import { Link } from 'react-router-dom'

/** 서비스 소개 화면 (PRD §5.4) */
export default function AboutPage() {
  return (
    <section className="page about-page">
      <h1 className="page__title">서비스 소개</h1>
      <p className="page__lead">
        전국에서 개최되는 축제 정보를 한곳에서 검색하고, 일정·장소·연락처·홈페이지·주소 등
        상세 정보를 확인할 수 있는 웹서비스입니다.
      </p>

      <section className="about-block">
        <h2 className="about-block__title">주요 기능</h2>
        <ul className="page__list">
          <li>축제명으로 전국 축제를 부분 일치 검색합니다.</li>
          <li>검색 결과 목록에서 개최기간·장소·주소를 한눈에 확인합니다.</li>
          <li>축제를 선택하면 기관 정보, 문의 전화, 홈페이지, 상세 주소를 볼 수 있습니다.</li>
        </ul>
      </section>

      <section className="about-block">
        <h2 className="about-block__title">이용 방법</h2>
        <ol className="page__list page__list--ordered">
          <li>
            <Link to="/festivals">축제 찾기</Link> 화면에 들어갑니다.
          </li>
          <li>검색창에 축제명을 입력하고 검색하거나, 전체 목록을 둘러봅니다.</li>
          <li>원하는 축제의 「상세 보기」를 눌러 자세한 정보를 확인합니다.</li>
        </ol>
      </section>

      <section className="about-block">
        <h2 className="about-block__title">데이터 출처</h2>
        <p className="about-block__text">
          본 서비스의 축제 정보는 공공데이터포털(
          <a
            className="detail-link"
            href="https://www.data.go.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
            data.go.kr
          </a>
          )에서 제공하는 <strong>전국문화축제표준데이터</strong>를 기반으로 합니다.
        </p>
        <p className="about-block__text">
          프론트엔드는 공공데이터 API를 직접 호출하지 않으며, 서버(FastAPI)가 수집·정제한
          뒤 제공하는 내부 API만 사용합니다.
        </p>
      </section>

      <section className="about-block">
        <h2 className="about-block__title">데이터 갱신 안내</h2>
        <p className="about-block__text">
          축제 데이터는 서버에서 공공데이터 API를 통해 동기화할 때 갱신됩니다. 원본 공공데이터의
          등록·수정 시점과 서비스 반영 시점에는 차이가 있을 수 있습니다.
        </p>
      </section>

      <section className="about-block">
        <h2 className="about-block__title">유의사항</h2>
        <ul className="page__list">
          <li>축제 일정·장소·연락처 등은 원본 데이터에 따라 변경되거나 누락될 수 있습니다.</li>
          <li>값이 없는 항목은 「정보 없음」으로 표시합니다. 임의로 정보를 만들어 넣지 않습니다.</li>
          <li>실제 방문 전에는 해당 축제 공식 홈페이지나 주최 기관에 최신 정보를 확인해 주세요.</li>
          <li>본 서비스는 정보 안내용이며, 예매·결제·예약 기능은 제공하지 않습니다.</li>
        </ul>
      </section>
    </section>
  )
}
