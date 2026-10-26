/*
 * 장소 검색 · 일정 계획 탭이 같이 쓰는 데이터와 도우미 함수
 */

/* ===== 여행 날짜 (A안: 키타히로시마 4박 + 삿포로 시내 3박) ===== */
// wd: 요일 번호 (0=일 ... 6=토, 구글 영업시간과 같은 기준)
export const DAYS = [
  { date: '2027-06-28', n: 1, md: '6/28', dow: '월', wd: 1, note: '도착 · 키타히로시마' },
  { date: '2027-06-29', n: 2, md: '6/29', dow: '화', wd: 2, note: '키타히로시마 골프' },
  { date: '2027-06-30', n: 3, md: '6/30', dow: '수', wd: 3, note: '키타히로시마 골프' },
  { date: '2027-07-01', n: 4, md: '7/1',  dow: '목', wd: 4, note: '키타히로시마 골프' },
  { date: '2027-07-02', n: 5, md: '7/2',  dow: '금', wd: 5, note: '골프 후 시내로 이동' },
  { date: '2027-07-03', n: 6, md: '7/3',  dow: '토', wd: 6, note: '삿포로 자유일정' },
  { date: '2027-07-04', n: 7, md: '7/4',  dow: '일', wd: 0, note: '삿포로 자유일정' },
  { date: '2027-07-05', n: 8, md: '7/5',  dow: '월', wd: 1, note: '귀국' },
];

// 시간표 범위 (분 단위): 6:00 ~ 22:00, 15분 단위로 맞춤
export const DAY_START = 6 * 60;
export const DAY_END = 22 * 60;
export const SNAP = 15;

// 길찾기 출발 호텔. 장소 검색 · 일정 편집 창에서 골라 씁니다.
// A안 첫 4박 + A안 시내 3박 후보(hotels-data.js) + B안 호텔. lat/lng가 없는 곳은 직선거리를 표시하지 않습니다.
const CLASSE = {
  id: 'a-classe', group: 'A안 · 첫 4박', short: '키타히로시마 클래스', name: '키타히로시마 클래스 호텔 (札幌北広島クラッセホテル)',
  query: '札幌北広島クラッセホテル 北広島市中の沢316-1', lat: null, lng: null,
};
const CITY = (window.SAPPORO_CITY_HOTELS || []).map((h) => ({
  id: `city-${h.num}`, group: 'A안 · 시내 3박 후보', short: h.short, name: h.name,
  query: h.query, lat: h.lat, lng: h.lng,
}));
const B_PARK = {
  id: 'b-park', group: 'B안 · 여행사', short: '프리미어 파크', name: '마이스테이즈 프리미어 삿포로 파크',
  query: 'Hotel MyStays Premier Sapporo Park', lat: 43.0484, lng: 141.3560,
};
export const HOTELS = [CLASSE, ...CITY, B_PARK];

const ORIGIN_STORAGE = 'sapporo.originHotel';

// 지금 고른 출발 호텔. 처음엔 '예약 경비' 탭에서 고른 시내 호텔 (없으면 첫 시내 호텔)
export function originHotel() {
  const saved = HOTELS.find((h) => h.id === storageGet(ORIGIN_STORAGE));
  if (saved) return saved;
  return HOTELS.find((h) => h.id === `city-${storageGet('sapporo.cityHotel')}`) || CITY[0] || CLASSE;
}

// 출발 호텔을 바꾸면 'originchange' 이벤트로 검색 결과 · 편집 창이 다시 그려짐
export function setOriginHotel(id) {
  storageSet(ORIGIN_STORAGE, id);
  window.dispatchEvent(new Event('originchange'));
}

// 출발 호텔 고르기 (data-origin-select 의 change는 각 화면에서 처리)
export function originPickerHTML() {
  const current = originHotel().id;
  const groups = [...new Set(HOTELS.map((h) => h.group))];
  return `
    <label class="origin-pick">
      <span class="origin-lab">출발 호텔</span>
      <select data-origin-select aria-label="길찾기 출발 호텔">
        ${groups.map((g) => `
          <optgroup label="${g}">
            ${HOTELS.filter((h) => h.group === g).map((h) =>
              `<option value="${h.id}"${h.id === current ? ' selected' : ''}>${h.short}</option>`).join('')}
          </optgroup>`).join('')}
      </select>
    </label>`;
}

/* ===== 새 계획을 만들 때 미리 넣어 두는 고정 일정 (A안) ===== */
// 티오프 시간은 아직 안 나와서 대략적인 시간으로 넣고 메모에 적어 둡니다.
const TEE_MEMO = '티오프 시간 미정 · 정해지면 옮겨 주세요. 27홀 기준 대략적인 시간입니다.';

function golf(day, memo) {
  const start = 7 * 60;
  const end = 15 * 60;
  return { title: '키타히로시마 CC 27홀 라운딩', kind: 'fixed', day, start, end, dur: end - start, memo, place: null };
}

// 시내 3박 호텔 (hotels-data.js의 번호로 찾음, 없으면 null = 아직 안 정함)
export function cityHotelByNum(num) {
  return (window.SAPPORO_CITY_HOTELS || []).find((h) => h.num === num) || null;
}

