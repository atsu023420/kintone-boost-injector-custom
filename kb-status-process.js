kb.event.on('kb.edit.submit.success', async (event) => {
  try {
    const rec = event.record;
    const recordId = rec.$id.value;
    const sendType = rec['送信種別']?.value;

    // 条件：提出のときだけ処理
    if (sendType !== '提出') return event;

    // 次作業者（必要な場合のみ）
    const assigneeLogin =
      (rec['レコード管理者']?.value || [])[0]?.code || '';

    // ★GASの /exec URL（不動さんの環境）
    const GAS_ENDPOINT =
      'https://script.google.com/macros/s/AKfycbyoxfT7jxLNXk198vSJitleSqyXmr_FXFBPBIei1DFsgUYRMfkXhyzWx2ROCxUVlpSOcw/exec';

    // 送信データ（URLエンコード形式）
    const body = new URLSearchParams({
      id: recordId,
      assignee: assigneeLogin || ''
    });

    // ★ no-cors で「投げっぱなしで送る」
    await fetch(GAS_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors', // これがポイント：レスポンスは一切読めないが投げることはできる
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    // no-cors のため結果は取得できない
    console.log('GAS にリクエスト送信完了（no-cors）');

  } catch (err) {
    console.error('Injector hook error:', err);
  }

  return event;
});
