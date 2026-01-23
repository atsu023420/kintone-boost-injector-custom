
<!-- ファイル名例: injector-test.js（中身はJSのみ。保存は .js 拡張子で） -->
<script>
(function () {
  'use strict';

  // 1) DOM構築完了で実行
  const ready = (fn) => (document.readyState !== 'loading')
    ? fn()
    : document.addEventListener('DOMContentLoaded', fn);

  ready(() => {
    // ヘッダー的な領域が無い場合もあるので、body末尾にバナーを追加
    if (!document.getElementById('injector-simple-badge')) {
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
      console.log('[InjectorTest] badge appended');
    }

    // 2) よくある input 要素を “存在すれば” 試しにプレフィル
    //    name 属性はフォーム構成で変わるので、存在チェックしながら安全に
    const tryFill = (selector, value) => {
      const el = document.querySelector(selector);
      if (el && !el.value) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('[InjectorTest] filled', selector);
      }
    };
    // 例：氏名・メール・電話など、よくあるname想定（無ければスキップ）
    tryFill('input[name="name"]', '山田 太郎');
    tryFill('input[name="email"]', 'taro.yamada@example.com');
    tryFill('input[name="tel"]', '0312345678');

    // 3) 送信ボタンのクリック前に簡易バリデーションを差し込む例
    //    送信ボタンのテキストが「送信」「Submit」など想定。見当たらなければ何もしない。
    const submitBtn = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      .find(b => /送信|submit/i.test(b.textContent || b.value || ''));
    if (submitBtn && !submitBtn.dataset.injectorHooked) {
      submitBtn.dataset.injectorHooked = '1';
      submitBtn.addEventListener('click', (e) => {
        const email = document.querySelector('input[name="email"]')?.value?.trim();
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          e.preventDefault();
          alert('メールアドレスの形式が正しくありません。');
        }
      }, { capture: true });
      console.log('[InjectorTest] submit hook ready');
    }
  });
})();
</script>
``
