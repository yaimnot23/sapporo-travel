/*
 * 일정 계획 탭
 *
 * - 대기함: 장소 검색에서 '계획에 추가'한 곳, 직접 추가한 일정 (아직 날짜 없음)
 * - 시간표: 8일 × 6:00~22:00. 컴퓨터에서는 끌어다 놓기 / 아래 끝을 끌어 길이 조절
 * - 휴대폰: 하루씩 보기. 일정을 눌러 날짜 · 시간을 고름 (끌기 대신)
 * - 최근 변경: 누가 무엇을 바꿨는지 + 되돌리기
 */
import {
  DAYS, DAY_START, DAY_END, SNAP,
  esc, fmtTime, fmtDur, dayInfo, dayLabel, snap, clamp, hoursCheck, directionsUrl, toast,
  originHotel, setOriginHotel, originPickerHTML, cityHotelByNum,
  storageGet, storageSet,
} from './common.js';
import * as store from './store.js';

const DAY_STORAGE = 'sapporo.planDay';
const root = document.getElementById('planRoot');
const dialog = document.getElementById('itemDialog');
const form = document.getElementById('itemForm');

let S = null;                 // store 상태
let shellBuilt = false;
let selectedDay = initialDay(); // 휴대폰에서 보고 있는 날짜
let drag = null;              // 끌기 중인 정보
let renderLater = false;      // 끌기 중에 들어온 변경은 끝나고 그림
let suppressClick = false;
let editing = null;           // 편집 창에서 고치는 일정 { id, item }
let choosingHotel = false;    // '새 계획 만들기'를 눌러 호텔 고르는 화면을 보는 중
let lastTripHotel;            // 다른 탭에 알린 마지막 우리 시내 호텔 번호

function initialDay() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dayInfo(today)) return today; // 여행 중이면 오늘
  const saved = storageGet(DAY_STORAGE);
  return dayInfo(saved) ? saved : DAYS[0].date;
}

/* ===== 일정 목록 도우미 ===== */
const allItems = () => (S ? [...S.items.values()] : []);
const itemsOn = (date) => allItems().filter((i) => i.day === date).sort((a, b) => a.start - b.start || a.end - b.end);
const trayItems = () => allItems()
  .filter((i) => !i.day)
  .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
const durOf = (item) => clamp(item.day ? item.end - item.start : (item.dur || 60), SNAP, DAY_END - DAY_START);

// 겹치는 일정은 옆으로 나란히 (lane: 몇 번째 줄, lanes: 그 묶음의 줄 수)
function layout(items) {
  const out = [];
  let group = [];
  let groupEnd = -1;
  let laneEnds = [];
  const flush = () => {
    group.forEach((g) => { g.lanes = laneEnds.length; });
    group = [];
    laneEnds = [];
    groupEnd = -1;
  };
  for (const it of items) {
    if (group.length && it.start >= groupEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= it.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.end);
    } else {
      laneEnds[lane] = it.end;
    }
    const g = { it, lane, lanes: 1 };
    group.push(g);
    out.push(g);
    groupEnd = Math.max(groupEnd, it.end);
  }
  flush();
  return out;
}

// 일정 하나의 주의할 점 (겹침, 쉬는 날, 영업시간 밖)
function warningsFor(item, day = item.day, start = item.start, end = item.end, id = item.id) {
  if (!day) return [];
  const out = [];
  const overlaps = itemsOn(day).filter((o) => o.id !== id && o.start < end && start < o.end);
  if (overlaps.length) out.push(`시간이 겹쳐요: ${overlaps.map((o) => `‘${o.title}’`).join(', ')}`);
  const check = item.place ? hoursCheck(item.place.hours, dayInfo(day).wd, start, end) : null;
  if (check === 'closed') out.push(`${dayLabel(day)}은 쉬는 날로 나와요.`);
  if (check === 'outside') out.push('영업시간 밖이에요. 영업시간을 확인해 주세요.');
  return out;
}

