(() => {
  'use strict';
  kb.event.on('kb.edit.submit.success', async (event) => {
    try {
      // Saveが成功したら、GASへ appId & recordId を渡す
      const webhook = 'https://script.google.com/macros/s/AKfycbzIGaqaG5Iw2o1CWNHsStgIsQbwTzLBVktLPyiheGKxHEtMVKvIuZ8jBDFIhrB_T6PmLw/exec';
      const payload = {
        appId: event.appId,
        recordId: event.recordId
      };
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return event;
    } catch (e) {
      alert(`GAS呼び出しに失敗：${e?.message || e}`);
      return event;
    }
  });
})();
