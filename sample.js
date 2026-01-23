
(function () {
    'use strict';
  
    /*** ====== 設定エリア ====== ***/
    // 対象アプリID（Boost-injectorは全アプリに差すことがあるので限定しておく）
    const TARGET_APP_IDS = [/* ここに適用したいアプリIDを数値で */];
  
    // 一覧で強調したい条件（例：フィールドコード Status が「資料回収案内」）
    const LIST_HIGHLIGHT_FIELD = 'Status';
    const LIST_HIGHLIGHT_VALUE = '資料回収案内';
    const LIST_HIGHLIGHT_STYLE = 'background: #fff7cc;'; // 薄い黄色
  
    // ヘッダーボタンのラベル
    const BUTTON_LABEL = '🚀 サンプル実行';
  
    /*** ====== ユーティリティ ====== ***/
    const log = (...args) => console.log('[BoostSample]', ...args);
  
    // 現在のアプリID取得（ポータルなどでは undefined になる）
    const getAppIdSafe = () => {
      try { return kintone.app.getId && kintone.app.getId(); } catch { return undefined; }
    };
  
    const shouldRunHere = () => {
      const appId = getAppIdSafe();
      // アプリ未指定なら全アプリで動く。指定があれば一致したときだけ。
      if (!TARGET_APP_IDS || TARGET_APP_IDS.length === 0) return !!appId;
      return TARGET_APP_IDS.includes(Number(appId));
    };
  
    // ヘッダー右上へ「注入中」バッジ
    const injectBadge = (text = 'Boost 注入中') => {
      try {
        const header = kintone.app.getHeaderMenuSpaceElement && kintone.app.getHeaderMenuSpaceElement();
        if (!header) return;
        const id = 'boost-badge';
        if (document.getElementById(id)) return;
        const span = document.createElement('span');
        span.id = id;
        span.textContent = text;
        span.style.cssText = [
          'margin-left:8px',
          'padding:2px 8px',
          'border-radius:12px',
          'background:#2563eb',
          'color:#fff',
          'font-weight:600',
          'font-size:12px'
        ].join(';');
        header.appendChild(span);
      } catch (e) {
        log('injectBadge error', e);
      }
    };
  
    // レコード詳細のヘッダーボタン作成
    const addHeaderButton = (label, onClick) => {
      const space = kintone.app.record.getHeaderMenuSpaceElement && kintone.app.record.getHeaderMenuSpaceElement();
      if (!space) return;
      const id = 'boost-sample-btn';
      if (document.getElementById(id)) return; // 二重追加防止
      const btn = document.createElement('button');
      btn.id = id;
      btn.textContent = label;
      btn.className = 'kintoneplugin-button-normal';
      btn.style.marginLeft = '8px';
      btn.onclick = onClick;
      space.appendChild(btn);
    };
  
    /*** ====== イベントハンドラ ====== ***/
    // レコード詳細表示（/show）
    const onRecordShow = (event) => {
      if (!shouldRunHere()) return event;
      injectBadge();
  
      // ボタンクリックで主要フィールドをサクッと確認（例：レコード番号、文字列、日付など）
      addHeaderButton(BUTTON_LABEL, () => {
        const rec = event.record;
        // 代表的な取り出し方の例：存在すれば表示
        const candidates = [
          { label: 'レコード番号', value: kintone.app.record.getId && kintone.app.record.getId() },
          { label: '文字列(単行)', value: rec.Text ? rec.Text.value : undefined },
          { label: '日付', value: rec.Date ? rec.Date.value : undefined },
          { label: 'ステータス(文字列)', value: rec.Status ? rec.Status.value : undefined },
        ].filter(x => x.value != null && x.value !== '');
  
        const lines = candidates.map(x => `${x.label}: ${x.value}`);
        const msg = lines.length ? lines.join('\n') : '表示できるフィールドが見つかりませんでした。フィールドコードを調整してください。';
        alert(msg);
        log('Record object:', rec);
      });
  
      return event;
    };
  
    // 一覧表示（/list）
    const onIndexShow = async (event) => {
      if (!shouldRunHere()) return event;
      injectBadge('Boost 注入中（一覧）');
  
      try {
        // 一覧テーブルの各行を走査し、条件一致で行背景を変更
        // 行データは event.records に格納
        const records = event.records || [];
        // 一覧のDOMは描画タイミングに差があるので、少し後で実行
        setTimeout(() => {
          // kintoneの一覧は data-rowindex 属性を使って行を特定できる
          const rows = document.querySelectorAll('div.gaia-argoui-app-index-recordlist div.recordlist-row');
          rows.forEach((row) => {
            const idx = Number(row.getAttribute('data-rowindex'));
            if (Number.isNaN(idx)) return;
            const r = records[idx];
            if (!r) return;
  
            const v = r[LIST_HIGHLIGHT_FIELD] && r[LIST_HIGHLIGHT_FIELD].value;
            if (v === LIST_HIGHLIGHT_VALUE) {
              row.style.cssText += `;${LIST_HIGHLIGHT_STYLE}`;
            }
          });
        }, 50);
      } catch (e) {
        log('Index highlight error', e);
      }
  
      return event;
    };
  
    /*** ====== イベント登録 ====== ***/
    kintone.events.on('app.record.detail.show', onRecordShow);
    kintone.events.on('app.record.index.show', onIndexShow);
  
    log('Boost sample script loaded. appId=', getAppIdSafe());
  })();
  