// 그날 dur분이 비어 있는 가장 이른 시간 (9시부터 찾음)
function firstFreeStart(day, dur, exceptId) {
  const busy = itemsOn(day).filter((i) => i.id !== exceptId);
  for (let s = 9 * 60; s + dur <= DAY_END; s += SNAP) {
    if (!busy.some((b) => b.start < s + dur && s < b.end)) return s;
  }
  return 9 * 60;
}

/* ===== 그리기 ===== */
store.subscribe((s) => {
  S = s;
  if (drag && drag.started) {
    renderLater = true;
    return;
  }
  render();
});

function render() {
  renderLater = false;
  if (S.status !== 'ready') {
    shellBuilt = false;
    root.innerHTML = statusHTML();
    return;
  }
  if (!shellBuilt) {
    root.innerHTML = shellHTML();
    shellBuilt = true;
    root.querySelector('#shareLink').value = store.shareLink();
    root.querySelector('#myName').value = store.getName() === '가족' ? '' : store.getName();
  }
  renderTripHotel();
  renderTray();
  renderDayPick();
  renderTimeline();
  renderHistory();
  renderSync();
}

// 우리 시내 호텔: 고르는 칸을 맞추고, 바뀌었으면 'triphotel' 이벤트로 다른 탭에 알림
function renderTripHotel() {
  const num = S.trip?.cityHotel ?? null;
  const sel = root.querySelector('#tripHotel');
  if (sel && document.activeElement !== sel) sel.value = num ? String(num) : '';
  if (num !== lastTripHotel) {
    lastTripHotel = num;
    window.sapporoTripHotel = num;
    window.dispatchEvent(new Event('triphotel'));
  }
}

// 새 계획 만들기 전: 시내 3박 호텔 고르기
function hotelChooserHTML() {
  const hotels = window.SAPPORO_CITY_HOTELS || [];
  return `
    <div class="plan-connect hotel-choose">
      <h2>시내 3박 호텔을 먼저 골라 주세요</h2>
      <p>고른 호텔은 가족 계획에 저장돼서, 7/2 체크인 · 7/5 체크아웃 일정과 예약 경비 · 총 경비 계산에 같이 쓰여요. 나중에 바꿀 수도 있어요.</p>
      <div class="choose-grid">
        ${hotels.map((h) => `
          <button type="button" class="choose-card" data-create-hotel="${h.num}" style="--hc:var(${h.color})">
            <span class="choose-top"><span class="num">${h.num}</span><b>${esc(h.short)}</b><em>${Math.round(h.price / 10000)}만원</em></span>
            <span class="small">${esc(h.area)}</span>
            <span class="small">${esc(h.bath)} · 조식 1인 ${h.breakfastYen.toLocaleString('ko-KR')}엔</span>
          </button>`).join('')}
      </div>
      <p class="choose-foot">
        <button type="button" class="btn-ghost" data-create-hotel="0">아직 못 정했어요 (나중에 정하기)</button>
        <button type="button" class="link-btn" data-act="cancel-create">취소</button>
      </p>
      <p class="small">가족에게 받은 링크가 있다면 만들지 말고 그 링크로 들어와 주세요. 새로 만들면 따로 노는 계획이 생겨요. 자세한 비교는 ‘호텔 비교’ 탭에 있어요.</p>
    </div>`;
}

