<script>
/**
 * Boost! Injector 送信後（保存完了後）に、
 * 「送信種別=提出」ならプロセス管理のアクション「評価入力完了」を実行して
 * ステータスを「評価確認中」へ進める。
 *
 * 依存：kintone REST API（CORS許可。APIトークン利用）
 * 参照：/k/v1/record.json（GET）, /k/v1/record/status.json（PUT）
 * Docs: https://cybozu.dev/ja/kintone/docs/rest-api/records/update-status/
 */

(async () => {
  // ====== 設定（必ず置換） ======
  const SUBDOMAIN = 'd8d1j';        // 例: 'example' → https://example.cybozu.com
  const APP_ID = 937;
  const API_TOKEN = 'yikDqoBrziDzoYM7ioTlzZvQdjMSpDouMj8idcoN';              // アプリ937のAPIトークン（閲覧/編集/プロセス実行が通る権限）
  const ACTION_NAME = '評価入力完了';         // UI上のアクション名と完全一致（言語も一致）
  const SENDTYPE_FIELD = '送信種別';         // フィールドコード
  const USER_FIELD_CODE_FOR_OWNER = 'レコード管理者'; // 次作業者に使うユーザー選択フィールド（必要時）

  // ====== Injectorの「保存完了」をトリガーにするためのフック ======
  // ※ Injector固有のイベント仕様が環境で異なる場合があるため、
  //   実運用では「保存完了後にこの関数を呼ぶ」形で組み込んでください。
  //   ここでは、ページロード後すぐに直近レコードを処理する例示に留めます。
  //   → 実際は Boost! Submit の「保存後リダイレクト先」にこのJSを置く方式も安定です。

  // 直近保存したレコードIDを何らかの方法で取得する必要があります。
  // 例）Thank youページのURLパラメータ ?rid=xxxx で渡す運用にしている前提：
  const rid = new URL(location.href).searchParams.get('rid');
  if (!rid) return; // ridが無い場合は何もしない（運用に合わせて変更）

  // レコード取得（送信種別の判定＆必要なら次作業者の抽出）
  const record = await getRecord(APP_ID, rid);
  const sendType = record[SENDTYPE_FIELD]?.value;
  if (sendType !== '提出') return; // 条件外は何もしない

  // まず assignee なしでアクション実行を試す
  let ok = await runAction(APP_ID, rid, ACTION_NAME, null);
  if (!ok) {
    // 必要ならユーザー選択フィールドから次作業者を補完して再実行
    const userCandidates = (record[USER_FIELD_CODE_FOR_OWNER]?.value || []);
    const assigneeLogin = userCandidates[0]?.code; // 先頭のユーザーのログイン名
    if (assigneeLogin) {
      ok = await runAction(APP_ID, rid, ACTION_NAME, assigneeLogin);
    }
  }
  if (!ok) {
    console.error('ステータス更新に失敗しました。権限/アクション名/作業者条件を再確認してください。');
  }

  // ====== REST 呼び出し関数群 ======
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
    if (!resp.ok) {
      throw new Error('レコード取得失敗');
    }
    const json = await resp.json();
    return json.record;
  }

  async function runAction(app, id, action, assignee /* nullable */) {
    const url = `https://${SUBDOMAIN}.cybozu.com/k/v1/record/status.json`;
    const body = { app, id, action };
    if (assignee) body.assignee = assignee;

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-Cybozu-API-Token': API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (resp.ok) return true;

    // デバッグ
    try {
      const err = await resp.json();
      console.warn('Action API error', err);
    } catch (_) {}
    return false;
  }
})();
</script>
