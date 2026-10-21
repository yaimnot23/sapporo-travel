/*
 * 장소 검색 · 일정 계획 탭이 같이 쓰는 데이터와 도우미 함수
 */

/* ===== 여행 날짜 (B안: 골프투어로 견적서 기준) ===== */
// wd: 요일 번호 (0=일 ... 6=토, 구글 영업시간과 같은 기준)
export const DAYS = [
  { date: '2027-06-28', n: 1, md: '6/28', dow: '월', wd: 1, note: '도착 · 쎈파크 골프' },
  { date: '2027-06-29', n: 2, md: '6/29', dow: '화', wd: 2, note: '기타히로시마 골프' },
  { date: '2027-06-30', n: 3, md: '6/30', dow: '수', wd: 3, note: '자유일정' },
  { date: '2027-07-01', n: 4, md: '7/1',  dow: '목', wd: 4, note: '클라크 골프' },
  { date: '2027-07-02', n: 5, md: '7/2',  dow: '금', wd: 5, note: '츠키샷프 골프' },
  { date: '2027-07-03', n: 6, md: '7/3',  dow: '토', wd: 6, note: '자유일정' },
  { date: '2027-07-04', n: 7, md: '7/4',  dow: '일', wd: 0, note: '유니토부 골프' },
  { date: '2027-07-05', n: 8, md: '7/5',  dow: '월', wd: 1, note: '귀국' },
];

// 시간표 범위 (분 단위): 6:00 ~ 22:00, 15분 단위로 맞춤
export const DAY_START = 6 * 60;
export const DAY_END = 22 * 60;
export const SNAP = 15;

// 숙소 (B안 견적서의 호텔). 길찾기 출발지와 거리 계산에 씁니다.
export const HOTEL = {
  name: '마이스테이즈 프리미어 삿포로 파크',
  query: 'Hotel MyStays Premier Sapporo Park',
  lat: 43.0484,
  lng: 141.3560,
};

/* ===== 새 계획을 만들 때 미리 넣어 두는 고정 일정 ===== */
// 티오프 시간은 아직 안 나와서 대략적인 시간으로 넣고 메모에 적어 둡니다.
function golf(day, course, start, end, memo) {
  return { title: `${course} 18홀 라운딩`, kind: 'fixed', day, start, end, dur: end - start, memo, place: null };
}

const TEE_MEMO = '티오프 시간 미정 · 정해지면 옮겨 주세요. 호텔 ↔ 골프장 송영차량 포함, 카트·셀프플레이.';

export const SEED_ITEMS = [
  golf('2027-06-28', '쎈파크', 12 * 60, 17 * 60 + 30, '공항 도착 후 송영차량으로 바로 이동. ' + TEE_MEMO),
  { title: '호텔 체크인', kind: 'fixed', day: '2027-06-28', start: 18 * 60, end: 18 * 60 + 30, dur: 30,
    memo: '라운딩 후 호텔로 이동해 체크인.', place: null },
  golf('2027-06-29', '기타히로시마', 7 * 60 + 30, 14 * 60, TEE_MEMO),
  golf('2027-07-01', '클라크', 7 * 60 + 30, 14 * 60, TEE_MEMO),
  golf('2027-07-02', '츠키샷프', 7 * 60 + 30, 14 * 60, TEE_MEMO),
  golf('2027-07-04', '유니토부', 7 * 60 + 30, 14 * 60, TEE_MEMO),
  { title: '체크아웃 · 공항 이동', kind: 'fixed', day: '2027-07-05', start: 9 * 60, end: 11 * 60, dur: 120,
    memo: '호텔 조식 후 체크아웃, 송영차량으로 신치토세공항. 항공편 시간에 맞춰 조정하세요.', place: null },
];

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
