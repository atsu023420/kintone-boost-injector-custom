kb.event.on('kb.edit.submit.success', async (event) => {
  try {
    const rec = event.record;
    const recordId = rec.$id.value;
    const sendType = rec['送信種別']?.value;
    if (sendType !== '提出') return event; // 条件外は何もしない

    // 必要な場合だけ次作業者のログイン名を用意（例：ユーザー選択フィールド「レコード管理者」）
    const assigneeLogin = (rec['レコード管理者']?.value || [])[0]?.code || '';

    // ★GASの /exec URL を設定
    const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyoxfT7jxLNXk198vSJitleSqyXmr_FXFBPBIei1DFsgUYRMfkXhyzWx2ROCxUVlpSOcw/exec';

    // CORS/プリフライト回避のため x-www-form-urlencoded で送る
    const body = new URLSearchParams({
      id: recordId,                   // 必須
      assignee: assigneeLogin || ''   // 必須のときだけ付与
      // 上書きしたければ：
      // app: '937',
      // action: '評価入力完了'
    });

    const res = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    // ログ確認（問題解析用）
    const json = await res.json();
    console.log('GAS relay result:', json); // { ok: true/false, kintone: {...} }

    // 必要なら UI リダイレクト/表示調整など
  } catch (err) {
    console.error('Injector hook error:', err);
  }
  return event;
});
