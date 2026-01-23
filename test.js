
(() => {
  'use strict';

  // kb.event.on が使えるまで待つ（最大5秒）
  const waitForKb = () =>
    new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (window.kb && kb.event && typeof kb.event.on === 'function') {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - started > 5000) {
          clearInterval(timer);
          reject(new Error('kb not ready'));
        }
      }, 30);
    });

  const showBadge = () => {
    if (document.getElementById('injector-simple-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'injector-simple-badge';
    badge.textContent = '🔥 INJECTOR OK!';
    Object.assign(badge.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: 999999,
      padding: '6px 10px',
      background: '#16a34a',
      color: '#fff',
      borderRadius: '12px',
      fontWeight: '700',
      boxShadow: '0 2px 8px rgba(0,0,0,.2)'
    });
    document.body.appendChild(badge);
    console.log('[InjectorBadge] appended');
  };

  waitForKb()
    .then(() => {
      // フォームビュー読込時に実行（Injectorの標準イベント）
      kb.event.on('kb.view.load', (event) => {
        showBadge();
        return event; // そのまま進める
      });
      console.log('[InjectorBadge] kb.view.load handler registered');
    })
    .catch((e) => {
      console.warn('[InjectorBadge] kb not ready:', e);
      // 最悪の保険：DOMだけでバッジを出す（イベントに乗らないケースでも目視確認できる）
      if (document.readyState !== 'loading') showBadge();
      else document.addEventListener('DOMContentLoaded', showBadge);
    });
})();
