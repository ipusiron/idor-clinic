// api.js
window.App = window.App || {};
(function(){
  const U = App.utils;

  function sanitizeUser(u){
    // 実際には最小化するが、学習用に一部残す
    return { id:u.id, username:u.username, name:u.name, email:u.email, role:u.role };
  }

  // /profile?userId=...
  function getProfile(query){
    const qid = Number(query.userId);
    const target = App.DB.users.find(u=>u.id===qid);
    if(!target) return { status:404, error:'Not Found' };

    if(App.MODE==='SECURE'){
      // 所有者強制：クエリは無視して現在ユーザのみ閲覧可
      if(!App.session.user) return { status:401, error:'Unauthorized' };
      if(App.session.user.id !== qid){
        return { status:403, error:'Forbidden (owner mismatch)' };
      }
    }
    return { status:200, data: sanitizeUser(target) };
  }

  // /orders/:id   (VULN: seqID, SECURE: tokenID)
  function getOrderByIdSegment(idSegment){
    if(App.MODE==='SECURE'){
      // token -> seqID へ逆引き
      const seqId = App.DB.reverseToken.get(idSegment);
      if(!seqId) return { status:404, error:'Not Found (invalid token)' };
      const ord = App.DB.orders.find(o=>o.id===seqId);
      if(!ord) return { status:404, error:'Not Found' };
      if(!App.session.user) return { status:401, error:'Unauthorized' };
      if(ord.ownerId !== App.session.user.id) return { status:403, error:'Forbidden (owner mismatch)' };
      return { status:200, data: ord };
    } else {
      const ord = App.DB.orders.find(o=>o.id===idSegment);
      if(!ord) return { status:404, error:'Not Found' };
      // VULN: 所有者チェックなし
      return { status:200, data: ord };
    }
  }

  // POST /api/messages/view  body: { messageId } headers: { X-Access-Token? }
  function postViewMessage(body, headers={}){
    const id = Number(body?.messageId);
    const msg = App.DB.messages.find(m=>m.id===id);
    if(!msg) return { status:404, error:'Not Found' };

    if(App.MODE==='SECURE'){
      if(!App.session.user) return { status:401, error:'Unauthorized' };
      const token = headers['X-Access-Token'];
      if(!token || token !== App.session.token){
        return { status:401, error:'Unauthorized (token required)' };
      }
      if(msg.recipientId !== App.session.user.id){
        return { status:403, error:'Forbidden (recipient mismatch)' };
      }
    }
    return { status:200, data: msg };
  }

  function listMyOrders(){
    if(!App.session.user) return [];
    if(App.MODE==='SECURE'){
      // 自分の注文をトークンIDで見せる
      return App.DB.orders.filter(o=>o.ownerId===App.session.user.id)
        .map(o=>({ id: App.DB.tokenMap.get(o.id), original:o.id, total:o.total }));
    } else {
      return App.DB.orders.filter(o=>o.ownerId===App.session.user.id)
        .map(o=>({ id: o.id, total:o.total }));
    }
  }

  App.API = { getProfile, getOrderByIdSegment, postViewMessage, listMyOrders };
})();
