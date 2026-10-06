// DOM-free rules for the educational simulator (not a server authorization library).
(function(root, factory){
  const core = factory();
  if(typeof module === 'object' && module.exports) module.exports = core;
  else (root.App = root.App || {}).core = core;
})(globalThis, function(){
  'use strict';
  const LIMITS = Object.freeze({ body:4096, header:256, order:128, logs:60, visibleLogs:12, window:8000 });
  const kinds = ['profile', 'order', 'message'];

  function positiveId(value){
    if(typeof value === 'string'){
      if(!/^[1-9][0-9]{0,15}$/.test(value)) return null;
      value = Number(value);
    }
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  function messageId(body){
    if(!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const keys = Object.keys(body);
    if(keys.length !== 1 || keys[0] !== 'messageId' || typeof body.messageId !== 'number') return null;
    return positiveId(body.messageId);
  }

  function parseBody(text){
    if(typeof text !== 'string' || text.length > LIMITS.body) return {error:'invalidBody'};
    try {
      const body = JSON.parse(text);
      return messageId(body) === null ? {error:'invalidBody'} : {body};
    } catch { return {error:'invalidBody'}; }
  }

  function parseHeader(text){
    if(typeof text !== 'string' || text.length > LIMITS.header || /[\r\n]/.test(text)) return {error:'invalidHeader'};
    if(!text.trim()) return {headers:{}};
    const match = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*([^\x00-\x1f\x7f]*)$/.exec(text.trim());
    if(!match) return {error:'invalidHeader'};
    return {headers:{[match[1].toLowerCase()]:match[2].trim()}};
  }

  function accessToken(headers){
    if(!headers || typeof headers !== 'object' || Array.isArray(headers)) return null;
    const keys = Object.keys(headers).filter(key=>key.toLowerCase() === 'x-access-token');
    return keys.length === 1 && typeof headers[keys[0]] === 'string' ? headers[keys[0]] : null;
  }

  function newProgress(){
    return {score:0, completed:[], hints:[], attempts:[], alertActive:false};
  }

  function complete(progress, kind, mode, userId, response){
    if(!kinds.includes(kind) || mode !== 'VULN' || positiveId(userId) === null || response?.status !== 200) return false;
    const owner = response.data?.[kind === 'profile' ? 'id' : kind === 'order' ? 'ownerId' : 'recipientId'];
    if(positiveId(owner) === null || owner === userId || progress.completed.includes(kind)) return false;
    progress.completed.push(kind);
    progress.score += 100;
    return true;
  }

  function hint(progress, kind, level){
    const key = `${kind}:${level}`;
    if(!kinds.includes(kind) || ![1,2,3].includes(level) || progress.hints.includes(key)) return false;
    progress.hints.push(key);
    progress.score = Math.max(0, progress.score - 30);
    return true;
  }

  function track(progress, kind, target, now){
    if(!kinds.includes(kind) || !Number.isFinite(now)) return false;
    progress.attempts = progress.attempts.filter(a=>now - a.t >= 0 && now - a.t < LIMITS.window);
    // Bounded even if the clock stops or the page receives many calls.
    progress.attempts.push({t:now, target:`${kind}:${target}`});
    progress.attempts = progress.attempts.slice(-100);
    const active = progress.attempts.length > 8 || new Set(progress.attempts.map(a=>a.target)).size > 5;
    const notify = active && !progress.alertActive;
    progress.alertActive = active;
    return notify;
  }

  function validDB(users, orders, messages){
    const unique = (rows, key)=>new Set(rows.map(row=>row[key])).size === rows.length;
    if(!Array.isArray(users) || !Array.isArray(orders) || !Array.isArray(messages)) return false;
    if(users.length !== 3 || orders.length !== 6 || messages.length !== 5) return false;
    if(!users.every(u=>u && typeof u.id==='number' && positiveId(u.id) && ['username','name','email','role'].every(k=>typeof u[k] === 'string'))) return false;
    const ids = new Set(users.map(u=>u.id));
    if(!orders.every(o=>o && typeof o.id === 'string' && /^ORD-[0-9]{6}$/.test(o.id) && ids.has(o.ownerId)
      && Number.isFinite(o.total) && Array.isArray(o.items) && o.items.every(i=>i && typeof i.name === 'string'
        && typeof i.sku === 'string' && Number.isFinite(i.qty) && Number.isFinite(i.price)))) return false;
    if(!messages.every(m=>m && typeof m.id==='number' && positiveId(m.id) && ids.has(m.senderId) && ids.has(m.recipientId)
      && ['subject','body','createdAt'].every(k=>typeof m[k] === 'string'))) return false;
    return unique(users,'id') && unique(orders,'id') && unique(messages,'id');
  }

  function snapshot(scenario,input,mode,userId){
    const fields=scenario==='A'?[input.profile]:scenario==='B'?[input.order]:[input.body,input.header];
    return JSON.stringify([scenario,mode,userId,...fields]);
  }

  function guideNext(stage,result,userId,targetId){
    if(result.scenario!=='A' || result.userId!==userId) return stage;
    const id=positiveId(result.req?.query?.userId);
    if(stage===0 && result.mode==='VULN' && id===userId && result.res.status===200) return 1;
    if(stage===1 && result.mode==='VULN' && id===targetId && targetId!==userId && result.res.status===200) return 2;
    if(stage===2 && result.mode==='SECURE' && id===targetId && targetId!==userId && result.res.status===403) return 3;
    return stage;
  }

  return {LIMITS, positiveId, messageId, parseBody, parseHeader, accessToken, newProgress, complete, hint, track, validDB,
    snapshot,guideNext};
});