function statusHTML() {
  if (S.status === 'none' && choosingHotel) return hotelChooserHTML();
  if (S.status === 'loading') return '<p class="small">계획을 불러오는 중…</p>';
  if (S.status === 'missing') {
    return `
      <div class="plan-connect">
        <h2>계획을 찾을 수 없어요</h2>
        <p>링크가 잘렸거나 잘못된 것 같아요. 받은 링크 전체를 다시 확인해 주세요.</p>
        <p><button type="button" class="btn-ghost" data-act="disconnect">연결 해제하고 다시 하기</button></p>
      </div>`;
  }
  if (S.status === 'error') {
    return `
      <div class="plan-connect">
        <h2>계획을 불러오지 못했어요</h2>
        <p>인터넷 연결을 확인하고 새로고침해 주세요. 계속 안 되면 링크가 맞는지 확인해 주세요.</p>
        <p class="small">오류: ${esc(S.error?.code || S.error?.message || '')}</p>
        <p><button type="button" class="btn-ghost" data-act="disconnect">연결 해제</button></p>
      </div>`;
  }
  return `
    <div class="plan-connect">
      <h2>가족 계획에 연결하기</h2>
      <p><b>가족에게 링크를 받았다면</b> 그 링크를 눌러서 들어오세요. 자동으로 연결되고, 이 기기는 다음부터 기억합니다.</p>
      <form class="connect-form" data-form="connect">
        <input name="link" type="text" placeholder="받은 링크를 여기에 붙여넣어도 돼요" autocomplete="off" aria-label="공유 링크">
        <button type="submit" class="btn-ghost">연결</button>
      </form>
      <hr>
      <p><b>처음 계획을 만드는 사람만</b> 아래 버튼을 누르세요. A안 일정(키타히로시마 골프 4회 · 시내 이동 등)이 미리 들어간 새 계획과 가족 공유 링크가 만들어집니다.</p>
      <p><button type="button" class="btn" data-act="create">새 계획 만들기</button></p>
    </div>`;
}

function shellHTML() {
  return `
    <div class="plan-bar">
      <div class="share">
        <label for="shareLink">가족 공유 링크</label>
        <div class="share-row">
          <input id="shareLink" type="text" readonly>
          <button type="button" class="btn-ghost" data-act="copy">복사</button>
        </div>
        <p class="small">이 링크를 받은 사람은 누구나 계획을 보고 고칠 수 있어요. 가족에게만 보내 주세요.</p>
      </div>
      <div class="me">
        <label for="tripHotel">우리 시내 호텔 (7/2 ~ 7/5)</label>
        <select id="tripHotel">
          <option value="">아직 안 정함</option>
          ${(window.SAPPORO_CITY_HOTELS || []).map((h) => `<option value="${h.num}">${esc(h.short)} · ${Math.round(h.price / 10000)}만원</option>`).join('')}
        </select>
        <p class="small">가족 모두에게 같이 바뀌어요.</p>
      </div>
      <div class="me">
        <label for="myName">내 이름</label>
        <input id="myName" type="text" maxlength="10" placeholder="예: 아빠" autocomplete="off">
        <p class="small">변경 기록에 누가 바꿨는지 표시돼요.</p>
      </div>
      <p class="sync" id="sync" aria-live="polite"></p>
    </div>

    <section class="tray" data-drop="tray" aria-labelledby="trayTitle">
      <div class="tray-head">
        <h2 id="trayTitle">대기함 <span class="count" id="trayCount"></span></h2>
        <button type="button" class="btn-ghost" data-act="add-custom">+ 직접 추가</button>
      </div>
      <p class="small tray-help">
        <span class="only-wide">시간표로 끌어다 놓으면 그 시간에 들어가요. 시간표의 일정을 여기로 끌어오면 다시 대기함으로 돌아와요.</span>
        <span class="only-narrow">눌러서 날짜와 시간을 고르면 시간표에 들어가요.</span>
      </p>
      <ul class="chips" id="trayList"></ul>
    </section>

    <div class="day-pick" id="dayPick"></div>
    <div class="timeline" id="timeline"></div>

    <p class="small plan-legend">
      <span class="lg-item"><span class="lg k-fixed"></span>골프 · 고정 일정</span>
      <span class="lg-item"><span class="lg k-place"></span>검색해서 넣은 곳</span>
      <span class="lg-item"><span class="lg k-custom"></span>직접 추가</span>
      <span class="lg-item"><span class="lg-warn">⚠</span>시간 겹침 · 쉬는 날 · 영업시간 밖</span>
    </p>

    <details class="history">
      <summary>최근 변경 · 되돌리기</summary>
      <ol id="historyList"></ol>
    </details>

    <p class="small plan-foot">
      <button type="button" class="link-btn" data-act="reseed">고정 일정을 A안 기본 일정으로 바꾸기</button>
      <button type="button" class="link-btn" data-act="disconnect">이 기기에서 계획 연결 해제</button>
    </p>`;
}

