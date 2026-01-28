(() => {
  'use strict';

  kb.event.on('kb.edit.submit.success', async (event) => {
    try {
      // Boost からは appId / recordId だけを渡す（条件判定は GAS 側で再チェック）
      const webhook = 'https://script.google.com/macros/s/AKfycbzIGaqaG5Iw2o1CWNHsStgIsQbwTzLBVktLPyiheGKxHEtMVKvIuZ8jBDFIhrB_T6PmLw/exec';
      const payload = {
        appId: event.appId,
        recordId: event.recordId
      };

      // ← プリフライトを避けるコツ：
      // 1) mode: 'no-cors'
      // 2) ヘッダーを付けない（Content-Type も付けない）
      // 3) body は文字列（デフォルトで text/plain になり “simple request” 相当）
      fetch(webhook, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });

      // no-cors ではレスポンスを読めないので、ここでは結果を扱わない
      return event;
    } catch (e) {
      alert(`GAS呼び出しに失敗：${e?.message || e}`);
      return event;
    }
  });
})();
