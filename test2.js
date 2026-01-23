
(() => {
  'use strict';

  const log = (...a) => console.log('[InjectorBadge]', ...a);

  const showBadge = () => {
    if (document.getElementById('injector-simple-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'injector-simple-badge';
    badge.textContent = '🔥 INJECTOR OK!';
    Object.assign(badge.style, {
      position: 'fixed',
      top: '14px',
      right: '14px',
      zIndex: 2147483647, // できるだけ最前面
      padding: '6px 10px',
      background: '#16a34a',
      color: '#fff',
      borderRadius: '12px',
      fontWeight: '700',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      boxShadow: '0 2px 12px rgba(0,0,0,.25)',
      pointerEvents: 'none' // 上のUI操作を邪魔しない
    });
    (document.body || document.documentElement).appendChild(badge);
    log('badge appended');
  };

  // kb.event.on が使えるまで待機
  const waitForKb = () =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const tm = setInterval(() => {
        if (window.kb && kb.event && typeof kb.event.on === 'function') {
          clearInterval(tm);
          resolve();
        } else if (Date.now() - start > 6000) {
          clearInterval(tm);
          reject(new Error('kb not ready timeout'));
        }
      }, 30);
    });

  // DOM 準備待ち
  const onDomReady = (fn) => {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  // 最後の最後の保険：主要ノードが出てきたら表示
  const observeAndShow = () => {
    try {
      const mo = new MutationObserver((muts, obs) => {
        if (document.body && !document.getElementById('injector-simple-badge')) {
          showBadge();
          obs.disconnect();
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => mo.disconnect(), 8000);
    } catch (e) { /* noop */ }
  };

  // 1) まず DOMContentLoaded で出す（見えるかを最優先）
  onDomReady(() => {
    setTimeout(showBadge, 0);        // 最速で表示
    setTimeout(showBadge, 500);      // レイアウト後に再度
    setTimeout(showBadge, 1500);     // 遅延描画の保険
    observeAndShow();                // ノード変化を見て重ねて出す
  });

  // 2) kb イベントに正式に乗せる（以後のナビゲーションにも追従）
  waitForKb().then(() => {
    const safeAttach = (type) => {
      try {
        kb.event.on(type, (event) => {
          showBadge();
          return event;
        });
        log(`handler registered: ${type}`);
      } catch (e) {
        log(`handler failed: ${type}`, e);
      }
    };
    // 代表的なイベントを広めにキャッチ
    ['kb.view.load', 'kb.edit.load', 'kb.create.load', 'kb.index.load'].forEach(safeAttach);
  }).catch((e) => {
    log('kb wait failed (fallback only)', e);
  });

})();