function renderTray() {
  const list = trayItems();
  root.querySelector('#trayCount').textContent = list.length ? String(list.length) : '';
  root.querySelector('#trayList').innerHTML = list.length
    ? list.map((i) => `
        <li><button type="button" class="chip k-${esc(i.kind)}" data-id="${esc(i.id)}">
          <b>${esc(i.title)}</b><span>${fmtDur(durOf(i))}</span>
        </button></li>`).join('')
    : '<li class="empty">비어 있어요. ‘장소 검색’ 탭에서 계획에 추가하거나 + 직접 추가를 눌러 주세요.</li>';
}

function renderDayPick() {
  root.querySelector('#dayPick').innerHTML = DAYS.map((d) => `
    <button type="button" data-day="${d.date}" aria-pressed="${d.date === selectedDay}">
      <b>${d.md} (${d.dow})</b><span>${esc(d.note)}</span>
    </button>`).join('');
}

function renderTimeline() {
  const head = DAYS.map((d) => `
    <div class="tl-day${d.date === selectedDay ? ' on' : ''}">
      <b>${d.n}일차 · ${d.md} (${d.dow})</b><small>${esc(d.note)}</small>
    </div>`).join('');

  const hours = [];
  for (let h = DAY_START / 60; h <= DAY_END / 60; h++) {
    hours.push(`<span style="--s:${h * 60 - DAY_START}">${h}:00</span>`);
  }

  const cols = DAYS.map((d) => {
    const blocks = layout(itemsOn(d.date)).map(({ it, lane, lanes }) => {
      const warn = warningsFor(it);
      return `
        <button type="button" class="blk k-${esc(it.kind)}${it.end - it.start <= 45 ? ' short' : ''}${warn.length ? ' has-warn' : ''}" data-id="${esc(it.id)}"
          style="--s:${it.start - DAY_START};--d:${it.end - it.start};--lane:${lane};--lanes:${lanes}"
          title="${esc(`${fmtTime(it.start)}–${fmtTime(it.end)} ${it.title}${warn.length ? '\n⚠ ' + warn.join('\n⚠ ') : ''}`)}">
          <span class="blk-time">${fmtTime(it.start)}–${fmtTime(it.end)}</span>
          <span class="blk-title">${warn.length ? '⚠ ' : ''}${esc(it.title)}</span>
          <span class="rz" aria-hidden="true"></span>
        </button>`;
    }).join('');
    return `<div class="tl-col${d.date === selectedDay ? ' on' : ''}" data-day="${d.date}" aria-label="${dayLabel(d.date)}">${blocks}</div>`;
  }).join('');

  root.querySelector('#timeline').innerHTML = `
    <div class="tl-head"><div class="tl-corner"></div>${head}</div>
    <div class="tl-body"><div class="tl-gutter">${hours.join('')}</div>${cols}</div>`;
}

