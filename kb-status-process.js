(() => {
  'use strict';

  // 編集画面の「保存成功後」イベント（Boost! Injector）
  kb.event.on('kb.edit.submit.success', async (event) => {
    try {
      // ← ここがポイント：kintone オブジェクトを安全に取得
      const kt = (typeof window !== 'undefined' && window.kintone)
              || (typeof parent !== 'undefined' && parent.kintone);
      if (!kt || !kt.api) {
        alert('kintoneオブジェクトが取得できませんでした（kintone is not defined）。\nプラグインの実行位置や読み込み順を確認してください。');
        return event;
      }

      const record   = event.record;
      const appId    = event.appId;
      const recordId = event.recordId;

      // 条件1：現在ステータスが「評価入力中」
      const currentStatus = record['ステータス']?.value;
      if (currentStatus !== '評価入力中') return event;

      // 条件2：送信種別（ラジオ）が「提出」
      const sendType = record['送信種別']?.value;
      if (sendType !== '提出') return event;

      // 作業者：ユーザー選択「レコード管理者」からログイン名(code)
      const managers = record['レコード管理者']?.value || [];
      if (managers.length === 0) {
        alert('作業者（レコード管理者）が未設定のため、ステータスを進められません。');
        return event;
      }
      const assigneeLoginName = managers[0].code;

      // ステータス更新API（評価入力完了 → 評価確認中）
      const body = {
        app: appId,
        id: recordId,
        action: '評価入力完了',     // プロセス管理のアクション名を正確に
        assignee: assigneeLoginName // 次の作業者を選択する型のときは必須
        // revision: -1            // 必要に応じて
      };

      await kt.api(
        kt.api.url('/k/v1/record/status', true),
        'PUT',
        body
      );

      return event;

    } catch (err) {
      alert(`ステータス更新に失敗しました：${err?.message || err}`);
      return event;
    }
  });
})();
