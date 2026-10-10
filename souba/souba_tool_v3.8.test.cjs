// Run: node souba/souba_tool_v3.8.test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8').replace(/\r\n/g,'\n');
const source=read('souba_tool_v3.8.js'),previous=read('souba_tool_v3.6.js');
function api(src,extra='',env={}){
  return vm.runInNewContext(src.slice(0,src.indexOf('/* ---------- 画面'))+
    `;return {BRANDS,modelsFromText,modelsFromGallery,calc,calcG,calcH,calcR,grade,tukey,gRe,gkey,cls,rowReason,getA,getB,getB1,${extra}setState:x=>S=x};})()`,
    {location:{hostname:'www.ebay.com'},window:{},localStorage:{getItem:()=>null},URL,...env});
}
const a=api(source,'gColorCounts,gColorGroup,bMoney,'),old=api(previous);
for(const sign of ['$','US $','¥','JP¥','JPY']){for(const gap of ['', ' ', '  ']){const p=a.bMoney(sign+gap+'1,404.50');assert.equal(p.value,1404.5);assert.equal(p.yen,/¥|JPY/.test(sign));}}
assert.equal(source.slice(source.indexOf('async function getA'),source.indexOf('/* ---------- B：')),read('souba_tool_v3.7.js').slice(read('souba_tool_v3.7.js').indexOf('async function getA'),read('souba_tool_v3.7.js').indexOf('/* ---------- B：'))); 
const eq=(x,y)=>assert.equal(JSON.stringify(x),JSON.stringify(y));
const models=['GUCCI 11/12.2','GUCCI 11/12'];
for(const m of models){
  for(const hint of ['full set','complete set','bezel set','bezels set','with bezels','with extra bezels','extra bezels','interchangeable bezels','bezels included','set of bezels']){
    assert.equal(a.rowReason(m,`${m} Near Mint ${hint.toUpperCase()}`),'色数なしのセット表記');
    for(const count of [12,6])assert.equal(a.rowReason(m,`${m} ${count} colors ${hint}`),'');
    for(const count of [10,7])assert.equal(a.rowReason(m,`${m} ${count} colors ${hint}`),'対象外の色数');
  }
  for(const hint of ['bezel','bezels','change bezel','changeable bezel','set','interchangeable','替えベゼル'])assert.equal(a.rowReason(m,`${m} Near Mint ${hint}`),'セット以外');
}
for(const [text,group] of [
  ['12 Colors','12色'],['11 Colors','12色'],['6 Bezels','6色'],['5 Colours','6色'],
  ['Watch12 Colors','12色'],['twelve interchangeable bezels','12色'],['eleven extra colored rings','12色'],
  ['six pcs changeable bezels','6色'],['five change bezel','6色'],['12pcs extra change colored rings','12色'],
  ['bezel x12','12色'],['bezels ×12','12色'],['12色','12色'],['6ring','6色'],
  ['10Ring',''],['ten rings',''],['7 bezels',''],['four colours',''],['full set',''],
  ['11/12.2 Change Bezel',''],['11/12 colors',''],['112 colors',''],['.12 colors',''],
  ['12.2 colors',''],['bezel x12.2',''],['12 colors and 6 rings',''],['12 colors and 10 rings','']
]) assert.equal(a.gColorGroup(text),group,text);
for(const m of models){
  for(const text of ['12 Colors','11 Colors','6 Bezels','five interchangeable rings','bezel x12'])assert.equal(a.rowReason(m,`${m} Near Mint ${text}`),'');
  assert.equal(a.rowReason(m,`${m} Near Mint full set`),'色数なしのセット表記');
  assert.equal(a.rowReason(m,`${m} Near Mint bezels`),'セット以外');
  assert.equal(a.rowReason(m,`${m} Near Mint 10Ring full set`),'対象外の色数');
  assert.equal(a.rowReason(m,`${m} Near Mint 1100 12 colors`),'型番違い');
  const other=models.find(x=>x!==m);assert.equal(a.rowReason(m,`${other} Near Mint 12 colors`),'型番違い');
}
const row=(title,price=700,isA=true)=>({title,k:a.cls(title),why:'',g:a.gkey(title),...(isA?{usd:price,ship:0}:{p:price,s:0})});
const data=models.flatMap(m=>['12 Colors','11 Colors','6 Bezels','5 Colours','10Ring','full set','bezels','1100 12 Colors'].map(t=>row(`${m} Near Mint ${t}`)));
eq(a.modelsFromText('gucci 11/12.2, gucci 11/12').out,models);
a.setState({});
for(const m of models){
  const res=a.calcG(m,data,[],'B打ち切り（3000件まで）');
  eq(res.map(r=>r.区分),['12色','6色']);
  res.forEach(r=>{assert.equal(r.nm.a件数,2);assert.match(r.備考,/色数なしのセット表記 1件/);assert.match(r.備考,/B打ち切り（3000件まで）/);});
  const many=Array.from({length:6},()=>row(`${m} Near Mint 12 Colors`));
  assert.equal(a.calcG(m,many,[],'')[0].nm.ラベル,'暫定');
}
const gallery=a.modelsFromGallery({lines:[{brand:'グッチ',vars:[
  {型番:models[0],bezel:'12色'},{型番:models[0],bezel:'12色'},
  {型番:models[1],bezel:'6色'}, {型番:models[1],bezel:'不明'}]}]});
