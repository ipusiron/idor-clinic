const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../js/core.js');
const read=name=>JSON.parse(fs.readFileSync(`${__dirname}/../data/${name}.json`,'utf8'));
function app(mode='VULN',id=1001){
  const users=read('users'),orders=read('orders'),messages=read('messages');
  const a={core,MODE:mode,session:{user:users.find(u=>u.id===id)||null,token:'example-session'},
    progress:core.newProgress(),logs:[],DB:{users,orders,messages,
      tokenMap:new Map(orders.map(o=>[o.id,'example-'+o.id])),
      reverseToken:new Map(orders.map(o=>['example-'+o.id,o.id]))}};
  vm.runInNewContext(fs.readFileSync(`${__dirname}/../js/api.js`,'utf8'),{App:a,window:{App:a}});
  return a;
}
const plain=value=>JSON.parse(JSON.stringify(value));
const input={profile:'1002',order:'ORD-000102',body:'{"messageId":9002}',header:'X-Access-Token: example-session'};
test('trace follows the actual permission decision, including deliberately unchecked checks',()=>{
  const a=app();
  const v=a.API.inspect('A',input),s=a.API.inspect('A',input,'SECURE');
  assert.equal(v.res.status,200);assert.equal(s.res.status,403);
  assert.deepEqual(plain(v.steps.map(s=>s.state)),['tracePass','tracePass','tracePass','traceUnchecked']);
  assert.deepEqual(plain(s.steps.map(s=>s.state)),['tracePass','tracePass','tracePass','traceFail']);
  assert.deepEqual(plain(v.res),plain(a.API.getProfile({userId:input.profile})));
});
test('early failures leave subsequent checks unexecuted',()=>{
  const a=app('SECURE',0);
  let r=a.API.inspect('A',input);
  assert.equal(r.res.status,401);
  assert.deepEqual(plain(r.steps.map(s=>s.state)),['traceFail','traceNotRun','traceNotRun','traceNotRun']);
  a.session.user=a.DB.users[0];
  r=a.API.inspect('A',{...input,profile:''});
  assert.equal(r.res.status,400);assert.equal(r.steps[2].state,'traceNotRun');
  r=a.API.inspect('A',{...input,profile:'9999'});
  assert.equal(r.res.status,404);assert.equal(r.steps[2].state,'traceFail');
  assert.equal(r.steps[3].state,'traceNotRun');
});
test('message token failure happens before target and recipient checks',()=>{
  const a=app('SECURE');
  for(const header of ['', 'X-Access-Token: wrong']){
    const r=a.API.inspect('C',{...input,header});
    assert.equal(r.res.status,401);
    assert.deepEqual(plain(r.steps.map(s=>s.state)),['tracePass','tracePass','traceFail','traceNotRun','traceNotRun']);
  }
  const r=a.API.inspect('C',{...input,header:'x-access-token: example-session'});
  assert.equal(r.res.status,403);assert.equal(r.steps.at(-1).state,'traceFail');
});
test('malformed editor JSON and headers stop at preflight without running API checks',()=>{
  const a=app();
  for(const patch of [{body:'null'},{body:'{'},{body:'{"messageId":"9002"}'},{header:'bad'},
    {body:' '.repeat(4097)},{header:'x'.repeat(257)}]){
    const r=a.API.inspect('C',{...input,...patch});
    assert.equal(r.res.status,400);
    assert.equal(r.steps[0].key,'traceInput');assert.equal(r.steps[0].state,'traceFail');
    assert.ok(r.steps.slice(1).every(s=>s.state==='traceNotRun'));
  }
});
for(const user of read('users')){
  test(`comparison matrix for ${user.username} uses the same object in both modes`,()=>{
    const a=app('VULN',user.id);
    for(const [scenario,rows,field,owner] of [
      ['A',a.DB.users,'profile','id'],['B',a.DB.orders,'order','ownerId'],['C',a.DB.messages,'body','recipientId']]){
      for(const row of rows){
        const value=scenario==='C'?JSON.stringify({messageId:row.id}):String(row.id);
        const results=a.API.compare(scenario,{...input,[field]:value}).results;
        assert.equal(results[0].res.status,200);
        assert.equal(results[1].res.status,row[owner]===user.id?200:403);
        if(scenario==='B'){
          assert.equal(results[0].req.path,'/orders/'+row.id);
          assert.equal(results[1].req.path,'/orders/example-'+row.id);
          a.MODE='SECURE';
          assert.deepEqual(plain(a.API.compare('B',{...input,order:'example-'+row.id}).results),plain(results));
          a.MODE='VULN';
        }
      }
    }
  });
}
test('unresolved order comparison does not guess another format or object',()=>{
  const a=app();
  for(const mode of ['VULN','SECURE']){
    a.MODE=mode;
    for(const order of ['', 'missing', 'x'.repeat(129), mode==='VULN'?'example-ORD-000101':'ORD-000101'])
      assert.equal(a.API.compare('B',{...input,order}).error,'compareUnresolved');
  }
});
test('comparison does not mutate input, session, mode, progress, logs or data',()=>{
  const a=app();a.progress.score=100;
  const raw=Object.freeze({...input});
  const before=JSON.stringify(a,(k,v)=>v instanceof Map?[...v]:v);
  for(let i=0;i<20;i++) for(const scenario of ['A','B','C']) a.API.compare(scenario,raw);
  assert.equal(JSON.stringify(a,(k,v)=>v instanceof Map?[...v]:v),before);
  assert.deepEqual(raw,input);
});
test('comparison preserves invalid message credentials instead of making them valid',()=>{
  const a=app();
  const results=a.API.compare('C',{...input,header:'X-Access-Token: wrong'}).results;
  assert.equal(results[0].res.status,200);assert.equal(results[1].res.status,401);
  assert.equal(results[1].req.headers['x-access-token'],'wrong');
});
