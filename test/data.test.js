const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const core=require('../js/core.js');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fixtures=Object.fromEntries(['users','orders','messages'].map(k=>[k,JSON.parse(read('data/'+k+'.json'))]));
function context(protocol='file:',fetcher=()=>{throw Error('Unexpected fetch');},token){
  let n=0;
  const App={core,utils:{randToken:token||(()=>`tok_fixture_${++n}`)}};
  const context={window:{App},App,location:{protocol},fetch:fetcher,AbortController,setTimeout,clearTimeout};
  vm.runInNewContext(read('js/data.js'),context);
  return App;
}
function sameFixtures(app){
  for(const k of Object.keys(fixtures)) assert.deepEqual(JSON.parse(JSON.stringify(app.DB[k])),fixtures[k]);
  assert.equal(app.DB.tokenMap.size,6);assert.equal(app.DB.reverseToken.size,6);
}
test('file loading never fetches and embedded fixtures exactly match public JSON',async()=>{
  const app=context();await app.loadDB();sameFixtures(app);
});
test('HTTP loads only the three same-site fixture files',async()=>{
  const requests=[];
  const app=context('http:',async url=>{
    requests.push(url);return {ok:true,json:async()=>fixtures[path.basename(url,'.json')]};
  });
  await app.loadDB();sameFixtures(app);
  assert.deepEqual(requests,['./data/users.json','./data/orders.json','./data/messages.json']);
});
for(const scenario of ['malformed','rejected','not-ok']){
  test(`HTTP ${scenario} fixture response uses embedded data`,async()=>{
    const app=context('http:',async()=>{
      if(scenario==='rejected') throw Error('offline');
      return {ok:scenario!=='not-ok',json:async()=>null};
    });
    await app.loadDB();sameFixtures(app);assert.equal(app.dataSource,'embedded');
  });
}
test('unavailable randomness and repeated collisions fail initialization',async()=>{
  const denied=context('file:',undefined,()=>{throw Error('unavailable');});
  await assert.rejects(denied.loadDB(),/unavailable/);assert.equal(denied.DB,undefined);
  let tries=0;const collision=context('file:',undefined,()=>{tries++;return 'same';});
  await assert.rejects(collision.loadDB(),/collision/);assert.equal(tries,11);assert.equal(collision.DB,undefined);
});
test('fixture validation rejects string IDs rather than creating unusable lookups',()=>{
  assert.equal(core.validDB(fixtures.users.map(u=>({...u,id:String(u.id)})),fixtures.orders,fixtures.messages),false);
  assert.equal(core.validDB(fixtures.users,fixtures.orders,fixtures.messages.map(m=>({...m,id:String(m.id)}))),false);
});