eq(gallery.gucciBezelGroups,{[models[0]]:['12色'],[models[1]]:['6色']});assert.equal(gallery.skip.length,1);
a.setState(gallery);eq(a.calcG(models[0],data,[],'').map(r=>r.区分),['12色']);eq(a.calcG(models[1],data,[],'').map(r=>r.区分),['6色']);
// Exact calculation-source parity includes conversion, rounding, labels and reversal.
const math=src=>src.slice(src.indexOf('function quart('),src.indexOf('/* グッチ：')).replaceAll('v3.8','v3.6');
assert.equal(math(source),math(previous));
for(const b of a.BRANDS){const prev=old.BRANDS.find(x=>x.key===b.key);for(const k of Object.keys(b))assert.equal(String(b[k]),String(prev[k]),b.key+'/'+k);}
const normalize=x=>JSON.stringify(x).replaceAll('v3.8','v3.6');
for(const [e,n] of [[300,300],[310,300],[500,300],[100,400]]){
  const rows=['EXC5','NM'].flatMap(k=>Array.from({length:5},()=>({...row('sample',k==='NM'?n:e),k,g:{cs:'金',dial:'黒',dia:false}})));
  for(const m of ['GUCCI 1500L','GUCCI 9040M','GUCCI 1600','GUCCI 6000.2.L','WK1312','7400','D48','AL32TA','640L','L4.720.4','160.3605.2','900L','7S26-0020']){
    const fn=m.startsWith('GUCCI')?'calcG':'calc';assert.equal(normalize(a[fn](m,rows,[],'')),normalize(old[fn](m,rows,[],'')),m);
  }
}
const html=read('相場収集ツール_登録_v3.8.html');
const payload=html.match(/href="javascript:([^"]*)"/)[1].replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');
assert.equal(decodeURIComponent(payload),source);
assert.match(a.calcG('GUCCI 1500L',[],[],'B打ち切り（3000件まで）')[0].備考,/B打ち切り（3000件まで）/);
console.log('PASS: color parsing, model exclusions, group counts, gallery selection, v3.6 calculation/brand parity, bookmark payload');

async function collectors(){
  const titles=models.flatMap(m=>['12 Colors','11 Colors','6 Bezels','five extra rings','10Ring','full set','1100 12 Colors'].map(t=>`${m} Near Mint ${t}`));
  const date=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const card=title=>({textContent:'Sold '+date,querySelectorAll:()=>['Sold '+date,'Free shipping'].map(textContent=>({textContent,children:[]})),
    querySelector:sel=>sel.includes('__title')?{textContent:title}:sel.includes('__price')?{textContent:'$700'}:null});
  const env={setTimeout:fn=>fn(),fetch:async()=>({text:async()=>''}),
    DOMParser:class{parseFromString(){return {body:{textContent:`${titles.length} results for`},querySelectorAll:()=>titles.map(card)}}},
    document:{body:{appendChild(){}},createElement:()=>({style:{},remove(){},contentDocument:{body:{innerText:''},querySelectorAll:sel=>sel==='th'?[]:
      titles.map(title=>({querySelectorAll:()=>[title,'','¥700','JP¥ 11','1','','',date].map(innerText=>({innerText}))}))}})}};
  const c=api(source,'',env);
  for(const m of models){
    const A=await c.getA(m),B=await c.getB(m);
    B.rows.forEach(r=>{assert.equal(r.p,700);assert.equal(r.s,11);assert.equal(r.yenAsDollar,true);});
    for(const rows of [A,B.rows]){
      assert.equal(rows.filter(r=>!r.why).length,4);
      assert.equal(rows.filter(r=>r.why==='色数なしのセット表記').length,1);
      assert.equal(rows.filter(r=>r.why==='対象外の色数').length,1);
    }
    c.calcG(m,A,B.rows,B.err).forEach(r=>{assert.equal(r.nm.a件数,2);assert.equal(r.nm.b件数,2);assert.match(r.備考,/色数なしのセット表記 2件/);});
  }
  console.log('PASS: actual A/B collectors with DOM fixtures, model/color exclusions and warning counts');
}

