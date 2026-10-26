/*
 * 일정 계획 데이터 저장 (Firebase Firestore, 실시간 동기화)
 *
 * 저장 구조
 *   trips/{열쇠}                 계획 하나 (열쇠 = 공유 링크의 #k= 뒤 문자열)
 *   trips/{열쇠}/items/{id}      일정 하나. day가 null이면 대기함
 *   trips/{열쇠}/history/{id}    변경 기록 (되돌리기용 before / after)
 *
 * 가족 중 누가 바꿔도 onSnapshot으로 모든 화면에 바로 반영됩니다.
 * 휴대폰이 오프라인이어도 마지막으로 받은 계획을 볼 수 있고, 바꾼 내용은 연결되면 저장됩니다.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, onSnapshot, writeBatch, serverTimestamp, query, orderBy, limit,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { seedItems, cityHotelByNum, cityHotelItemPatch, dayLabel, fmtTime, storageGet, storageSet } from './common.js';

const KEY_STORAGE = 'sapporo.tripKey';
const NAME_STORAGE = 'sapporo.name';
const KEY_PATTERN = /^[A-Za-z0-9_-]{24,64}$/;

// 일정 하나가 가지는 값 (이 밖의 값은 저장하지 않음)
// role: 시내 호텔 체크인/체크아웃 일정 표시 ('city-in' · 'city-out'), 우리 시내 호텔을 바꿀 때 찾아서 고침
const ITEM_FIELDS = ['title', 'kind', 'day', 'start', 'end', 'dur', 'memo', 'place', 'role'];

/* ===== Firebase 연결 ===== */
const app = initializeApp(firebaseConfig);
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
} catch {
  db = getFirestore(app); // 기기 저장소를 못 쓰는 환경(사생활 보호 모드 등)
}

/* ===== 공유 링크(#k=열쇠)로 들어왔으면 열쇠를 기억하고 주소창에서 지움 ===== */
const linkMatch = location.hash.match(/^#k=([A-Za-z0-9_-]+)$/);
if (linkMatch && KEY_PATTERN.test(linkMatch[1])) {
  storageSet(KEY_STORAGE, linkMatch[1]);
  history.replaceState(null, '', location.pathname + location.search);
}

/* ===== 상태와 구독 ===== */
// status: 'none' 연결 안 됨 · 'loading' · 'ready' · 'missing' 없는 계획 · 'error'
const state = {
  key: storageGet(KEY_STORAGE),
  status: 'none',
  items: new Map(),
  history: [],
  expenses: [],
  trip: null,
  pending: false,
  error: null,
};
const listeners = new Set();
let unsubscribers = [];

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn(state));
}

function fail(err) {
  console.error(err);
  state.status = 'error';
  state.error = err;
  emit();
}

function tripRef() {
  return doc(db, 'trips', state.key);
}

function listen() {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  state.items = new Map();
  state.history = [];
  state.expenses = [];
  state.trip = null;
  state.error = null;

  if (!state.key) {
    state.status = 'none';
    emit();
    return;
  }
  state.status = 'loading';
  emit();

  unsubscribers.push(onSnapshot(tripRef(), (snap) => {
    if (snap.exists()) {
      state.trip = snap.data(); // 계획 정보 (cityHotel: 우리 시내 호텔 번호)
      state.status = 'ready';
      emit();
    } else if (!snap.metadata.fromCache) {
      state.status = 'missing';
      emit();
    }
  }, fail));

  unsubscribers.push(onSnapshot(collection(tripRef(), 'items'), { includeMetadataChanges: true }, (snap) => {
    state.items = new Map(snap.docs.map((d) => [d.id, { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }]));
    state.pending = snap.metadata.hasPendingWrites;
    emit();
  }, fail));

  const historyQuery = query(collection(tripRef(), 'history'), orderBy('at', 'desc'), limit(30));
  unsubscribers.push(onSnapshot(historyQuery, (snap) => {
    state.history = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    emit();
  }, fail));

  // 지출 관리 탭의 지출 목록 (trips/{열쇠}/expenses)
  unsubscribers.push(onSnapshot(collection(tripRef(), 'expenses'), (snap) => {
    state.expenses = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    emit();
  }, fail));
}

