
(function () {
  'use strict';

  // 右上ヘッダーにバッジを付けて「適用されてる」ことだけ確認する簡易版
  const insertBadge = () => {
    try {
      const header = kintone.app.getHeaderMenuSpaceElement?.();
      if (!header) return;

      // 二重追加防止
      if (document.getElementById('boost-simple-badge')) return;

      const badge = document.createElement('div');
      badge.id = 'boost-simple-badge';
      badge.textContent = '🔥 BOOST OK!';
      badge.style.cssText = [
        'padding:4px 10px',
        'margin-left:8px',
        'background:#ff5722',
        'color:#fff',
        'border-radius:12px',
        'font-weight:600',
        'font-size:12px'
      ].join(';');

      header.appendChild(badge);
    } catch (e) {
      console.log('Badge error:', e);
    }
  };

  // すべてのアプリ画面で実行（詳細・一覧・レコード編集画面など）
  const events = [
    'app.record.index.show',
    'app.record.detail.show',
    'app.record.edit.show',
    'app.record.create.show'
  ];

  events.forEach(ev => {
    kintone.events.on(ev, insertBadge);
  });

  console.log('🔥 Simple Boost JS Loaded');
})();
