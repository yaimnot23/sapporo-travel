/*
 * 총 경비 탭: 예약 경비(예약 경비 탭) + 직접 넣는 지출(식비 · 관광 · 쇼핑 등)
 *
 * 지출은 일정 계획과 같은 가족 계획(Firebase)에 저장돼서 가족 모두 같이 보고 고칩니다.
 * 엔화로 넣은 지출은 '예약 경비' 탭의 환율로 원화로 바꿔 더합니다.
 */
import { DAYS, dayLabel, esc, toast } from './common.js';
import * as store from './store.js';

const PEOPLE = 4;

// 분류 [키, 이름, 색]
const CATS = [
  ['breakfast', '아침', '--c6'],
  ['lunch',     '점심', '--c3'],
  ['dinner',    '저녁', '--c2'],
  ['cafe',      '간식 · 카페', '--c5'],
  ['sight',     '관광 · 입장료', '--c1'],
  ['transport', '교통', '--c4'],
  ['shopping',  '쇼핑 · 선물', '--accent'],
  ['etc',       '기타', '--muted'],
];
const catOf = (key) => CATS.find((c) => c[0] === key) || CATS[CATS.length - 1];

// 날짜 칸: 여행 전 · 공통 + 여행 8일
const DAY_OPTIONS = [['before', '여행 전 · 공통'], ...DAYS.map((d) => [d.date, `${d.n}일차 · ${dayLabel(d.date)}`])];

const sumEl = document.getElementById('spendSum');
const formEl = document.getElementById('spendForm');
const catsEl = document.getElementById('spendCats');
const listEl = document.getElementById('spendList');

let S = null;          // store 상태
let editingId = null;  // 수정 중인 지출 id

const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
const rate = () => (window.sapporoCost && window.sapporoCost.rate) || 839;
const toWon = (e) => (e.cur === 'JPY' ? Math.round(e.amount * rate() / 100) : e.amount);
const expenses = () => (S && S.status === 'ready' ? S.expenses : []);

/* ===== 지출 넣기 폼 ===== */
function formHTML() {
  return `
    <label class="f">날짜
      <select name="day">${DAY_OPTIONS.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select>
    </label>
    <label class="f">분류
      <select name="cat">${CATS.map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select>
    </label>
    <label class="f wide">내용
      <input name="what" type="text" maxlength="60" placeholder="예: 스스키노 징기스칸, 오타루 오르골당 선물" autocomplete="off">
    </label>
    <div class="f amount-f">
      <span>금액</span>
      <div class="amount-row">
        <input name="amount" type="number" min="0" step="1" inputmode="numeric" placeholder="0" aria-label="금액">
        <select name="cur" aria-label="통화">
          <option value="JPY">엔</option>
          <option value="KRW">원</option>
        </select>
      </div>
    </div>
    <div class="spend-actions">
      <button type="submit" class="btn">추가</button>
      <button type="button" class="btn-ghost" data-spend="cancel" hidden>수정 취소</button>
    </div>`;
}

function resetForm() {
  editingId = null;
  formEl.what.value = '';
  formEl.amount.value = '';
  formEl.querySelector('[type="submit"]').textContent = '추가';
  formEl.querySelector('[data-spend="cancel"]').hidden = true;
}

function startEdit(id) {
  const e = expenses().find((x) => x.id === id);
  if (!e) return;
  editingId = id;
  formEl.day.value = e.day;
  formEl.cat.value = e.cat;
  formEl.what.value = e.title;
  formEl.amount.value = e.amount;
  formEl.cur.value = e.cur;
  formEl.querySelector('[type="submit"]').textContent = '수정 저장';
  formEl.querySelector('[data-spend="cancel"]').hidden = false;
  formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  formEl.what.focus();
}

