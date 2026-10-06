// utils.js
window.App = window.App || {};

App.utils = (function(){
  const base62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  function randToken(len=16){
    if(!Number.isInteger(len) || len < 1 || len > 128) throw new RangeError('Invalid token length');
    let s='tok_';
    // Rejection sampling avoids modulo bias. These are simulator tokens, not real credentials.
    const bytes = new Uint8Array(64);
    while(s.length < len + 4){
      globalThis.crypto.getRandomValues(bytes);
      for(const byte of bytes){
        if(byte < 248) s += base62[byte % 62];
        if(s.length === len + 4) break;
      }
    }
    return s;
  }
  function el(tag, props={}, children=[]){
    const e = document.createElement(tag);
    Object.entries(props).forEach(([k,v])=>{
      if(k==='class') e.className = v;
      else if(k==='html' || k==='style') throw new TypeError('HTML strings and inline styles are not supported');
      else if(k.startsWith('on')) {
        if(typeof v!=='function') throw new TypeError('Event handlers must be functions');
        e.addEventListener(k.substring(2),v);
      }
      else if(k==='disabled') {
        if(v) e.setAttribute('disabled', '');
        // false の場合は属性を設定しない
      }
      else e.setAttribute(k, v);
    });
    (Array.isArray(children)?children:[children]).filter(Boolean).forEach(c=>{
      if(typeof c==='string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    });
    return e;
  }
  function code(obj){
    try{
      if(typeof obj === 'string') return obj;
      return JSON.stringify(obj, null, 2);
    }catch(e){ return String(obj); }
  }
  function now(){
    const d = new Date();
    return d.toLocaleString();
  }
  function debounce(fn, ms=300){
    let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
  }

  return { randToken, el, code, now, debounce };
})();
