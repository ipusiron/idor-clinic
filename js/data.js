// data.js
window.App = window.App || {};
(function(){
  const U = App.utils;

  // 内蔵デフォルトデータ（fetch失敗時に使用）
  const defaultUsers = [
    { id:1001, username:'alice', name:'Alice A.', email:'alice@example.com', role:'user' },
    { id:1002, username:'bob',   name:'Bob B.',   email:'bob@example.com',   role:'user' },
    { id:1003, username:'carol', name:'Carol C.', email:'carol@example.com', role:'user' }
  ];
  const defaultOrders = [
    { id:'ORD-000101', ownerId:1001, items:[{sku:'A-1', name:'USB Key', qty:1, price:1200}], total:1200 },
    { id:'ORD-000102', ownerId:1002, items:[{sku:'B-2', name:'VPN Plan', qty:1, price:5800}], total:5800 },
    { id:'ORD-000103', ownerId:1003, items:[{sku:'C-7', name:'Yubikey', qty:2, price:4800}], total:9600 },
    { id:'ORD-000104', ownerId:1001, items:[{sku:'D-9', name:'Lock Picks', qty:1, price:3200}], total:3200 },
    { id:'ORD-000105', ownerId:1002, items:[{sku:'E-3', name:'Pentest Book', qty:1, price:4200}], total:4200 },
    { id:'ORD-000106', ownerId:1003, items:[{sku:'F-5', name:'CTF Ticket', qty:3, price:2500}], total:7500 }
  ];
  const defaultMessages = [
    { id:9001, senderId:1002, recipientId:1001, subject:'Hello Alice', body:'Meet up for coffee?', createdAt:'2025-09-01T09:00:00Z' },
    { id:9002, senderId:1001, recipientId:1002, subject:'Re: Hello', body:'Sure, tomorrow works.', createdAt:'2025-09-01T10:10:00Z' },
    { id:9003, senderId:1003, recipientId:1001, subject:'Admin Note', body:'Please rotate your tokens.', createdAt:'2025-09-02T08:30:00Z' },
    { id:9004, senderId:1001, recipientId:1003, subject:'Ping', body:'Are you joining the study group?', createdAt:'2025-09-03T12:00:00Z' },
    { id:9005, senderId:1002, recipientId:1003, subject:'FYI', body:'New policy on access control.', createdAt:'2025-09-04T15:50:00Z' }
  ];

  async function tryFetch(path){
    const res = await fetch(path).catch(()=>null);
    if(!res || !res.ok) throw new Error('fetch-failed');
    return res.json();
  }

  async function loadDB(){
    // data/*.json を試し、失敗したら内蔵データへフォールバック
    let users = defaultUsers, orders = defaultOrders, messages = defaultMessages;
    try {
      const [u,o,m] = await Promise.all([
        tryFetch('./data/users.json'),
        tryFetch('./data/orders.json'),
        tryFetch('./data/messages.json'),
      ]);
      users = u; orders = o; messages = m;
    } catch(e){
      console.warn('[IDOR Clinic] Falling back to embedded data (file load failed).');
    }
    // トークンマップ（SECURE用: seqID -> token）
    const tokenMap = new Map();
    const reverseToken = new Map();
    orders.forEach(ord=>{
      const tok = U.randToken(18);
      tokenMap.set(ord.id, tok);
      reverseToken.set(tok, ord.id);
    });

    App.DB = { users, orders, messages, tokenMap, reverseToken };
    App.score = 0;
    App.attempts = [];
    App.logs = [];
  }

  // 検知（擬似）
  function trackAttempt(kind, target){
    App.attempts.push({ t: Date.now(), kind, target });
    const recent = App.attempts.filter(a => Date.now() - a.t < 8000);
    const distinctTargets = new Set(recent.map(a=>a.target));
    if(recent.length > 8 || distinctTargets.size > 5){
      App.score = Math.max(0, App.score - 50);
      App.ui.toast('Suspicious pattern detected', 'warn');
      App.ui.pushLog({ kind:'detect', msg:'Suspicious pattern detected', ok:false });
    }
  }

  App.loadDB = loadDB;
  App.trackAttempt = trackAttempt;
})();
