(() => {
  'use strict';

  // 件数の数え方は環境により異なるため2通り用意：
  // 1) event.records が提供される場合（Boost!イベントのeventに含まれるケース）
  // 2) DOM から行数を数える場合（テーブル/カード表示ごとにクラスは調整）

  const showWarningIfEmpty = (event) => {
    // 1) Boost! Echo のイベントオブジェクトに records があるならそれを利用
    const countFromEvent = Array.isArray(event.records) ? event.records.length : null;

    // 2) DOMから数える（リスト表示を想定。必要に応じてセレクタは調整）
    //   例：表形式なら一覧の <tr>、カード形式ならカード要素を対象にする
    const container = event.container || document; // EchoのメインDOM
    const listRows = container.querySelectorAll('.kb-echo-list tbody tr, .kb-echo-card'); 
    const countFromDom = listRows.length;

    const recordCount = (countFromEvent !== null) ? countFromEvent : countFromDom;

    // 0件だったらメッセージを挿入（重複防止も入れる）
    if (recordCount === 0 && !container.querySelector('.kb-empty-warning')) {
      const box = document.createElement('div');
      box.className = 'kb-empty-warning';
      box.setAttribute('role', 'alert');
      box.textContent = '従業員コードかパスワードが間違っています';
      // 表示位置：ヘッダー直下（お好みで変更）
      container.prepend(box);
    }

    return event;
  };

  // ビューの表示完了＆リフレッシュ完了イベントにフック
  // （Echoの「画面表示イベント」系。必要に応じてイベント名を足してください）
  kb.event.on(['kb.view.load.complete', 'kb.view.refresh.complete'], showWarningIfEmpty);
})();
