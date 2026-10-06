const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../js/core.js');
const read = name=>JSON.parse(fs.readFileSync(`${__dirname}/../data/${name}.json`, 'utf8'));
const users = read('users'), orders = read('orders'), messages = read('messages');
function app(mode='SECURE', id=1001){
  const state = {core:C, MODE:mode, utils:{}, session:{user:users.find(u=>u.id===id) || null, token:'test-token'},
    DB:{users, orders, messages, tokenMap:new Map(orders.map(o=>[o.id, `test-${o.id}`])),
      reverseToken:new Map(orders.map(o=>[`test-${o.id}`,o.id]))}};
  vm.runInNewContext(fs.readFileSync(`${__dirname}/../js/api.js`,'utf8'), {window:{App:state}, App:state});
  return state;
}
test('positive IDs reject coercion and unsafe integers', ()=>{
  for(const v of [null,[],{},true,'',' 1001','1e3','0x10','01',0,-1,1.5,Infinity,NaN,2**53]) assert.equal(C.positiveId(v),null);
  for(const v of [1001,'1001',Number.MAX_SAFE_INTEGER]) assert.equal(C.positiveId(v),Number(v));
});
test('message body must contain exactly one numeric ID', ()=>{
  for(const text of ['null','[]','1','true','{}','{"messageId":[9001]}','{"messageId":"9001"}',
    '{"messageId":9001,"extra":1}','{"messageId":0}','{', ' '.repeat(4097)]) assert.ok(C.parseBody(text).error,text);
  assert.equal(C.parseBody('{"messageId":9001}').body.messageId,9001);
});
test('header parser handles case and invalid syntax', ()=>{
  assert.equal(C.parseHeader('x-access-token: abc').headers['x-access-token'],'abc');
  assert.equal(C.parseHeader('X-Access-Token: abc').headers['x-access-token'],'abc');
  assert.deepEqual(C.parseHeader('').headers,{});
  for(const text of ['bad',':x','Bad Header:x','X:x\nY:y','x'.repeat(257)]) assert.ok(C.parseHeader(text).error);
  assert.equal(C.accessToken({'X-Access-Token':'x','x-access-token':'y'}),null);
});
for(const mode of ['VULN','SECURE']){
  for(const user of users){
    test(`${mode}: ${user.username} profile matrix`, ()=>{
      const a=app(mode,user.id);
      for(const other of users) assert.equal(a.API.getProfile({userId:other.id}).status,
        mode==='VULN' || other.id===user.id ? 200:403);
      assert.equal(a.API.getProfile({userId:9999}).status,404);
      assert.equal(a.API.getProfile({userId:[1001]}).status,400);
    });
    test(`${mode}: ${user.username} order matrix including known other token`, ()=>{
      const a=app(mode,user.id);
      for(const o of orders) assert.equal(a.API.getOrderByIdSegment(mode==='VULN'?o.id:`test-${o.id}`).status,
        mode==='VULN' || o.ownerId===user.id ? 200:403);
      assert.equal(a.API.getOrderByIdSegment('missing').status,404);
      assert.equal(a.API.getOrderByIdSegment('').status,400);
    });
    test(`${mode}: ${user.username} message matrix`, ()=>{
      const a=app(mode,user.id);
      for(const m of messages) assert.equal(a.API.postViewMessage({messageId:m.id},{'x-access-token':'test-token'}).status,
        mode==='VULN' || m.recipientId===user.id ? 200:403);
      assert.equal(a.API.postViewMessage(null).status,400);
      assert.equal(a.API.postViewMessage({messageId:9001},{}).status,mode==='VULN'?200:401);
    });
  }
  test(`${mode}: every API requires simulated login`, ()=>{
    const a=app(mode,0);
    assert.equal(a.API.getProfile({userId:1001}).status,401);
    assert.equal(a.API.getOrderByIdSegment('ORD-000101').status,401);
    assert.equal(a.API.postViewMessage({messageId:9001}).status,401);
  });
}
test('award only once per scenario, not per target or user', ()=>{
  const p=C.newProgress();
  for(const kind of ['profile','order','message']){
    const data={id:1002,ownerId:1002,recipientId:1002};
    assert.equal(C.complete(p,kind,'SECURE',1001,{status:200,data}),false);
    assert.equal(C.complete(p,kind,'VULN',1002,{status:200,data}),false);
    assert.equal(C.complete(p,kind,'VULN',1001,{status:200,data}),true);
    assert.equal(C.complete(p,kind,'VULN',1003,{status:200,data}),false);
  }
  assert.equal(p.score,300);
});
test('hints cost 30 once each, with zero floor', ()=>{
  const p=C.newProgress(); p.score=100;
  assert.equal(C.hint(p,'profile',1),true);
  assert.equal(C.hint(p,'profile',1),false);
  assert.equal(p.score,70);
  for(const n of [2,3]) C.hint(p,'profile',n);
  C.hint(p,'order',1);
  assert.equal(p.score,0);
});
test('warning is bounded, debounced and never changes score', ()=>{
  const p=C.newProgress(); p.score=100;
  for(let i=0;i<8;i++) assert.equal(C.track(p,'profile','1001',0),false);
  assert.equal(C.track(p,'profile','1001',0),true);
  assert.equal(C.track(p,'profile','1001',0),false);
  for(let i=0;i<1000;i++) C.track(p,'profile','1001',0);
  assert.equal(p.attempts.length,100);
  assert.equal(p.score,100);
  assert.equal(C.track(p,'profile','1001',8000),false);
  assert.equal(p.attempts.length,1);
});
test('six distinct targets trigger a warning', ()=>{
  const p=C.newProgress();
  for(let i=0;i<5;i++) assert.equal(C.track(p,'profile',String(i),0),false);
  assert.equal(C.track(p,'profile','5',0),true);
});
test('fixtures validate; malformed and duplicate fixtures do not', ()=>{
  assert.equal(C.validDB(users,orders,messages),true);
  assert.equal(C.validDB(null,orders,messages),false);
  assert.equal(C.validDB([users[0],users[0],users[2]],orders,messages),false);
  assert.equal(C.validDB(users,orders,messages.map(m=>({...m,recipientId:0}))),false);
});
test('CSPRNG token format and bounds', ()=>{
  const state={};
  vm.runInNewContext(fs.readFileSync(`${__dirname}/../js/utils.js`,'utf8'),
    {window:{App:state},App:state,crypto:require('node:crypto').webcrypto});
  assert.match(state.utils.randToken(18),/^tok_[A-Za-z0-9]{18}$/);
  assert.throws(()=>state.utils.randToken(0));
  assert.throws(()=>state.utils.randToken(129));
});
