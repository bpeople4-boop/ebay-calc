// Run: node souba/souba_tool_v3.5.test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8').replace(/\r\n/g,'\n');
const source=read('souba_tool_v3.5.js');
function api(src,extra='',env={}){
  const context={location:{hostname:'www.ebay.com'},window:{},localStorage:{getItem:()=>null},URL,...env};
  const prefix=src.slice(0,src.indexOf('/* ---------- 画面'));
  return vm.runInNewContext(prefix+`;return {cls,BRANDS,modelsFromText,modelsFromGallery,calc,calcG,grade,tukey,median,ceil,lab,gRe,${extra}setState:x=>S=x};})()`,context);
}
const a=api(source,'hGroup,H_GROUPS,rGroup,R_GROUPS,cfgOf,titleRe,rowReason,calcH,calcR,getA,getB,'),old=api(read('souba_tool_v3.3.js'));
const eq=(x,y)=>assert.equal(JSON.stringify(x),JSON.stringify(y));
const brand=k=>a.BRANDS.find(b=>b.key===k);
for(const t of ['Big Crown','Hand Winding','Gold Bezel','Leather Strap','Change Bezel','Sapphire Crystal'])assert.equal(a.cls('Near Mint '+t),'NM');
for(const t of ['crown only','hands only','strap only','movement only','bracelet links','junk'])assert.equal(a.cls('Near Mint '+t),'EXCL');
for(const [key,model,yes,no] of [
 ['ORIS','7400',['7400','7400B','7400C','7403-40B','302-7285B'],['17400','74001','A7400']],
 ['DIOR','D48',['D48','D-48','48.203','48.133'],['D480','148.203','48.2034']],
 ['BVLGARI','AL32TA',['AL32TA','AL32A','AL 32 TA'],['AL32TAB','AL32']],
 ['TAG','383.513',['383.513/1'],[]]
]){for(const t of yes)assert.ok(brand(key).re(model).test(t),t);for(const t of no)assert.ok(!brand(key).re(model).test(t),t);}
eq(brand('DIOR').terms('D48'),['dior D48','christian dior octagon','dior 48.203','dior 48.133']);
assert.ok(brand('BVLGARI').terms('AL32TA').includes('bvlgari AL32A'));
const models=['11/12','11/12.2','6000.2.L','9040L','9200M','1600','5500M','2600L','2400S','7200L','3000.2.M','1500L'];
for(const m of models){eq(a.modelsFromText('gucci '+m).out,['GUCCI '+m]);assert.ok(a.gRe(m).test('Gucci '+m+' Near Mint'),m);}
for(const [m,t] of [['11/12','11/12.2'],['11/12.2','11/12'],['1600','1600L'],['2400S','2400L'],['1500L','1500M'],['1500L','15001'],['6000.2.L','6000.2.M']])assert.ok(!a.gRe(m).test(t),m+' / '+t);
eq(a.modelsFromText('oris 7400, fendi 640L, gucci 11/12.2, dior D48, bvlgari AL32TA').out,['7400','640L','GUCCI 11/12.2','D48','AL32TA']);
for(const [m,t] of [['640L','Fendi 640L change belts'],['640L','Fendi 640L with 5 straps'],['GUCCI 11/12','Gucci 11/12 with extra bezels'],['GUCCI 11/12.2','Gucci 11/12.2 12 colors']])assert.equal(a.rowReason(m,t),'');
assert.equal(a.rowReason('640L','Fendi 640L Leather Strap'),'セット以外');
assert.equal(a.rowReason('GUCCI 11/12.2','Gucci 11/12.2 Watch'),'セット以外');
eq(a.H_GROUPS,['ケリー カデナ']);
for(const t of ['Hermes Kelly padlock','Hermes Kelly Cadena KE1.201','Hermès Kelly padlock'])assert.equal(a.hGroup(t),'ケリー カデナ');
for(const t of ['Hermes Kelly Cadena KE1.210','Hermes Kelly Cadena KE1 210','Hermes Kelly Cadena KE1-210','Hermes Kelly watch leather','Hermes Clipper 24mm gold','Hermes H-Watch','Hermes Arceau','Hermes Rallye','Hermes Profil','Seiko Kelly padlock'])assert.equal(a.hGroup(t),'',t);
for(const [t,g] of [['RADO Balboa Quartz',0],['Rado Golden Horse Automatic',1],['Rado Golden-Horse',1]])assert.equal(a.rGroup(t),a.R_GROUPS[g]);
for(const t of ['Rado DiaStar 129.0266.3','Seiko Golden Horse'])assert.equal(a.rGroup(t),'');
assert.equal(a.cfgOf('RADO').key,'RADO');assert.ok(a.titleRe('RADO').test('Rado DiaStar 129.0266.3'));
for(const t of ['Rado 160.3605.2N','Rado 160.3605.2','RADO 160-3605-2N','Rado 160 3605 2N'])assert.ok(brand('RADO').re('160.3605.2').test(t),t);
for(const t of ['Rado 160.3605.21','Rado 160.3605.2NA','Rado 160.3605.2N1'])assert.ok(!brand('RADO').re('160.3605.2').test(t),t);
const input={lines:[{brand:'RADO',name:'',vars:[{区分:'ラドー バルボア',photoCheck:true},{区分:'ラドー ゴールデンホース'},{label:'ラドー バルボア'},{型番:'160.3605.2'}]},{brand:'エルメス',name:'',vars:[{区分:'ケリー カデナ',photoCheck:true},{区分:'Hウォッチ',型番:'HH1.201'}]}]};
const gallery=a.modelsFromGallery(input);
eq(gallery.set,['RADO','160.3605.2','HERMES','HH1.201']);eq(gallery.radoGroups,a.R_GROUPS);eq(gallery.hermesGroups,a.H_GROUPS);
assert.equal(gallery.photo.RADO,1);assert.equal(gallery.photo.HERMES,1);
eq(a.modelsFromGallery(input.lines).set,gallery.set);
eq(a.modelsFromText('rado balboa, rado golden horse, rado 160.3605.2').out,['RADO','160.3605.2']);
const rows=['Rado Balboa Near Mint','Rado Golden Horse Near Mint','Rado DiaStar Near Mint','Seiko Golden Horse Near Mint'].map(title=>({title,k:'NM',why:'',usd:300,ship:0}));
a.setState({radoGroups:gallery.radoGroups,hermesGroups:gallery.hermesGroups,br:gallery.br});
const rr=a.calcR(rows,[], 'B読めず');eq(rr.map(r=>r.区分),a.R_GROUPS);
rr.forEach(r=>{assert.equal(r.型番,'RADO');assert.equal(r.nm.a件数,1);assert.ok(r.備考.includes('B読めず'));assert.ok(r.備考.endsWith('自動収集v3.5'));});
a.setState({radoGroups:[a.R_GROUPS[1]]});eq(a.calcR(rows,[],'').map(r=>r.区分),[a.R_GROUPS[1]]);
a.setState({radoGroups:[]});assert.equal(a.calcR(rows,[],'').length,2);
a.setState({});assert.equal(a.calcR(rows,[],'').length,2);
const hr=a.calcH(['Hermes Kelly padlock','Hermes Kelly Cadena KE1.210','Hermes Clipper 24mm'].map(title=>({title,k:'NM',why:'',usd:500,ship:0})),[],'');
assert.equal(hr.length,1);assert.equal(hr[0].nm.a件数,1);assert.equal(hr[0].区分,'ケリー カデナ');
// Non-Rado brand settings, exclusions, set rules, calculation and reversal logic are unchanged.
for(const b of a.BRANDS.filter(b=>b.key!=='RADO')){
 const prev=old.BRANDS.find(x=>x.key===b.key);
 for(const key of Object.keys(b))assert.equal(String(b[key]),String(prev[key]),b.key+'/'+key);
}
const normalize=x=>JSON.stringify(x).replaceAll('自動収集v3.5','自動収集v3.3');
for(const [e,n] of [[300,300],[310,300],[500,300],[100,400]]){
 const rs=['EXC5','NM'].flatMap(k=>Array.from({length:5},()=>({title:'sample',k,why:'',usd:k==='NM'?n:e,ship:0,g:{cs:'金',dial:'黒',dia:false}})));
 for(const m of ['WK1312','GUCCI 9040M','GUCCI 1500L','GUCCI 11/12','7400','D48','AL32TA','640L','L4.720.4']){
  const fn=m.startsWith('GUCCI')?'calcG':'calc';assert.equal(normalize(a[fn](m,rs,[],'')),normalize(old[fn](m,rs,[],'')),m);
 }
}
const unchanged=src=>src.slice(src.indexOf('function quart('),src.indexOf('function calcH(')).replaceAll('自動収集v3.5','自動収集v3.3');
assert.equal(unchanged(source),unchanged(read('souba_tool_v3.3.js')));
const sample=Array.from({length:5},(_,i)=>({title:'Gucci 1600 Near Mint',k:'NM',why:'',usd:500+i,ship:0,g:{cs:i%2?'金':'銀',dial:'黒',dia:false}}));
const gr=a.calcG('GUCCI 1600',sample,[],'');assert.equal(gr.length,1);assert.equal(gr[0].区分,'全体');assert.equal(gr[0].nm.a件数,5);assert.equal(gr[0].nm.ラベル,'暫定');
for(const m of models.slice(0,10)){const r=a.calcG('GUCCI '+m,[],[],'')[0];assert.equal(r.区分,m.startsWith('11/12')?'セット':'全体');}
// Compare the unchanged numerical implementation and results against v3.3.
const math=src=>src.slice(src.indexOf('function quart('),src.indexOf('function calc('));
assert.equal(math(source),math(read('souba_tool_v3.3.js')));
for(const v of [[],[100],[100,200],[100,200,300],[100,101,102,103,10000]]){
 eq(a.tukey(v),old.tukey(v));eq(a.grade(v,[200,210,220],[300,320,330],[],'nm'),old.grade(v,[200,210,220],[300,320,330],[],'nm'));
}
const html=read('相場収集ツール_登録_v3.5.html');
const encoded=html.match(/href="javascript:([^"]*)"/)[1].replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');
assert.equal(decodeURIComponent(encoded),source);
console.log('PASS: exclusions, model aliases, Gucci groups, sets, Hermes groups, unchanged calculations, bookmark payload');
// Exercise collection with DOM fixtures: query settings, page caps, deduplication,
// and the same set filter in both A and B, without contacting eBay.
async function collectors(){
  const urls=[],iframes=[];
  let fixtures=['Hermes Kelly padlock Near Mint'];
  const date=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const card=title=>({textContent:'Sold '+date,
    querySelectorAll:()=>['Sold '+date,'Free shipping'].map(textContent=>({textContent,children:[]})),
    querySelector:sel=>sel.includes('__title')?{textContent:title}:sel.includes('__price')?{textContent:'$500'}:null});
  const env={setTimeout:fn=>fn(),fetch:async url=>{urls.push(new URL(url,'https://www.ebay.com'));return {text:async()=>''}},
    DOMParser:class{parseFromString(){return {body:{textContent:'2000 results for'},querySelectorAll:()=>fixtures.map(card)}}},
    document:{body:{appendChild:f=>iframes.push(new URL(f.src,'https://www.ebay.com'))},createElement:()=>({style:{},remove(){},
      contentDocument:{body:{innerText:''},querySelectorAll:sel=>sel==='th'?[]:fixtures.map(title=>({querySelectorAll:()=>[title,'','$500','Free','1','','',date].map(innerText=>({innerText}))}))}})}};
  const c=api(source,'getA,getB,calcR,',env);
  const ar=await c.getA('HERMES');assert.equal(ar.length,1);assert.equal(urls.length,16);
  for(const u of urls){assert.equal(u.searchParams.get('_sacat'),'31387');assert.equal(u.searchParams.get('_ipg'),'240');assert.ok(+u.searchParams.get('_pgn')<=4);}
  eq([...new Set(urls.map(u=>u.searchParams.get('_nkw')))],['hermes kelly watch','hermes watch near mint','hermes watch exc+5','hermes watch n mint']);
  const br=await c.getB('HERMES');assert.equal(br.rows.length,1);assert.equal(iframes.length,2);
  eq(iframes.map(u=>u.searchParams.get('keywords')),['hermes kelly watch','hermes kelly cadena']);
  urls.length=0;iframes.length=0;fixtures=['Rado Balboa Near Mint','Rado Golden Horse Near Mint','Seiko Golden Horse Near Mint'];
  const ra=await c.getA('RADO'),rb=await c.getB('RADO');assert.equal(urls.length,4);assert.equal(iframes.length,2);
  eq([...new Set(urls.map(u=>u.searchParams.get('_nkw')))],['rado balboa','rado golden horse']);
  eq(iframes.map(u=>u.searchParams.get('keywords')),['rado balboa','rado golden horse']);
  for(const u of urls){assert.equal(u.searchParams.get('_sacat'),'31387');assert.equal(u.searchParams.get('_ipg'),'240');assert.ok(+u.searchParams.get('_pgn')<=2);}
  c.setState({radoGroups:[]});const result=c.calcR(ra,rb.rows,'');result.forEach(r=>{assert.equal(r.nm.a件数,1);assert.equal(r.nm.b件数,1);});
  assert.equal(ra.length,3);assert.equal(rb.rows.length,3);assert.equal(ra[2].why,'型番違い');assert.equal(rb.rows[2].why,'型番違い');
  for(const m of ['640L','GUCCI 11/12.2']){
    const stem=m==='640L'?'Fendi 640L':'Gucci 11/12.2';
    fixtures=[stem+' Near Mint full set',stem+' Near Mint'];
    const aa=await c.getA(m),bb=await c.getB(m);
    for(const rows of [aa,bb.rows]){assert.equal(rows.length,2);assert.equal(rows[0].why,'');assert.equal(rows[1].why,'セット以外');}
    const r=m==='640L'?c.calc(m,aa,bb.rows,''):c.calcG(m,aa,bb.rows,'')[0];
    assert.equal(r.区分,'セット');assert.equal(r.nm.a件数,1);assert.equal(r.nm.b件数,1);
  }
  console.log('PASS: A/B collection fixtures, Hermes/Rado queries and page caps, deduplication, set-only counts');
}
// Run the actual UI start handler with isolated storage and mocked collection.
async function startup(){
  for(const fileInput of [true,false]){
    const nodes={},saved=[];
    const node=id=>nodes[id]||(nodes[id]={style:{},value:'',files:[],innerHTML:'',insertAdjacentHTML(){}});
    const box={style:{},querySelector:selector=>node(selector.slice(1))};
    if(fileInput)node('sb-f').files=[{text:async()=>JSON.stringify({lines:[{brand:'RADO',name:'',vars:[{区分:'ラドー バルボア',photoCheck:true}]}]})}];
    else node('sb-t').value='rado balboa, rado golden horse';
    const context={location:{hostname:'www.ebay.com'},window:{},URL,
      localStorage:{getItem:()=>null,setItem:(key,value)=>saved.push(JSON.parse(value))},
      document:{createElement:()=>box,body:{appendChild(){}}},alert:message=>assert.fail(message)};
    const mocked=source.replace('/* ---------- 画面',`getA=async()=>[{title:'Rado Balboa Near Mint',k:'NM',why:'',usd:300,ship:0}];getB=async()=>({rows:[],err:''});\n/* ---------- 画面`);
    vm.runInNewContext(mocked,context);
    assert.ok(box.innerHTML.includes('<span class="m">v3.5</span>'));
    await node('sb-go').onclick();
    const last=saved.at(-1);assert.ok(!last.err);eq(last.models,['RADO']);
    const results=JSON.parse(node('sb-j').value).結果;
    eq(results.map(r=>r.区分),fileInput?['ラドー バルボア']:['ラドー バルボア','ラドー ゴールデンホース']);
    eq(last.radoGroups,fileInput?['ラドー バルボア']:[]);
    assert.equal(results[0].nm.a件数,1);
    assert.equal(results[0].備考.includes('棚卸し：写真確認'),fileInput);
  }
  console.log('PASS: run(), gallery/manual group selection, saved state, photoCheck, v3.5 panel and output JSON');
}
// Only getB1 and version labels may differ from v3.4.
const outsideB=src=>src.replace(/async function getB1\([\s\S]*?(?=async function getB\()/,'').replaceAll('v3.5','v3.4');
assert.equal(outsideB(source),outsideB(read('souba_tool_v3.4.js')));
async function prices(){
  let headers=[],pages=[],page=0;
  const env={setTimeout:fn=>fn(),document:{body:{appendChild(){}},createElement:()=>{
    const cells=pages[page++]||[];
    return {style:{},remove(){},contentDocument:{body:{innerText:'No sold'},querySelectorAll:sel=>
      sel==='th'?headers.map(innerText=>({innerText})):cells.map(row=>({querySelectorAll:()=>row.map(innerText=>({innerText}))}))}};
  }}};
  const c=api(source,'getB1,',env),title='Rado Balboa Near Mint';
  const row=(p,s='Free')=>[title,'',p,s,'7','','','Sep 25, 2026'];
  const run=async(data,h=[])=>{pages=data;headers=h;page=0;return c.getB1('rado balboa','RADO',false);};
  for(const p of ['$500','$ 500.00','$\u00a0500.00'])for(const s of ['Free','$ 30.00 75% Free shipping']){
    const b=await run([[row(p,s)]]);assert.equal(b.err,'');assert.equal(b.rows[0].p,500);
    assert.equal(b.rows[0].s,s==='Free'?0:30);assert.equal(b.rows[0].q,'7');assert.equal(b.rows[0].d,'Sep 25, 2026');
  }
  for(const dateHeader of ['DATE LAST SOLD','Last sold']){
    const b=await run([[[title,'Sep 24, 2026','$ 30.00','9','$ 500.00']]],['Title',dateHeader,'AVG SHIPPING','Total sold','Avg sold price (USD)']);
    const r=b.rows[0];assert.equal(r.p,500);assert.equal(r.s,30);assert.equal(r.q,'9');assert.equal(r.d,'Sep 24, 2026');
  }
  const partial=await run([[row('$500')]],['Title','Edit','Avg sold price']);
  assert.equal(partial.rows[0].q,'7');assert.equal(partial.rows[0].d,'Sep 25, 2026');
  const bad=await run([[row('—'),row('—')]]);
  assert.equal(bad.err,'B読めず（価格が読めない・rado balboa）');bad.rows.forEach(r=>assert.equal(r.why,'価格読めず'));
  c.setState({});const result=c.calc('RADO',[],bad.rows,bad.err);assert.equal(result.nm.b件数,0);assert.ok(result.備考.includes(bad.err));
  const mixed=await run([[row('$0'),row('—'),row('$500')]]);
  assert.equal(mixed.err,'');assert.equal(mixed.rows[0].why,'価格読めず');assert.equal(c.calc('RADO',[],mixed.rows,'').nm.b中央値,500);
  const paged=await run([Array.from({length:50},()=>row('—')),[row('$500')]]);assert.equal(paged.err,'');assert.equal(paged.rows.length,51);
  assert.equal((await run([[]])).err,'');
  console.log('PASS: B price whitespace, shipping, reordered/partial/missing headers, unreadable/zero prices, exclusion, warnings and pagination');
}
Promise.all([collectors(),startup(),prices()]).catch(e=>{console.error(e);process.exitCode=1});