function timeAgo(ts) {
  const ms = ts?.toMillis?.();
  if (!ms) return '';
  const sec = (Date.now() - ms) / 1000;
  if (sec < 60) return '방금';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function renderHistory() {
  const list = S.history;
  root.querySelector('#historyList').innerHTML = list.length
    ? list.map((h) => `
        <li>
          <span><b>${esc(h.by || '가족')}</b> · ${esc(h.text)} <span class="small">${timeAgo(h.at)}</span></span>
          ${h.itemId ? `<button type="button" class="btn-ghost sm" data-act="undo" data-hid="${esc(h.id)}">되돌리기</button>` : ''}
        </li>`).join('')
    : '<li class="small">아직 변경 기록이 없어요.</li>';
}

function renderSync() {
  const el = root.querySelector('#sync');
  if (!el) return;
  if (!navigator.onLine) {
    el.textContent = '● 오프라인 · 바꾼 내용은 연결되면 자동 저장돼요';
    el.dataset.state = 'off';
  } else if (S.pending) {
    el.textContent = '● 저장 중…';
    el.dataset.state = 'saving';
  } else {
    el.textContent = '● 모두 저장됨 · 가족 화면에도 바로 반영돼요';
    el.dataset.state = 'ok';
  }
}
window.addEventListener('online', () => S && S.status === 'ready' && renderSync());
window.addEventListener('offline', () => S && S.status === 'ready' && renderSync());

/* ===== 클릭 · 입력 ===== */
root.addEventListener('click', async (e) => {
  if (suppressClick) return;

  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.getAttribute('data-act');
    if (a === 'create') {
      choosingHotel = true;
      render();
    } else if (a === 'cancel-create') {
      choosingHotel = false;
      render();
    }
    else if (a === 'disconnect') {
      if (confirm('이 기기에서 계획 연결을 해제할까요? 계획 자체는 지워지지 않고, 공유 링크로 다시 들어오면 됩니다.')) store.disconnect();
    } else if (a === 'reseed') {
      if (confirm('골프 · 체크인 같은 고정 일정(초록색)을 모두 지우고 A안 기본 일정으로 바꿀까요?\n\n직접 넣은 일정과 대기함은 그대로 남고, 최근 변경에서 하나씩 되돌릴 수 있어요.')) {
        store.replaceFixedItems();
        toast('고정 일정을 A안으로 바꿨어요.');
      }
    } else if (a === 'copy') copyLink();
    else if (a === 'add-custom') openDialog(null);
    else if (a === 'undo') {
      const h = S.history.find((x) => x.id === act.getAttribute('data-hid'));
      if (h) {
        store.undo(h);
        toast('되돌렸어요.');
      }
    }
    return;
  }

  const hotelBtn = e.target.closest('[data-create-hotel]');
  if (hotelBtn) {
    createTrip(Number(hotelBtn.getAttribute('data-create-hotel')) || null);
    return;
  }

  const pickBtn = e.target.closest('#dayPick [data-day]');
  if (pickBtn) {
    selectedDay = pickBtn.getAttribute('data-day');
    storageSet(DAY_STORAGE, selectedDay);
    renderDayPick();
    renderTimeline();
    return;
  }

  const itemEl = e.target.closest('[data-id]');
  if (itemEl) openDialog(itemEl.getAttribute('data-id'));
});

root.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form="connect"]');
  if (!f) return;
  e.preventDefault();
  if (!store.connect(f.link.value)) toast('링크 형식이 맞지 않아요. 받은 링크 전체를 붙여넣어 주세요.');
});

root.addEventListener('change', (e) => {
  if (e.target.id === 'myName') {
    store.setName(e.target.value.trim());
    toast('이름을 저장했어요.');
  }
  if (e.target.id === 'tripHotel') {
    const h = cityHotelByNum(Number(e.target.value));
    store.setTripHotel(h ? h.num : null);
    toast(h ? `우리 시내 호텔을 ${h.short}(으)로 정했어요.` : '시내 호텔을 아직 안 정함으로 바꿨어요.');
  }
});

async function createTrip(cityNum) {
  root.querySelectorAll('[data-create-hotel]').forEach((b) => { b.disabled = true; });
  toast('계획을 만드는 중…');
  try {
    await store.createTrip(cityNum);
    choosingHotel = false;
    toast('새 계획을 만들었어요. 위의 공유 링크를 가족에게 보내 주세요.');
  } catch (err) {
    console.error(err);
    toast('계획을 만들지 못했어요. 인터넷 연결을 확인해 주세요.');
    root.querySelectorAll('[data-create-hotel]').forEach((b) => { b.disabled = false; });
  }
}

