const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../js/core.js');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ja=read('README.md'),en=read('README.en.md');
const body=s=>s.includes('-->')?s.slice(s.indexOf('-->')+3):s;
test('project metadata stays in Japanese README; English starts with the standard language link',()=>{
  assert.ok(en.startsWith('English · [日本語](README.md)\n'));
  assert.doesNotMatch(en,/^id:|^slug:|^hub:|^description_ja:/m);
  assert.match(ja,/\[English\]\(README.en.md\) · 日本語/);
  assert.match(en,/\*\*Day065 - 100 Security Tools with Generative AI\*\*/);
  assert.match(ja,/id: day065/);assert.match(ja,/slug: idor-clinic/);
  assert.match(ja,/hub: true/);
  assert.match(ja,/demo_url: "https:\/\/ipusiron.github.io\/idor-clinic\/"/);
});
test('English README is a complete counterpart with corresponding sections and tables',()=>{
  const headings=s=>[...body(s).matchAll(/^(#{1,6}) (.+)$/gm)].map(m=>[m[1].length,m[1].length===2?m[2].split(' ')[0]:'']);
  assert.deepEqual(headings(ja),headings(en));
  const tableShapes=s=>body(s).split(/\n\s*\n/).filter(b=>b.startsWith('|')).map(b=>b.split('\n').map(l=>l.split('|').length));
  assert.deepEqual(tableShapes(ja),tableShapes(en));
  assert.doesNotMatch(body(en).replace('[日本語](README.md)',''),/[\u3040-\u30ff\u3400-\u9fff]/);
  for(const text of [body(ja),body(en)]){
    assert.match(text,/4,096/);assert.match(text,/256/);assert.match(text,/128/);
    assert.match(text,/300/);assert.match(text,/60/);assert.match(text,/12/);
    assert.doesNotMatch(text,/previously|used to|earlier version|formerly/i);
    for(const section of text.split(/^#{1,6} /m)) assert.ok((section.match(/\*\*/g)||[]).length<=4);
  }
});
test('README response tables match both languages and the actual simulated API',()=>{
  const rows=s=>body(s).split('\n').filter(l=>/^\| [ABC]:/.test(l)).map(l=>l.split('|').slice(2,4).map(Number));
  assert.equal(rows(ja).length,10);assert.deepEqual(rows(ja),rows(en));
  const users=JSON.parse(read('data/users.json')),orders=JSON.parse(read('data/orders.json')),messages=JSON.parse(read('data/messages.json'));
  const results=[];
  for(const mode of ['VULN','SECURE']){
    const App={core,MODE:mode,utils:{},session:{user:users[0],token:'fixture-token'},
      DB:{users,orders,messages,reverseToken:new Map([['own','ORD-000101'],['other','ORD-000102']])}};
    vm.runInNewContext(read('js/api.js'),{window:{App},App});
    results.push([App.API.getProfile({userId:1001}),App.API.getProfile({userId:1002}),
      App.API.getOrderByIdSegment('ORD-000101'),App.API.getOrderByIdSegment('ORD-000102'),
      App.API.getOrderByIdSegment('own'),App.API.getOrderByIdSegment('other'),
      App.API.postViewMessage({messageId:9001},{'X-Access-Token':'fixture-token'}),
      App.API.postViewMessage({messageId:9002},{'X-Access-Token':'fixture-token'}),
      App.API.postViewMessage({messageId:9001},{}),App.API.postViewMessage(null,{})].map(r=>r.status));
  }
  assert.deepEqual(rows(ja),results[0].map((status,i)=>[status,results[1][i]]));
});
test('README relative links resolve and matching screenshots exist',()=>{
  for(const text of [ja,en]){
    for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
      if(/^(?:https?:|#)/.test(m[1])) continue;
      assert.ok(fs.existsSync(path.join(root,m[1])),m[1]);
    }
  }
  for(const file of ['screenshot.png','screenshot2.png','screenshot3.png','screenshot4.png']){
    for(const prefix of ['assets/','assets/en/']){
      const data=fs.readFileSync(path.join(root,prefix,file));
      assert.equal(data.subarray(1,4).toString(),'PNG');assert.ok(data.length>10000);
    }
  }
  const tree=s=>s.split('```text\n')[1].split('```')[0].split('\n').map(l=>l.split('#')[0].trimEnd()).join('\n');
  assert.equal(tree(ja),tree(en));
});
test('README retains explicit limits and distinguishes references from authorization',()=>{
  for(const phrase of ['not a real access-control boundary','do not replace authorization','not real attack detection',
    'not security or skill','Not implemented','Only theme and language','all public dummy data for learning']) assert.ok(en.includes(phrase),phrase);
  assert.match(ja,/本物のアクセス制御ではありません/);assert.match(ja,/実装なし/);
  assert.match(ja,/実際の攻撃検知ではありません/);assert.match(ja,/テーマと言語だけ/);
});
test('plain data wording and learning features have explicit bilingual descriptions',()=>{
  assert.match(ja,/実在の人物や取引の記録ではありません/);
  assert.match(en,/not records of real people or transactions/);
  assert.doesNotMatch(ja,/架空/);
  for(const phrase of ['同じ注文','変更後は未実行','開いたヒント','手順付きモード','試行回数は変更しません'])
    assert.ok(ja.includes(phrase),phrase);
  for(const phrase of ['same order','changes have not been run','Opened hints','guided mode',
    'does not change the input, mode, score, completion status, logs or attempt count'])
    assert.ok(en.includes(phrase),phrase);
});
