// utils.js
window.App = window.App || {};

App.utils = (function(){
  const base62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  function randToken(len=16){
    let s='tok_';
    for(let i=0;i<len;i++) s += base62[Math.floor(Math.random()*base62.length)];
    return s;
  }
  function el(tag, props={}, children=[]){
    const e = document.createElement(tag);
    Object.entries(props).forEach(([k,v])=>{
      if(k==='class') e.className = v;
      else if(k==='html') e.innerHTML = v; // WARNING: Only use with trusted content
      else if(k.startsWith('on') && typeof v==='function') e.addEventListener(k.substring(2), v);
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
