/* ----------------------------------------------------------
 * Boost! Injector 共通スニペット（評価レコード管理 / 個人目標管理 両対応）
 *  - 保存（提出）完了時に、GAS へ no-cors POST
 *  - アプリIDで分岐（937=評価, 936=個人目標）
 *  - 個人目標は現在ステータスを取得して action を自動決定
 * ---------------------------------------------------------- */
(() => {
  const TAG = '[Injector unified]';

  // ★★★ あなたの GAS /exec URL に置き換え ★★★
  const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwwWx8Ah3ao20gvQPlEwjVHwKhCox2fpJDg0UwZ29UWVbiUv7-eERVDTBGt4Uq-hQewcw/exec';

  // ---- 0) ログ（読み込み確認）----
  console.log(`${TAG} custom JS loaded at`, new Date().toISOString());

  // ---- 1) Boost! Injector イベントにフック（kb.event が出るまで待機）----
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

  // ---- 2) kintone: レコード現在ステータス名を取得（GET /k/v1/record/status.json）----
  async function fetchRecordStatusName(appId, recordId) {
    try {
      const url = kintone.api.url('/k/v1/record/status.json', true);
      const resp = await kintone.api(url, 'GET', { app: appId, id: recordId });
      // 返却形の揺れに耐性を持たせる
      if (!resp) return '';
      if (typeof resp.status === 'string') return resp.status;
      if (resp.status && typeof resp.status.name === 'string') return resp.status.name;
      // 古い仕様やカスタムによる揺れにも一応対応
      if (resp.state && typeof resp.state === 'string') return resp.state;
      return '';
    } catch (e) {
      console.warn(`${TAG} failed to fetch status name`, e);
      return '';
    }
  }

  // ---- 3) 送信完了ハンドラ ----
  async function onSubmitSuccess(event) {
    try {
      const rec = event && event.record;
      if (!rec) {
        console.warn(`${TAG} event.record is missing.`, event);
        return event;
      }

      const appId = (kintone.app && kintone.app.getId && kintone.app.getId()) || null;
      const recordId = rec.$id && rec.$id.value;
      const sendType  = rec['送信種別'] && rec['送信種別'].value;
      if (!recordId) {
        console.warn(`${TAG} recordId not found (rec.$id.value).`);
        return event;
      }
      if (sendType !== '提出') {
        console.log(`${TAG} skip: 送信種別 ≠ 提出`);
        return event;
      }
      if (appId !== 936 && appId !== 937) {
        console.log(`${TAG} skip: target app only (936, 937). appId=`, appId);
        return event;
      }

      // 次作業者（プロセス側が必須のときのみ使用される）
      const assigneeLogin = (rec['レコード管理者']?.value || [])[0]?.code || '';

      // ---- アクション選定 ----
      let action = '';
      if (appId === 937) {
        // 評価レコード管理（固定アクション）
        action = '評価入力完了(admin)';
      } else if (appId === 936) {
        // 個人目標管理（現在ステータスで分岐）
        const statusName = await fetchRecordStatusName(appId, recordId);
        if (!statusName) {
          console.warn(`${TAG} statusName not resolved. skip. recordId=`, recordId);
          return event;
        }
        const isGoalPhase = (statusName === '目標入力中' || statusName === '目標見直し中');
        const isReviewPhase = (statusName === '振り返り入力中' || statusName === '振り返り見直し中');

        if (isGoalPhase) {
          action = '目標入力完了(admin)';
        } else if (isReviewPhase) {
          action = '振り返り入力完了(admin)';
        } else {
          console.log(`${TAG} skip: status not in target phases. status=`, statusName);
          return event; // 例外時の扱い＝追加不要 → スキップで安全終了
        }
      }

      if (!action) {
        console.warn(`${TAG} action not decided. skip.`);
        return event;
      }

      // ---- GAS へ no-cors POST ----
      const form = new URLSearchParams({
        id: String(recordId),
        app: String(appId),
        action: action
      });
      if (assigneeLogin) form.set('assignee', assigneeLogin); // 必要時のみ送る

      await fetch(GAS_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
      });

      console.log(`${TAG} sent to GAS (no-cors). app=${appId} id=${recordId} action=${action} assignee=${assigneeLogin || '(none)'}`);
    } catch (err) {
      console.error(`${TAG} exception before send`, err);
    }
    return event;
  }

  // 起動
  waitKb();
})();