function copyLink() {
  const input = root.querySelector('#shareLink');
  const done = () => toast('공유 링크를 복사했어요.');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(input.value).then(done, () => { input.select(); });
  } else {
    input.select();
    document.execCommand('copy');
    done();
  }
}

/* ===== 끌어다 놓기 (컴퓨터 마우스) ===== */
const perMin = (col) => col.getBoundingClientRect().height / (DAY_END - DAY_START);

root.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  const el = e.target.closest('.blk[data-id], .chip[data-id]');
  if (!el || !S || !S.items.has(el.getAttribute('data-id'))) return;
  const item = S.items.get(el.getAttribute('data-id'));
  const isBlock = el.classList.contains('blk');
  drag = {
    item,
    el,
    resize: isBlock && !!e.target.closest('.rz'),
    grab: isBlock ? (e.clientY - el.getBoundingClientRect().top) / perMin(el.closest('.tl-col')) : 0,
    x0: e.clientX,
    y0: e.clientY,
    started: false,
    target: null,
    ghost: null,
    preview: null,
  };
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
  window.addEventListener('pointercancel', onDragEnd);
});

function onDragMove(e) {
  if (!drag) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
    drag.started = true;
    document.body.classList.add('is-dragging');
    drag.el.classList.add('dragging');
    if (!drag.resize) {
      drag.ghost = document.createElement('div');
      drag.ghost.className = `drag-ghost k-${drag.item.kind}`;
      drag.ghost.textContent = drag.item.title;
      document.body.append(drag.ghost);
    }
  }
  e.preventDefault();

  // 화면 위아래 끝에 가까우면 스크롤
  if (e.clientY < 60) window.scrollBy(0, -14);
  else if (e.clientY > window.innerHeight - 60) window.scrollBy(0, 14);

  if (drag.resize) {
    const col = drag.el.closest('.tl-col');
    const rect = col.getBoundingClientRect();
    const end = clamp(snap(DAY_START + (e.clientY - rect.top) / perMin(col)), drag.item.start + SNAP, DAY_END);
    drag.target = { end };
    drag.el.style.setProperty('--d', end - drag.item.start);
    drag.el.querySelector('.blk-time').textContent = `${fmtTime(drag.item.start)}–${fmtTime(end)}`;
    return;
  }

  drag.ghost.style.left = `${e.clientX + 12}px`;
  drag.ghost.style.top = `${e.clientY + 12}px`;
  clearDropMarks();

  const under = document.elementFromPoint(e.clientX, e.clientY);
  const col = under && under.closest('.tl-col');
  const tray = under && under.closest('[data-drop="tray"]');
  if (col) {
    const dur = durOf(drag.item);
    const rect = col.getBoundingClientRect();
    const start = clamp(snap(DAY_START + (e.clientY - rect.top) / perMin(col) - drag.grab), DAY_START, DAY_END - dur);
    drag.target = { day: col.getAttribute('data-day'), start, end: start + dur };
    drag.preview = document.createElement('div');
    drag.preview.className = 'blk preview';
    drag.preview.style.cssText = `--s:${start - DAY_START};--d:${dur};--lane:0;--lanes:1`;
    drag.preview.textContent = `${fmtTime(start)}–${fmtTime(start + dur)}`;
    col.append(drag.preview);
    drag.ghost.textContent = `${drag.item.title} · ${dayLabel(drag.target.day)} ${fmtTime(start)}`;
  } else if (tray) {
    drag.target = { day: null };
    tray.classList.add('drop-on');
    drag.ghost.textContent = `${drag.item.title} · 대기함으로`;
  } else {
    drag.target = null;
    drag.ghost.textContent = drag.item.title;
  }
}

function clearDropMarks() {
  if (drag && drag.preview) {
    drag.preview.remove();
    drag.preview = null;
  }
  root.querySelectorAll('.drop-on').forEach((el) => el.classList.remove('drop-on'));
}

