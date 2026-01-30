kb.event.on('kb.edit.submit.success', async (event) => {
  // 1) 提出条件チェック
  const rec = event.record;
  const recordId = rec.$id.value;
  const sendType = rec['送信種別']?.value;
  if (sendType !== '提出') return event;

  // 2) （必要時のみ）次作業者のログイン名を準備
  const assigneeLogin = (rec['レコード管理者']?.value || [])[0]?.code || '';

  // 3) JSONPのコールバックをグローバルに定義
  //    ※一度定義すれば複数回の呼び出しでも使える
  window._kbStatusDone = function (resp) {
    // resp = { ok: true/false, kintone: {...} }
    console.log('GAS JSONP result:', resp);

    if (!resp || resp.ok !== true) {
      // 必要ならUI表示やリトライ処理
      // alert('ステータス更新に失敗しました');
    } else {
      // OK時のUI処理（任意）
      // alert('ステータス更新完了');
    }
  };

  // 4) GASの /exec に JSONP で投げる（CORS非対象）
  const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwveUBgoAvLdQEjFIzVkNisXMZdM4lYU9zTHlbP_xZowgabW2V4IUGR3QtTTRKS_RfOvQ/exec';
  const qs = new URLSearchParams({
    id: String(recordId),
    assignee: assigneeLogin || '',
    // ここで app や action を上書きしたい時は追加：
    // app: '937',
    // action: '評価入力完了',
    callback: '_kbStatusDone' // ← ここがJSONPの肝
  });

  const s = document.createElement('script');
  s.src = `${GAS_ENDPOINT}?${qs.toString()}`;
  s.defer = true;                        // 任意
  document.head.appendChild(s);          // ← これで実行され、_kbStatusDone に結果が返る

  return event;
});
