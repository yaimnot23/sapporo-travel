/*
 * 맨 위 탭 전환: [일정 계획] / [장소 검색] / [여행 경비] / [A안 · B안] / [호텔 비교]
 *
 * 주소 끝에 #search, #cost, #ab, #hotel 을 붙이면 그 탭이 바로 열립니다. (예: .../index.html#cost)
 * 아무것도 없거나 가족 공유 링크(#k=...)면 일정 계획 탭이 열립니다.
 */
(function () {

  const TABS = [
    { id: 'plan',   hash: '' },
    { id: 'search', hash: '#search' },
    { id: 'cost',   hash: '#cost' },
    { id: 'ab',     hash: '#ab' },
    { id: 'hotel',  hash: '#hotel' },
  ].map((t) => ({
    tab: document.getElementById('tab-' + t.id),
    panel: document.getElementById('p-' + t.id),
    hash: t.hash,
  }));

  function show(index, { focus = false, updateHash = false } = {}) {
    TABS.forEach((t, i) => {
      const active = i === index;
      t.tab.setAttribute('aria-selected', String(active));
      t.tab.tabIndex = active ? 0 : -1;
      t.panel.hidden = !active;
    });
    if (focus) TABS[index].tab.focus();
    if (updateHash) {
      const url = location.pathname + location.search + TABS[index].hash;
      history.replaceState(null, '', url);
    }
  }

  // 주소의 #... 로 열 탭 고르기: #cost 이거나 경비 탭 안의 요소면 경비 탭, 그 밖에는 호텔 탭
  function tabFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return 0;
    const target = document.getElementById(id);
    const index = TABS.findIndex((t) => t.hash === '#' + id || (target && t.panel.contains(target)));
    return index === -1 ? 0 : index;
  }

  TABS.forEach((t, i) => {
    t.tab.addEventListener('click', () => {
      show(i, { updateHash: true });
      window.scrollTo(0, 0);
    });
  });

  // 키보드: ← → 로 탭 이동, Home/End 로 처음/끝
  document.querySelector('.tabs').addEventListener('keydown', (e) => {
    const current = TABS.findIndex((t) => t.tab === document.activeElement);
    if (current === -1) return;
    let next = null;
    if (e.key === 'ArrowRight') next = (current + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    show(next, { focus: true, updateHash: true });
  });

  window.addEventListener('hashchange', () => show(tabFromHash()));

  show(tabFromHash());

})();
