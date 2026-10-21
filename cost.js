/*
 * 여행 경비 탭: 환율·좌석을 바꾸면 엔화 항목을 원화로 다시 계산합니다.
 *
 * 엔화 금액은 HTML의 <span class="w" data-yen="..."> 에 들어 있습니다.
 * 항목을 추가하려면 index.html에 같은 형식으로 한 줄 넣으면 '교통 · 수하물'에 더해집니다.
 */
(function () {

  const LODGE_WON = 3126000;          // 숙박비 합계 (원화, 환율 영향 없음)
  const B_TOTAL_WON = 8600000;        // B안 견적 총액 (1인 2,150,000원 × 4명)
  const ROUND_YEN = 11000 * 4 * 4;    // 라운딩비: 1인 11,000엔 × 4회 × 4명
  const PEOPLE = 4;

  const SEATS = {
    ji: { yen: 8280, note: '지정석 기준' },
    ja: { yen: 5000, note: '자유석 기준' },
  };

  const panel = document.getElementById('p-cost');
  const rateInput = document.getElementById('rate');
  const seatSelect = document.getElementById('seat');

  function format(n) {
    return Math.round(n).toLocaleString('ko-KR');
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function update() {
    const rate = parseFloat(rateInput.value); // 100엔당 원
    if (!rate || rate <= 0) return;
    const toWon = (yen) => Math.round(yen * rate / 100);

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

    const total = LODGE_WON + transWon + roundWon;
    const perPerson = Math.round(total / PEOPLE);

    // A안 요약 · 표
    setText('aTrans', format(transWon));
    setText('aRound', format(roundWon));
    setText('aTotal', format(total));
    setText('aTotal2', format(total));
    setText('aPer', format(perPerson));

    // A안 · B안 비교
    setText('cA', format(total));
    setText('cAper', format(perPerson));
    setText('cLodge', format(LODGE_WON));
    setText('cTrans', format(transWon));
    setText('cRound', format(roundWon));
    setText('cDiff', format(Math.abs(B_TOTAL_WON - total)));
    setText('cPct', Math.round(total / B_TOTAL_WON * 100));
    setText('cYenShare', Math.round((transWon + roundWon) / 10000)); // 만원 단위
  }

  rateInput.addEventListener('input', update);
  seatSelect.addEventListener('change', update);
  update();

})();