/* ===== 그리기 ===== */
function render() {
  const connected = S && S.status === 'ready';
  formEl.querySelectorAll('input, select, button').forEach((el) => { el.disabled = !connected; });
  document.getElementById('spendConnect').hidden = connected;

  const list = expenses();
  const extra = list.reduce((sum, e) => sum + toWon(e), 0);
  // 예약 경비: 가족 계획의 '우리 시내 호텔' 기준 (안 정했으면 예약 경비 탭에서 고른 호텔)
  const cost = window.sapporoCost;
  const tripNum = window.sapporoTripHotel;
  const tripHotel = (window.SAPPORO_CITY_HOTELS || []).find((h) => h.num === tripNum);
  const booked = !cost ? 0 : tripHotel ? cost.totals[tripHotel.num] : cost.total;
  const bookedNote = tripHotel
    ? `A안 · 우리 시내 호텔 ${tripHotel.short}`
    : `A안 · 시내 ${cost ? cost.cityShort : ''} (예약 경비 탭에서 고른 호텔)`;
  const total = booked + extra;

  sumEl.innerHTML = `
    <div class="sum-card"><span>예약 경비</span><b>${fmt(booked)}원</b><small>${esc(bookedNote)}</small></div>
    <div class="sum-card"><span>추가 지출</span><b>${fmt(extra)}원</b><small>${list.length}건 · 식비 · 관광 · 쇼핑 등</small></div>
    <div class="sum-card main"><span>총 경비 (4명)</span><b>${fmt(total)}원</b><small>1인당 약 ${fmt(total / PEOPLE)}원</small></div>`;

  // 분류별
  const byCat = CATS.map(([k, t, c]) => ({ k, t, c, won: list.filter((e) => e.cat === k).reduce((s, e) => s + toWon(e), 0) }))
    .filter((x) => x.won > 0);
  catsEl.innerHTML = byCat.length
    ? byCat.map((x) => `
        <div class="cat-row" style="--cc:var(${x.c})">
          <span class="cat-name"><i></i>${esc(x.t)}</span>
          <span class="cat-bar"><span style="width:${Math.max(2, (x.won / extra) * 100)}%"></span></span>
          <b>${fmt(x.won)}원</b>
        </div>`).join('')
    : '<p class="small">아직 넣은 지출이 없어요.</p>';

  // 날짜별
  const groups = DAY_OPTIONS
    .map(([v, t]) => ({ v, t, items: list.filter((e) => e.day === v) }))
    .filter((g) => g.items.length);
  listEl.innerHTML = groups.length
    ? groups.map((g) => `
        <div class="spend-day">
          <h3>${esc(g.t)} <span>${fmt(g.items.reduce((s, e) => s + toWon(e), 0))}원</span></h3>
          <ul>
            ${g.items
              .sort((a, b) => CATS.findIndex((c) => c[0] === a.cat) - CATS.findIndex((c) => c[0] === b.cat))
              .map((e) => {
                const [, catName, color] = catOf(e.cat);
                const yen = e.cur === 'JPY' ? `${fmt(e.amount)}엔 · ` : '';
                return `
                  <li class="${e.id === editingId ? 'editing' : ''}">
                    <span class="chip-cat" style="--cc:var(${color})">${esc(catName)}</span>
                    <span class="spend-title">${esc(e.title || catName)}<small>${esc(e.by || '가족')}</small></span>
                    <span class="spend-amt">${yen}<b>${fmt(toWon(e))}원</b></span>
                    <span class="spend-btns">
                      <button type="button" class="btn-ghost sm" data-spend="edit" data-id="${esc(e.id)}">수정</button>
                      <button type="button" class="btn-ghost sm danger" data-spend="del" data-id="${esc(e.id)}">삭제</button>
                    </span>
                  </li>`;
              }).join('')}
          </ul>
        </div>`).join('')
    : '<p class="small">위에서 날짜 · 분류 · 금액을 넣고 ‘추가’를 누르면 여기에 날짜별로 모여요.</p>';
}

/* ===== 이벤트 ===== */
formEl.innerHTML = formHTML();

formEl.addEventListener('submit', (ev) => {
  ev.preventDefault();
  if (!store.isConnected()) return;
  const amount = Math.round(Number(formEl.amount.value));
  if (!amount || amount < 0) {
    toast('금액을 넣어 주세요.');
    return;
  }
  const data = {
    day: formEl.day.value,
    cat: formEl.cat.value,
    title: formEl.what.value.trim(),
    amount,
    cur: formEl.cur.value,
    memo: '',
  };
  store.saveExpense(editingId, data);
  toast(editingId ? '지출을 고쳤어요.' : '지출을 추가했어요.');
  resetForm();
  formEl.what.focus();
});

formEl.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-spend="cancel"]')) {
    resetForm();
    render();
  }
});

listEl.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-spend]');
  if (!b) return;
  const id = b.getAttribute('data-id');
  if (b.dataset.spend === 'edit') {
    startEdit(id);
    render();
  } else if (b.dataset.spend === 'del') {
    const e = expenses().find((x) => x.id === id);
    if (e && confirm(`‘${e.title || catOf(e.cat)[1]}’ 지출을 삭제할까요?`)) {
      store.removeExpense(id);
      if (editingId === id) resetForm();
    }
  }
});

window.addEventListener('costchange', render);
window.addEventListener('triphotel', render);
store.subscribe((s) => {
  S = s;
  render();
});
