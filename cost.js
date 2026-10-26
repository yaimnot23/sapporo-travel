/*
 * 예약 경비 탭 (A안 직접 예약) + A안 · B안 비교 탭
 *
 * - 시내 3박 호텔을 고르면 숙박비와 합계가 모두 바뀝니다. (호텔 목록 · 요금은 hotels-data.js)
 * - 환율 · 좌석 · 조식 횟수를 바꾸면 엔화 항목을 원화로 다시 계산합니다.
 * - 엔화 금액은 HTML의 <span class="w" data-yen="..."> 에 들어 있습니다.
 *   항목을 추가하려면 index.html에 같은 형식으로 한 줄 넣으면 '교통 · 수하물'에 더해집니다.
 */
(function () {

  const CITY_HOTELS = window.SAPPORO_CITY_HOTELS;
  const KITA_WON = 1506000;           // 키타히로시마 클래스 호텔 4박 (원화)
  const B_TOTAL_WON = 8600000;        // B안 견적 총액 (1인 2,150,000원 × 4명)
  const ROUND_YEN = 11000 * 4 * 4;    // 라운딩비: 1인 11,000엔 × 4회 × 4명
  const PEOPLE = 4;
  const CITY_STORAGE = 'sapporo.cityHotel';
  const DEFAULT_CITY = 4;             // 처음엔 미쓰이 가든 (예전 경비 기준)

  const SEATS = {
    ji: { yen: 8280, note: '지정석 기준' },
    ja: { yen: 5000, note: '자유석 기준' },
  };

  const panel = document.getElementById('p-cost');
  const rateInput = document.getElementById('rate');
  const seatSelect = document.getElementById('seat');
  const bfSelect = document.getElementById('bfCount');

  let cityNum = loadCity();

  function loadCity() {
    let saved = null;
    try { saved = Number(localStorage.getItem(CITY_STORAGE)); } catch { /* 없으면 기본값 */ }
    return CITY_HOTELS.some((h) => h.num === saved) ? saved : DEFAULT_CITY;
  }

  function saveCity() {
    try { localStorage.setItem(CITY_STORAGE, String(cityNum)); } catch { /* 저장 못 해도 동작 */ }
  }

  const city = () => CITY_HOTELS.find((h) => h.num === cityNum);

  function format(n) {
    return Math.round(n).toLocaleString('ko-KR');
  }

  function man(n) {
    return `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  // 호텔 하나로 A안 총액 계산 (교통 · 라운딩은 호텔과 상관없이 같음)
  function totalsFor(hotel, rate, transWon, roundWon, bfCount) {
    const bfYen = bfCount * PEOPLE * hotel.breakfastYen;
    const bfWon = Math.round(bfYen * rate / 100);
    const lodge = KITA_WON + hotel.price + bfWon;
    const total = lodge + transWon + roundWon;
    return { bfYen, bfWon, lodge, total, per: Math.round(total / PEOPLE) };
  }

  /* ===== 시내 호텔 고르기 버튼 (예약 경비 · A안·B안 두 탭에 같은 버튼) ===== */
  function renderPickers() {
    const html = CITY_HOTELS.map((h) => `
      <button type="button" data-city="${h.num}" aria-pressed="${h.num === cityNum}" style="--hc:var(${h.color})">
        <span class="num">${h.num}</span>
        <span class="city-txt"><b>${esc(h.short)}</b><small>${man(h.price)}</small></span>
      </button>`).join('');
    document.querySelectorAll('[data-city-pick]').forEach((el) => { el.innerHTML = html; });
  }

  /* ===== 계산 · 표시 ===== */
  function update() {
    const rate = parseFloat(rateInput.value); // 100엔당 원
    if (!rate || rate <= 0) return;
    const toWon = (yen) => Math.round(yen * rate / 100);
    const bfCount = Number(bfSelect.value);
    const hotel = city();

    // 돌아오는 날 좌석
    const seat = SEATS[seatSelect.value];
    document.getElementById('seatWon').setAttribute('data-yen', seat.yen);
    setText('seatYen', format(seat.yen));
    setText('seatNote', seat.note);

    // 엔화 항목을 원화로 바꾸면서, 라운딩비와 나머지(교통·수하물)를 나눠 더함
    let transWon = 0;
    let roundWon = 0;
    panel.querySelectorAll('.w').forEach((el) => {
      const yen = parseFloat(el.getAttribute('data-yen'));
      const won = toWon(yen);
      el.textContent = format(won);
      if (yen === ROUND_YEN) roundWon = won;
      else transWon += won;
    });

    const t = totalsFor(hotel, rate, transWon, roundWon, bfCount);

    // 고른 호텔 이름 · 방
    document.querySelectorAll('[data-city-name]').forEach((el) => { el.textContent = hotel.name; });
    setText('cityRoom', `${hotel.room} · ${hotel.note}`);
    setText('cityWon', format(hotel.price));

    // 조식 (고른 횟수가 있을 때만 줄 표시)
    document.getElementById('bfRow').hidden = bfCount === 0;
    setText('bfNote', `${bfCount}번 × ${PEOPLE}명 · 1인 ${format(hotel.breakfastYen)}엔`);
    setText('bfYen', format(t.bfYen));
    setText('bfWon', format(t.bfWon));

    // 예약 경비 탭
    setText('aLodge', format(t.lodge));
    setText('aTrans', format(transWon));
    setText('aRound', format(roundWon));
    setText('aTotal', format(t.total));
    setText('aTotal2', format(t.total));
    setText('aPer', format(t.per));

    // A안 · B안 비교 탭
    setText('cA', format(t.total));
    setText('cAper', format(t.per));
    setText('cLodge', format(t.lodge));
    setText('cTrans', format(transWon));
    setText('cRound', format(roundWon));
    setText('cMore', t.total > B_TOTAL_WON ? 'A안이' : 'B안이'); // 환율이 아주 높으면 A안이 더 비쌀 수 있음
    setText('cDiff', format(Math.abs(B_TOTAL_WON - t.total)));
    setText('cPct', Math.round(t.total / B_TOTAL_WON * 100));
    setText('cYenShare', Math.round((transWon + roundWon + t.bfWon) / 10000)); // 만원 단위

    // 지출 관리 탭(spend.js)이 예약 경비 · 환율을 같이 씀
    window.sapporoCost = { total: t.total, rate, cityShort: hotel.short };
    window.dispatchEvent(new Event('costchange'));

    // 시내 호텔별 A안 총액 표
    document.getElementById('cityTable').innerHTML = CITY_HOTELS.map((h) => {
      const x = totalsFor(h, rate, transWon, roundWon, bfCount);
      const diff = B_TOTAL_WON - x.total;
      return `
        <tr class="${h.num === cityNum ? 'on' : ''}">
          <td><button type="button" class="link-btn city-link" data-city="${h.num}" style="--hc:var(${h.color})"><span class="num">${h.num}</span>${esc(h.short)}</button></td>
          <td class="r">${format(x.total)}원</td>
          <td class="r">${format(x.per)}원</td>
          <td class="r">${format(Math.abs(diff))}원 ${diff >= 0 ? '쌈' : '비쌈'}</td>
        </tr>`;
    }).join('');
  }

  function pickCity(num) {
    if (!CITY_HOTELS.some((h) => h.num === num)) return;
    cityNum = num;
    saveCity();
    renderPickers();
    update();
  }

  /* ===== 이벤트 ===== */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-city]');
    if (b && (b.closest('[data-city-pick]') || b.closest('#cityTable'))) pickCity(Number(b.getAttribute('data-city')));
  });
  rateInput.addEventListener('input', update);
  seatSelect.addEventListener('change', update);
  bfSelect.addEventListener('change', update);

  renderPickers();
  update();

})();