function onDragEnd() {
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
  window.removeEventListener('pointercancel', onDragEnd);
  const d = drag;
  if (!d) return;
  clearDropMarks();
  drag = null;
  if (!d.started) return; // 그냥 클릭 → click 이벤트에서 편집 창

  document.body.classList.remove('is-dragging');
  d.el.classList.remove('dragging');
  if (d.ghost) d.ghost.remove();
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);

  const it = d.item;
  const t = d.target;
  if (d.resize && t && t.end !== it.end) {
    store.saveItem(it.id, { ...it, end: t.end, dur: t.end - it.start });
  } else if (!d.resize && t && t.day === null && it.day) {
    store.saveItem(it.id, { ...it, day: null, start: null, end: null, dur: durOf(it) });
  } else if (!d.resize && t && t.day && (t.day !== it.day || t.start !== it.start)) {
    store.saveItem(it.id, { ...it, day: t.day, start: t.start, end: t.end, dur: t.end - t.start });
  }
  render(); // 끌기 동안 바뀐 모양을 원래대로(또는 새 값으로) 다시 그림
}

/* ===== 편집 창 ===== */
function timeOptions(from, to, selected) {
  let html = '';
  for (let m = from; m <= to; m += SNAP) {
    html += `<option value="${m}"${m === selected ? ' selected' : ''}>${fmtTime(m)}</option>`;
  }
  return html;
}

function setTimes(start, end) {
  form.start.innerHTML = timeOptions(DAY_START, DAY_END - SNAP, start);
  form.end.innerHTML = timeOptions(DAY_START + SNAP, DAY_END, end);
  editing.len = Math.max(SNAP, end - start); // 시작을 옮길 때 유지할 길이
}

function openDialog(id) {
  const item = id
    ? S.items.get(id)
    : { id: null, title: '', kind: 'custom', day: null, start: null, end: null, dur: 60, memo: '', place: null };
  if (!item) return;
  editing = { id, item };

  document.getElementById('dlgTitle').textContent = id ? '일정 보기 · 고치기' : '직접 추가';
  form.itemTitle.value = item.title;
  form.memo.value = item.memo || '';
  form.day.innerHTML = '<option value="">대기함 (날짜 미정)</option>'
    + DAYS.map((d) => `<option value="${d.date}">${d.n}일차 · ${dayLabel(d.date)} · ${esc(d.note)}</option>`).join('');
  form.day.value = item.day || '';

  const dur = durOf(item);
  const start = item.day ? item.start : firstFreeStart(selectedDay, dur, id);
  setTimes(start, Math.min(start + dur, DAY_END));

  form.querySelector('[data-dlg="tray"]').hidden = !item.day;
  form.querySelector('[data-dlg="delete"]').hidden = !id;
  refreshDialog();
  dialog.showModal();
  if (!id) form.itemTitle.focus();
}

// 날짜 · 시간을 바꿀 때마다 주의할 점과 길찾기 링크를 다시 계산
function refreshDialog() {
  const day = form.day.value || null;
  form.start.disabled = !day;
  form.end.disabled = !day;
  const start = Number(form.start.value);
  const end = Number(form.end.value);
  const item = editing.item;

  const warn = day ? warningsFor(item, day, start, end, editing.id) : [];
  if (day && end <= start) warn.unshift('끝 시간이 시작 시간보다 늦어야 해요.');
  const warnBox = document.getElementById('dlgWarn');
  warnBox.hidden = !warn.length;
  warnBox.innerHTML = warn.map((w) => `⚠ ${esc(w)}`).join('<br>');

  document.getElementById('dlgPlace').innerHTML = placeInfoHTML(item, day, start);
}

