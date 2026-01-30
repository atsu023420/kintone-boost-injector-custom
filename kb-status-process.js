(() => {
  'use strict';

  /*** ===== 設定（必ず置換） ===== ***/
  const SUBDOMAIN = 'YOUR_SUBDOMAIN'; // 例: https://example.cybozu.com
  const APP_ID = 937;
  const API_TOKEN = '***************'; // App937 用APIトークン（閲覧/編集/プロセス実行が通る権限）
  const ACTION_NAME = '評価入力完了';   // プロセス管理のアクション名（UI表記と完全一致）
  const SENDTYPE_FIELD = '送信種別';    // フィールドコード
  const USER_FIELD_CODE_FOR_OWNER = 'レコード管理者'; // 次作業者に使うユーザー選択フィールド（必要時）

  /**
   * Injectorの「保存完了」イベントで発火
   * - event には直近保存レコードの情報（recordId 等）が入る想定
   * - 実際のプロパティ名は環境により異なることがあるため、console.log(event)で確認しつつ参照先を調整
   */
  kb.event.on('kb.edit.submit.success', async (event) => {
    try {
      // 1) 直近保存されたレコードIDの取得
      //   例: event.recordId / event.id / event.detail.recordId など。環境に合わせて調整する。
      console.log(event);
      const recordId =
        event?.recordId ??
        event?.id ??
        event?.detail?.recordId ??
        null;

      if (!recordId) {
        console.warn('保存後イベントに recordId が見当たりません。event を確認してください。', event);
        return event;
      }

      // 2) レコードを取得して「送信種別」を判定
      const record = await getRecord(APP_ID, recordId);
      const sendType = record[SENDTYPE_FIELD]?.value;
      if (sendType !== '提出') {
        // 条件外は何もしない
        return event;
      }

      // 3) ステータス更新APIを実行
      // まず assignee なしで試行（プロセス設定が「作業者選択不要」の場合はこれで通る）
      let ok = await runAction(APP_ID, recordId, ACTION_NAME, null);

      // 4) 必要なら次作業者（assignee）を補完して再実行
      if (!ok) {
        const userCandidates = (record[USER_FIELD_CODE_FOR_OWNER]?.value || []);
        const assigneeLogin = userCandidates[0]?.code; // ログイン名
        if (assigneeLogin) {
          ok = await runAction(APP_ID, recordId, ACTION_NAME, assigneeLogin);
        }
      }

      if (!ok) {
        console.error('ステータス更新に失敗。アクション名/権限/作業者条件を確認してください。');
      }
    } catch (err) {
      console.error(err);
    }
    return event;
  });

  /*** ========== REST ユーティリティ ========== ***/

  async function getRecord(app, id) {
    const url = `https://${SUBDOMAIN}.cybozu.com/k/v1/record.json`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Cybozu-API-Token': API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ app, id })
    });
    if (!resp.ok) throw new Error('レコード取得失敗');
    const json = await resp.json();
    return json.record;
  }

  async function runAction(app, id, action, assignee /* nullable */) {
    const url = `https://${SUBDOMAIN}.cybozu.com/k/v1/record/status.json`;
    const body = { app, id, action };
    if (assignee) body.assignee = assignee; // 「次のユーザーから作業者を選択」などでは必須

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-Cybozu-API-Token': API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (resp.ok) return true;

    // デバッグログ
    try { console.warn('Action API error', await resp.json()); } catch (_) {}
    return false;
  }
})();
