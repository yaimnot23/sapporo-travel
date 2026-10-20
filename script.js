/*
 * 삿포로 호텔 비교 페이지
 *
 * 위쪽은 데이터(호텔, 주요 지점, 표 항목), 아래쪽은 그 데이터로 화면을 그리는 코드입니다.
 * 호텔 정보를 고치려면 HOTELS만 수정하면 표 · 지도 · 카드에 모두 반영됩니다.
 *
 * 출처 태그: 'off' = 공식, 'ref' = 참고, 'na' = 미확인, 'me' = 직접 확인(화면에는 태그 안 붙음)
 */
(function () {

  /* ===== 데이터: 호텔 ===== */
  // num: 번호 · color: 고유 색 CSS 변수 · short: 짧은 이름 · lat/lon: 지도 위치
  // mapQuery: 구글지도 검색어 · summary: 한 줄 소개
  // rows: 비교 표 각 항목 [내용, 출처] · good / care: 좋은 점 / 알아둘 점 [내용, 출처]
  const HOTELS = [
    {
      num: 1,
      color: '--c1',
      short: '홀리데이 인',
      name: '홀리데이 인 스위트 삿포로 오도리 공원 바이 IHG',
      lat: 43.0580,
      lon: 141.3481,
      addr: '札幌市中央区南2条西8-6-1 (060-0062)',
      tel: '+81-11-272-0555',
      mapQuery: 'Holiday Inn & Suites Sapporo Odori Park, 北海道札幌市中央区南2条西8-6-1',
      summary: '2025년 10월에 문을 연 새 호텔. 오도리공원 서쪽에 있습니다.',
      rows: {
        price: ['조식 미포함 130만원 / 조식 포함 154만원 (조식 +24만원)', 'me'],
        addr:  ['미나미2조 니시8초메', 'off'],
        st:    ['오도리역 도보 약 10분', 'ref'],
        park:  ['도보 약 5분', 'ref'],
        sus:   ['도보로 갈 수 있는 거리', 'off'],
        sap:   ['지하철로 오도리에서 1정거장 · 택시 약 10분', 'ref'],
        bath:  ['최상층 대욕장·사우나, 투숙객 무료', 'off'],
        bf:    ['2층 뷔페', 'off'],
        io:    ['15:00 / 11:00', 'off'],
        size:  ['195실 · 10층 · 2025년 10월 개관', 'off'],
      },
      good: [
        ['최상층 대욕장과 사우나를 투숙객은 무료로 씁니다.', 'off'],
        ['24시간 헬스장, 셀프 세탁실, 짐 보관 락커가 있습니다.', 'off'],
        ['오도리공원까지 도보 약 5분, 노면전차 니시8초메 정류장은 약 200m입니다.', 'ref'],
        ['2025년에 지은 새 건물입니다.', 'off'],
      ],
      care: [
        ['오도리역까지 도보 약 10분으로, 네 곳 중 지하철역이 먼 편입니다.', 'ref'],
        ['공항 셔틀은 없습니다.', 'off'],
      ],
    },
    {
      num: 2,
      color: '--c2',
      short: '베셀 캄파나',
      name: '베셀 호텔 캄파나 스스키노',
      lat: 43.0548,
      lon: 141.3500,
      addr: '札幌市中央区南五条西6丁目16-1 (064-0805)',
      tel: '+81-11-531-8111',
      mapQuery: 'Vessel Hotel Campana Sapporo Susukino, 北海道札幌市中央区南五条西6丁目16-1',
      summary: '스스키노 한복판. 먹고 마시는 거리 바로 옆입니다.',
      rows: {
        price: ['조식 미포함 153만원 / 조식 포함 180만원 (조식 +27만원)', 'me'],
        addr:  ['미나미5조 니시6초메', 'off'],
        st:    ['스스키노역 4번 출구 도보 4분', 'off'],
        park:  ['도보 약 11분', 'ref'],
        sus:   ['스스키노 거리 도보 1분', 'ref'],
        sap:   ['도보 18분 · 지하철 2정거장', 'ref'],
        bath:  ['2층 대욕장·드라이 사우나, 투숙객 무료', 'off'],
        bf:    ['1층 라운지 6:00~9:30 · 신선한 해물이 있어 4곳 중 가장 풍부하지만, 일찍 가지 않으면 자리가 없어 못 먹을 수도 있음', 'me'],
        io:    ['14:00 / 11:00', 'off'],
        size:  ['296실 · 2019년 6월 개관', 'off'],
      },
      good: [
        ['스스키노역 4번 출구에서 도보 4분, 스스키노 거리는 1분, 타누키코지는 3분입니다.', 'off'],
        ['2층 대욕장과 드라이 사우나가 무료입니다. 이용 시간은 6:00~10:00, 15:00~25:00입니다.', 'off'],
        ['조식은 신선한 해물이 있어 4곳 중 가장 풍부합니다. 다만 일찍 가지 않으면 자리가 없어 못 먹을 수도 있습니다.', 'me'],
      ],
      care: [
        ['삿포로역까지 도보 18분입니다. 지하철로는 2정거장입니다.', 'ref'],
        ['대욕장은 문신이 있으면 제공하는 스티커(8×10cm)로 가려야 들어갈 수 있습니다.', 'off'],
        ['오도리공원까지 도보 약 11분(약 0.8km)입니다.', 'ref'],
      ],
    },
    {
      num: 3,
      color: '--c3',
      short: '도큐스테이',
      name: '도큐스테이 삿포로 오도리',
      lat: 43.0583,
      lon: 141.3520,
      addr: '札幌市中央区南2条西5-26-2 (060-0062)',
      tel: '+81-11-200-3109',
      mapQuery: 'Tokyu Stay Sapporo Odori, 北海道札幌市中央区南2条西5-26-2',
      summary: '오도리역 2번 출구에서 가까운 번화가 한가운데입니다.',
      rows: {
        price: ['조식 미포함 144만원 / 조식 포함 160만원 (조식 +16만원)', 'me'],
        addr:  ['미나미2조 니시5초메', 'off'],
        st:    ['오도리역 2번 출구 도보 약 3분', 'off'],
        park:  ['3~9분 (자료마다 다름)', 'ref'],
        sus:   ['도보 약 5분', 'ref'],
        sap:   ['도보 약 11분 · 지하철 1정거장', 'ref'],
        bath:  ['확인된 정보 없음', 'na'],
        bf:    ['뷔페 · 요금 확인 못함', 'na'],
        io:    ['15:00 / 11:00', 'off'],
        size:  ['176실', 'off'],
      },
      good: [
        ['오도리역 2번 출구에서 도보 약 3분입니다.', 'off'],
        ['타누키코지 상점가가 1~2분 거리입니다.', 'ref'],
        ['스스키노까지 도보 약 5분, 삿포로역까지 지하철 1정거장입니다.', 'ref'],
      ],
      care: [
        ['대욕장 정보를 찾지 못했습니다. 필요하면 예약 전에 호텔에 문의하세요.', 'na'],
        ['오도리역 3번 출구는 2024년 7월부터 닫혀 있습니다. 2번 출구를 이용하세요.', 'off'],
        ['이름이 비슷한 다른 호텔 \'도큐스테이 삿포로\'(미나미1조 니시1)와 헷갈리지 마세요.', 'off'],
      ],
    },
    {
      num: 4,
      color: '--c4',
      short: '미쓰이 가든',
      name: '미쓰이 가든 호텔 삿포로 웨스트',
      lat: 43.0670,
      lon: 141.3470,
      addr: '札幌市中央区北5条西6-2-4 (060-0005)',
      tel: '+81-11-218-2231',
      mapQuery: 'Mitsui Garden Hotel Sapporo West, 北海道札幌市中央区北5条西6-2-4',
      summary: '삿포로역 바로 옆. 공항에서 오는 길이 가장 단순합니다.',
      rows: {
        price: ['조식 미포함 138만원 / 조식 포함 162만원 (조식 +24만원)', 'me'],
        addr:  ['기타5조 니시6초메', 'off'],
        st:    ['JR 삿포로역 서쪽 출구 도보 4분 · 지하철역 도보 4분', 'off'],
        park:  ['도보 약 12분', 'ref'],
        sus:   ['걸어가기엔 먼 거리 (지하철 이용)', 'na'],
        sap:   ['도보 4분', 'off'],
        bath:  ['2층 대욕장, 투숙객 무료 · 15:00~다음날 9:00', 'off'],
        bf:    ['2층 뷔페 · 성인 ¥2,970 / 어린이 ¥1,485', 'off'],
        io:    ['15:00 / 11:00', 'off'],
        size:  ['169실 · 13층 · 2020년 2월 개관', 'off'],
      },
      good: [
        ['삿포로역 서쪽 출구에서 도보 4분입니다. 신치토세공항에서 JR 쾌속으로 약 37~40분 걸려 삿포로역에 닿습니다.', 'off'],
        ['2층 대욕장이 무료이고, 2025년 10월부터 문신 제한이 없어졌습니다.', 'off'],
        ['투숙객 라운지가 15:00~23:00 열리고, 15~19시에는 간단한 단 음식도 나옵니다.', 'ref'],
      ],
      care: [
        ['오도리공원까지 도보 약 12분, 오도리역까지 약 14분이라 시내 관광은 걸어가기에 먼 편입니다.', 'ref'],
        ['조식 요금은 성인 ¥2,970입니다. 2026년 2월부터 적용된 요금입니다.', 'off'],
        ['대욕장은 작은 규모입니다. 이름이 비슷한 \'미쓰이 가든 호텔 삿포로\'는 다른 호텔입니다.', 'off'],
      ],
    },
  ];

  /* ===== 데이터: 주요 지점 ===== */
  // onMap: 지도에 마름모로 표시할지 · labelDx/labelDy: 이름 글자 위치(마름모 기준) · anchor: 글자 정렬
  // onMap이 false인 곳은 거리표와 패널에만 나옵니다.
  const PLACES = [
    { id: 'sap',  name: '삿포로역',                     lat: 43.0687, lon: 141.3508, onMap: true,  labelDx: 12,  labelDy: 5,   anchor: 'start' },
    { id: 'ods',  name: '오도리역',                     lat: 43.0603, lon: 141.3538, onMap: true,  labelDx: 12,  labelDy: 26,  anchor: 'start' },
    { id: 'park', name: '오도리공원(중간쯤)',           lat: 43.0607, lon: 141.3489, onMap: false },
    { id: 'tv',   name: 'TV타워',                       lat: 43.0611, lon: 141.3564, onMap: true,  labelDx: -14, labelDy: -12, anchor: 'end' },
    { id: 'clk',  name: '시계탑',                       lat: 43.0625, lon: 141.3537, onMap: true,  labelDx: 12,  labelDy: 5,   anchor: 'start' },
    { id: 'tnk',  name: '타누키코지 상점가',            lat: 43.0580, lon: 141.3525, onMap: false },
    { id: 'sus',  name: '스스키노역',                   lat: 43.0553, lon: 141.3533, onMap: true,  labelDx: 12,  labelDy: 5,   anchor: 'start' },
    { id: 'nak',  name: '나카지마공원(북쪽 입구 부근)', lat: 43.0478, lon: 141.3540, onMap: false },
  ];

  /* ===== 데이터: 비교 표 항목 (HOTELS[].rows의 키, 표에 보일 이름) ===== */
  const COMPARE_ROWS = [
    ['price', '요금 (trip.com, 7월 2~5일)'],
    ['addr',  '위치'],
    ['st',    '가까운 역'],
    ['park',  '오도리공원'],
    ['sus',   '스스키노'],
    ['sap',   '삿포로역'],
    ['bath',  '대욕장'],
    ['bf',    '조식 (뷔페)'],
    ['io',    '체크인 / 아웃'],
    ['size',  '규모'],
  ];

  const TAG_LABELS = { off: '공식', ref: '참고', na: '미확인', me: '지우 확인' };

  /* ===== 도우미 함수 ===== */

  // 출처 태그 HTML. 'me'는 화면에 태그를 붙이지 않습니다.
  function tagHTML(source) {
    return source
      .split(',')
      .filter((s) => s !== 'me')
      .map((s) => `<span class="tag ${s}">${TAG_LABELS[s]}</span>`)
      .join('');
  }

  // HTML 특수문자 처리
  function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  // 두 지점 사이 직선거리(m), 하버사인 공식
  function distance(a, b) {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLon = (b.lon - a.lon) * rad;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  // 거리 표시: 1km 미만은 50m 단위, 이상은 소수 한 자리 km
  function formatDistance(m) {
    return m < 1000
      ? '약 ' + Math.round(m / 50) * 50 + 'm'
      : '약 ' + (m / 1000).toFixed(1) + 'km';
  }

  // 위도·경도 → 지도 SVG 좌표 [x, y]
  function toMapXY(point) {
    return [(point.lon - 141.3430) * 40650, (43.0700 - point.lat) * 55660];
  }

  function googleMapURL(hotel) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(hotel.mapQuery);
  }

  // 호텔 고유 색을 --hc 변수로 넘겨주는 style 값
  function hotelStyle(hotel) {
    return `--hc:var(${hotel.color})`;
  }

  /* ===== 한눈에 보기 표 ===== */
  function renderCompareTable() {
    let html =
      '<div class="row head"><div class="lab"></div>' +
      HOTELS.map((h) =>
        `<div class="cell" style="${hotelStyle(h)}"><span class="num">${h.num}</span><span>${esc(h.name)}</span></div>`
      ).join('') +
      '</div>';

    COMPARE_ROWS.forEach(([key, label]) => {
      html +=
        `<div class="row"><div class="lab">${label}</div>` +
        HOTELS.map((h) => {
          const [text, source] = h.rows[key];
          return `<div class="cell" style="${hotelStyle(h)}" data-h="${h.num}. ${esc(h.short)}">${esc(text)}${tagHTML(source)}</div>`;
        }).join('') +
        '</div>';
    });

    document.getElementById('cmp').innerHTML = html;
  }

  /* ===== 주요 지점까지 거리표 ===== */
  function renderDistanceTable() {
    let html =
      '<div class="row head"><div class="lab"></div>' +
      HOTELS.map((h) =>
        `<div class="cell" style="${hotelStyle(h)}"><span class="num">${h.num}</span><span>${esc(h.short)}</span></div>`
      ).join('') +
      '</div>';

    PLACES.forEach((place) => {
      const dists = HOTELS.map((h) => distance(h, place));
      const nearest = Math.min(...dists);
      html +=
        `<div class="row"><div class="lab">${esc(place.name)}</div>` +
        HOTELS.map((h, i) => {
          const best = dists[i] === nearest ? ' best' : '';
          return `<div class="cell${best}" style="${hotelStyle(h)}" data-h="${h.num}. ${esc(h.short)}">${formatDistance(dists[i])}</div>`;
        }).join('') +
        '</div>';
    });

    document.getElementById('dist').innerHTML = html;
  }

  /* ===== 지도 ===== */
  let selected = null; // 선택된 호텔 번호(0~3), 없으면 null

  function mapSVG() {
    const W = 650;
    const H = 1030;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="삿포로 중심가 약식 지도. 호텔 4곳과 주요 지점의 위치 관계">`;

    // 배경
    s += `<rect width="${W}" height="${H}" fill="var(--soft)"/>`;

    // 오도리공원 (동서로 긴 띠)
    const parkNE = toMapXY({ lat: 43.0611, lon: 141.3563 });
    const parkSW = toMapXY({ lat: 43.0603, lon: 141.3420 });
    const parkH = parkSW[1] - parkNE[1];
    s += `<rect x="0" y="${parkNE[1]}" width="${parkNE[0]}" height="${parkH}" fill="var(--park)"/>`;
    s += `<text class="svg-t" x="30" y="${parkNE[1] + parkH / 2 + 6}" font-size="17" font-weight="700" style="stroke:var(--park)">오도리공원</text>`;

    // 타누키코지 상점가 (가는 띠)
    const tanukiE = toMapXY({ lat: 43.0580, lon: 141.3563 });
    const tanukiWx = toMapXY({ lat: 43.0580, lon: 141.3481 })[0] + 40;
    s += `<rect x="${tanukiWx}" y="${tanukiE[1] - 7}" width="${tanukiE[0] - tanukiWx}" height="14" fill="var(--tanuki)"/>`;
    s += `<text class="svg-t" x="${tanukiE[0] - 4}" y="${tanukiE[1] + 28}" text-anchor="end" font-size="14" style="stroke:var(--soft)">타누키코지 상점가</text>`;

    // 지하철 난보쿠선: 삿포로역 → 오도리역 → 스스키노역
    const sapporo = toMapXY(PLACES[0]);
    const odori = toMapXY(PLACES[1]);
    const susukino = toMapXY(PLACES[6]);
    s += `<polyline points="${sapporo.join(',')} ${odori.join(',')} ${susukino.join(',')}" fill="none" stroke="var(--muted)" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>`;
    s += `<text class="svg-t" x="${odori[0] + 14}" y="${odori[1] + 210}" font-size="13" style="fill:var(--muted);stroke:var(--soft)">지하철 난보쿠선(약식)</text>`;

    // 주요 지점 (마름모 + 이름)
    PLACES.forEach((place) => {
      if (!place.onMap) return;
      const [x, y] = toMapXY(place);
      s += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="var(--fg)" transform="rotate(45 ${x} ${y})"/>`;
      s += `<text class="svg-t" x="${x + place.labelDx}" y="${y + place.labelDy}" text-anchor="${place.anchor}" font-size="16" font-weight="700" style="stroke:var(--soft)">${place.name}</text>`;
    });

    // 호텔을 골랐으면: 그 호텔에서 각 지점까지 점선 + 거리
    // (지도 밖에 있는 나카지마공원은 제외)
    if (selected !== null) {
      const h = HOTELS[selected];
      const [hx, hy] = toMapXY(h);
      PLACES.forEach((place) => {
        if (!place.onMap && place.id !== 'park' && place.id !== 'tnk') return;
        const [px, py] = toMapXY(place);
        s += `<line x1="${hx}" y1="${hy}" x2="${px}" y2="${py}" stroke="var(${h.color})" stroke-width="2.5" stroke-dasharray="7 6"/>`;
        const midX = (hx + px) / 2;
        const midY = (hy + py) / 2;
        s += `<text class="svg-t" x="${midX}" y="${midY}" text-anchor="middle" font-size="15" font-weight="700" style="fill:var(${h.color});stroke:var(--soft)">${formatDistance(distance(h, place)).replace('약 ', '')}</text>`;
      });
    }

    // 호텔 핀 (번호 동그라미 + 짧은 이름). 다른 호텔을 골랐으면 흐리게.
    HOTELS.forEach((h, i) => {
      const [x, y] = toMapXY(h);
      const isSelected = selected === i;
      const dim = selected !== null && !isSelected;
      s += `<g tabindex="0" role="button" aria-label="${h.num}번 ${esc(h.name)}" style="cursor:pointer;outline:none" opacity="${dim ? 0.4 : 1}" data-i="${i}">`;
      s += `<circle cx="${x}" cy="${y}" r="${isSelected ? 20 : 17}" fill="var(${h.color})" stroke="var(--card)" stroke-width="3"/>`;
      s += `<text x="${x}" y="${y + 7}" text-anchor="middle" font-size="19" font-weight="900" style="fill:var(--on-c);font-family:var(--font)">${h.num}</text>`;
      s += `<text class="svg-t" x="${x}" y="${y + 36 + (isSelected ? 4 : 0)}" text-anchor="middle" font-size="17" font-weight="900" style="stroke:var(--soft)">${esc(h.short)}</text>`;
      s += '</g>';
    });

    // 축척 막대, 방위, 안내
    s += '<line x1="24" y1="990" x2="274" y2="990" stroke="var(--fg)" stroke-width="3"/>';
    s += '<text class="svg-t" x="24" y="978" font-size="14" style="stroke:var(--soft)">500m</text>';
    s += `<text class="svg-t" x="${W - 20}" y="40" text-anchor="end" font-size="15" font-weight="700" style="stroke:var(--soft)">북 ↑</text>`;
    s += `<text class="svg-t" x="${W - 20}" y="1008" text-anchor="end" font-size="14" style="fill:var(--muted);stroke:var(--soft)">↓ 나카지마공원은 이 아래쪽</text>`;

    return s + '</svg>';
  }

  // 호텔 선택 버튼 (전체 + 호텔 4곳)
  function selectButtonsHTML() {
    return (
      `<button type="button" aria-pressed="${selected === null}" data-i="all">전체</button>` +
      HOTELS.map((h, i) =>
        `<button type="button" style="${hotelStyle(h)}" aria-pressed="${selected === i}" data-i="${i}"><span class="num">${h.num}</span>${esc(h.short)}</button>`
      ).join('')
    );
  }

  // 지도 옆 패널: 선택한 호텔의 주소 · 전화 · 가까운 순 거리
  function panelHTML() {
    if (selected === null) {
      return '<p>호텔 번호를 누르면 그 호텔에서 주요 지점까지 선이 그려지고 거리가 나옵니다. 지도의 핀을 눌러도 됩니다.</p>';
    }

    const h = HOTELS[selected];
    const items = PLACES
      .map((place) => ({ place, m: distance(h, place) }))
      .sort((a, b) => a.m - b.m)
      .map(({ place, m }) => `<li><span>${esc(place.name)}</span><b>${formatDistance(m)}</b></li>`)
      .join('');

    return (
      `<h3 style="color:var(${h.color})">${h.num}. ${esc(h.name)}</h3>` +
      `<p class="addr">${esc(h.addr)}<br>전화 <span class="sel-tel">${h.tel}</span></p>` +
      `<ul>${items}</ul>` +
      '<p class="small">직선거리 · 대략 값</p>' +
      `<p><a class="btn" href="${googleMapURL(h)}" target="_blank" rel="noopener">구글지도에서 정확한 위치 보기</a></p>`
    );
  }

  function renderMap() {
    document.getElementById('mapbox').innerHTML = mapSVG();
    document.getElementById('sel').innerHTML = selectButtonsHTML();
    document.getElementById('panel').innerHTML = panelHTML();
  }

  // '전체'를 누르면 선택 해제. (value는 문자열, selected는 숫자라
  // 같은 호텔을 다시 눌러도 해제되지 않고 그대로 선택된 상태로 남습니다.)
  function pick(value) {
    selected = value === 'all' || value === selected ? null : Number(value);
    renderMap();
  }

  /* ===== 호텔 카드 ===== */
  function renderCards() {
    const listItems = (list) =>
      list.map(([text, source]) => `<li>${esc(text)}${tagHTML(source)}</li>`).join('');

    document.getElementById('cards').innerHTML = HOTELS.map((h) =>
      `<article class="card" style="${hotelStyle(h)}">` +
        `<div class="t"><span class="num">${h.num}</span><h3>${esc(h.name)}</h3></div>` +
        `<p class="one">${esc(h.summary)}</p>` +
        `<div><h4>좋은 점</h4><ul>${listItems(h.good)}</ul></div>` +
        `<div><h4>알아둘 점</h4><ul>${listItems(h.care)}</ul></div>` +
        `<p class="addr">${esc(h.addr)}<br>전화 <span class="sel-tel">${h.tel}</span></p>` +
        `<p><a class="btn" href="${googleMapURL(h)}" target="_blank" rel="noopener">구글지도에서 보기</a></p>` +
      '</article>'
    ).join('');
  }

  /* ===== 시작 ===== */
  renderCompareTable();
  renderDistanceTable();
  renderMap();
  renderCards();

  // 버튼 클릭 · 지도 핀 클릭 · 지도 핀에서 Enter/Space
  document.getElementById('sel').addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) pick(button.getAttribute('data-i'));
  });

  const mapbox = document.getElementById('mapbox');
  mapbox.addEventListener('click', (e) => {
    const pin = e.target.closest('g[data-i]');
    if (pin) pick(pin.getAttribute('data-i'));
  });
  mapbox.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const pin = e.target.closest('g[data-i]');
    if (pin) {
      e.preventDefault();
      pick(pin.getAttribute('data-i'));
    }
  });

})();