function placeInfoHTML(item, day, start) {
  const p = item.place;
  if (!p) return '';
  const lines = [];
  lines.push(`<p class="addr">${esc(p.address)}</p>`);
  const meta = [];
  if (p.typeLabel) meta.push(esc(p.typeLabel));
  if (p.rating != null) meta.push(`★ ${Number(p.rating).toFixed(1)}`);
  if (meta.length) lines.push(`<p class="small">${meta.join(' · ')}</p>`);
  if (p.hoursText) {
    lines.push(`<details class="r-more"><summary>영업시간</summary><ul>${p.hoursText.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>`);
  }

  // 길찾기: 고른 호텔에서 / 바로 앞 일정 장소에서
  const links = [];
  const here = { name: p.name, query: p.query, placeId: p.id };
  const origin = originHotel();
  if (p.mapsUrl) links.push(`<a class="btn-ghost" href="${esc(p.mapsUrl)}" target="_blank" rel="noopener">구글지도</a>`);
  links.push(`<a class="btn-ghost" href="${esc(directionsUrl(origin, here))}" target="_blank" rel="noopener">${esc(origin.short)}에서 가는 길</a>`);
  if (day) {
    const prev = itemsOn(day).filter((o) => o.id !== editing.id && o.place && o.end <= start).pop();
    if (prev) {
      const url = directionsUrl({ name: prev.place.name, query: prev.place.query, placeId: prev.place.id }, here);
      links.push(`<a class="btn-ghost" href="${esc(url)}" target="_blank" rel="noopener">앞 일정(${esc(prev.title)})에서 가는 길</a>`);
    }
  }
  lines.push(originPickerHTML());
  lines.push(`<div class="r-actions">${links.join('')}</div>`);
  return lines.join('');
}

form.day.addEventListener('change', () => {
  // 대기함 → 날짜를 고르면 그날 비어 있는 시간으로 맞춰 줌
  const day = form.day.value;
  if (day && !editing.item.day) {
    const dur = durOf(editing.item);
    const start = firstFreeStart(day, dur, editing.id);
    setTimes(start, Math.min(start + dur, DAY_END));
  }
  refreshDialog();
});

form.start.addEventListener('change', () => {
  // 시작을 옮기면 길이는 그대로 유지
  const start = Number(form.start.value);
  setTimes(start, Math.min(start + editing.len, DAY_END));
  refreshDialog();
});

form.end.addEventListener('change', () => {
  editing.len = Math.max(SNAP, Number(form.end.value) - Number(form.start.value));
  refreshDialog();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = form.itemTitle.value.trim();
  if (!title) {
    toast('제목을 입력해 주세요.');
    return;
  }
  const day = form.day.value || null;
  const start = Number(form.start.value);
  const end = Number(form.end.value);
  if (day && end <= start) {
    toast('끝 시간이 시작 시간보다 늦어야 해요.');
    return;
  }
  const next = {
    ...editing.item,
    title,
    memo: form.memo.value.trim(),
    day,
    start: day ? start : null,
    end: day ? end : null,
    dur: day ? end - start : durOf(editing.item),
  };
  store.saveItem(editing.id, next);
  dialog.close();
});

form.querySelector('[data-dlg="tray"]').addEventListener('click', () => {
  store.saveItem(editing.id, { ...editing.item, day: null, start: null, end: null, dur: durOf(editing.item) });
  dialog.close();
});

form.querySelector('[data-dlg="delete"]').addEventListener('click', () => {
  if (!confirm(`‘${editing.item.title}’을(를) 삭제할까요? (최근 변경에서 되돌릴 수 있어요)`)) return;
  store.removeItem(editing.id);
  dialog.close();
});

form.querySelector('[data-dlg="close"]').addEventListener('click', () => dialog.close());

// 편집 창 안에서 출발 호텔 바꾸기 (장소 검색 탭과 같은 설정)
document.getElementById('dlgPlace').addEventListener('change', (e) => {
  if (e.target.matches('[data-origin-select]')) setOriginHotel(e.target.value);
});
window.addEventListener('originchange', () => {
  if (dialog.open && editing) refreshDialog();
});
