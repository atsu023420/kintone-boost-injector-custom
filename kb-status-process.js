(() => {
  'use strict';

  // 編集画面の「保存成功後」イベント（Boost! Injector）
  kb.event.on('kb.edit.submit.success', async (event) => {
    try {
      const record   = event.record;
      const appId    = event.appId;
      const recordId = event.recordId;
      console.log(record);

      // 条件1：現在ステータスが「評価入力中」
      const currentStatus = record['ステータス']?.value;
      if (currentStatus !== '評価入力中') return event;

      // 条件2：送信種別（ラジオ）が「提出」
      const sendType = record['送信種別']?.value;
      if (sendType !== '提出') return event;

      // 作業者：ユーザー選択フィールド「レコード管理者」からログイン名(code)
      const managers = record['レコード管理者']?.value || [];
      if (managers.length === 0) {
        alert('作業者（レコード管理者）が未設定のため、ステータスを進められません。');
        return event;
      }
      const assigneeLoginName = managers[0].code;

      // ステータス更新API呼び出し（評価入力完了 → 評価確認中 へ進むアクションを実行）
      const body = {
        app: appId,
        id: recordId,
        action: '評価入力完了',     // プロセス管理で定義したアクション名を正確に
        assignee: assigneeLoginName // 「次のユーザーから選択」型のときは必須
        // revision: -1             // リビジョンチェック不要なら明示してもOK（省略でも可）
      };

      await kintone.api(
        kintone.api.url('/k/v1/record/status', true),
        'PUT',
        body
      );

      return event; // 既定の遷移（詳細画面表示など）に任せる

    } catch (err) {
      alert(`ステータス更新に失敗しました：${err?.message || err}`);
      return event; // 保存自体は成功済みのため event を返す
    }
  });
})();