async function pagination(){
  let sizes=[],index=0,urls=[],unreadable=false;
  const env={setTimeout:fn=>fn(),document:{body:{appendChild:f=>urls.push(new URL(f.src,'https://www.ebay.com'))},createElement:()=>{
    const page=index++,size=sizes[page]||0;
    return {style:{},remove(){},contentDocument:{body:{innerText:'No sold'},querySelectorAll:sel=>sel==='th'?[]:
      Array.from({length:size},(_,i)=>({querySelectorAll:()=>[`${models[0]} Near Mint 12 Colors #${page*50+i}`,'',unreadable?'—':'$ 700.00','Free','1','','','Sep 28, 2026'].map(innerText=>({innerText}))}))}};
  }}};
  const c=api(source,'',env);
  const run=async ns=>{sizes=ns;index=0;urls=[];return c.getB(models[0]);};
  let b=await run(Array(60).fill(50));assert.equal(b.rows.length,3000);assert.match(b.err,/B打ち切り（3000件まで）/);assert.equal(urls.length,60);
  eq(urls.map(u=>+u.searchParams.get('offset')),Array.from({length:60},(_,i)=>i*50));urls.forEach(u=>assert.equal(u.searchParams.get('limit'),'50'));
  c.calcG(models[0],[],b.rows,b.err).forEach(r=>assert.match(r.備考,/B打ち切り（3000件まで）/));
  b=await run([...Array(9).fill(50),49]);assert.equal(b.rows.length,499);assert.equal(b.err,'');
  b=await run([50,1]);assert.equal(b.rows.length,51);assert.equal(urls.length,2);assert.equal(b.err,'');
  b=await run([...Array(33).fill(50),0]);assert.equal(b.rows.length,1650);assert.equal(urls.length,34);assert.equal(b.err,'');
  b=await run([...Array(59).fill(50),49]);assert.equal(b.rows.length,2999);assert.equal(urls.length,60);assert.equal(b.err,'');
  b=await run([0]);assert.equal(b.rows.length,0);assert.equal(b.err,'');
  unreadable=true;b=await run(Array(60).fill(50));assert.match(b.err,/B読めず/);assert.match(b.err,/B打ち切り（3000件まで）/);
  console.log('PASS: B pagination, 3000-row cap, partial/empty final pages, combined price/cap warnings');
}
async function startup(){
  for(const mode of ['manual','gallery','both']){
    const nodes={},saved=[];
    const node=id=>nodes[id]||(nodes[id]={style:{},value:'',files:[],innerHTML:'',insertAdjacentHTML(){}});
    const box={style:{},querySelector:s=>node(s.slice(1))};
    if(mode!=='manual')node('sb-f').files=[{text:async()=>JSON.stringify({lines:[{brand:'グッチ',vars:[{型番:models[0],bezel:'6色'}]}]})}];
    if(mode!=='gallery')node('sb-t').value='gucci 11/12.2, gucci 11/12';
    const mocked=source.replace('/* ---------- 画面',`getA=async()=>${JSON.stringify(data)};getB=async()=>({rows:[{yenAsDollar:true},{yenAsDollar:true}],err:'B打ち切り（3000件まで）'});\n/* ---------- 画面`);
    vm.runInNewContext(mocked,{location:{hostname:'www.ebay.com'},window:{},URL,
      localStorage:{getItem:key=>{assert.equal(key,'soubaTool_v3.8');return null;},setItem:(key,v)=>saved.push(JSON.parse(v))},
      document:{createElement:()=>box,body:{appendChild(){}}},alert:assert.fail});
    await node('sb-go').onclick();
    assert.ok(box.innerHTML.includes('<span class="m">v3.8</span>'));
    const res=JSON.parse(node('sb-j').value).結果;
    res.forEach(r=>assert.equal((r.備考.match(/B：¥表示をドルとして読んだ/g)||[]).length,1));
    eq(res.map(r=>r.区分),mode==='gallery'?['6色']:['12色','6色','12色','6色']);
    assert.match(node('sb-tb').innerHTML,/⚠ 色数なしのセット表記 1件/);assert.match(node('sb-tb').innerHTML,/⚠ B打ち切り（3000件まで）/);
    assert.ok(!saved.at(-1).err);assert.ok(saved.at(-1).gucciBezelGroups);
  }
  console.log('PASS: UI run(), manual four rows, gallery selected group, saved groups and visible warnings');
}
Promise.all([pagination(),startup(),collectors()]).catch(e=>{console.error(e);process.exitCode=1});
