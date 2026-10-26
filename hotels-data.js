/*
 * A안 시내 3박 호텔 후보 (여행 경비 · A안·B안 비교 · 장소 검색 탭이 같이 씀)
 *
 * price: 3박 · 객실 2개 합계 (원, 세금 포함, 조식 미포함)
 *        2026년 10월 26일 trip.com, 2027년 7월 2~5일 · 성인 4명 · 각자 침대를 쓰는 가장 싼 방
 * breakfastYen: 호텔 조식을 그날 사 먹을 때 성인 1인 가격 (엔)
 * area · bath: 일정 계획에서 호텔을 고를 때 보여주는 짧은 설명
 * num · color는 '호텔 비교' 탭(script.js)의 번호 · 색과 같게 맞춰 둠
 */
window.SAPPORO_CITY_HOTELS = [
  { num: 1, color: '--c1', short: '홀리데이 인', name: '홀리데이 인 스위트 삿포로 오도리 공원',
    query: 'Holiday Inn & Suites Sapporo Odori Park', lat: 43.0580, lng: 141.3481,
    price: 1476486, room: '2 트윈 프리미엄', note: '무료 취소(6/2까지)', breakfastYen: 2500,
    area: '타누키코지 바로 옆 · 오도리역 10분', bath: '최상층 대욕장 · 사우나' },
  { num: 2, color: '--c2', short: '베셀 캄파나', name: '베셀 호텔 캄파나 스스키노',
    query: 'Vessel Hotel Campana Susukino', lat: 43.0548, lng: 141.3500,
    price: 1372582, room: '스탠다드 트윈', note: '무료 취소(6/30까지)', breakfastYen: 2300,
    area: '스스키노 · 스스키노역 4분', bath: '대욕장 · 사우나 (해물 조식 인기)' },
  { num: 3, color: '--c3', short: '도큐스테이', name: '도큐스테이 삿포로 오도리',
    query: 'Tokyu Stay Sapporo Odori', lat: 43.0583, lng: 141.3520,
    price: 1442706, room: '수페리어 트윈', note: '무료 취소(7/1까지)', breakfastYen: 2100,
    area: '오도리역 3분 · 타누키코지 1분', bath: '대욕장 없음 · 방에 세탁기' },
  { num: 4, color: '--c4', short: '미쓰이 가든', name: '미쓰이 가든 호텔 삿포로 웨스트',
    query: 'Mitsui Garden Hotel Sapporo West', lat: 43.0670, lng: 141.3470,
    price: 1248908, room: '스탠다드 침대 2개', note: '환불 불가 · 무료 취소는 1,387,756원', breakfastYen: 2970,
    area: '삿포로역 4분', bath: '작은 대욕장' },
  { num: 5, color: '--c5', short: '몬토레 에델호프', name: '호텔 몬토레 에델호프 삿포로',
    query: 'Hotel Monterey Edelhof Sapporo', lat: 43.0636, lng: 141.3557,
    price: 1341224, room: '스탠다드 트윈', note: '무료 취소(6/23까지)', breakfastYen: 4000,
    area: '삿포로역 ~ 오도리 사이', bath: '14층 천연온천 스파' },
  { num: 6, color: '--c6', short: '그랜드 호텔', name: '삿포로 그랜드 호텔',
    query: 'Sapporo Grand Hotel', lat: 43.0622, lng: 141.3514,
    price: 1530844, room: '런 오브 하우스 트윈', note: '무료 취소도 같은 값', breakfastYen: 4000,
    area: '오도리역 · 지하도 바로 연결', bath: '대욕장 없음' },
];
