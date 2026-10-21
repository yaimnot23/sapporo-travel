/*
 * 장소 검색 탭: 구글 Places API로 삿포로 주변 관광지 · 맛집을 찾아 계획 대기함에 추가
 *
 * 구글 지도 코드는 처음 검색할 때만 불러옵니다(하루 사용량 절약).
 * API 키는 Google Cloud에서 yaimnot23.github.io 에서만 쓰이도록 잠가 두었습니다.
 */
import { HOTEL, esc, dayLabel, fmtTime, distanceKm, directionsUrl, toast } from './common.js';
import { firebaseConfig } from './firebase-config.js';
import * as store from './store.js';

const MAPS_KEY = firebaseConfig.apiKey; // Firebase와 같은 키 (Maps JavaScript API, Places API (New) 허용)

// 검색 결과에서 가져올 정보
const FIELDS = [
  'id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'priceLevel',
  'regularOpeningHours', 'photos', 'primaryTypeDisplayName', 'types', 'googleMapsURI', 'websiteURI', 'businessStatus',
];

// 빠른 검색 버튼 [버튼 글자, 실제 검색어]
const QUICK = [
  ['라멘', '삿포로 라멘'],
  ['스시', '삿포로 스시'],
  ['징기스칸', '삿포로 징기스칸'],
  ['수프카레', '삿포로 수프카레'],
  ['해산물 · 시장', '삿포로 해산물 시장'],
  ['카페 · 디저트', '삿포로 디저트 카페'],
  ['관광 명소', '삿포로 관광 명소'],
  ['야경', '삿포로 야경'],
  ['온천', '삿포로 근교 온천'],
  ['오타루', '오타루 관광'],
];

const PRICE_LABELS = {
  FREE: '무료',
  INEXPENSIVE: '¥ 저렴',
  MODERATE: '¥¥ 보통',
  EXPENSIVE: '¥¥¥ 비쌈',
  VERY_EXPENSIVE: '¥¥¥¥ 매우 비쌈',
};

const FOOD_TYPES = ['restaurant', 'cafe', 'bakery', 'bar', 'food', 'meal_takeaway', 'meal_delivery'];

const SAPPORO_CENTER = { lat: 43.0621, lng: 141.3544 };

const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const statusEl = document.getElementById('searchStatus');
const resultsEl = document.getElementById('results');

let results = [];          // 정리한 장소 정보
let photos = [];           // 결과별 구글 사진 객체 (사진은 펼쳤을 때만 불러옴)
const cache = new Map();   // 같은 검색어는 다시 요청하지 않음
let storeState = null;

/* ===== 구글 지도 불러오기 ===== */
let placesLib = null;
function loadPlaces() {
  if (placesLib) return placesLib;
  placesLib = new Promise((resolve, reject) => {
    window.__sapporoMapsReady = resolve;
    window.gm_authFailure = () => {
      reject(new Error('auth'));
      setStatus('구글 지도 키 설정 문제로 검색할 수 없어요. (키의 웹사이트 제한을 확인해 주세요)');
    };
    const s = document.createElement('script');
    s.src = 'https://maps.googleapis.com/maps/api/js?' + new URLSearchParams({
      key: MAPS_KEY, v: 'weekly', loading: 'async', language: 'ko', region: 'JP', callback: '__sapporoMapsReady',
    });
    s.async = true;
    s.onerror = () => reject(new Error('load'));
    document.head.append(s);
  }).then(() => google.maps.importLibrary('places'));
  placesLib.catch(() => { placesLib = null; });
  return placesLib;
}

/* ===== 검색 ===== */
async function search(text) {
  const q = text.trim();
  if (!q) return;
  input.value = q;
  if (cache.has(q)) {
    show(cache.get(q), q);
    return;
  }
  setStatus(`‘${q}’ 검색 중…`);
  resultsEl.innerHTML = '';
  try {
    const { Place } = await loadPlaces();
    const { places } = await Place.searchByText({
      textQuery: q,
      fields: FIELDS,
      locationBias: { center: SAPPORO_CENTER, radius: 50000 },
      language: 'ko',
      region: 'jp',
      maxResultCount: 12,
    });
    const found = { list: places.map(normalize), photos: places.map((p) => (p.photos || [])[0] || null) };
    cache.set(q, found);
    show(found, q);
  } catch (err) {
    console.error(err);
    if (err.message !== 'auth') {
      setStatus('검색하지 못했어요. 인터넷 연결을 확인하거나, 오늘 검색 한도(하루 300회)를 넘었으면 내일 다시 해 주세요.');
    }
  }
}

function show(found, q) {
  results = found.list;
  photos = found.photos;
  setStatus(results.length ? `‘${q}’ 검색 결과 ${results.length}곳` : `‘${q}’ 검색 결과가 없어요. 다른 말로 검색해 보세요.`);
  resultsEl.innerHTML = results.map(resultHTML).join('');
}

function setStatus(text) {
  statusEl.textContent = text;
}

// 구글 영업시간 → [{ d, o, c }] (common.js의 hoursCheck 형식)
function toPeriods(hours) {
  if (!hours || !Array.isArray(hours.periods)) return null;
  return hours.periods.map((p) => {
    const o = p.open.hour * 60 + p.open.minute;
    if (!p.close) return { d: p.open.day, o, c: o + 7 * 1440 }; // 24시간 영업
    let c = ((p.close.day - p.open.day + 7) % 7) * 1440 + p.close.hour * 60 + p.close.minute;
    if (c <= o) c += 7 * 1440;
    return { d: p.open.day, o, c };
  });
}

