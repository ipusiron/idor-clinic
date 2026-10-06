const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const messages=require('../js/messages.js');
const root=path.join(__dirname,'..');
test('JA/EN dictionary has matching keys, nonempty values and placeholders',()=>{
  assert.deepEqual(Object.keys(messages.ja),Object.keys(messages.en));
  for(const key of Object.keys(messages.ja)){
    assert.ok(messages.ja[key].trim(),key);assert.ok(messages.en[key].trim(),key);
    assert.deepEqual(messages.ja[key].match(/\{\w+\}/g)||[],messages.en[key].match(/\{\w+\}/g)||[],key);
    assert.doesNotMatch(messages.en[key],/[\u3040-\u30ff\u3400-\u9fff]/,key);
  }
});
test('static and literal dictionary references exist',()=>{
  const files=['index.html',...['ui','auth','data','main'].map(n=>'js/'+n+'.js')];
  for(const file of files){
    const source=fs.readFileSync(path.join(root,file),'utf8');
    const references=[...source.matchAll(/(?:\bT\(|\bt\(|\btoast\()'([^']+)'(?=\s*[,\)])/g),
      ...source.matchAll(/data-i18n="([^"]+)"/g)];
    references.forEach(m=>assert.ok(Object.hasOwn(messages.en,m[1]),file+': '+m[1]));
  }
  for(const scenario of ['A','B','C']) assert.ok(messages.en['scenario'+scenario]);
  for(const step of [0,1,2]) assert.ok(messages.en['guideStep'+step]);
  for(const kind of ['profile','order','message']) assert.ok(messages.en['role'+kind]);
  for(const name of ['Title','Login','Input','Token','Target','Self','Owner','Recipient','Pass','Fail','NotRun','Unchecked','Context','Limit'])
    assert.ok(messages.en['trace'+name]);
  for(const kind of ['Profile','Order','Message']){
    for(const prefix of ['success','retrieved']) assert.ok(messages.en[prefix+kind]);
    for(const level of [1,2,3]) assert.ok(messages.en['hint'+kind+level]);
  }
});
function preferences({query='',saved={},locale='en-US',dark=false,denied=false}={}){
  const classes=new Set();const html={classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c)}};
  const context={window:{},URLSearchParams,location:{search:query},navigator:{language:locale},
    localStorage:{getItem:k=>{if(denied) throw Error('denied');return saved[k];},setItem:()=>{}},
    matchMedia:()=>({matches:dark}),document:{documentElement:html}};
  context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'js/preferences.js'),'utf8'),context);
  return {prefs:context.App.preferences,html,classes};
}
test('language priority is query, saved, then browser; invalid values fall back',()=>{
  assert.equal(preferences({query:'?lang=ja',saved:{'idor-clinic.language':'en'}}).prefs.language,'ja');
  assert.equal(preferences({query:'?lang=xx',saved:{'idor-clinic.language':'ja'}}).prefs.language,'ja');
  assert.equal(preferences({locale:'ja-JP'}).prefs.language,'ja');
  assert.equal(preferences({locale:'fr-FR'}).prefs.language,'en');
});
test('theme is applied before paint and storage denial does not prevent preferences',()=>{
  assert.equal(preferences({saved:{'idor-clinic.theme':'dark'}}).classes.has('light-mode'),false);
  assert.equal(preferences({dark:true}).prefs.theme,'dark');
  const p=preferences({denied:true,locale:'ja-JP'});
  assert.equal(p.prefs.storage,false);assert.equal(p.html.lang,'ja');assert.ok(p.classes.has('light-mode'));
});
