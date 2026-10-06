const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('CSP is local-only with no inline scripts, styles or misleading header meta',()=>{
  const html=read('index.html');
  assert.match(html,/default-src 'none'/);assert.match(html,/script-src 'self'/);
  assert.match(html,/style-src 'self'/);assert.match(html,/connect-src 'self'/);
  assert.match(html,/object-src 'none'/);assert.match(html,/base-uri 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.doesNotMatch(html,/unsafe-inline|unsafe-eval|http-equiv="(?:X-Content-Type-Options|Permissions-Policy|Referrer-Policy)"/i);
  assert.doesNotMatch(html,/<[^>]+\s(?:on\w+|style)=/i);
  for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
    assert.match(m[1],/src="\.\/js\//);assert.equal(m[2].trim(),'');
  }
  assert.ok(html.indexOf('js/preferences.js')<html.indexOf('style.css'));
});
test('UI renders data as text; event string and HTML/style sinks fail closed',()=>{
  const element={setAttribute(){},addEventListener(){},appendChild(){}};
  const context={window:{},document:{createElement:()=>element,createTextNode:s=>s}};
  context.window=context;vm.createContext(context);vm.runInContext(read('js/utils.js'),context);
  for(const props of [{html:'<img>'},{style:'color:red'},{onclick:'alert(1)'}]){
    assert.throws(()=>context.App.utils.el('div',props));
  }
  const source=read('js/ui.js');
  assert.doesNotMatch(source,/innerHTML\s*=\s*(?!['"]['"])[^;]/);
  assert.doesNotMatch(source,/\beval\s*\(|new Function\s*\(|style\s*:/);
});
test('theme text colors meet 4.5:1 on every panel and status background',()=>{
  const css=read('style.css');
  const luminance=hex=>{
    const channels=hex.match(/\w\w/g).map(h=>parseInt(h,16)/255)
      .map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
    return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
  };
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  for(const selector of [':root',':root.light-mode']){
    const body=css.slice(css.indexOf(selector+' {')).split('}')[0];
    const vars=Object.fromEntries([...body.matchAll(/--([\w-]+):#([\da-f]{6})/g)].map(m=>[m[1],m[2]]));
    for(const color of ['text','muted','accent','good','bad','warn']){
      for(const bg of ['bg','panel','panel-2','code']) assert.ok(contrast(vars[color],vars[bg])>=4.5,selector+' '+color+'/'+bg);
    }
    for(const bg of ['accent','good','bad']) assert.ok(contrast(vars['button-text'],vars[bg])>=4.5,selector+' button/'+bg);
  }
});
