// 保存完了イベント（Boost! Injector）
kb.event.on('kb.edit.submit.success', (event) => {
  const rec = event.record;
  const recordId = rec.$id.value;
  const sendType = rec['送信種別']?.value;

  // 条件：送信種別 = 提出 のときだけ実行
  if (sendType !== '提出') return event;

  // （必要な場合のみ）次作業者のログイン名を取得
  // 例：ユーザー選択フィールド「レコード管理者」から最初のユーザーを使用
  const assigneeLogin = (rec['レコード管理者']?.value || [])[0]?.code || '';

  // JSONP のコールバック（グローバルに定義）
  window._kbStatusDone = function (resp) {
    // 返ってくる resp の例：
    // { ok: true/false, status: 200/400/403..., kintone: {...} }
    console.log('GAS JSONP result:', resp);

    if (resp && resp.ok === true) {
      // 成功時：必要ならUI通知や画面更新など
      // alert('ステータス更新が完了しました。');
    } else {
      // 失敗時：resp.status / resp.kintone.message などで原因確認
      // 例）アクション名不一致 / assignee不足 / 権限不足 など
      console.warn('ステータス更新に失敗:', resp);
      // alert('ステータス更新に失敗しました。管理者に連絡してください。');
    }
  };

  // ★ 不動さんのGAS /exec URL
  const GAS_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbyawDi5C71L52W370elaTBYY4RuS-oh4kta9fhGOwhjsHtsnIe3kHeJIu3d3JdVsvZA6w/exec';

  // JSONP 呼び出しパラメータ
  const qs = new URLSearchParams({
    id: String(recordId),
    assignee: assigneeLogin || '',   // 必要時のみ。要らなければ '' のまま
    // 必要に応じて上書きしたいときだけ（通常はGASの設定値でOK）：
    // app: '937',
    // action: '評価入力完了',
    callback: '_kbStatusDone'
  });

  // script タグで JSONP 呼び出し（CORSの制約なし）
  const s = document.createElement('script');
  s.src = `${GAS_ENDPOINT}?${qs.toString()}`;
  s.defer = true;                     // 任意
  document.head.appendChild(s);

  return event;
});