// 호텔을 일정의 장소 정보로 (편집 창에서 구글지도 · 길찾기 버튼이 나오게)
function hotelPlace(h) {
  return {
    id: null, name: h.name, query: h.query, address: h.area, lat: h.lat, lng: h.lng,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(h.query),
    website: '', rating: null, ratingCount: null, priceLevel: null, typeLabel: '숙소', hours: null, hoursText: null,
  };
}

// 시내 호텔이 들어가는 고정 일정 2개의 제목 · 메모 · 장소.
// role('city-in' / 'city-out')로 찾아서, 우리 시내 호텔을 바꾸면 같이 바뀝니다.
export function cityHotelItemPatch(role, h) {
  if (role === 'city-in') {
    return h
      ? { title: `${h.short} 체크인 (시내로 이동)`, memo: `키타히로시마 → ${h.name} (교통비 2,320엔).`, place: hotelPlace(h) }
      : { title: '삿포로 시내 호텔로 이동 · 체크인', memo: "키타히로시마 → 시내 호텔 (교통비 2,320엔). 호텔이 정해지면 위쪽 '우리 시내 호텔'에서 고르세요.", place: null };
  }
  return h
    ? { title: `${h.short} 체크아웃 · 공항 이동`, memo: `${h.name} 체크아웃 후 JR로 신치토세공항. 항공편 시간에 맞춰 조정하세요.`, place: hotelPlace(h) }
    : { title: '체크아웃 · 공항 이동', memo: '시내 호텔 체크아웃 후 JR로 신치토세공항. 항공편 시간에 맞춰 조정하세요.', place: null };
}

// A안 고정 일정. cityNum: 우리 시내 호텔 번호 (없으면 이름 없이)
export function seedItems(cityNum) {
  const h = cityHotelByNum(cityNum);
  return [
    { title: '키타히로시마 클래스 호텔 체크인', kind: 'fixed', day: '2027-06-28', start: 15 * 60, end: 15 * 60 + 30, dur: 30,
      memo: '신치토세공항에서 이동 (첫날 교통비 4,000엔). 항공편 도착 시간에 맞춰 옮기세요.', place: null },
    golf('2027-06-29', TEE_MEMO),
    golf('2027-06-30', TEE_MEMO),
    golf('2027-07-01', TEE_MEMO),
    golf('2027-07-02', '키타히로시마 체크아웃하고 짐을 맡긴 뒤 라운딩 (짐 보관은 호텔에 확인). ' + TEE_MEMO),
    { kind: 'fixed', role: 'city-in', day: '2027-07-02', start: 15 * 60 + 30, end: 17 * 60, dur: 90,
      ...cityHotelItemPatch('city-in', h) },
    { kind: 'fixed', role: 'city-out', day: '2027-07-05', start: 9 * 60, end: 11 * 60, dur: 120,
      ...cityHotelItemPatch('city-out', h) },
  ];
}

/* ===== 도우미 함수 ===== */

export function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 분 → "9:30"
export function fmtTime(min) {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

// 분 → "1시간 30분"
export function fmtDur(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}분`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

export function dayInfo(date) {
  return DAYS.find((d) => d.date === date) || null;
}

// "2027-06-30" → "6/30 (수)"
export function dayLabel(date) {
  const d = dayInfo(date);
  return d ? `${d.md} (${d.dow})` : '';
}

export function snap(min) {
  return Math.round(min / SNAP) * SNAP;
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// 두 지점 사이 직선거리(km)
export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}

// 구글지도 대중교통 길찾기 주소
export function directionsUrl(from, to) {
  const p = new URLSearchParams({ api: '1', travelmode: 'transit' });
  p.set('origin', from.query || from.name);
  if (from.placeId) p.set('origin_place_id', from.placeId);
  p.set('destination', to.query || to.name);
  if (to.placeId) p.set('destination_place_id', to.placeId);
  return 'https://www.google.com/maps/dir/?' + p.toString();
}

/*
 * 영업시간 확인
 * hours: [{ d: 여는 요일, o: 여는 시각(분), c: 닫는 시각(여는 날 0시 기준 분, 다음날이면 1440 넘음) }]
 * 반환: null = 문제없음(또는 정보 없음) · 'closed' = 그날 쉬는 날 · 'outside' = 영업시간 밖
 */
export function hoursCheck(hours, wd, start, end) {
  if (!Array.isArray(hours) || hours.length === 0) return null;
  const WEEK = 7 * 1440;
  const s = wd * 1440 + start;
  const e = wd * 1440 + end;
  let openThatDay = false;
  for (const p of hours) {
    for (const shift of [-WEEK, 0, WEEK]) {
      const a = p.d * 1440 + p.o + shift;
      const b = p.d * 1440 + p.c + shift;
      if (a <= s && e <= b) return null;
      if (a < wd * 1440 + 1440 && b > wd * 1440) openThatDay = true;
    }
  }
  return openThatDay ? 'outside' : 'closed';
}

// 화면 아래에 잠깐 뜨는 안내 문구
let toastTimer = null;
export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

export function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function storageSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* 저장 못 해도 동작은 계속 */ }
}
