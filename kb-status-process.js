/* ----------------------------------------------------------
 * Boost! Injector 送信完了フック（ログ強化版 / JSONP呼び出し対応）
 * 1) スクリプト読み込み確認
 * 2) kb.event の存在待ち
 * 3) 全イベントの型名をログ（ワイルドカード）
 * 4) kb.edit.submit.success で JSONP 呼び出し
 * ---------------------------------------------------------- */

(() => {
  const TAG = '[Injector]';
  console.group(`${TAG} custom JS loaded`);
  console.time(`${TAG} total`);
  console.log(`${TAG} script started at`, new Date().toISOString());

  // ---- 0) グローバル動作チェック（最低限の読込確認） ----
  // ここまでのログが出なければ、JSファイルが読み込まれていません（URL/公開設定/キャッシュを確認）
  console.log(`${TAG} window.location.href:`, window.location && window.location.href);

  // ---- 1) kb.event が使えるまで待つ（最大 ~10秒）----
  const MAX_WAIT = 50; // 50*200ms = 10s
  let waitCount = 0;

  function waitKb() {
    const ok = !!(window.kb && kb.event && kb.event.on);
    console.log(`${TAG} kb.event ready?`, ok, `(try ${waitCount + 1}/${MAX_WAIT})`);
    if (ok) {
      onKbReady();
    } else if (waitCount++ < MAX_WAIT) {
      setTimeout(waitKb, 200);
    } else {
      console.warn(`${TAG} kb.event not available after waiting. Injectorの画面/設定を再確認してください。`);
      console.timeEnd(`${TAG} total`);
      console.groupEnd();
    }
  }

  // ---- 2) kb が準備できたらハンドラを登録 ----
  function onKbReady() {
    console.log(`${TAG} kb.event is available:`, !!kb.event.on);

    // 2-1) まずは全イベントの型名を覗く（一度限り）
    try {
      kb.event.on('*', (ev) => {
        try {
          console.log(`${TAG} ANY event:`, ev && ev.type);
        } catch (_) {}
        return ev;
      });
      console.log(`${TAG} wildcard event logger attached`);
    } catch (e) {
      console.warn(`${TAG} wildcard attach failed:`, e);
    }

    // 2-2) 本命：保存完了イベントにフック
    try {
      kb.event.on('kb.edit.submit.success', onSubmitSuccess);
      console.log(`${TAG} handler attached: kb.edit.submit.success`);
    } catch (e) {
      console.error(`${TAG} attach failed: kb.edit.submit.success`, e);
    }

    // 2-3) 手動キック関数（コンソールで window._kick() で実行可）
    window._kick = () => {
      console.warn(`${TAG} manual kick`);
      onSubmitSuccess({ type: 'manual.kick', record: window._lastRecord || null });
    };

    console.timeEnd(`${TAG} total`);
    console.groupEnd();
  }

  // ---- 3) 送信完了ハンドラ（ここで JSONP 実行） ----
  function onSubmitSuccess(event) {
    console.group(`${TAG} onSubmitSuccess`);
    const rec = event && event.record;
    if (!rec) {
      console.warn(`${TAG} event.record が未定義。直前のANYイベントログに型名が出ているか確認してください。event=`, event);
      console.groupEnd();
      return event;
    }

    // 3-1) レコードID／送信種別
    const recordId = rec.$id && rec.$id.value;
    const sendType = rec['送信種別'] && rec['送信種別'].value;
    window._lastRecord = rec; // 手動キック用に保持
    console.log(`${TAG} event.type:`, event.type);
    console.log(`${TAG} recordId:`, recordId);
    console.log(`${TAG} 送信種別:`, sendType);

    // 条件：提出のみ
    if (sendType !== '提出') {
      console.log(`${TAG} 送信種別が提出以外のため処理スキップ`);
      console.groupEnd();
      return event;
    }
    if (!recordId) {
      console.error(`${TAG} recordId が取得できません（rec.$id.value を確認）`);
      console.groupEnd();
      return event;
    }

    // 3-2) 次作業者ログイン名（必要な場合のみ）
    const assigneeLogin = (rec['レコード管理者']?.value || [])[0]?.code || '';
    console.log(`${TAG} assigneeLogin:`, assigneeLogin || '(empty)');

    // 3-3) JSONP コールバック
    window._kbStatusDone = function (resp) {
      console.group(`${TAG} _kbStatusDone`);
      console.log('resp:', resp);
      if (resp && resp.ok === true) {
        console.info(`${TAG} ステータス更新 OK`);
      } else {
        console.warn(`${TAG} ステータス更新 NG`, resp);
      }
      console.groupEnd();
    };

    // 3-4) GAS JSONP 呼び出し（CORS非対象）
    const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyawDi5C71L52W370elaTBYY4RuS-oh4kta9fhGOwhjsHtsnIe3kHeJIu3d3JdVsvZA6w/exec';
    const qs = new URLSearchParams({
      id: String(recordId),
      assignee: assigneeLogin || '',
      // 必要に応じて上書き可能：
      // app: '937',
      // action: '評価入力完了',
      callback: '_kbStatusDone',
      c: Date.now().toString() // キャッシュ防止
    });
    const src = `${GAS_ENDPOINT}?${qs.toString()}`;
    console.log(`${TAG} JSONP src:`, src);

    // 3-5) script タグ挿入（ロード結果もログ）
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.onload = () => {
      console.log(`${TAG} JSONP script onload`);
    };
    s.onerror = (ev) => {
      console.error(`${TAG} JSONP script onerror`, ev);
    };

    // CSPブロック検知（参考）
    window.addEventListener('error', function (e) {
      const msg = String(e && e.message || '');
      if (msg.includes('Refused to load the script')) {
        console.error(`${TAG} CSPでJSONPが拒否されています。no-cors投げっぱなし or 同オリジン中継をご検討ください。`);
      }
    }, { once: true });

    document.head.appendChild(s);
    console.log(`${TAG} JSONP script appended`);

    console.groupEnd();
    return event;
  }

  // ---- 起動 ----
  waitKb();
})();