/* ===== 연결 · 새 계획 ===== */

export function isConnected() {
  return state.status === 'ready';
}

export function shareLink() {
  return `${location.origin}${location.pathname}#k=${state.key}`;
}

// 공유 링크 전체나 열쇠만 붙여넣어도 연결. 형식이 틀리면 false
export function connect(linkOrKey) {
  const text = String(linkOrKey || '').trim();
  const key = (text.match(/#k=([A-Za-z0-9_-]+)/) || [null, text])[1];
  if (!KEY_PATTERN.test(key)) return false;
  state.key = key;
  storageSet(KEY_STORAGE, key);
  listen();
  return true;
}

export function disconnect() {
  state.key = null;
  storageSet(KEY_STORAGE, null);
  listen();
}

function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(21)); // → 28자
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// A안 고정 일정을 넣은 새 계획을 만들고 연결 (인터넷 연결 필요)
// cityNum: 우리 시내 호텔 번호 (hotels-data.js), 아직 안 정했으면 null
export async function createTrip(cityNum = null) {
  const key = randomKey();
  const trip = doc(db, 'trips', key);
  const batch = writeBatch(db);
  batch.set(trip, { title: '삿포로 골프 여행 (A안)', cityHotel: cityNum, createdAt: serverTimestamp() });
  seedItems(cityNum).forEach((item) => {
    batch.set(doc(collection(trip, 'items')), { ...pick(item), by: getName(), updatedAt: serverTimestamp() });
  });
  batch.set(doc(collection(trip, 'history')), {
    at: serverTimestamp(), by: getName(), text: '새 계획 만들기 (A안 고정 일정 포함)', itemId: null, before: null, after: null,
  });
  await batch.commit();
  connect(key);
  return key;
}

// 지금 계획의 고정 일정(골프 · 체크인 등)을 모두 지우고 A안 기본 일정으로 바꿈.
// 직접 넣은 일정과 대기함은 그대로. 바뀐 일정마다 변경 기록이 남아 하나씩 되돌릴 수 있음
export function replaceFixedItems() {
  const itemsCol = collection(tripRef(), 'items');
  const historyCol = collection(tripRef(), 'history');
  const batch = writeBatch(db);
  const log = (itemId, before, after, text) => batch.set(doc(historyCol), {
    at: serverTimestamp(), by: getName(), text, itemId, before, after,
  });
  [...state.items.values()].filter((i) => i.kind === 'fixed').forEach((i) => {
    batch.delete(doc(itemsCol, i.id));
    log(i.id, pick(i), null, `‘${i.title}’ 삭제 (A안으로 바꾸기)`);
  });
  seedItems(state.trip?.cityHotel ?? null).forEach((item) => {
    const ref = doc(itemsCol);
    const next = pick(item);
    batch.set(ref, { ...next, by: getName(), updatedAt: serverTimestamp() });
    log(ref.id, null, next, `‘${item.title}’ 추가 (A안으로 바꾸기)`);
  });
  batch.commit().catch(fail);
}

// 우리 시내 호텔 바꾸기: 계획에 저장하고, 시내 호텔 체크인 · 체크아웃 일정의 제목 · 장소도 같이 바꿈
export function setTripHotel(cityNum) {
  const h = cityHotelByNum(cityNum);
  const itemsCol = collection(tripRef(), 'items');
  const historyCol = collection(tripRef(), 'history');
  const batch = writeBatch(db);
  batch.set(tripRef(), { cityHotel: h ? h.num : null }, { merge: true });
  [...state.items.values()].filter((i) => i.role === 'city-in' || i.role === 'city-out').forEach((i) => {
    const before = pick(i);
    const after = { ...before, ...cityHotelItemPatch(i.role, h) };
    batch.set(doc(itemsCol, i.id), { ...after, by: getName(), updatedAt: serverTimestamp() });
    batch.set(doc(historyCol), {
      at: serverTimestamp(), by: getName(), text: `‘${after.title}’ (시내 호텔 변경)`, itemId: i.id, before, after,
    });
  });
  batch.set(doc(historyCol), {
    at: serverTimestamp(), by: getName(), text: `우리 시내 호텔: ${h ? h.name : '아직 안 정함'}`,
    itemId: null, before: null, after: null,
  });
  batch.commit().catch(fail);
}

/* ===== 이름 (변경 기록에 '누가'로 표시) ===== */

export function getName() {
  return storageGet(NAME_STORAGE) || '가족';
}

export function setName(name) {
  storageSet(NAME_STORAGE, name ? name.slice(0, 10) : null);
}

/* ===== 일정 저장 · 삭제 · 되돌리기 ===== */

function pick(item) {
  const out = {};
  ITEM_FIELDS.forEach((f) => { out[f] = item && item[f] !== undefined ? item[f] : null; });
  return out;
}

function when(item) {
  return `${dayLabel(item.day)} ${fmtTime(item.start)}–${fmtTime(item.end)}`;
}

// 변경 기록에 남길 문장
function describe(before, after) {
  const t = `‘${(after || before).title}’`;
  if (!before) return after.day ? `${t} ${when(after)}에 추가` : `${t} 대기함에 추가`;
  if (!after) return `${t} 삭제`;
  if (!after.day) return before.day ? `${t} 대기함으로 이동` : `${t} 수정`;
  if (!before.day) return `${t} ${when(after)}에 배치`;
  if (before.day !== after.day || before.start !== after.start || before.end !== after.end) {
    return `${t} ${when(after)}로 변경`;
  }
  return `${t} 내용 수정`;
}

// 일정 하나를 저장(after) 또는 삭제(after = null)하고 변경 기록을 같이 남김.
// 화면은 저장 완료를 기다리지 않고 바로 바뀝니다(오프라인이면 연결 후 저장).
function write(id, after, text) {
  const itemsCol = collection(tripRef(), 'items');
  const ref = id ? doc(itemsCol, id) : doc(itemsCol);
  const current = id ? state.items.get(id) : null;
  const before = current ? pick(current) : null;
  const next = after ? pick(after) : null;

  const batch = writeBatch(db);
  if (next) batch.set(ref, { ...next, by: getName(), updatedAt: serverTimestamp() });
  else batch.delete(ref);
  batch.set(doc(collection(tripRef(), 'history')), {
    at: serverTimestamp(),
    by: getName(),
    text: text || describe(before, next),
    itemId: ref.id,
    before,
    after: next,
  });
  batch.commit().catch(fail);
  return ref.id;
}

// id가 없으면 새 일정 추가
export function saveItem(id, item) {
  return write(id, item);
}

/* ===== 지출 (지출 관리 탭) ===== */
// 지출 하나: { day: '2027-06-30' | 'before'(여행 전·공통), cat, title, amount, cur: 'JPY' | 'KRW', memo }
const EXPENSE_FIELDS = ['day', 'cat', 'title', 'amount', 'cur', 'memo'];

// id가 없으면 새 지출 추가
export function saveExpense(id, data) {
  const col = collection(tripRef(), 'expenses');
  const ref = id ? doc(col, id) : doc(col);
  const out = {};
  EXPENSE_FIELDS.forEach((f) => { out[f] = data[f] ?? null; });
  writeBatch(db)
    .set(ref, { ...out, by: getName(), updatedAt: serverTimestamp() })
    .commit()
    .catch(fail);
  return ref.id;
}

export function removeExpense(id) {
  writeBatch(db).delete(doc(collection(tripRef(), 'expenses'), id)).commit().catch(fail);
}

export function removeItem(id) {
  return write(id, null);
}

// 변경 기록 하나를 되돌림: 그 변경 전 상태로 다시 저장
export function undo(entry) {
  if (!entry.itemId) return;
  write(entry.itemId, entry.before, `되돌림: ${entry.text}`);
}

listen();
