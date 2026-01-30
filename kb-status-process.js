(() => {
  'use strict';

  /*** ===== 設定（置換） ===== ***/
  const SUBDOMAIN = 'YOUR_SUBDOMAIN';     // 例: https://example.cybozu.com
  const APP_ID = 937;
  const API_TOKEN = '***************';    // App937のAPIトークン（閲覧/編集/プロセス実行が通る権限）
  const ACTION_NAME = '評価入力完了';      // プロセス管理のアクション名（UI表記と完全一致）
  const SENDTYPE_FIELD = '送信種別';      // フィールドコード
  const USER_FIELD_CODE_FOR_OWNER = 'レコード管理者'; // 次作業者に使うユーザー選択フィールド（必要時）

  // Injector: 送信完了イベント
  kb.event.on('kb.edit.submit.success', async (event) => {
    try {
      // 1) 直近保存レコードのIDと値を event.record から取得
      const rec = event.record;
      console.log(rec);
      const recordId = rec.$id.value; // ★ここがポイント
      console.log(recordId);
      if (!recordId) {
        console.warn('recordId が取得できません。event.record.$id.value を確認してください。', event);
        return event;
      }

      // 2) 「送信種別」を判定（APIで取り直さず、event.record をそのまま利用）
      const sendType = rec?.[SENDTYPE_FIELD]?.value;
      if (sendType !== '提出') return event; // 条件外は何もしない

      // 3) ステータス更新APIを実行
      // まず assignee なしで試行
      let ok = await runAction(APP_ID, recordId, ACTION_NAME, null);

      // 4) 必要なら次作業者（assignee）を補完して再実行
      if (!ok) {
        const candidates = rec?.[USER_FIELD_CODE_FOR_OWNER]?.value || [];
        const assigneeLogin = candidates[0]?.code; // ログイン名
        if (assigneeLogin) {
          ok = await runAction(APP_ID, recordId, ACTION_NAME, assigneeLogin);
        }
      }

      if (!ok) {
        console.error('ステータス更新に失敗：アクション名/権限/作業者条件を確認してください。');
      }
    } catch (err) {
      console.error(err);
    }
    return event;
  });

  /*** ========== REST 呼び出し ========== ***/
  async function runAction(app, id, action, assignee /* nullable */) {
    const url = `https://${SUBDOMAIN}.cybozu.com/k/v1/record/status.json`;
    const body = { app, id, action };
    if (assignee) body.assignee = assignee; // 「次のユーザーから作業者を選択」等では必須

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-Cybozu-API-Token': API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (resp.ok) return true;
    try { console.warn('Action API error', await resp.json()); } catch (_) {}
    return false;
  }
})();
