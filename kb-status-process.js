kb.event.on('kb.edit.submit.success', (event) => {
  try {
    // 0) イベント到達ログ（最初に出るかを確認）
    console.group('[Injector] kb.edit.submit.success');
    console.time('[Injector] total'); // 全体計測

    // 1) イベント内容の最小限を可視化
    console.log('[Injector] event.type:', event && event.type);
    console.log('[Injector] has record? ->', !!(event && event.record));

    const rec = event.record;
    if (!rec) {
      console.warn('[Injector] event.record がありません。Boost! Injector のコールバックが想定外の可能性');
      console.groupEnd();
      return event;
    }

    // 2) レコードIDと送信種別の確認
    const recordId = rec.$id && rec.$id.value;
    const sendType = rec['送信種別'] && rec['送信種別'].value;
    console.log('[Injector] recordId:', recordId);
    console.log('[Injector] 送信種別:', sendType);

    // 3) 条件分岐（提出以外は何もしない）
    if (sendType !== '提出') {
      console.log('[Injector] 送信種別が提出以外のため送信しません。');
      console.timeEnd('[Injector] total');
      console.groupEnd();
      return event;
    }
    if (!recordId) {
      console.error('[Injector] recordId が空。event.record.$id.value の取得を見直してください。');
      console.timeEnd('[Injector] total');
      console.groupEnd();
      return event;
    }

    // 4) （必要な場合のみ）次作業者のログイン名を取得
    const assigneeLogin = (rec['レコード管理者']?.value || [])[0]?.code || '';
    console.log('[Injector] assigneeLogin:', assigneeLogin || '(empty)');

    // 5) JSONP コールバック（グローバルに定義）
    window._kbStatusDone = function (resp) {
      console.group('[Injector] _kbStatusDone callback');
      console.log('resp:', resp); // { ok: true/false, status, kintone: {...} } が返る想定
      if (resp && resp.ok === true) {
        console.info('[Injector] ステータス更新 OK');
      } else {
        console.warn('[Injector] ステータス更新 NG', resp);
      }
      console.groupEnd();
      console.timeEnd('[Injector] total');
    };

    // 6) GAS エンドポイント設定
    const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyawDi5C71L52W370elaTBYY4RuS-oh4kta9fhGOwhjsHtsnIe3kHeJIu3d3JdVsvZA6w/exec';

    // 7) JSONP のクエリ生成（cache-busting 付き）
    const qs = new URLSearchParams({
      id: String(recordId),
      assignee: assigneeLogin || '',
      // 必要なら app/action の上書きも可能：
      // app: '937',
      // action: '評価入力完了',
      callback: '_kbStatusDone',
      c: Date.now().toString() // キャッシュ回避
    });
    const src = `${GAS_ENDPOINT}?${qs.toString()}`;
    console.log('[Injector] JSONP src:', src);

    // 8) script タグ挿入（onload / onerror フック付き）
    const s = document.createElement('script');
    s.src = src;
    s.defer = true; // 任意

    s.onload = function () {
      console.log('[Injector] script onload fired（JSONPロード完了）。_kbStatusDone が呼ばれていない場合はGAS側でcallbackが欠落している可能性あり。');
    };
    s.onerror = function (ev) {
      console.error('[Injector] script onerror fired: JSONP ロード失敗（CSP/ネットワーク/URL誤りの可能性）', ev);
      console.timeEnd('[Injector] total');
    };

    // 9) CSP によるブロック兆候を検出（エラー監視）
    // ※ 一部ブラウザでは console にCSPメッセージが出ないことがあるため保険として
    window.addEventListener('error', function (e) {
      if (String(e.message || '').includes('Refused to load the script')) {
        console.error('[Injector] CSPでscriptロードが拒否されています。JSONP方式不可 → no-cors または同オリジン中継に切替が必要');
      }
    }, { once: true });

    // 10) 挿入して実行
    document.head.appendChild(s);
    console.log('[Injector] script appended');

    // 11) 応答が来ない場合のタイムアウト検出（10秒）
    setTimeout(() => {
      console.warn('[Injector] JSONP 応答タイムアウト（10秒）。GAS到達/デプロイ/URL/アクセス権を確認してください。');
      console.timeEnd('[Injector] total');
    }, 10000);

    console.groupEnd();
    return event;

  } catch (err) {
    console.error('[Injector] 例外発生:', err);
    console.groupEnd && console.groupEnd();
    return event;
  }
});
