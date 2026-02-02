/* ----------------------------------------------------------
 * Boost! Injector 送信完了フック（no-cors 投げっぱなし版）
 *  - 送信種別=「提出」のとき、GASへ x-www-form-urlencoded でPOST
 *  - ステータス値で appId / action を判定（appIdは取得しない前提）
 *  - no-cors のためレスポンスは読まない（結果はGAS側でログ/通知）
 * ---------------------------------------------------------- */

(() => {
  const TAG = '[Injector no-cors]';

  // ★★★ ここをあなたの GAS /exec URL に置き換え ★★★
  const GAS_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbwwWx8Ah3ao20gvQPlEwjVHwKhCox2fpJDg0UwZ29UWVbiUv7-eERVDTBGt4Uq-hQewcw/exec';

  // ---- 0) 必要なら最小ログ（読み込み確認）----
  console.log(`${TAG} custom JS loaded at`, new Date().toISOString());

  // ---- 1) Boost! Injector のイベントにフック ----
  // ※ kb.event が未定義の場合のため、軽く待機（最大 10 秒）
  const MAX_WAIT = 50; // 50*200ms = 10s
  let tries = 0;

  function waitKb() {
    if (window.kb && kb.event && kb.event.on) {
      attachHandler();
    } else if (tries++ < MAX_WAIT) {
      setTimeout(waitKb, 200);
    } else {
      console.warn(`${TAG} kb.event not available. Check Injector settings/screen.`);
    }
  }

  function attachHandler() {
    console.log(`${TAG} attaching handler: kb.edit.submit.success`);
    kb.event.on('kb.edit.submit.success', onSubmitSuccess);
  }

  // ---- 2) 送信完了ハンドラ：no-cors で GAS に投げる ----
  async function onSubmitSuccess(event) {
    try {
      const rec = event && event.record;
      if (!rec) {
        console.warn(`${TAG} event.record is missing.`, event);
        return event;
      }

      const recordId = rec.$id && rec.$id.value;
      const sendType = rec['送信種別'] && rec['送信種別'].value;
      if (!recordId) {
        console.warn(`${TAG} recordId not found (rec.$id.value).`);
        return event;
      }
      if (sendType !== '提出') {
        console.log(`${TAG} skip: 送信種別 ≠ 提出`);
        return event;
      }

      // 次作業者（プロセス設定により必須な場合のみ）
      const assigneeLogin = (rec['レコード管理者']?.value || [])[0]?.code || '';

      // ---- ステータス値で appId/action を判定（appIdはkintone.app.getId()を使わない）----
      // 評価（937）と個人目標（936）の対象ステータス
      const statusField = rec['ステータス']; // kintone標準のプロセス管理ステータス（画面上は「ステータス」）
      // Injectorの event.record にはステータスの直値が入らないことがあるため安全側で取得
      const statusName =
        (typeof statusField?.value === 'string' && statusField.value) ||
        (rec['ステータス'] && rec['ステータス'].value) ||
        ''; // フォールバック

      // 判定テーブル
      const isEvalPhase = (statusName === '評価入力中' || statusName === '評価見直し中'); // 937
      const isGoalPhase = (statusName === '目標入力中' || statusName === '目標見直し中'); // 936
      const isReviewPhase = (statusName === '振り返り入力中' || statusName === '振り返り見直し中'); // 936

      let appId = '';
      let action = '';

      if (isEvalPhase) {
        appId = '937';
        action = '評価入力完了(admin)';
      } else if (isGoalPhase) {
        appId = '936';
        action = '目標入力完了(admin)';
      } else if (isReviewPhase) {
        appId = '936';
        action = '振り返り入力完了(admin)';
      } else {
        console.log(`${TAG} skip: status not in target phases. status=`, statusName);
        return event; // 安全のため対象外は送らない
      }

      // ---- 送信内容作成 ----
      const form = new URLSearchParams({
        id: String(recordId),
        app: appId,
        action: action
      });
      if (assigneeLogin) form.set('assignee', assigneeLogin);

      // no-cors で「送るだけ」。レスポンスは読めない
      await fetch(GAS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
      });

      console.log(
        `${TAG} sent to GAS (no-cors). recordId=${recordId} app=${appId} action=${action} assignee=${assigneeLogin || '(none)'}`
      );
    } catch (err) {
      // 送出前の例外のみ捕捉できる（CORS/サーバ応答は拾えない）
      console.error(`${TAG} exception before send`, err);
    }
    return event;
  }

  // 起動
  waitKb();
})();
