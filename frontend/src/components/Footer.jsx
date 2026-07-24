/** 공통 푸터: 데이터 출처·서비스 안내 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__line">
          본 서비스는 공공데이터포털의 전국문화축제표준데이터를 기반으로 합니다.
        </p>
        <p className="site-footer__line">
          데이터 출처: 공공데이터포털 (data.go.kr) · 축제 정보는 원본 데이터에 따라 변경될 수
          있습니다.
        </p>
        <p className="site-footer__line site-footer__muted">
          전국 축제 정보 검색 서비스 · 비영리·정보 안내용
        </p>
      </div>
    </footer>
  )
}