function normalize(p) {
  const loc = p.location;
  return {
    id: p.id,
    name: p.displayName || '',
    address: p.formattedAddress || '',
    lat: loc ? loc.lat() : null,
    lng: loc ? loc.lng() : null,
    mapsUrl: p.googleMapsURI || '',
    website: p.websiteURI || '',
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? null,
    priceLevel: p.priceLevel ? String(p.priceLevel).toUpperCase() : null,
    typeLabel: p.primaryTypeDisplayName || '',
    isFood: (p.types || []).some((t) => FOOD_TYPES.includes(t)),
    status: p.businessStatus ? String(p.businessStatus).toUpperCase() : null,
    hours: toPeriods(p.regularOpeningHours),
    hoursText: p.regularOpeningHours?.weekdayDescriptions || null,
  };
}

/* ===== 결과 화면 ===== */

function metaLine(p) {
  const parts = [];
  if (p.typeLabel) parts.push(esc(p.typeLabel));
  if (p.rating != null) parts.push(`★ ${p.rating.toFixed(1)}${p.ratingCount ? ` (${p.ratingCount.toLocaleString('ko-KR')})` : ''}`);
  if (p.priceLevel && PRICE_LABELS[p.priceLevel]) parts.push(PRICE_LABELS[p.priceLevel]);
  return parts.join(' · ');
}

// 이미 계획에 들어 있으면 어디에 있는지 알려줌
function planStatus(placeId) {
  if (!storeState || storeState.status !== 'ready') return '';
  const found = [...storeState.items.values()].filter((i) => i.place && i.place.id === placeId);
  if (!found.length) return '';
  return found
    .map((i) => (i.day ? `${dayLabel(i.day)} ${fmtTime(i.start)} 일정에 있음` : '대기함에 있음'))
    .join(' · ');
}

function resultHTML(p, i) {
  const dist = p.lat != null ? distanceKm(HOTEL, p) : null;
  const closed = p.status === 'CLOSED_PERMANENTLY' ? '폐업한 곳으로 나와요'
    : p.status === 'CLOSED_TEMPORARILY' ? '임시 휴업 중으로 나와요' : '';
  const inPlan = planStatus(p.id);
  const route = directionsUrl(HOTEL, { name: p.name, placeId: p.id });
  return `
    <li class="result" data-i="${i}">
      <div class="r-main">
        <h3>${esc(p.name)}</h3>
        <p class="r-meta">${metaLine(p)}</p>
        <p class="addr">${esc(p.address)}</p>
        ${dist != null ? `<p class="small">호텔에서 직선 약 ${dist < 10 ? dist.toFixed(1) : Math.round(dist)}km</p>` : ''}
        ${closed ? `<p class="r-warn">${closed}</p>` : ''}
      </div>
      ${p.hoursText ? `<details class="r-more"><summary>영업시간</summary><ul>${p.hoursText.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>` : ''}
      ${photos[i] ? '<details class="r-more r-photo"><summary>사진</summary></details>' : ''}
      <div class="r-actions">
        <button type="button" class="btn" data-add="${i}">계획에 추가</button>
        ${p.mapsUrl ? `<a class="btn-ghost" href="${esc(p.mapsUrl)}" target="_blank" rel="noopener">구글지도</a>` : ''}
        <a class="btn-ghost" href="${esc(route)}" target="_blank" rel="noopener">호텔에서 가는 길</a>
      </div>
      <p class="r-status small" data-status="${esc(p.id)}">${esc(inPlan)}</p>
    </li>`;
}

function refreshPlanStatus() {
  resultsEl.querySelectorAll('[data-status]').forEach((el) => {
    el.textContent = planStatus(el.getAttribute('data-status'));
  });
}

/* ===== 계획 대기함에 추가 ===== */
function addToPlan(i) {
  const p = results[i];
  if (!p) return;
  if (!store.isConnected()) {
    toast('먼저 ‘일정 계획’ 탭에서 가족 계획에 연결해 주세요.');
    return;
  }
  const { isFood, status, ...place } = p;
  store.saveItem(null, {
    title: p.name, kind: 'place', day: null, start: null, end: null,
    dur: isFood ? 60 : 90, memo: '', place,
  });
  toast(`‘${p.name}’을(를) 대기함에 넣었어요.`);
}

/* ===== 이벤트 ===== */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  search(input.value);
});

document.getElementById('quick').innerHTML = QUICK
  .map(([label, q]) => `<button type="button" class="quick-btn" data-q="${esc(q)}">${esc(label)}</button>`)
  .join('');
document.getElementById('quick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-q]');
  if (b) search(b.getAttribute('data-q'));
});

resultsEl.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) addToPlan(Number(add.getAttribute('data-add')));
});

// 사진은 '사진'을 펼쳤을 때 처음 한 번만 불러옴
resultsEl.addEventListener('toggle', (e) => {
  const box = e.target;
  if (!box.classList || !box.classList.contains('r-photo') || !box.open || box.dataset.loaded) return;
  const i = Number(box.closest('[data-i]').getAttribute('data-i'));
  const photo = photos[i];
  if (!photo) return;
  box.dataset.loaded = '1';
  const img = document.createElement('img');
  img.alt = `${results[i].name} 사진`;
  img.loading = 'lazy';
  img.src = photo.getURI({ maxWidth: 640 });
  box.append(img);
  const credit = (photo.authorAttributions || [])[0];
  if (credit) {
    const p = document.createElement('p');
    p.className = 'small';
    p.textContent = `사진: ${credit.displayName}`;
    box.append(p);
  }
}, true);

store.subscribe((s) => {
  storeState = s;
  refreshPlanStatus();
});
