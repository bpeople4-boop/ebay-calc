// Run: node souba/souba_tool_v3.2.test.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8').replace(/\r\n/g,'\n');
const source=read('souba_tool_v3.2.js');
function api(src,extra='',env={}){
  const context={location:{hostname:'www.ebay.com'},window:{},localStorage:{getItem:()=>null},URL,...env};
  const prefix=src.slice(0,src.indexOf('/* ---------- 画面'));
  return vm.runInNewContext(prefix+`;return {cls,BRANDS,modelsFromText,modelsFromGallery,calc,calcG,grade,tukey,median,ceil,lab,gRe,${extra}setState:x=>S=x};})()`,context);
}
const a=api(source,'hGroup,H_GROUPS,rowReason,calcH,getA,getB,'),old=api(read('souba_tool_v3.1.js'));
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
const titles=['Kelly padlock','Kelly','Clipper 24mm gold','Clipper 26mm stainless','Clipper 24mm two-tone','Clipper 27mm','Clipper 34mm','Rallye','H-Watch','Arceau','Profil'];
titles.forEach((t,i)=>assert.equal(a.hGroup('Hermes '+t),a.H_GROUPS[i]));
for(const t of ['Clipper 24mm','Clipper 24.5mm'])assert.equal(a.hGroup('Hermes '+t),a.H_GROUPS[3]);
for(const t of ['Clipper 24mm gold steel','Clipper 24mm silver and gold'])assert.equal(a.hGroup('Hermes '+t),a.H_GROUPS[4]);
for(const t of ['H hour','Heure H','HH1.201'])assert.equal(a.hGroup('Hermès '+t),a.H_GROUPS[8]);
assert.equal(a.hGroup('Hermes Clipper'),'');assert.equal(a.hGroup('Other Clipper 24mm'),'');
const gallery=a.modelsFromGallery({lines:[{brand:'エルメス',name:'HH1.201',vars:a.H_GROUPS.map(区分=>({区分}))}]});
eq(gallery.set,['HERMES']);eq(gallery.hermesGroups,a.H_GROUPS);
a.setState({hermesGroups:gallery.hermesGroups,br:gallery.br});
const rows=titles.map(t=>({title:'Hermes '+t,k:'NM',why:'',usd:500,ship:0}));
const hr=a.calcH(rows,[],'');assert.equal(hr.length,11);
hr.forEach((r,i)=>{assert.equal(r.型番,'HERMES');assert.equal(r.区分,a.H_GROUPS[i]);assert.equal(r.nm.a件数,1);assert.ok(r.備考.endsWith('自動収集v3.2'));});
const sample=Array.from({length:5},(_,i)=>({title:'Gucci 1600 Near Mint',k:'NM',why:'',usd:500+i,ship:0,g:{cs:i%2?'金':'銀',dial:'黒',dia:false}}));
const gr=a.calcG('GUCCI 1600',sample,[],'');assert.equal(gr.length,1);assert.equal(gr[0].区分,'全体');assert.equal(gr[0].nm.a件数,5);assert.equal(gr[0].nm.ラベル,'暫定');
for(const m of models.slice(0,10)){const r=a.calcG('GUCCI '+m,[],[],'')[0];assert.equal(r.区分,m.startsWith('11/12')?'セット':'全体');}
// Compare the unchanged numerical implementation and results against v3.1.
const math=src=>src.slice(src.indexOf('function quart('),src.indexOf('function calc('));
assert.equal(math(source),math(read('souba_tool_v3.1.js')));
for(const v of [[],[100],[100,200],[100,200,300],[100,101,102,103,10000]]){
 eq(a.tukey(v),old.tukey(v));eq(a.grade(v,[200,210,220],[300,320,330],[],'nm'),old.grade(v,[200,210,220],[300,320,330],[],'nm'));
}
const html=read('相場収集ツール_登録_v3.2.html');
const encoded=html.match(/href="javascript:([^"]*)"/)[1].replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');
assert.equal(decodeURIComponent(encoded),source);
console.log('PASS: exclusions, model aliases, Gucci groups, sets, Hermes groups, unchanged calculations, bookmark payload');
// Exercise collection with DOM fixtures: query settings, page caps, deduplication,
// and the same set filter in both A and B, without contacting eBay.
async function collectors(){
  const urls=[],iframes=[];
  let fixtures=['Hermes Clipper 24mm Near Mint'];
  const date=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const card=title=>({textContent:'Sold '+date,
    querySelectorAll:()=>['Sold '+date,'Free shipping'].map(textContent=>({textContent,children:[]})),
    querySelector:sel=>sel.includes('__title')?{textContent:title}:sel.includes('__price')?{textContent:'$500'}:null});
  const env={setTimeout:fn=>fn(),fetch:async url=>{urls.push(new URL(url,'https://www.ebay.com'));return {text:async()=>''}},
    DOMParser:class{parseFromString(){return {body:{textContent:'2000 results for'},querySelectorAll:()=>fixtures.map(card)}}},
    document:{body:{appendChild:f=>iframes.push(new URL(f.src,'https://www.ebay.com'))},createElement:()=>({style:{},remove(){},
      contentDocument:{body:{innerText:''},querySelectorAll:()=>fixtures.map(title=>({querySelectorAll:()=>[title,'','$500','Free','1','','',date].map(innerText=>({innerText}))}))}})}};
  const c=api(source,'getA,getB,',env);
  const ar=await c.getA('HERMES');assert.equal(ar.length,1);assert.equal(urls.length,20);
  for(const u of urls){assert.equal(u.searchParams.get('_sacat'),'31387');assert.equal(u.searchParams.get('_ipg'),'240');assert.ok(+u.searchParams.get('_pgn')<=4);}
  eq([...new Set(urls.map(u=>u.searchParams.get('_nkw')))],['hermes watch near mint','hermes watch exc+5','hermes kelly watch','hermes clipper watch','hermes watch n mint']);
  const br=await c.getB('HERMES');assert.equal(br.rows.length,1);assert.equal(iframes.length,5);
  eq(iframes.map(u=>u.searchParams.get('keywords')),['hermes kelly watch','hermes clipper','hermes watch near mint','hermes h watch','hermes arceau']);
  for(const m of ['640L','GUCCI 11/12.2']){
    const stem=m==='640L'?'Fendi 640L':'Gucci 11/12.2';
    fixtures=[stem+' Near Mint full set',stem+' Near Mint'];
    const aa=await c.getA(m),bb=await c.getB(m);
    for(const rows of [aa,bb.rows]){assert.equal(rows.length,2);assert.equal(rows[0].why,'');assert.equal(rows[1].why,'セット以外');}
    const r=m==='640L'?c.calc(m,aa,bb.rows,''):c.calcG(m,aa,bb.rows,'')[0];
    assert.equal(r.区分,'セット');assert.equal(r.nm.a件数,1);assert.equal(r.nm.b件数,1);
  }
  console.log('PASS: A/B collection fixtures, Hermes queries and 4-page cap, deduplication, set-only counts');
}
collectors().catch(e=>{console.error(e);process.exitCode=1});
