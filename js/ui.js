// ui.js
window.App = window.App || {};
(function(){
  const U = App.utils;

  let toastTimeout;

  // Helper function to create help icons with tooltips
  function helpIcon(helpText) {
    return U.el('span',{class:'help-tooltip'},[
      U.el('span',{class:'help-icon'},'?'),
      U.el('span',{class:'help-tooltiptext'},helpText)
    ]);
  }
  function toast(msg, kind=''){
    const t = document.getElementById('toast');

    // Clear any existing timeout
    if(toastTimeout) {
      clearTimeout(toastTimeout);
    }

    t.textContent = msg;
    t.className = 'toast show ' + (kind||'');

    // Set new timeout
    toastTimeout = setTimeout(()=>{
      t.className='toast';
      toastTimeout = null;
    }, 2200);
  }

  // ログ
  function pushLog({kind,msg,ok,req,res}){
    App.logs.unshift({ time: U.now(), kind, msg, ok, req, res });
    const max = 60;
    if(App.logs.length>max) App.logs.length = max;
  }

  function renderModeIndicator(){
    const indicator = document.getElementById('modeIndicator');
    if(!indicator) return;
    indicator.innerHTML = '';
    const badgeClass = App.MODE === 'SECURE' ? 'mode-badge-secure' : 'mode-badge-vuln';
    indicator.appendChild(U.el('span', {class: badgeClass}, App.MODE));
  }

  function renderLoginBox(){
    const box = document.getElementById('loginBox');
    if(!App.DB){ box.innerHTML=''; return; }
    if(App.session.user){
      box.innerHTML = '';
      box.appendChild(U.el('span', {class:'badge'}, `${App.session.user.username}`));
      box.appendChild(U.el('button', {class:'btn-ghost', onclick:()=>App.logout()}, 'Logout'));
    } else {
      const sel = U.el('select', {class:'input', id:'loginSelect'});
      App.DB.users.forEach(u=> sel.appendChild(U.el('option', {value:u.id}, `${u.username} (#${u.id})`)));
      const btn = U.el('button', {class:'btn', onclick:()=>{
        const id = document.getElementById('loginSelect').value;
        App.login(id);
      }}, 'Login');
      box.innerHTML = '';
      box.appendChild(sel); box.appendChild(btn);
    }
  }

  // ---------- Pages ----------
  function homePage(){
    const wrap = U.el('div', {class:'grid', style:'grid-template-columns: 1fr; gap:14px;'});

    // Welcome section
    wrap.appendChild(U.el('div',{class:'card'},[
      U.el('h3',{},'ようこそ — IDOR Clinic 🏥'),
      U.el('p',{style: 'white-space: pre-line;'},'IDOR（不適切な直接オブジェクト参照）は、最も見つけやすく攻撃しやすいWebアプリ脆弱性の一つです。\n本ツールでは、安全な環境でIDOR攻撃を実際に体験し、対策方法を学ぶことができます。'),
      U.el('div',{style:'background:var(--panel-2); padding:12px; border-radius:8px; margin:12px 0;'},[
        U.el('h4',{style:'margin:0 0 8px 0; color:var(--accent);'},'🎯 学習目標'),
        U.el('ul',{style:'margin:8px 0 0 0;'},[
          U.el('li',{},'他人のプロフィール、注文履歴、メッセージを不正閲覧する攻撃手法'),
          U.el('li',{},'URLパラメーター・パス・JSON・ヘッダー改ざんによる権限昇格'),
          U.el('li',{},'脆弱性対策（認可チェック・間接参照・ID設計）の重要性')
        ])
      ]),
      U.el('p',{},[
        'モードを ',
        U.el('span',{class:'badge', style:'background:var(--panel-2); color:var(--bad); border:1px solid var(--bad);'},'VULN'),
        ' と ',
        U.el('span',{class:'badge', style:'background:var(--panel-2); color:var(--good); border:1px solid var(--good);'},'SECURE'),
        ' で切り替えて、同じ攻撃がどう防御されるかを体験しましょう。'
      ]),
      U.el('p',{class:'subtle'},'※ すべての処理はブラウザー内で行われ、データの保存・送信は一切ありません。安心してお使いください。')
    ]));

    // Quick start guide
    wrap.appendChild(U.el('div',{class:'card'},[
      U.el('h3',{},'📋 実践ガイド'),
      U.el('div',{class:'split'},[
        U.el('div',{},[
          U.el('h4',{style:'color:var(--bad); margin-top:0;'},'🔓 STEP 1: 攻撃を試す（VULNモード）'),
          U.el('ol',{},[
            U.el('li',{},[
              U.el('strong',{},'モード設定: '),
              'ヘッダー右上で「VULN」を選択'
            ]),
            U.el('li',{},[
              U.el('strong',{},'ログイン: '),
              'Alice、Bob、Charlieのいずれかでログイン'
            ]),
            U.el('li',{},[
              U.el('strong',{},'攻撃実行: '),
              '「App」タブ → 各シナリオでIDを他人のものに変更 → Send'
            ]),
            U.el('li',{},[
              U.el('strong',{},'結果確認: '),
              'スコア加算 = 攻撃成功（他人データの不正閲覧）'
            ])
          ])
        ]),
        U.el('div',{},[
          U.el('h4',{style:'color:var(--good); margin-top:0;'},'🔒 STEP 2: 防御を確認（SECUREモード）'),
          U.el('ol',{},[
            U.el('li',{},[
              U.el('strong',{},'モード切替: '),
              '「SECURE」に変更'
            ]),
            U.el('li',{},[
              U.el('strong',{},'同じ攻撃: '),
              '先ほどと同じIDで攻撃を再試行'
            ]),
            U.el('li',{},[
              U.el('strong',{},'防御確認: '),
              '403エラーや404エラーで攻撃がブロック'
            ]),
            U.el('li',{},[
              U.el('strong',{},'対策理解: '),
              '「Compare」タブで防御手法を確認'
            ])
          ])
        ])
      ])
    ]));

    // Scenarios overview
    wrap.appendChild(U.el('div',{class:'card'},[
      U.el('h3',{},'🎭 攻撃シナリオ'),
      U.el('div',{class:'split'},[
        U.el('div',{class:'item'},[
          U.el('h4',{style:'margin-top:0; color:var(--accent);'},'A. プロフィール閲覧'),
          U.el('p',{class:'small'},'URLパラメーター userId を変更して他人のプロフィールを不正閲覧'),
          U.el('code',{class:'code', style:'font-size:11px;'},'GET /profile?userId=1002')
        ]),
        U.el('div',{class:'item'},[
          U.el('h4',{style:'margin-top:0; color:var(--accent);'},'B. 注文履歴取得'),
          U.el('p',{class:'small'},'URLパスの注文ID を変更して他人の注文情報を不正取得'),
          U.el('code',{class:'code', style:'font-size:11px;'},'GET /orders/ORD-000102')
        ])
      ]),
      U.el('div',{class:'item'},[
        U.el('h4',{style:'margin-top:0; color:var(--accent);'},'C. メッセージ盗聴'),
        U.el('p',{class:'small'},'JSONボディの messageId とヘッダーを改ざんして他人宛メッセージを盗聴'),
        U.el('code',{class:'code', style:'font-size:11px;'},'POST /api/messages/view\n{"messageId": 9002}')
      ])
    ]));

    // Action buttons
    wrap.appendChild(U.el('div',{class:'card', style:'text-align:center;'},[
      U.el('div',{class:'btn-group', style:'justify-content:center;'},[
        U.el('a',{href:'#/app', class:'btn btn-good'},'🚀 実践開始（App）'),
        U.el('a',{href:'#/learn', class:'btn btn-ghost'},'📚 詳細解説（Learn）'),
        U.el('a',{href:'#/compare', class:'btn btn-ghost'},'⚖️ 対策比較（Compare）')
      ])
    ]));

    return wrap;
  }

  function appPage(){
    const container = U.el('div',{class:'grid', style:'grid-template-columns: 1fr; gap:14px;'});

    // Mode display with color-coded badge
    const modeBadgeClass = App.MODE === 'SECURE' ? 'mode-badge-secure' : 'mode-badge-vuln';
    const modeDisplay = U.el('div',{class:'card'},[
      U.el('span',{}, '現在のモード:'),
      U.el('span',{class:modeBadgeClass}, App.MODE),
      helpIcon('VULNモードは脆弱な状態でIDOR攻撃が成功します。\nSECUREモードは対策済みで攻撃がブロックされます'),
      U.el('div',{class:'small'}, App.MODE==='SECURE'?'（所有者/トークン/検証あり）':'（所有者検証なし）')
    ]);
    container.appendChild(modeDisplay);

    // Login prompt for non-logged in users
    if (!App.session.user) {
      const loginPrompt = U.el('div',{class:'login-prompt'},[
        U.el('strong',{},'⚠️ ログインが必要です'),
        U.el('div',{},'Attack Panelを使用するには、まず右上からログインしてください。')
      ]);
      container.appendChild(loginPrompt);
    }

    // Sub-tabs for scenarios
    const tabsContainer = U.el('div',{class:'card'});
    const subTabs = U.el('div',{class:'sub-tabs'});
    const tabA = U.el('button',{class:'sub-tab active', onclick:()=>switchSubTab('A')}, [
      'A. プロフィール（Query改ざん）',
      helpIcon('URLのクエリパラメーター（?userId=1001）を改ざんして他人のプロフィールを閲覧するシナリオです')
    ]);
    const tabB = U.el('button',{class:'sub-tab', onclick:()=>switchSubTab('B')}, [
      'B. 注文詳細（Path改ざん）',
      helpIcon('URLのパス部分（/orders/ORD-000123）を改ざんして他人の注文を閲覧するシナリオです')
    ]);
    const tabC = U.el('button',{class:'sub-tab', onclick:()=>switchSubTab('C')}, [
      'C. メッセージAPI（Body改ざん）',
      helpIcon('POSTリクエストのボディ（JSON）を改ざんして他人宛のメッセージを閲覧するシナリオです')
    ]);
    subTabs.append(tabA, tabB, tabC);
    tabsContainer.appendChild(subTabs);

    // Content containers for each scenario
    const contentA = createScenarioA();
    const contentB = createScenarioB();
    const contentC = createScenarioC();

    const tabContentA = U.el('div',{class:'sub-tab-content active', id:'scenario-A'});
    tabContentA.appendChild(contentA);
    const tabContentB = U.el('div',{class:'sub-tab-content', id:'scenario-B'});
    tabContentB.appendChild(contentB);
    const tabContentC = U.el('div',{class:'sub-tab-content', id:'scenario-C'});
    tabContentC.appendChild(contentC);

    tabsContainer.append(tabContentA, tabContentB, tabContentC);
    container.appendChild(tabsContainer);

    // Sub-tab switching function
    function switchSubTab(scenario) {
      // Update tab buttons
      tabA.classList.toggle('active', scenario === 'A');
      tabB.classList.toggle('active', scenario === 'B');
      tabC.classList.toggle('active', scenario === 'C');

      // Update content visibility
      tabContentA.classList.toggle('active', scenario === 'A');
      tabContentB.classList.toggle('active', scenario === 'B');
      tabContentC.classList.toggle('active', scenario === 'C');
    }

    // Scenario A: Profile Query Attack
    function createScenarioA() {
      const container = U.el('div',{});

      // Description
      container.appendChild(U.el('div',{class:'card', style:'background:var(--panel-2); margin-bottom:12px;'},[
        U.el('h4',{style:'margin-top:0;'},'シナリオA: プロフィール閲覧（Query改ざん）'),
        U.el('p',{class:'small'},'例: /profile?userId=1001 → 1002 に変更して他人のプロフィールを閲覧')
      ]));

      const attackPanel = U.el('div',{class:'card'});
      attackPanel.appendChild(U.el('h4',{},'Attack Panel'));

      // A: Query (profile) with datalist
      attackPanel.appendChild(U.el('label',{},[
        'userId（ユーザID）',
        helpIcon('プロフィールを閲覧したいユーザのID。\n自分以外のIDを入力してIDOR攻撃を試してください')
      ]));
      const qUserId = U.el('input',{
        class:'input',
        type:'number',
        placeholder: App.session.user ? 'e.g. 1002（他のユーザIDを試してください）' : 'ログインが必要です',
        value: App.session.user?.id ?? '',
        list: 'userIdListA'
      });
      const userDatalist = U.el('datalist',{id:'userIdListA'});
      if(App.DB) {
        App.DB.users.forEach(u => {
          userDatalist.appendChild(U.el('option',{value:u.id}, `${u.username} (#${u.id})`));
        });
      }
      attackPanel.appendChild(qUserId);
      attackPanel.appendChild(userDatalist);

      // Send Profile button for scenario A
      const btnQuery = U.el('button',{class:'btn', style:'margin:8px 0;', onclick: () => onSendProfile(), disabled: !App.session.user},'Send Profile');
      attackPanel.appendChild(btnQuery);

      // Hints for scenario A
      attackPanel.appendChild(U.el('hr',{class:'sep'}));
      attackPanel.appendChild(U.el('label',{},'ヒント（行き詰まった時に使用）'));
      const hintGroupA = U.el('div',{class:'btn-group'});
      const btnHintA1 = U.el('button',{class:'btn-ghost', onclick:()=>hintA(1)},'Hint 1');
      const btnHintA2 = U.el('button',{class:'btn-ghost', onclick:()=>hintA(2)},'Hint 2');
      const btnHintA3 = U.el('button',{class:'btn-ghost', onclick:()=>hintA(3)},'Hint 3');
      hintGroupA.append(btnHintA1, btnHintA2, btnHintA3);
      attackPanel.appendChild(hintGroupA);

      container.appendChild(attackPanel);
      return container;
    }

    // Scenario B: Order Path Attack
    function createScenarioB() {
      const container = U.el('div',{});

      // Description
      container.appendChild(U.el('div',{class:'card', style:'background:var(--panel-2); margin-bottom:12px;'},[
        U.el('h4',{style:'margin-top:0;'},'シナリオB: 注文詳細（Path改ざん）'),
        U.el('p',{class:'small'},'例: /orders/ORD-000123 → ORD-000124 に変更して他人の注文を閲覧')
      ]));

      const attackPanel = U.el('div',{class:'card'});
      attackPanel.appendChild(U.el('h4',{},'Attack Panel'));

      // B: Path (order) with better help
      attackPanel.appendChild(U.el('label',{},[
        'orderId（注文ID）',
        helpIcon('注文詳細を閲覧したい注文ID。\n自分以外の注文IDを入力してIDOR攻撃を試してください')
      ]));
      const myOrders = App.API.listMyOrders();

      if (!App.session.user) {
        attackPanel.appendChild(U.el('div',{class:'small', style:'color:#ffb86b'}, '⚠️ ログインすると自分の注文IDが表示されます'));
      } else {
        const help = App.MODE==='SECURE'
          ? '（SECUREはトークンID。自分の注文のみ一覧に表示）'
          : '（VULNは連番ID。自分の注文から開始し他人IDへ変更）';
        attackPanel.appendChild(U.el('div',{class:'small'}, help));
      }

      const pathInput = U.el('input',{
        class:'input',
        type:'text',
        placeholder: !App.session.user
          ? 'ログインが必要です'
          : (App.MODE==='SECURE' ? 'tok_xxx...（トークンを変更して試す）' : 'ORD-000101（番号を変更して試す）'),
        list: 'orderIdListB'
      });

      const orderDatalist = U.el('datalist',{id:'orderIdListB'});
      if(myOrders.length > 0) {
        pathInput.value = myOrders[0].id;
        myOrders.forEach(o => {
          orderDatalist.appendChild(U.el('option',{value:o.id}, `Your order: ${o.id}`));
        });
      }
      attackPanel.appendChild(pathInput);
      attackPanel.appendChild(orderDatalist);

      // Send Order button for scenario B
      const btnPath = U.el('button',{class:'btn', style:'margin:8px 0;', onclick: () => onSendOrder(), disabled: !App.session.user}, 'Send Order');
      attackPanel.appendChild(btnPath);

      // Hints for scenario B
      attackPanel.appendChild(U.el('hr',{class:'sep'}));
      attackPanel.appendChild(U.el('label',{},'ヒント（行き詰まった時に使用）'));
      const hintGroupB = U.el('div',{class:'btn-group'});
      const btnHintB1 = U.el('button',{class:'btn-ghost', onclick:()=>hintB(1)},'Hint 1');
      const btnHintB2 = U.el('button',{class:'btn-ghost', onclick:()=>hintB(2)},'Hint 2');
      const btnHintB3 = U.el('button',{class:'btn-ghost', onclick:()=>hintB(3)},'Hint 3');
      hintGroupB.append(btnHintB1, btnHintB2, btnHintB3);
      attackPanel.appendChild(hintGroupB);

      container.appendChild(attackPanel);
      return container;
    }

    // Scenario C: Message Body Attack
    function createScenarioC() {
      const container = U.el('div',{});

      // Description
      container.appendChild(U.el('div',{class:'card', style:'background:var(--panel-2); margin-bottom:12px;'},[
        U.el('h4',{style:'margin-top:0;'},'シナリオC: メッセージAPI（Body改ざん）'),
        U.el('p',{class:'small'},'例: {"messageId":9001} → 9002 に変更して他人宛メッセージを閲覧')
      ]));

      const attackPanel = U.el('div',{class:'card'});
      attackPanel.appendChild(U.el('h4',{},'Attack Panel'));

      // C: Body (message) with better placeholder
      attackPanel.appendChild(U.el('label',{},[
        'JSON Body',
        helpIcon('APIに送信するJSONデータ。\nmessageIdを自分以外のメッセージIDに変更してIDOR攻撃を試してください')
      ]));
      const bodyTA = U.el('textarea',{
        class:'input',
        rows:'5',
        placeholder: App.session.user ? '' : 'ログインが必要です'
      },
        JSON.stringify({ messageId: 9001 }, null, 2)
      );
      if(App.session.user) {
        attackPanel.appendChild(U.el('div',{class:'small'}, 'messageIdを9002, 9003などに変更して試してください'));
      }
      attackPanel.appendChild(bodyTA);

      // Headers with better help
      attackPanel.appendChild(U.el('label',{},[
        'Headers（例: X-Access-Token: ...）',
        helpIcon('HTTPヘッダー。\nログイン時にアクセストークンが自動設定されます。\nSECUREモードで認証に使用されます')
      ]));
      if(!App.session.token) {
        attackPanel.appendChild(U.el('div',{class:'small', style:'color:#ffb86b'}, '⚠️ ログインするとアクセストークンが自動設定されます'));
      }
      const hdr = U.el('input',{
        class:'input',
        type:'text',
        placeholder: App.session.token ? '' : 'ログインが必要です',
        value: App.session.token? `X-Access-Token: ${App.session.token}` : ''
      });
      attackPanel.appendChild(hdr);

      // Send Message button for scenario C
      const btnBody = U.el('button',{class:'btn', style:'margin:8px 0;', onclick: () => onSendMsg(), disabled: !App.session.user}, 'Send Message');
      attackPanel.appendChild(btnBody);

      // Hints for scenario C
      attackPanel.appendChild(U.el('hr',{class:'sep'}));
      attackPanel.appendChild(U.el('label',{},'ヒント（行き詰まった時に使用）'));
      const hintGroupC = U.el('div',{class:'btn-group'});
      const btnHintC1 = U.el('button',{class:'btn-ghost', onclick:()=>hintC(1)},'Hint 1');
      const btnHintC2 = U.el('button',{class:'btn-ghost', onclick:()=>hintC(2)},'Hint 2');
      const btnHintC3 = U.el('button',{class:'btn-ghost', onclick:()=>hintC(3)},'Hint 3');
      hintGroupC.append(btnHintC1, btnHintC2, btnHintC3);
      attackPanel.appendChild(hintGroupC);

      container.appendChild(attackPanel);
      return container;
    }

    // Request / Response side by side (shared across all scenarios)
    const rrContainer = U.el('div',{class:'split'});

    const reqCard = U.el('div',{class:'card'},[
      U.el('h3',{},[
        'Request',
        helpIcon('Attack Panelから送信される擬似HTTPリクエストの内容が表示されます')
      ]),
      U.el('pre',{class:'code', id:'reqBox', style:'min-height:150px'},'リクエストがここに表示されます')
    ]);

    const resCard = U.el('div',{class:'card', id:'resCard'},[
      U.el('h3',{},[
        'Response',
        helpIcon('擬似サーバからのレスポンス。\n200=成功、403=認可失敗、404=見つからない。\nVULNモードで他人データが取得できればIDOR成功です')
      ]),
      U.el('div',{id:'statusBadge'}),
      U.el('pre',{class:'code', id:'resBox', style:'min-height:150px'},'レスポンスがここに表示されます')
    ]);

    rrContainer.append(reqCard, resCard);
    container.appendChild(rrContainer);

    // Score & Log with tooltip
    const scoreCard = U.el('div',{class:'card'},[
      U.el('div',{style:'display:flex; justify-content:space-between; align-items:center;'},[
        U.el('h3',{style:'margin:0'},[
          'Score & Log',
          helpIcon('IDOR攻撃の成功/失敗とヒント使用の履歴。\n成功+100点、ヒント-30点、検知-50点')
        ]),
        U.el('div',{style:'display:flex; gap:4px;'},[
          U.el('button',{class:'btn-ghost', style:'padding:4px 8px; font-size:12px;', onclick:()=>clearScore()}, 'Clear score'),
          U.el('button',{class:'btn-ghost', style:'padding:4px 8px; font-size:12px;', onclick:()=>clearLogs()}, 'Clear logs'),
          U.el('button',{class:'btn-ghost', style:'padding:4px 8px; font-size:12px;', onclick:()=>clearBoth()}, 'Clear all')
        ])
      ]),
      U.el('div',{style:'margin-top:8px;'},[
        U.el('span',{class:'tooltip'},[
          U.el('span',{class:'score-badge', id:'scoreDisplay'}, `Score: ${App.score}`),
          U.el('span',{class:'tooltiptext'}, '成功: +100点\nヒント使用: -30点\n疑似検知: -50点\n\n他人のデータにアクセスできたら成功です！')
        ])
      ]),
      U.el('div',{id:'logBox', class:'list', style:'margin-top:8px;'})
    ]);

    container.appendChild(scoreCard);

    return container;

    // ---- handlers ----
    function setReqRes(req, res){
      document.getElementById('reqBox').textContent = U.code(req);
      document.getElementById('resBox').textContent = U.code(res);

      // Add status badge
      const statusBadge = document.getElementById('statusBadge');
      statusBadge.innerHTML = '';
      const statusClass = res.status === 200 ? 'status-200' : (res.status === 403 || res.status === 404 ? 'status-403' : '');
      statusBadge.appendChild(U.el('div',{class:`status-badge ${statusClass}`}, `HTTP ${res.status}`));

      // Add colored border to response card
      const resCard = document.getElementById('resCard');
      if(res.status === 200) {
        resCard.classList.add('response-success');
        resCard.classList.remove('response-error');
      } else {
        resCard.classList.add('response-error');
        resCard.classList.remove('response-success');
      }

      renderLogBox();
    }
    function renderLogBox(){
      const lb = document.getElementById('logBox');
      lb.innerHTML = '';
      App.logs.slice(0,12).forEach(L=>{
        lb.appendChild(U.el('div',{class:'item'},[
          U.el('div',{},`${L.time}  ${L.kind}  ${L.ok?'✅':'❌'}  ${L.msg||''}`),
          L.req ? U.el('pre',{class:'code'}, U.code(L.req)) : null,
          L.res ? U.el('pre',{class:'code'}, U.code(L.res)) : null,
        ]));
      });
      // スコア表示更新
      const scoreBadge = document.getElementById('scoreDisplay');
      if(scoreBadge) scoreBadge.textContent = `Score: ${App.score}`;
    }

    function onSendProfile(){
      const userIdInput = document.querySelector('input[list="userIdListA"]');
      const userId = Number(userIdInput?.value||0);
      const req = { method:'GET', path:'/profile', query:{ userId } };
      App.trackAttempt('profile', userId);
      const res = App.API.getProfile(req.query);
      // 成功条件（VULNで他人が見えたら加点）
      let ok = false, msg='';
      if(res.status===200){
        ok = true;
        if(App.MODE==='VULN' && App.session.user && res.data.id !== App.session.user.id){
          App.score += 100;
          msg = 'IDOR成功（他人プロフィール表示）';
          toast(msg,'good');
        }else{
          msg = 'プロフィール取得';
        }
      } else msg = res.error || 'Error';
      pushLog({kind:'profile', msg, ok:res.status===200, req, res});
      setReqRes(req,res);
    }

    function onSendOrder(){
      const orderIdInput = document.querySelector('input[list="orderIdListB"]');
      const orderId = String(orderIdInput?.value||'').trim();
      const req = { method:'GET', path:`/orders/${orderId}` };
      App.trackAttempt('order', orderId);
      const res = App.API.getOrderByIdSegment(orderId);
      let msg='', ok=false;
      if(res.status===200){
        ok=true;
        if(App.MODE==='VULN' && App.session.user && res.data.ownerId !== App.session.user.id){
          App.score += 100;
          msg = 'IDOR成功（他人の注文閲覧）';
          toast(msg,'good');
        }else{
          msg = '注文取得';
        }
      } else msg = res.error || 'Error';
      pushLog({kind:'order', msg, ok, req, res});
      setReqRes(req,res);
    }

    function onSendMsg(){
      const bodyTA = document.querySelector('#scenario-C textarea');
      const hdrInput = document.querySelector('#scenario-C input[type="text"]');

      // Headers
      const headers = {};
      const line = (hdrInput?.value||'').trim();
      if(line){
        const i = line.indexOf(':');
        if(i>0){
          const k = line.slice(0,i).trim();
          const v = line.slice(i+1).trim();
          headers[k] = v;
        }
      }
      // Body
      let body;
      try{ body = JSON.parse(bodyTA?.value||'{}'); }
      catch(e){ toast('JSONが不正です','bad'); return; }

      const req = { method:'POST', path:'/api/messages/view', headers, body };
      App.trackAttempt('message', String(body.messageId));
      const res = App.API.postViewMessage(body, headers);
      let msg='', ok=false;
      if(res.status===200){
        ok=true;
        if(App.MODE==='VULN' && App.session.user && res.data.recipientId !== App.session.user.id){
          App.score += 100;
          msg = 'IDOR成功（他人宛メッセージ閲覧）';
          toast(msg,'good');
        }else{
          msg='メッセージ取得';
        }
      }else msg = res.error || 'Error';
      pushLog({kind:'message', msg, ok, req, res});
      setReqRes(req,res);
    }

    function hintA(n){
      const msgs = [
        'userIdを自分以外に変えると他人のプロフィールが見えるかも…',
        '自分のID±1を試してみてください（例：1001→1002）',
        '1002を入力してSend Profileを押してください'
      ];
      App.score = Math.max(0, App.score - 30);
      toast(`プロフィールのヒント ${n}: ${msgs[n-1]}`, 'warn');
      pushLog({kind:'hint', msg:`プロフィールヒント ${n}`, ok:true});
      renderLogBox();
    }

    function hintB(n){
      // Get current user's order ID for better hints
      const myOrders = App.API.listMyOrders();
      const currentUserId = App.session.user?.id;

      let hint3 = 'ORD-000102を入力してSend Orderを押してください'; // Default for others

      // Provide specific valid IDs based on current user
      if (currentUserId === 1001) {
        hint3 = 'ORD-000102を入力してSend Orderを押してください（Bobの注文）';
      } else if (currentUserId === 1002) {
        hint3 = 'ORD-000101を入力してSend Orderを押してください（Aliceの注文）';
      } else if (currentUserId === 1003) {
        hint3 = 'ORD-000101を入力してSend Orderを押してください（Aliceの注文）';
      }

      const msgs = [
        '注文IDの末尾番号を変えると他人の注文が見えるかも…',
        '末尾の数字を変更してみてください（例：ORD-000101→ORD-000102）',
        hint3
      ];
      App.score = Math.max(0, App.score - 30);
      toast(`注文のヒント ${n}: ${msgs[n-1]}`, 'warn');
      pushLog({kind:'hint', msg:`注文ヒント ${n}`, ok:true});
      renderLogBox();
    }

    function hintC(n){
      const msgs = [
        'messageIdを別の番号に変えると他人宛メッセージが見えるかも…',
        '9001を9002に変更してみてください',
        '{"messageId":9002}を入力してSend Messageを押してください'
      ];
      App.score = Math.max(0, App.score - 30);
      toast(`メッセージのヒント ${n}: ${msgs[n-1]}`, 'warn');
      pushLog({kind:'hint', msg:`メッセージヒント ${n}`, ok:true});
      renderLogBox();
    }

    function clearScore(){
      App.score = 0;
      const scoreBadge = document.getElementById('scoreDisplay');
      if(scoreBadge) scoreBadge.textContent = `Score: ${App.score}`;
      toast('スコアをクリアしました', 'warn');
    }

    function clearLogs(){
      App.logs = [];
      renderLogBox();
      toast('ログをクリアしました', 'warn');
    }

    function clearBoth(){
      App.score = 0;
      App.logs = [];
      const scoreBadge = document.getElementById('scoreDisplay');
      if(scoreBadge) scoreBadge.textContent = `Score: ${App.score}`;
      renderLogBox();
      toast('スコアとログをクリアしました', 'warn');
    }

    return grid;
  }

  function comparePage(){
    const wrap = U.el('div',{class:'grid', style:'grid-template-columns:1fr; gap:14px;'});

    // Proper table structure for VULN vs SECURE comparison
    const tableCard = U.el('div',{class:'card'},[
      U.el('h3',{},'VULN vs SECURE 比較表'),
      U.el('table',{class:'comparison-table', style:'width:100%; border-collapse: collapse;'},[
        U.el('thead',{},[
          U.el('tr',{},[
            U.el('th',{style:'text-align:left; padding:8px 12px; border-bottom:2px solid var(--border); background:var(--panel-2);'},'項目'),
            U.el('th',{style:'text-align:left; padding:8px 12px; border-bottom:2px solid var(--border); background:var(--panel-2); color:var(--bad);'},'VULN（脆弱）'),
            U.el('th',{style:'text-align:left; padding:8px 12px; border-bottom:2px solid var(--border); background:var(--panel-2); color:var(--good);'},'SECURE（安全）')
          ])
        ]),
        U.el('tbody',{},[
          U.el('tr',{},[
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); font-weight:600;'},'所有者照合'),
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); color:var(--bad);'},'なし'),
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); color:var(--good);'},'resource.ownerId === session.user.id')
          ]),
          U.el('tr',{},[
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); font-weight:600;'},'参照方法'),
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); color:var(--bad);'},'直接参照'),
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); color:var(--good);'},'間接参照（/me, token）')
          ]),
          U.el('tr',{},[
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); font-weight:600;'},'ID性質'),
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); color:var(--bad);'},'連番・推測可'),
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); color:var(--good);'},'ランダム・推測困難')
          ]),
          U.el('tr',{},[
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); font-weight:600;'},'レート制限'),
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); color:var(--bad);'},'なし'),
            U.el('td',{style:'padding:8px 12px; border-bottom:1px solid var(--border); color:var(--good);'},'短期間多試行でブロック（擬似）')
          ]),
          U.el('tr',{},[
            U.el('td',{style:'padding:8px 12px; font-weight:600;'},'監査・検知'),
            U.el('td',{style:'padding:8px 12px; color:var(--bad);'},'なし'),
            U.el('td',{style:'padding:8px 12px; color:var(--good);'},'多対象連続試行を警告')
          ])
        ])
      ])
    ]);

    wrap.appendChild(tableCard);
    wrap.appendChild(U.el('div',{class:'card'},[
      U.el('h3',{},'Tips'),
      U.el('ul',{},[
        U.el('li',{},'SECUREではプロフィールは /profile?userId=... を信頼せず、ログインユーザのみ許可'),
        U.el('li',{},'SECUREの注文IDはトークン表示。推測で他人注文を当てられない'),
        U.el('li',{},'SECUREのメッセージはアクセストークン必須＋受信者チェック')
      ])
    ]));
    return wrap;
  }

  function learnPage(){
    const wrap = U.el('div',{class:'grid', style:'grid-template-columns:1fr; gap:14px;'});

    // Page title
    wrap.appendChild(U.el('div',{class:'card'},[
      U.el('h3',{},'📚 IDOR完全学習ガイド'),
      U.el('p',{},'不適切な直接オブジェクト参照（IDOR）について、基礎から実践的な攻撃手法、防御策まで体系的に学習しましょう。')
    ]));

    // Accordion sections
    wrap.appendChild(createAccordion('📖 1. 基本概念', 'basics', [
      U.el('h4',{},'IDORとは？'),
      U.el('p',{},'IDOR（Insecure Direct Object Reference）は、アプリケーションが認可チェック不十分のままクライアントからの直接オブジェクト参照を許可してしまう脆弱性です。'),
      U.el('div',{class:'split'},[
        U.el('div',{},[
          U.el('h5',{style:'color:var(--accent);'},'🔍 特徴'),
          U.el('ul',{},[
            U.el('li',{},'OWASP Top 10の常連脆弱性'),
            U.el('li',{},'発見・悪用が容易'),
            U.el('li',{},'権限昇格の原因となる'),
            U.el('li',{},'個人情報漏洩リスクが高い')
          ])
        ]),
        U.el('div',{},[
          U.el('h5',{style:'color:var(--accent);'},'📊 権限昇格の種類'),
          U.el('ul',{},[
            U.el('li',{},[U.el('strong',{},'水平的権限昇格: '),'同レベルユーザの情報にアクセス']),
            U.el('li',{},[U.el('strong',{},'垂直的権限昇格: '),'上位権限（管理者等）の機能を実行'])
          ])
        ])
      ]),
      U.el('div',{class:'code'},[
        '脆弱な例:\n',
        'GET /user/profile?id=123  ← IDを変更するだけで他人の情報が見える\n',
        'GET /admin/users?id=456   ← 一般ユーザが管理者機能にアクセス'
      ]),
      U.el('div',{style:'background:var(--panel-2); padding:12px; border-radius:8px; margin:12px 0;'},[
        U.el('h5',{style:'margin:0 0 8px 0; color:var(--warn);'},'⚠️ 実際の被害例'),
        U.el('ul',{style:'margin:8px 0 0 0;'},[
          U.el('li',{},'Facebook: 他人の写真や個人情報への不正アクセス'),
          U.el('li',{},'Instagram: 非公開アカウントの投稿閲覧'),
          U.el('li',{},'各種ECサイト: 他人の注文履歴・決済情報漏洩')
        ])
      ])
    ]));

    wrap.appendChild(createAccordion('⚔️ 2. 攻撃手法', 'attacks', [
      U.el('h4',{},'具体的な攻撃パターン'),
      U.el('div',{class:'split'},[
        U.el('div',{},[
          U.el('h5',{style:'color:var(--bad);'},'🎯 URLパラメーター改ざん'),
          U.el('p',{},'最も基本的な攻撃手法です。'),
          U.el('div',{class:'code'},[
            '正常:\n',
            'GET /profile?userId=1001\n\n',
            '攻撃:\n',
            'GET /profile?userId=1002  ← 他人のID\n',
            'GET /profile?userId=1003  ← さらに他人のID'
          ]),
          U.el('h5',{style:'color:var(--bad);'},'📂 URLパス改ざん'),
          U.el('div',{class:'code'},[
            '正常:\n',
            'GET /orders/ORD-000101\n\n',
            '攻撃:\n',
            'GET /orders/ORD-000102  ← 他人の注文\n',
            'GET /orders/ORD-000103  ← 連番で総当たり'
          ])
        ]),
        U.el('div',{},[
          U.el('h5',{style:'color:var(--bad);'},'📝 POSTボディ改ざん'),
          U.el('div',{class:'code'},[
            '正常:\n',
            'POST /api/messages/view\n',
            '{"messageId": 9001}\n\n',
            '攻撃:\n',
            'POST /api/messages/view\n',
            '{"messageId": 9002}  ← 他人宛メッセージ'
          ]),
          U.el('h5',{style:'color:var(--bad);'},'🏷️ ヘッダー改ざん'),
          U.el('div',{class:'code'},[
            '攻撃例:\n',
            'X-User-ID: 1002\n',
            'X-Role: admin\n',
            'Authorization: Bearer others_token'
          ])
        ])
      ]),
      U.el('div',{style:'background:var(--panel-2); padding:12px; border-radius:8px; margin:12px 0;'},[
        U.el('h5',{style:'margin:0 0 8px 0; color:var(--accent);'},'🔍 攻撃者の手順'),
        U.el('ol',{style:'margin:8px 0 0 0;'},[
          U.el('li',{},'正常なリクエストでIDの形式を把握'),
          U.el('li',{},'IDの規則性を分析（連番、UUID、ランダム文字列等）'),
          U.el('li',{},'他のIDに変更してリクエスト送信'),
          U.el('li',{},'レスポンスで情報漏洩を確認'),
          U.el('li',{},'自動化ツールで大量のIDを試行')
        ])
      ]),
      U.el('h4',{},'攻撃の自動化'),
      U.el('p',{},'手動攻撃は効率が悪いため、攻撃者は通常ツールを使用します：'),
      U.el('ul',{},[
        U.el('li',{},[U.el('strong',{},'Burp Suite: '),'プロキシツールで自動的にIDを変更・送信']),
        U.el('li',{},[U.el('strong',{},'OWASP ZAP: '),'無料のセキュリティスキャナー']),
        U.el('li',{},[U.el('strong',{},'カスタムスクリプト: '),'Python等で大量IDを総当たり'])
      ])
    ]));

    wrap.appendChild(createAccordion('🛡️ 3. 防御策', 'defense', [
      U.el('h4',{},'根本的対策'),
      U.el('div',{class:'split'},[
        U.el('div',{},[
          U.el('h5',{style:'color:var(--good);'},'✅ 認可チェック'),
          U.el('p',{},'最も重要な対策です。'),
          U.el('div',{class:'code'},[
            '// 悪い例\n',
            'function getProfile(userId) {\n',
            '  return db.users.find(userId);\n',
            '}\n\n',
            '// 良い例\n',
            'function getProfile(userId, currentUser) {\n',
            '  if (userId !== currentUser.id) {\n',
            '    throw new ForbiddenError();\n',
            '  }\n',
            '  return db.users.find(userId);\n',
            '}'
          ])
        ]),
        U.el('div',{},[
          U.el('h5',{style:'color:var(--good);'},'🔗 間接参照'),
          U.el('p',{},'直接IDを使わない設計。'),
          U.el('div',{class:'code'},[
            '// 直接参照（危険）\n',
            'GET /profile?userId=123\n\n',
            '// 間接参照（安全）\n',
            'GET /profile/me\n',
            'GET /profile  // セッションから自動取得'
          ])
        ])
      ]),
      U.el('h4',{},'追加的対策'),
      U.el('div',{class:'split'},[
        U.el('div',{},[
          U.el('h5',{style:'color:var(--accent);'},'🎲 ID設計'),
          U.el('ul',{},[
            U.el('li',{},[U.el('strong',{},'UUID使用: '),'推測困難なランダムID']),
            U.el('li',{},[U.el('strong',{},'トークン化: '),'内部IDを外部に露出させない']),
            U.el('li',{},[U.el('strong',{},'暗号化ID: '),'可逆的だが推測不可'])
          ]),
          U.el('div',{class:'code'},[
            '// 推測可能（危険）\n',
            'user_id: 1001, 1002, 1003...\n\n',
            '// 推測困難（安全）\n',
            'user_id: f47ac10b-58cc-4372-a567-0e02b2c3d479'
          ])
        ]),
        U.el('div',{},[
          U.el('h5',{style:'color:var(--accent);'},'🚦 監視・制限'),
          U.el('ul',{},[
            U.el('li',{},[U.el('strong',{},'レート制限: '),'短時間の大量リクエストを制限']),
            U.el('li',{},[U.el('strong',{},'監査ログ: '),'異常なアクセスパターンを記録']),
            U.el('li',{},[U.el('strong',{},'アラート: '),'権限エラー多発時に通知'])
          ])
        ])
      ]),
      U.el('div',{style:'background:var(--good-bg, var(--panel-2)); padding:12px; border-radius:8px; margin:12px 0; border-left:4px solid var(--good);'},[
        U.el('h5',{style:'margin:0 0 8px 0; color:var(--good);'},'💡 ベストプラクティス'),
        U.el('ul',{style:'margin:8px 0 0 0;'},[
          U.el('li',{},'デフォルトでアクセス拒否（Whitelist方式）'),
          U.el('li',{},'最小権限の原則'),
          U.el('li',{},'定期的なセキュリティテスト'),
          U.el('li',{},'開発者教育の徹底')
        ])
      ])
    ]));

    wrap.appendChild(createAccordion('📋 4. まとめ', 'summary', [
      U.el('h4',{},'IDOR対策チェックリスト'),
      U.el('div',{class:'split'},[
        U.el('div',{},[
          U.el('h5',{style:'color:var(--accent);'},'🔍 設計・開発段階'),
          U.el('ul',{},[
            U.el('li',{},'☐ 全リソースアクセスに認可チェック実装'),
            U.el('li',{},'☐ 間接参照の採用検討'),
            U.el('li',{},'☐ 推測困難なID設計'),
            U.el('li',{},'☐ セキュリティレビュー実施')
          ]),
          U.el('h5',{style:'color:var(--accent);'},'🧪 テスト段階'),
          U.el('ul',{},[
            U.el('li',{},'☐ IDパラメーター改ざんテスト'),
            U.el('li',{},'☐ 異なる権限レベルでのテスト'),
            U.el('li',{},'☐ 自動化ツールでの脆弱性スキャン')
          ])
        ]),
        U.el('div',{},[
          U.el('h5',{style:'color:var(--accent);'},'🚀 運用段階'),
          U.el('ul',{},[
            U.el('li',{},'☐ レート制限の設定'),
            U.el('li',{},'☐ 監査ログの有効化'),
            U.el('li',{},'☐ 異常検知システムの導入'),
            U.el('li',{},'☐ 定期的なペネトレーションテスト')
          ]),
          U.el('h5',{style:'color:var(--accent);'},'📚 継続的改善'),
          U.el('ul',{},[
            U.el('li',{},'☐ セキュリティ情報の収集'),
            U.el('li',{},'☐ チーム教育の実施'),
            U.el('li',{},'☐ インシデント対応計画の策定')
          ])
        ])
      ]),
      U.el('div',{style:'background:var(--warn-bg, var(--panel-2)); padding:12px; border-radius:8px; margin:12px 0; border-left:4px solid var(--warn);'},[
        U.el('h5',{style:'margin:0 0 8px 0; color:var(--warn);'},'⚖️ 法的・倫理的な注意'),
        U.el('ul',{style:'margin:8px 0 0 0;'},[
          U.el('li',{},'他人のシステムへの無許可アクセスは犯罪行為です'),
          U.el('li',{},'学習は必ず自分の環境または許可された環境で行う'),
          U.el('li',{},'発見した脆弱性は適切に報告する（責任ある開示）'),
          U.el('li',{},'知識は防御のために使用し、悪用しない')
        ])
      ]),
      U.el('h4',{},'🎯 学習の次のステップ'),
      U.el('div',{class:'btn-group'},[
        U.el('a',{href:'#/app', class:'btn btn-good'},'実践練習（App）'),
        U.el('a',{href:'#/compare', class:'btn btn-ghost'},'対策比較（Compare）'),
        U.el('a',{href:'https://owasp.org/www-project-top-ten/', target:'_blank', rel:'noopener noreferrer', class:'btn btn-ghost'},'OWASP Top 10')
      ])
    ]));

    // Legal notice
    wrap.appendChild(U.el('div',{class:'card', style:'background:var(--panel-2); border:2px solid var(--border);'},[
      U.el('p',{style:'margin:0; color:var(--muted); text-align:center;'},[
        '📢 本ツールは教育目的のシミュレーターです。実際のシステムへの攻撃は法的責任を問われる可能性があります。',
        U.el('br'),
        '学習した知識は防御目的でのみ使用してください。'
      ])
    ]));

    return wrap;
  }

  // Helper function to create accordion
  function createAccordion(title, id, content) {
    return U.el('div', {class: 'accordion'}, [
      U.el('button', {
        class: 'accordion-header',
        onclick: `toggleAccordion('${id}')`
      }, [
        U.el('span', {}, title),
        U.el('span', {class: 'accordion-icon'}, '▼')
      ]),
      U.el('div', {
        class: 'accordion-content',
        id: `accordion-${id}`
      }, content)
    ]);
  }

  // Accordion toggle function
  window.toggleAccordion = function(id) {
    const content = document.getElementById(`accordion-${id}`);
    const header = content.previousElementSibling;

    if (content.classList.contains('active')) {
      content.classList.remove('active');
      header.classList.remove('active');
    } else {
      content.classList.add('active');
      header.classList.add('active');
    }
  }

  function renderRoute(){
    renderLoginBox();
    renderModeIndicator();
    const root = document.getElementById('app');
    const h = location.hash || '#/';
    let node;
    if(h.startsWith('#/app')) node = appPage();
    else if(h.startsWith('#/compare')) node = comparePage();
    else if(h.startsWith('#/learn')) node = learnPage();
    else node = homePage();
    root.innerHTML = ''; root.appendChild(node);
  }

  App.ui = { toast, pushLog, renderRoute, renderLoginBox, renderModeIndicator };
})();
