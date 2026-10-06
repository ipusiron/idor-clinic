// ui.js
window.App = window.App || {};
(function(){
  const U = App.utils;
  const T = (...args)=>App.i18n.t(...args);

  let toastTimeout;
  let editor = {scenario:'A', profile:'', order:'', body:'', header:'', results:{}};

  function resetEditors(){
    const user = App.session.user;
    const message = App.DB.messages.find(m=>m.recipientId === user?.id);
    editor = {scenario:editor.scenario, profile:String(user?.id || ''),
      order:App.API.listMyOrders()[0]?.id || '',
      body:JSON.stringify({messageId:message?.id || 9001},null,2),
      header:user ? `X-Access-Token: ${App.session.token}` : '', results:{}};
  }

  function toast(msg, kind=''){
    const t = document.getElementById('toast');

    // Clear any existing timeout
    if(toastTimeout) {
      clearTimeout(toastTimeout);
    }

    t.textContent = typeof msg==='string' ? T(msg) : T(msg.key,msg.values);
    t.className = 'toast show ' + (kind||'');

    // Set new timeout
    toastTimeout = setTimeout(()=>{
      t.className='toast';
      toastTimeout = null;
    }, 2200);
  }

  // ログ
  function clearToast(){
    clearTimeout(toastTimeout);
    document.getElementById('toast').className='toast';
    document.getElementById('toast').textContent='';
  }
  function pushLog({kind,msg,values={},ok,req,res}){
    App.logs.unshift({ time: U.now(), mode:App.MODE, user:App.session.user?.username || '-', kind, msg, values, ok, req, res });
    const max = App.core.LIMITS.logs;
    if(App.logs.length>max) App.logs.length = max;
  }

  function renderModeIndicator(){
    const indicator = document.getElementById('modeIndicator');
    if(!indicator) return;
    indicator.replaceChildren();
    const badgeClass = App.MODE === 'SECURE' ? 'mode-badge-secure' : 'mode-badge-vuln';
    indicator.appendChild(U.el('span', {class: badgeClass}, App.MODE));
  }

  function renderLoginBox(){
    const box = document.getElementById('loginBox');
    if(!App.DB){ box.replaceChildren(); return; }
    if(App.session.user){
      box.replaceChildren();
      box.appendChild(U.el('span', {class:'badge'}, `${App.session.user.username}`));
      box.appendChild(U.el('button', {class:'btn-ghost', onclick:()=>App.logout()}, T('logout')));
    } else {
      const sel = U.el('select', {class:'input', id:'loginSelect','aria-label':T('chooseUser')});
      App.DB.users.forEach(u=> sel.appendChild(U.el('option', {value:u.id}, `${u.username} (#${u.id})`)));
      const btn = U.el('button', {class:'btn', onclick:()=>{
        const id = document.getElementById('loginSelect').value;
        App.login(id);
      }}, T('login'));
      box.replaceChildren();
      box.appendChild(sel); box.appendChild(btn);
    }
  }

  // ---------- Pages ----------
  function homePage(){
    const wrap = U.el('div',{class:'grid page-stack'});
    wrap.appendChild(U.el('section',{class:'card'},[
      U.el('h2',{},T('welcome')), U.el('p',{},T('intro')),
      U.el('p',{class:'notice'},T('privacy'))
    ]));
    wrap.appendChild(U.el('section',{class:'card'},[
      U.el('h2',{},T('goals')),
      U.el('ul',{},['goalAuth','goalIds','goalLimit'].map(k=>U.el('li',{},T(k))))
    ]));
    wrap.appendChild(U.el('section',{class:'card'},[
      U.el('h2',{},T('guide')),
      U.el('ol',{},['step1','step2','step3','step4'].map(k=>U.el('li',{},T(k)))),
      U.el('a',{href:'#/app',class:'btn'},T('app'))
    ]));
    wrap.appendChild(U.el('section',{class:'card'},[
      U.el('h2',{},T('scenarios')),
      ...['A','B','C'].map(k=>U.el('div',{class:'item'},[
        U.el('h3',{},T('scenario'+k)), U.el('p',{},T('desc'+k))
      ]))
    ]));
    return wrap;
  }

  function appPage(){
    const container = U.el('div',{class:'grid page-stack'});
    container.appendChild(U.el('section',{class:'card'},[
      U.el('span',{},T('currentMode')),
      U.el('span',{class:App.MODE==='SECURE'?'mode-badge-secure':'mode-badge-vuln'},App.MODE),
      U.el('p',{class:'small'},T('modeHelp')),
      U.el('p',{class:'small'},T(App.MODE==='SECURE'?'secureDetail':'vulnDetail'))
    ]));
    if(!App.session.user) container.appendChild(U.el('div',{class:'login-prompt'},[
      U.el('strong',{},T('loginRequired')), U.el('p',{},T('loginPrompt'))
    ]));
    const tabCard=U.el('section',{class:'card'});
    const tabs=U.el('div',{class:'sub-tabs',role:'tablist','aria-label':T('scenarios')});
    const buttons={}, panels={};
    const config={
      A:{kind:'profile',field:'profile',title:'userId',help:'profileHelp',send:'sendProfile'},
      B:{kind:'order',field:'order',title:'orderId',help:'orderHelp',send:'sendOrder'},
      C:{kind:'message',field:'body',title:'bodyLabel',help:'bodyHelp',send:'sendMessage'}
    };
    for(const scenario of ['A','B','C']){
      const c=config[scenario], id='input-'+scenario;
      buttons[scenario]=U.el('button',{class:'sub-tab',id:'tab-'+scenario,role:'tab',
        'aria-controls':'scenario-'+scenario,onclick:()=>switchTab(scenario),
        onkeydown:e=>{
          const keys=['A','B','C'],i=keys.indexOf(scenario);
          const next=e.key==='ArrowRight'?keys[(i+1)%3]:e.key==='ArrowLeft'?keys[(i+2)%3]:
            e.key==='Home'?'A':e.key==='End'?'C':null;
          if(next){e.preventDefault();switchTab(next);buttons[next].focus();}
        }},T('scenario'+scenario));
      tabs.appendChild(buttons[scenario]);
      const panel=U.el('div',{class:'sub-tab-content',id:'scenario-'+scenario,role:'tabpanel',
        'aria-labelledby':'tab-'+scenario});
      panel.append(U.el('h2',{},T('scenario'+scenario)),U.el('p',{},T('desc'+scenario)));
      panel.append(U.el('label',{for:id},T(c.title)),U.el('p',{class:'help-text',id:id+'-help'},T(c.help)));
      const props={id,class:'input','aria-describedby':id+'-help',
        oninput:e=>{editor[c.field]=e.target.value;}};
      let input;
      if(scenario==='C'){
        input=U.el('textarea',{...props,rows:5,maxlength:App.core.LIMITS.body},editor.body);
      } else {
        input=U.el('input',{...props,type:scenario==='A'?'number':'text',
          value:editor[c.field],list:scenario==='A'?'userIdListA':'orderIdListB',
          maxlength:scenario==='B'?App.core.LIMITS.order:32,
          placeholder:T(!App.session.user?'loginRequired':scenario==='A'?'profilePlaceholder':
            App.MODE==='SECURE'?'tokenPlaceholder':'orderPlaceholder')});
      }
      panel.appendChild(input);
      if(scenario==='A'){
        const list=U.el('datalist',{id:'userIdListA'});
        App.DB.users.forEach(u=>list.appendChild(U.el('option',{value:u.id},u.username)));
        panel.appendChild(list);
      } else if(scenario==='B'){
        const list=U.el('datalist',{id:'orderIdListB'});
        App.API.listMyOrders().forEach(o=>list.appendChild(U.el('option',{value:o.id},o.id)));
        panel.append(list,U.el('p',{class:'small'},T(!App.session.user?'orderLogin':
          App.MODE==='SECURE'?'orderSecure':'orderVuln')),
          U.el('button',{class:'btn-ghost',disabled:!App.session.user,onclick:()=>{
            editor.order=App.API.listMyOrders()[0]?.id||'';input.value=editor.order;
          }},T('ownOrder')));
      } else {
        panel.append(U.el('p',{class:'small'},T('messageTip')),
          U.el('label',{for:'headerInput'},T('headers')),
          U.el('p',{class:'help-text',id:'headerHelp'},T('headerHelp')),
          U.el('input',{id:'headerInput',class:'input',type:'text',value:editor.header,
            maxlength:App.core.LIMITS.header,'aria-describedby':'headerHelp',
            oninput:e=>{editor.header=e.target.value;}}));
        if(!App.session.user) panel.appendChild(U.el('p',{class:'small'},T('tokenLogin')));
      }
      panel.append(U.el('div',{class:'btn-group action-row'},U.el('button',{
        class:'btn',disabled:!App.session.user,onclick:()=>send(scenario)},T(c.send))),
        U.el('hr',{class:'sep'}),U.el('p',{},T('hintLabel')),
        U.el('div',{class:'btn-group'},[1,2,3].map(n=>U.el('button',{
          class:'btn-ghost',disabled:!App.session.user,onclick:()=>hint(scenario,n)},T('hintButton',{n})))));
      panels[scenario]=panel;
    }
    tabCard.append(tabs,...Object.values(panels));
    container.appendChild(tabCard);
    container.appendChild(U.el('div',{class:'split'},[
      U.el('section',{class:'card'},[
        U.el('h2',{},T('request')),U.el('p',{class:'help-text'},T('requestHelp')),
        U.el('pre',{class:'code result-code',id:'reqBox'},T('emptyRequest'))
      ]),
      U.el('section',{class:'card',id:'resCard'},[
        U.el('h2',{},T('response')),U.el('p',{class:'help-text'},T('responseHelp')),
        U.el('div',{id:'statusBadge',role:'status','aria-live':'polite'}),
        U.el('pre',{class:'code result-code',id:'resBox'},T('emptyResponse')),
        U.el('p',{class:'small'},T('lastResult'))
      ])
    ]));
    container.appendChild(U.el('section',{class:'card'},[
      U.el('h2',{},T('scoreLog')),U.el('p',{class:'help-text'},T('scoreHelp')),
      U.el('div',{class:'score-badge',id:'scoreDisplay'},T('score',{score:App.score})),
      U.el('div',{class:'btn-group action-row'},[
        U.el('button',{class:'btn-ghost',id:'clearScore',onclick:()=>{
          App.score=0;App.progress.completed=[];App.progress.hints=[];
          renderLogBox();toast('clearedScore','warn');
        }},T('clearScore')),
        U.el('button',{class:'btn-ghost',id:'clearLogs',onclick:()=>{
          App.logs=[];renderLogBox();toast('clearedLogs','warn');
        }},T('clearLogs')),
        U.el('button',{class:'btn-ghost',id:'clearAll',onclick:()=>{
          App.progress=App.core.newProgress();App.logs=[];resetEditors();
          renderRoute();toast('clearedAll','warn');
        }},T('clearAll'))
      ]),
      U.el('div',{class:'list',id:'logBox'})
    ]));
    function switchTab(scenario){
      editor.scenario=scenario;
      for(const key of ['A','B','C']){
        const active=key===scenario;
        buttons[key].classList.toggle('active',active);
        buttons[key].setAttribute('aria-selected',String(active));
        buttons[key].tabIndex=active?0:-1;
        panels[key].classList.toggle('active',active);
        panels[key].hidden=!active;
      }
      renderResult();
    }
    function renderResult(){
      const box=document.getElementById('statusBadge');
      if(!box) return;
      box.replaceChildren();
      const card=document.getElementById('resCard'), s=editor.results[editor.scenario];
      card.classList.remove('response-success','response-error');
      document.getElementById('reqBox').textContent=s?U.code(s.req):T('emptyRequest');
      document.getElementById('resBox').textContent=s?U.code(s.res):T('emptyResponse');
      if(s){
        box.append(U.el('p',{class:'small'},T('executed',{mode:s.mode,user:s.user,scenario:editor.scenario})),
          U.el('div',{class:'status-badge '+(s.res.status===200?'status-200':'status-error')},'HTTP '+s.res.status));
        card.classList.add(s.res.status===200?'response-success':'response-error');
      }
    }
    function renderLogBox(){
      const box=document.getElementById('logBox');
      if(!box) return;
      box.replaceChildren();
      for(const log of App.logs.slice(0,App.core.LIMITS.visibleLogs)){
        const values={...log.values};
        if(values.scenario) values.scenario=T('scenario'+values.scenario);
        if(values.detailKey) values.detail=T(values.detailKey,{id:values.id});
        box.appendChild(U.el('div',{class:'item'},[
          U.el('div',{},[log.time,log.mode,log.user,log.kind,log.ok?'✓':'!',T(log.msg,values)].join(' / ')),
          log.req?U.el('pre',{class:'code'},U.code(log.req)):null,
          log.res?U.el('pre',{class:'code'},U.code(log.res)):null
        ]));
      }
      document.getElementById('scoreDisplay').textContent=T('score',{score:App.score});
    }
    function send(scenario){
      const c=config[scenario];
      let req,res;
      if(scenario==='A'){
        req={method:'GET',path:'/profile',query:{userId:editor.profile}};
        App.trackAttempt('profile',editor.profile);res=App.API.getProfile(req.query);
      } else if(scenario==='B'){
        const id=editor.order.trim();
        req={method:'GET',path:'/orders/'+id};
        App.trackAttempt('order',id);res=App.API.getOrderByIdSegment(id);
      } else {
        const body=App.core.parseBody(editor.body),headers=App.core.parseHeader(editor.header);
        if(body.error||headers.error){
          req={method:'POST',path:'/api/messages/view',body:editor.body,headers:editor.header};
          res={status:400,error:'Bad Request',reason:headers.error||body.error};
          toast('invalidInput','bad');
        } else {
          req={method:'POST',path:'/api/messages/view',headers:headers.headers,body:body.body};
          App.trackAttempt('message',String(body.body.messageId));
          res=App.API.postViewMessage(body.body,headers.headers);
        }
      }
      const foreign=res.status===200 && App.MODE==='VULN' && App.session.user &&
        res.data[scenario==='A'?'id':scenario==='B'?'ownerId':'recipientId']!==App.session.user.id;
      const suffix=scenario==='A'?'Profile':scenario==='B'?'Order':'Message';
      const msg=res.status===200?(foreign?'success':'retrieved')+suffix:(res.reason||'error');
      if(foreign){
        App.core.complete(App.progress,c.kind,App.MODE,App.session.user.id,res);
        toast(msg,'good');
      }
      pushLog({kind:c.kind,msg,ok:res.status===200,req,res});
      editor.results[scenario]={req,res,mode:App.MODE,user:App.session.user?.username||'-'};
      renderResult();renderLogBox();
    }
    function hint(scenario,n){
      if(!App.session.user) return;
      const kind=config[scenario].kind;
      const id=scenario==='A'?App.DB.users.find(u=>u.id!==App.session.user.id).id:
        scenario==='B'?App.DB.orders.find(o=>o.ownerId!==App.session.user.id).id:
        App.DB.messages.find(m=>m.recipientId!==App.session.user.id).id;
      const detailKey='hint'+(scenario==='A'?'Profile':scenario==='B'?'Order':'Message')+n;
      App.core.hint(App.progress,kind,n);
      toast({key:'hintToast',values:{scenario:T('scenario'+scenario),n,detail:T(detailKey,{id})}},'warn');
      pushLog({kind:'hint',msg:'hintToast',values:{scenario,n,detailKey,id},ok:true});
      renderLogBox();
    }
    container.refresh=()=>{switchTab(editor.scenario);renderLogBox();};
    return container;
  }

  function comparePage(){
    const rows = [
      ['simulatedLogin','required','required'],
      ['ownership','unchecked','ownerRecipient'],
      ['references','sequence','secureReferences'],
      ['messageToken','unchecked','currentToken'],
      ['rateLimit','notImplemented','notImplemented'],
      ['detection','detectionRule','detectionRule']
    ];
    return U.el('section',{class:'card'},[
      U.el('h2',{},T('compareTitle')),
      U.el('table',{class:'comparison-table'},[
        U.el('caption',{class:'sr-only'},T('compareTitle')),
        U.el('thead',{},U.el('tr',{},[
          U.el('th',{scope:'col'},T('item')), U.el('th',{scope:'col'},'VULN'), U.el('th',{scope:'col'},'SECURE')
        ])),
        U.el('tbody',{},rows.map(row=>U.el('tr',{},row.map((key,i)=>
          U.el(i===0?'th':'td',i===0?{scope:'row'}:{},T(key))))))
      ]),
      U.el('p',{class:'notice'},T('idLimit')), U.el('p',{},T('goalLimit'))
    ]);
  }

  function learnPage(){
    const wrap = U.el('div',{class:'grid page-stack'});
    wrap.appendChild(U.el('section',{class:'card'},U.el('h2',{},T('learnTitle'))));
    for(const [title,text] of [['basics','basicsText'],['attacks','attacksText'],
      ['defense','defenseText'],['summary','limitsText']]){
      wrap.appendChild(U.el('details',{class:'accordion'},[
        U.el('summary',{},T(title)), U.el('div',{class:'learning-content'},[
          U.el('p',{},T(text)), ...(title==='defense'?[U.el('p',{},T('idLimit'))]:[]),
          ...(title==='summary'?[U.el('p',{},T('warningText')),U.el('p',{},T('privacy'))]:[])
        ])
      ]));
    }
    wrap.appendChild(U.el('section',{class:'card'},[
      U.el('h2',{},T('referencesTitle')), U.el('p',{},T('useText')),
      U.el('ul',{},[
        U.el('li',{},U.el('a',{
          href:'https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html',
          target:'_blank',rel:'noopener noreferrer'},'OWASP: IDOR Prevention')),
        U.el('li',{},U.el('a',{
          href:'https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/',
          target:'_blank',rel:'noopener noreferrer'},'OWASP: API1:2023 BOLA')),
        U.el('li',{},U.el('a',{href:'https://portswigger.net/web-security/access-control/idor',
          target:'_blank',rel:'noopener noreferrer'},'PortSwigger: IDOR'))
      ])
    ]));
    return wrap;
  }

  function renderRoute(){
    if(!App.DB) return;
    renderLoginBox();
    renderModeIndicator();
    const root = document.getElementById('app');
    const h = location.hash || '#/';
    const route = ['#/app','#/compare','#/learn'].includes(h) ? h : '#/';
    document.querySelectorAll('.nav a').forEach(a=>{
      if(a.getAttribute('href')===route) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    document.getElementById('mode').value=App.MODE;
    let node;
    if(h.startsWith('#/app')) node = appPage();
    else if(h.startsWith('#/compare')) node = comparePage();
    else if(h.startsWith('#/learn')) node = learnPage();
    else node = homePage();
    root.replaceChildren(node);
    node.refresh?.();
  }

  App.ui = { toast, clearToast, pushLog, renderRoute, renderLoginBox, renderModeIndicator, resetEditors };
})();
