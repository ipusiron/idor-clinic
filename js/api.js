// Shared, side-effect-free decisions for this browser-only learning simulator.
window.App = window.App || {};
(function(){
  const C = App.core;
  function stages(kind, preflight=false){
    const keys = preflight ? ['traceInput','traceLogin'] : ['traceLogin','traceInput'];
    if(kind==='message') keys.push('traceToken');
    keys.push('traceTarget',kind==='message'?'traceRecipient':'traceOwner');
    return keys.map(key=>({key,state:'traceNotRun'}));
  }
  function evaluate(kind, input, mode=App.MODE, session=App.session){
    const steps=stages(kind);
    const mark=(key,state)=>{steps.find(s=>s.key===key).state=state;};
    const done=res=>({res,steps});
    const fail=(key,status,error,reason)=>{
      mark(key,'traceFail');
      return done({status,error,...(reason?{reason}:{})});
    };
    if(!session.user) return fail('traceLogin',401,'Unauthorized','loginRequired');
    mark('traceLogin','tracePass');
    const id=kind==='profile'?C.positiveId(input.id):kind==='message'?C.messageId(input.body):input.id;
    if(kind==='order' ? typeof id!=='string'||!id||id.length>C.LIMITS.order : id===null){
      return fail('traceInput',400,'Bad Request',kind==='message'?'invalidBody':'invalidId');
    }
    mark('traceInput','tracePass');
    if(kind==='message'){
      if(mode==='SECURE'){
        if(!session.token || C.accessToken(input.headers)!==session.token)
          return fail('traceToken',401,'Unauthorized (token required)','tokenRequired');
        mark('traceToken','tracePass');
      } else mark('traceToken','traceUnchecked');
    }
    const targetId=kind==='order' && mode==='SECURE'?App.DB.reverseToken.get(id):id;
    const rows=App.DB[kind==='profile'?'users':kind==='order'?'orders':'messages'];
    const target=rows.find(row=>row.id===targetId);
    if(!target) return fail('traceTarget',404,
      kind==='order' && mode==='SECURE' && !targetId?'Not Found (invalid token)':'Not Found');
    mark('traceTarget','tracePass');
    const ownerKey=kind==='profile'?'id':kind==='order'?'ownerId':'recipientId';
    const checkKey=kind==='message'?'traceRecipient':'traceOwner';
    if(mode==='SECURE'){
      if(target[ownerKey]!==session.user.id)
        return fail(checkKey,403,kind==='message'?'Forbidden (recipient mismatch)':'Forbidden (owner mismatch)');
      mark(checkKey,'tracePass');
    } else mark(checkKey,'traceUnchecked');
    const data=kind==='profile'
      ? {id:target.id,username:target.username,name:target.name,email:target.email,role:target.role}
      : target;
    return done({status:200,data});
  }

  // Inspect raw editor text. This is also the normal UI execution path.
  function inspect(scenario, input, mode=App.MODE){
    let req, result;
    if(scenario==='A'){
      req={method:'GET',path:'/profile',query:{userId:input.profile}};
      result=evaluate('profile',{id:input.profile},mode);
    } else if(scenario==='B'){
      const id=input.order.trim();
      req={method:'GET',path:'/orders/'+id};
      result=evaluate('order',{id},mode);
    } else if(scenario==='C'){
      const body=C.parseBody(input.body), headers=C.parseHeader(input.header);
      if(body.error||headers.error){
        req={method:'POST',path:'/api/messages/view',body:input.body,headers:input.header};
        const steps=stages('message',true);
        steps[0].state='traceFail';
        result={res:{status:400,error:'Bad Request',reason:headers.error||body.error},steps};
      } else {
        req={method:'POST',path:'/api/messages/view',headers:headers.headers,body:body.body};
        result=evaluate('message',{body:body.body,headers:headers.headers},mode);
      }
    } else throw new TypeError('Unknown scenario');
    return {req,...result,mode,user:App.session.user?.username||'-'};
  }

  // Order comparison converts references only after resolving the current-mode input.
  // No mode switching, scoring, logging, tracking or session mutation occurs here.
  function compare(scenario,input){
    const pair={VULN:{...input},SECURE:{...input}};
    let target=null;
    if(scenario==='B'){
      const id=input.order.trim();
      if(!id||id.length>C.LIMITS.order) return {error:'compareUnresolved'};
      const seq=App.MODE==='SECURE'?App.DB.reverseToken.get(id):id;
      if(!App.DB.orders.some(o=>o.id===seq)) return {error:'compareUnresolved'};
      const token=App.DB.tokenMap.get(seq);
      if(!token) return {error:'compareUnresolved'};
      target=seq;
      pair.VULN.order=seq;pair.SECURE.order=token;
    }
    return {target,results:['VULN','SECURE'].map(mode=>inspect(scenario,pair[mode],mode))};
  }
  function listMyOrders(){
    if(!App.session.user) return [];
    return App.DB.orders.filter(o=>o.ownerId===App.session.user.id).map(o=>({
      id:App.MODE==='SECURE'?App.DB.tokenMap.get(o.id):o.id,
      ...(App.MODE==='SECURE'?{original:o.id}:{}),total:o.total
    }));
  }
  App.API={
    getProfile:query=>evaluate('profile',{id:query?.userId}).res,
    getOrderByIdSegment:id=>evaluate('order',{id}).res,
    postViewMessage:(body,headers={})=>evaluate('message',{body,headers}).res,
    inspect,compare,listMyOrders
  };
})();
