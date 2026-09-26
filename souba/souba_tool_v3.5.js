(()=>{
/* 相場収集ツール v3.5 (2026-09-26)
   v3.2：除外語・型番ゆれ・セット判定・エルメス区分を追加。
   v3.2：eBayが価格を円で表示する場合に対応（本体価格も158円/ドルでドルに直す。これまではUK90日の落札をほぼ全部「ドル以外」で捨てていた）
   v3.1：ブランド設定表を追加（タグホイヤー・グッチ・ラドー・オリス・ロンジン・エルメス・ブルガリ・ディオール・フェンディ・セイコー）。
         グッチ 9040M はケース色で分けない／Ivory・Cream・White は1色（銀白）／文字盤の色の読み方を改善／
         棚卸しの写真確認（photoCheck）に印／EXC+5がNear MINTを1,000円以内で上回ったら同額にそろえる
   v3：グッチ対応。v2.1：呼び名・URLから型番を読む。v2：換算は反対側3件以上のときだけ／要目視の自動判定
   正本：claude/相場算出ルール_2026-09-19.md ／ 計算は claude/souba_calc.py と同一 */
if(location.hostname!=='www.ebay.com'){alert('www.ebay.com を開いてから押してください');return;}
if(window.__souba){window.__souba.show();return;}
const KEY='soubaTool_v3.2',RATE=158,COEF=106,FIXED=5000,RATIO=0.897,WAIT=2500;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||null}catch(e){return null}};
const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
let S=load(),stop=false,running=false;

/* ---------- 仕分け ---------- */
const EXCL=/\b(links?|bracelet links|parts|clasp|end link|click ring|movement only|watch case|spares|repairs|for service|refurbish|not running|junk|dial only|case only|buckle|strap only|band only|bezel only|crown only|hands only|belts? only|bands? only|straps? only|bracelet only)\b/i;
function cls(t){const s=t.replace(/＋/g,'+');if(EXCL.test(s))return'EXCL';if(/exc\s*\+\s*5/i.test(s))return'EXC5';if(/(near|n\.?)\s*mint/i.test(s))return'NM';if(/exc\s*\+\s*4/i.test(s))return'EXC4';if(/excellent\s*\+\+/i.test(s))return'EXCPP';if(/\bmint\b/i.test(s))return'MINT';return'NONE';}
const num=s=>+String(s).replace(/,/g,'');

/* ---------- 共通：型番のゆれを吸収した照合 ---------- */
/* 「129.0266.3」→ 129[.\s-]?0266[.\s-]?3 のように、点・スペース・ハイフンの違いを無視して探す */
function looseRe(model,opt){
  const parts=String(model).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const body=parts.join('[.\\s\\-]?');
  const tail=(opt&&opt.tail)||'(?![A-Z0-9])';
  return new RegExp('(?:^|[^A-Z0-9])'+body+tail,'i');
}
const anyRe=list=>new RegExp(list.map(r=>r.source).join('|'),'i');

/* ---------- ブランド設定表（ここに1行足せば新しいブランドが通る） ---------- */
/* pat: 型番と認める形（全体一致）／terms: eBayの検索語／re: タイトル照合／split: 区分に分けるか／cap: ラベルの上限 */
const isNew=m=>/^[A-Z]{2}\d{4}$/.test(m);
const BRANDS=[
 {key:'TAG',brand:'タグホイヤー',word:/tag\s?heuer|タグホイヤー/i,
  pat:/^([A-Z]{2}\d{4}|[A-Z]?\d{2,3}\.\d{3})$/i,
  terms:m=>isNew(m)?[m,m+'-0',m+'-K0']:[m],
  re:m=>isNew(m)?new RegExp(m.slice(0,2)+'\\s?-?'+m.slice(2),'i'):new RegExp(m.replace(/^([A-Z]?)(\d+)\.(\d+)$/,'$1\\s?$2[.\\s-]?$3'),'i'),
  pages:3},
 {key:'GUCCI',brand:'グッチ',word:/gucci|グッチ/i,
  pat:/^(?:11\/12(?:\.2)?|\d{3,4}(?:\.\d\.?)?[LMS]?)$/i,prefix:'GUCCI ',
  terms:m=>gTerms(m),re:m=>gRe(m),split:true,cap:'暫定',pages:5},
 {key:'RADO',brand:'RADO',word:/\brado\b|ラドー/i,
  pat:/^(\d{3}[.\s-]?\d{4}([.\s-]?\d[A-Z]?)?|1\d{4}(\/\d)?)$/i,
  terms:m=>['rado '+m],re:m=>looseRe(m,{tail:'[A-Z]?(?![A-Z0-9])'}),pages:3},
 {key:'ORIS',brand:'オリス',word:/\boris\b|オリス/i,
  pat:/^(\d{3}-)?\d{4}[A-Z]?$/i,
  terms:m=>{const t=m.replace(/^\d{3}-/,'');return t==='7400'?['oris '+m,'oris 7400B','oris 7400C','oris 7403-40B','oris 302-7285B']:t===m?['oris '+m]:['oris '+t,'oris '+m]},
  re:m=>{const t=m.replace(/^\d{3}-/,'');
    /* 7400 の追加別表記は依頼された対応表に基づく。 */
    if(t==='7400')return /(?<![A-Z0-9])(?:(?:\d{3}-)?7400(?:[A-Z]|-\d{2}[A-Z]?)?|7403-40B|302-7285B)(?![0-9])/i;
    return new RegExp('(?<![A-Z0-9])(?:\\d{3}-)?'+t+'(?:[A-Z]|-\\d{2}[A-Z]?)?(?![0-9])','i');},pages:3},
 {key:'LONGINES',brand:'ロンジン',word:/longines|ロンジン/i,
  pat:/^(L\s?\d[.\s-]?\d{3}([.\s-]?\d)?|\d{4})$/i,
  terms:m=>['longines '+m],re:m=>looseRe(m),pages:3},
 {key:'HERMES',brand:'エルメス',word:/hermes|hermès|エルメス/i,
  pat:/^[A-Z]{2}\d[.\s-]?\d{3}$/i,
  terms:m=>['hermes '+m],re:m=>looseRe(m),pages:3},
 {key:'BVLGARI',brand:'ブルガリ',word:/bvlgari|bulgari|ブルガリ/i,
  pat:/^(AL\d{2}[A-Z]{1,2}|BB\d{2}[A-Z]{0,3}|ST\d{2}[A-Z]{0,2}|EG\d{2}[A-Z]{0,2}|RT\d{2}[A-Z]{0,2})$/i,
  terms:m=>m==='AL32TA'?['bulgari '+m,'bvlgari AL32A']:['bulgari '+m],re:m=>m==='AL32TA'?/(?<![A-Z0-9])AL\s?32\s?T?A(?![A-Z0-9])/i:looseRe(m),pages:3},
 {key:'DIOR',brand:'ディオール',word:/dior|ディオール/i,
  pat:/^D\d{2,3}(-\d{2,3})?$/i,
  terms:m=>m==='D48'?['dior D48','christian dior octagon','dior 48.203','dior 48.133']:['dior '+m],re:m=>m==='D48'?/(?<![A-Z0-9])(D\s?-?48(?![0-9])|48\.\d{3}(?![0-9]))/i:looseRe(m),pages:3},
 {key:'FENDI',brand:'フェンディ',word:/fendi|フェンディ/i,
  pat:/^\d{3}[LG]$/i,
  terms:m=>['fendi '+m],
  /* 900L の検索に 900G が混ざらないよう、末尾の L/G を厳密に見る */
  re:m=>new RegExp('(?:^|[^A-Z0-9])'+m.slice(0,3)+'\\s?[.\\-]?\\s?'+m.slice(3)+'(?![A-Z0-9])','i'),pages:3},
 {key:'SEIKO',brand:'セイコー',word:/seiko|セイコー/i,
  pat:/^[0-9A-Z]{4}-[0-9A-Z]{4}$/i,
  terms:m=>['seiko '+m],re:m=>looseRe(m),pages:3},
];
const byKey=k=>BRANDS.find(b=>b.key===k);
const byBrand=b=>BRANDS.find(x=>x.brand===b);
/* 保存する型番の書き方：グッチだけ「GUCCI 1500L」。他はそのまま */
const cfgOf=m=>m==='HERMES'?byKey('HERMES'):m==='RADO'?byKey('RADO'):/^GUCCI /.test(m)?byKey('GUCCI'):(S&&S.br&&S.br[m]?byKey(S.br[m]):BRANDS.find(b=>b.key!=='GUCCI'&&b.pat.test(m))||byKey('TAG'));
const isGucci=m=>/^GUCCI /.test(m);

/* ---------- グッチ（v3から継続） ---------- */
const MERGE_BARE={'1500L':1};      /* 末尾のL/Mなしの表記もまとめて数えるモデル */
const NO_CASE_SPLIT={'9040M':1};   /* ケース色で分けないモデル（2026-09-23 決定） */
const gModel=m=>m.replace(/^GUCCI /,'');
function gRe(m){const g=gModel(m);
  if(/^11\/12(?:\.2)?$/.test(g))return new RegExp('(?<![A-Z0-9.])'+g.replace('.', '\\.')+'(?![A-Z0-9]|\\.\\d)','i');
  const x=g.match(/^(\d{3,4})(?:\.(\d)\.?)?([LMS])?$/);if(!x)return/$^/;
  const sub=x[2]?'[.\\s-]?'+x[2]:'',suf=x[3]?`\\s?[.\\-]?\\s?${x[3]}`:'';
  const tail=MERGE_BARE[g]?`(?:${suf})?`:suf;
  return new RegExp(`(?<![A-Z0-9.])${x[1]}${sub}${tail}(?![A-Z0-9]|\\.\\d|\\s?[.\\-]?\\s?[LMS]\\b)`,'i');}
const G_ALL=new Set(['11/12','11/12.2','6000.2.L','9040L','9200M','1600','5500M','2600L','2400S','7200L']);
const FENDI_SET=/change(able)?\s*belts?|interchangeable|extra\s*(belts?|bands?|straps?)|(belts?|bands?|straps?)\s*(set|\d)|\d+\s*(pcs\s*)?(colou?rs?|belts?|bands?|straps?)|chameleon|full set|with\s+(\d+\s*)?(belts?|bands?|straps?)/i;
const GUCCI_SET=/(\d+)\s*(pcs\s*)?(colou?rs?|bezels?)|bezels?\s*(set|\d)|interchangeable|full set|with\s+(\d+\s*)?(extra\s*)?bezels?/i;
const setRe=m=>isGucci(m)&&/^11\/12(?:\.2)?$/.test(gModel(m))?GUCCI_SET:cfgOf(m).key==='FENDI'&&m==='640L'?FENDI_SET:null;
const H_GROUPS=['ケリー カデナ'];
const H_TERMS_A=['hermes kelly watch','hermes watch near mint','hermes watch exc+5','hermes watch n mint'];
const H_TERMS_B=['hermes kelly watch','hermes kelly cadena'];
function hGroup(t){
  if(!/\bherm[eè]s\b/i.test(t)||looseRe('KE1.210').test(t))return '';
  return /kelly/i.test(t)&&/cadena|padlock/i.test(t)?H_GROUPS[0]:'';
}
const R_GROUPS=['ラドー バルボア','ラドー ゴールデンホース'];
const R_TERMS=['rado balboa','rado golden horse'];
function rGroup(t){
  if(!/\brado\b/i.test(t))return '';
  if(/balboa/i.test(t))return R_GROUPS[0];
  return /golden[\s-]?horse/i.test(t)?R_GROUPS[1]:'';
}
const titleRe=m=>m==='HERMES'?/\bherm[eè]s\b/i:m==='RADO'?/\brado\b/i:cfgOf(m).re(m);
function rowReason(m,t){if(!titleRe(m).test(t))return '型番違い';const set=setRe(m);return set&&!set.test(t)?'セット以外':'';}

const gTerms=m=>{const g=gModel(m);return MERGE_BARE[g]?['gucci '+g,'gucci '+g.replace(/[LM]$/,'')]:['gucci '+g];};
/* タイトル → ケース色・文字盤・ダイヤ（v3.1：色の読み方を改善。Ivory/Cream/White は銀白にまとめる） */
const DIALCOL={black:'黒',white:'銀白',grey:'銀白',gray:'銀白',ivory:'銀白',cream:'銀白',silver:'銀白',gold:'金',champagne:'金',
  pink:'その他',blue:'その他',green:'その他',red:'その他',navy:'その他',bordeaux:'その他',brown:'その他',purple:'その他',orange:'その他',yellow:'その他'};
const COLWORDS='black|white|grey|gray|ivory|cream|silver|gold|champagne|pink|blue|green|red|navy|bordeaux|brown|purple|orange|yellow';
function gkey(t){const s=' '+String(t).replace(/[【】\[\]()（）*"!]/g,' ')+' ';
  const dia=/diamond|\b1\s?P\b|\bdia\b/i.test(s);
  const gold=/\bgold\b|\bGP\b|gold[- ]?(tone|plated)/i.test(s),silv=/\bsilver\b|stainless|\bsteel\b|\bSS\b/i.test(s);
  const cs=gold&&!silv?'金':silv&&!gold?'銀':'不明';
  let dial=null;
  /* ① 「<色> Dial」を最優先 */
  const md=s.match(new RegExp('\\b(shell|mop|pearl|gg|logo|'+COLWORDS+')\\s+(dial|face)\\b','i'));
  if(md){const w=md[1].toLowerCase();dial=/shell|mop|pearl/.test(w)?'パール':(/gg|logo/.test(w)?'その他':DIALCOL[w]||'その他');}
  /* ② パール系の言葉 */
  if(!dial&&/\b(shell|mop|pearl|mother of pearl)\b/i.test(s))dial='パール';
  /* ③ ケース色以外で最初に出る色（Leather/Belt/Strap/Band が続く色は飛ばす） */
  if(!dial){const re=new RegExp('\\b('+COLWORDS+')\\b(?!\\s*(leather|belt|strap|band|bracelet))','ig');let m2;
    while((m2=re.exec(s))){const w=m2[1].toLowerCase(),v=DIALCOL[w];
      if(cs==='金'&&(w==='gold')) continue;
      if(cs==='銀'&&(w==='silver')) continue;
      if(v){dial=v;break;}}}
  /* ④ 分からなければケース色から推定 */
  if(!dial)dial=cs==='金'?'金':cs==='銀'?'銀白':'その他';
  return{cs,dial,dia};}
const G_GROUPS=[
  ['金メッキ×全文字盤（ダイヤなし）',g=>!g.dia&&g.cs==='金'],
  ['金メッキ×パール',g=>!g.dia&&g.cs==='金'&&g.dial==='パール'],
  ['金メッキ×黒',g=>!g.dia&&g.cs==='金'&&g.dial==='黒'],
  ['金メッキ×金',g=>!g.dia&&g.cs==='金'&&g.dial==='金'],
  ['金メッキ×銀白',g=>!g.dia&&g.cs==='金'&&g.dial==='銀白'],
  ['金メッキ×その他',g=>!g.dia&&g.cs==='金'&&g.dial==='その他'],
  ['シルバー×全文字盤（ダイヤなし）',g=>!g.dia&&g.cs==='銀'],
  ['シルバー×パール',g=>!g.dia&&g.cs==='銀'&&g.dial==='パール'],
  ['シルバー×黒',g=>!g.dia&&g.cs==='銀'&&g.dial==='黒'],
  ['シルバー×銀白',g=>!g.dia&&g.cs==='銀'&&g.dial==='銀白'],
  ['シルバー×金',g=>!g.dia&&g.cs==='銀'&&g.dial==='金'],
  ['シルバー×その他',g=>!g.dia&&g.cs==='銀'&&g.dial==='その他'],
  ['ダイヤ入り（ケース問わず）',g=>g.dia]];
/* ケース色で分けないモデル用（9040M） */
const G_GROUPS_NOCASE=[
  ['全文字盤（ケース色でまとめる・ダイヤなし）',g=>!g.dia],
  ['パール',g=>!g.dia&&g.dial==='パール'],
  ['黒',g=>!g.dia&&g.dial==='黒'],
  ['金',g=>!g.dia&&g.dial==='金'],
  ['銀白',g=>!g.dia&&g.dial==='銀白'],
  ['その他',g=>!g.dia&&g.dial==='その他'],
  ['ダイヤ入り',g=>g.dia]];
const matchRe=m=>cfgOf(m).re(isGucci(m)?m:m);

/* ---------- A：UK 90日（ebay.com Sold＋BIN） ---------- */
async function getA(m){
  const cfg=cfgOf(m),rows={},cut=new Date();cut.setHours(0,0,0,0);cut.setDate(cut.getDate()-90);
  const terms=m==='HERMES'?H_TERMS_A:m==='RADO'?R_TERMS:cfg.terms(m),maxPg=m==='HERMES'?4:m==='RADO'?2:cfg.pages||3,ipg=m==='HERMES'||m==='RADO'?240:60;
  for(const term of terms){
    for(let pg=1;pg<=maxPg;pg++){
      const h=await fetch(`/sch/i.html?_nkw=${encodeURIComponent(term)}&LH_Sold=1&LH_BIN=1&_ipg=${ipg}${m==='HERMES'||m==='RADO'?'&_sacat=31387':''}&_blrs=spell_auto_correct&_pgn=${pg}`,{credentials:'include'}).then(r=>r.text());
      await sleep(WAIT);
      const d=new DOMParser().parseFromString(h,'text/html');
      const head=num((d.body.textContent.match(/([\d,]+)\+?\s*results?\s+for/)||[,'0'])[1]);
      const cards=[...d.querySelectorAll('li.s-card, li.s-item')].filter(e=>/Sold\s/.test(e.textContent)).slice(0,Math.max(0,head-(pg-1)*ipg));
      let old=0;
      for(const e of cards){
        const texts=[...e.querySelectorAll('span,div')].filter(x=>!x.children.length).map(x=>x.textContent.trim()).filter(Boolean);
        const all=texts.join(' | ');
        const title=((e.querySelector('.s-card__title, .s-item__title')||{}).textContent||'').replace(/Opens in a new window or tab/,'').trim();
        const dm=all.match(/Sold\s+(\w{3} \d{1,2}, \d{4})/);const date=dm?new Date(dm[1]):null;
        const priceEl=e.querySelector('.s-card__price, .s-item__price');const pr=priceEl?priceEl.textContent.trim():'';
        /* v3.2：本体価格が円表示（JPY 51,929／￥51,929）のときも158円/ドルでドルに直す（送料と同じ扱い） */
        let usd=null;
        if(/^\$[\d,.]+$/.test(pr))usd=num(pr.slice(1));
        else{const jp=pr.match(/^(?:JPY|¥|￥)\s?([\d,]+)/i);if(jp)usd=num(jp[1])/RATE;}
        const bo=!!e.querySelector('[class*="strikethrough"],[class*="STRIKETHROUGH"],s,del')||/Best offer accepted/i.test(all);
        let ship=null;const j=all.match(/\+\s*JPY\s?([\d,]+)/),u=all.match(/\+\s*\$([\d,.]+)\s*(shipping|delivery)/i);
        if(j)ship=num(j[1])/RATE;else if(u)ship=num(u[1]);else if(/Free[^|]*(shipping|delivery)/i.test(all))ship=0;
        const r={d:dm?dm[1]:'',title,pr,usd,ship,bo,k:cls(title)};
        if(isGucci(m))r.g=gkey(title);
        let why=rowReason(m,title);
        if(!why){if(!date||date<cut)why='90日外';else if(bo)why='Best offer';else if(usd===null)why='ドル以外';else if(ship===null)why='送料不明';}
        if(date&&date<cut)old++;
        r.why=why;rows[r.d+'|'+title+'|'+pr]=r;
      }
      if(head<=pg*ipg)break;
      if(cards.length&&old>=cards.length*0.8)break; /* ほぼ90日外になったら次の検索語へ */
    }
  }
  return Object.values(rows);
}

/* ---------- B：US 1年（プロダクトリサーチ） ---------- */
async function getB1(kw,m,g){
  const out=[],end=Date.now(),start=end-31536000000;
  for(let off=0;off<500;off+=50){
    const f=document.createElement('iframe');f.style.cssText='position:fixed;left:-4000px;top:0;width:1300px;height:900px';
    f.src=`/sh/research?marketplace=EBAY-US&keywords=${encodeURIComponent(kw)}&dayRange=365&startDate=${start}&endDate=${end}&format=FIXED_PRICE&offset=${off}&limit=50&tabName=SOLD&tz=Asia%2FTokyo`;
    document.body.appendChild(f);let rows=[],ok=false,doc;
    for(let i=0;i<25;i++){await sleep(1000);try{doc=f.contentDocument}catch(e){break}
      if(!doc||!doc.body)continue;rows=[...doc.querySelectorAll('tr.research-table-row')];
      if(rows.length){await sleep(800);rows=[...doc.querySelectorAll('tr.research-table-row')];ok=true;break;}
      if(i>=8&&/No sold|no results|0 results|couldn't find/i.test(doc.body.innerText)){ok=true;break;}}
    const headers=[...doc?.querySelectorAll('th')||[]].map(th=>(th.innerText||th.textContent||'').replace(/\s+/g,' ').trim().toLowerCase());
    const col=(name,fallback)=>{const i=headers.findIndex(h=>h.includes(name));return i<0?fallback:i;};
    const priceCol=col('avg sold price',2),shipCol=col('avg shipping',3),soldCol=col('total sold',4),dateCol=col('date last sold',col('last sold',7));
    const got=rows.map(r=>{const c=[...r.querySelectorAll('td')].map(td=>td.innerText.replace(/\s+/g,' ').trim());const title=(c[0]||'').replace(/^, preview full size image /,'');
      const p=num((c[priceCol]||'').match(/\$\s*([\d,.]+)/)?.[1]||0),s=/Free/.test((c[shipCol]||'').split('%')[0])?0:num((c[shipCol]||'').match(/\$\s*([\d,.]+)/)?.[1]||0);
      const o={title,p,s,q:c[soldCol]||'',d:c[dateCol]||'',k:cls(title),why:Number.isFinite(p)&&p>0?rowReason(m,title):'価格読めず'};if(g)o.g=gkey(title);return o;});
    f.remove();out.push(...got);
    if(!ok)return {rows:out,err:out.length&&!out.some(r=>Number.isFinite(r.p)&&r.p>0)?'B読めず（価格が読めない・'+kw+'）':'B読めず（'+kw+'・'+off+'件目から）'};
    if(got.length<50)break;await sleep(WAIT);
  }
  return {rows:out,err:out.length&&!out.some(r=>Number.isFinite(r.p)&&r.p>0)?'B読めず（価格が読めない・'+kw+'）':''};
}
async function getB(m){
  const cfg=cfgOf(m);
  if(!isGucci(m)){const terms=m==='HERMES'?H_TERMS_B:m==='RADO'?R_TERMS:cfg.terms(m);const seen={},rows=[],errs=[];
    for(const kw of terms){const b=await getB1(kw,m,false);if(b.err)errs.push(b.err);
      b.rows.forEach(r=>{const k=r.title+'|'+r.d+'|'+r.p;if(!seen[k]){seen[k]=1;rows.push(r);}});}
    return {rows,err:errs.join('／')};}
  const seen={},rows=[],errs=[];
  for(const kw of gTerms(m)){const b=await getB1(kw,m,true);if(b.err)errs.push(b.err);
    b.rows.forEach(r=>{const k=r.title+'|'+r.d+'|'+r.p;if(!seen[k]){seen[k]=1;rows.push(r);}});}
  return {rows,err:errs.join('／')};
}

/* ---------- 計算（souba_calc.py と同じ） ---------- */
function quart(x,p){const n=x.length,pos=(n-1)*p,lo=Math.floor(pos);return lo+1<n?x[lo]+(x[lo+1]-x[lo])*(pos-lo):x[lo];}
function tukey(v){const x=[...v].sort((a,b)=>a-b);if(x.length<4)return{keep:x,out:[]};const q1=quart(x,.25),q3=quart(x,.75),i=q3-q1;
  return{keep:x.filter(a=>a>=q1-1.5*i&&a<=q3+1.5*i),out:x.filter(a=>a<q1-1.5*i||a>q3+1.5*i)};}
function median(x){const n=x.length;if(!n)return null;const s=[...x].sort((a,b)=>a-b);return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;}
const summ=x=>{const t=tukey(x);return{n:x.length,keep:t.keep,out:t.out,med:median(t.keep)};};
const ceil=u=>Math.floor((u*COEF-FIXED)/500)*500;
const lab=n=>n>=5?'確定':n>=3?'暫定':n>=1?'参考':'なし';
const r2=v=>v==null?null:Math.round(v*100)/100;
function grade(a,b,oa,ob,other){
  const A=summ(a),B=summ(b),res={a件数:A.n,a中央値:r2(A.med),b件数:B.n,b中央値:r2(B.med)};let src,S2x;
  if(A.n>=3){src='UK90日';S2x=A}else if(B.n>=3){src='US1年';S2x=B}else{
    const OA=summ(oa),OB=summ(ob),O=OA.n>=OB.n?OA:OB,own=Math.max(A.n,B.n);
    if(O.med!=null&&(O.n>=3||own===0)){const med=other==='nm'?O.med*RATIO:O.med/RATIO;
      Object.assign(res,{上限:ceil(med),採用元:'換算',ラベル:O.n<3?'参考':'暫定',最小:r2(Math.min(...O.keep)),最大:r2(Math.max(...O.keep))});return{res,A,B};}
    const S3=A.n>=B.n?A:B;if(!S3.n){Object.assign(res,{上限:null,ラベル:'なし'});return{res,A,B};}
    src=S3===A?'UK90日':'US1年';S2x=S3;}
  Object.assign(res,{上限:ceil(S2x.med),採用元:src,ラベル:lab(S2x.keep.length),最小:r2(Math.min(...S2x.keep)),最大:r2(Math.max(...S2x.keep))});return{res,A,B,used:S2x.med};
}
function calc(m,Arows,Brows,berr){
  const okA=Arows.filter(r=>!r.why),okB=Brows.filter(r=>!r.why);
  const val=(rows,k,isA)=>rows.filter(r=>r.k===k).map(r=>isA?r.usd+r.ship:r.p+r.s);
  const aE=val(okA,'EXC5',1),aN=val(okA,'NM',1),bE=val(okB,'EXC5'),bN=val(okB,'NM');
  const e=grade(aE,bE,aN,bN,'nm'),n=grade(aN,bN,aE,bE,'exc5');
  const cnt=rows=>rows.reduce((o,r)=>(o[r.k]=(o[r.k]||0)+1,o),{});const cB=cnt(okB),cA=cnt(okA);
  const skipA=Arows.filter(r=>r.why&&r.why!=='型番違い'&&(r.k==='EXC5'||r.k==='NM')).map(r=>`${r.why}:${r.k==='EXC5'?'EXC+5':'NM'} ${r.d} ${r.pr}`);
  const notes=[];
  [['EXC+5',e],['Near MINT',n]].forEach(([g,x])=>{if(x.res.a件数>=3&&x.res.b件数>=3){const d=x.res.b中央値/x.res.a中央値-1;if(Math.abs(d)>0.15)notes.push(`要目視：${g}のUS/UK差${(d*100).toFixed(1)}%`);}
    const o=[...x.A.out.map(v=>'A$'+r2(v)),...x.B.out.map(v=>'B$'+r2(v))];if(o.length)notes.push(`${g}外れ値除外 ${o.join('/')}`);});
  /* 要目視の自動判定（v2） */
  if(e.used&&n.used){const q=e.used/n.used;if(q<0.75||q>1.05)notes.push(`要目視：EXC+5とNear MINTの比${q.toFixed(2)}（通常0.75〜1.05）`);}
  /* v3.3：上限が逆転したら EXC+5 を Near MINT と同額に下げる */
  if(e.res.上限!=null&&n.res.上限!=null&&e.res.上限>n.res.上限){const original=e.res.上限,diff=original-n.res.上限;
    e.res.上限=n.res.上限;
    notes.push(`逆転のためEXC+5をNear MINTにそろえた（元のEXC+5：${original.toLocaleString('ja-JP')}円）`);
    if(diff>1000)notes.push(`要目視：EXC+5がNear MINTを${diff.toLocaleString('ja-JP')}円上回っていた`);}
  [['EXC+5',e],['Near MINT',n]].forEach(([g,x])=>{const r=x.res;
    if(r.最小>0&&r.最大/r.最小>1.5)notes.push(`要目視：${g}の落札の幅が広い（$${r.最小}〜$${r.最大}）`);
    if(r.上限>=80000)notes.push(`要目視：${g}の上限が高額（${r.上限.toLocaleString()}円）`);});
  if(berr)notes.push(berr);
  notes.push(`A（UK90日）内訳 EXC+5 ${cA.EXC5||0}・NM ${cA.NM||0}・MINT ${cA.MINT||0}・無表記 ${cA.NONE||0}`);
  if(skipA.length)notes.push('A除外 '+skipA.join('／'));
  notes.push('その他件数はB（US1年）。自動収集v3.5');
  return{型番:m,区分:setRe(m)?'セット':'全体',exc5:e.res,nm:n.res,その他件数:{mint:cB.MINT||0,exc4:cB.EXC4||0,excellentpp:cB.EXCPP||0,無表記:cB.NONE||0},備考:notes.join('。')};
}
/* グッチ：区分ごとに calc を回す。ラベルは最高でも暫定 */
function calcG(m,Arows,Brows,berr){
  if(G_ALL.has(gModel(m))){
    const set=setRe(m),keep=r=>(!set||set.test(r.title));
    const res=calc(m,Arows.filter(keep),Brows.filter(keep),berr);
    ['exc5','nm'].forEach(k=>{if(res[k].ラベル==='確定')res[k].ラベル='暫定';});
    res.区分=set?'セット':'全体';return [res];
  }
  const out=[],okA=Arows.filter(r=>!r.why),okB=Brows.filter(r=>!r.why);
  const nocase=!!NO_CASE_SPLIT[gModel(m)];
  const groups=nocase?G_GROUPS_NOCASE:G_GROUPS;
  const unk=[...okA,...okB].filter(r=>(r.k==='EXC5'||r.k==='NM')&&r.g&&r.g.cs==='不明'&&!r.g.dia).length;
  const hasData=f=>[...okA,...okB].some(r=>(r.k==='EXC5'||r.k==='NM')&&r.g&&f(r.g));
  for(const [name,f] of groups){if(!hasData(f))continue;
    const res=calc(m,Arows.filter(r=>r.g&&f(r.g)),Brows.filter(r=>r.g&&f(r.g)),berr);
    ['exc5','nm'].forEach(k=>{if(res[k].ラベル==='確定')res[k].ラベル='暫定';});
    res.区分=name;
    res.備考=`グッチ区分：${name}（タイトルの文字で自動仕分け。ラベルは最高でも暫定。${nocase?'このモデルはケース色で分けない。':`ケース色不明で数えなかったもの${unk}件`}）。`+res.備考;
    out.push(res);}
  if(!out.length)out.push({型番:m,区分:'（該当なし）',exc5:{上限:null,ラベル:'なし'},nm:{上限:null,ラベル:'なし'},その他件数:{},備考:`EXC+5・Near MINTの落札が見つからない。ケース色不明${unk}件。自動収集v3.5`});
  return out;
}

function calcH(Arows,Brows,berr){
  return (S.hermesGroups||H_GROUPS).map(name=>{
    const res=calc('HERMES',Arows.filter(r=>hGroup(r.title)===name),Brows.filter(r=>hGroup(r.title)===name),berr);
    res.区分=name;return res;
  });
}

function calcR(Arows,Brows,berr){
  return (S.radoGroups&&S.radoGroups.length?S.radoGroups:R_GROUPS).map(name=>{
    const res=calc('RADO',Arows.filter(r=>rGroup(r.title)===name),Brows.filter(r=>rGroup(r.title)===name),berr);
    res.区分=name;return res;
  });
}

/* ---------- 型番リスト ---------- */
const clean=t=>String(t||'').toUpperCase().replace(/[（）()【】\[\]]/g,' ').trim();
/* 文字列の中から、指定ブランドの型番を探す */
function findFor(cfg,text){
  const s=clean(text);if(!s)return'';
  const toks=s.split(/[\s、,]+/).filter(Boolean);
  for(const tk of toks){const t=tk.replace(/[^A-Z0-9./\-]/g,'');if(t&&cfg.pat.test(t))return (cfg.prefix||'')+t;}
  /* 単語で切れない場合（「RADO129.0266.3」など）は正規表現で拾う */
  const mm=s.match(new RegExp(cfg.pat.source.replace(/^\^/,'').replace(/\$$/,''),'i'));
  return mm?(cfg.prefix||'')+mm[0]:'';
}
/* ギャラリーJSON → 型番リスト（行の brand で設定を選ぶ） */
function modelsFromGallery(obj){const lines=Array.isArray(obj)?obj:obj.lines||[],set=[],skip=[],br={},photo={},hermesGroups=[],radoGroups=[];
  lines.forEach(l=>{const cfg=byBrand(l.brand);
    (l.vars||[]).forEach(v=>{
      const group=v['区分']||v.label;
      if((cfg&&cfg.key==='HERMES'||byKey('HERMES').word.test(l.brand||''))&&H_GROUPS.includes(group)){
        if(!set.includes('HERMES'))set.push('HERMES');br.HERMES='HERMES';
        if(!hermesGroups.includes(group))hermesGroups.push(group);
        if(v.photoCheck)photo.HERMES=1;return;
      }
      if((cfg&&cfg.key==='RADO'||byKey('RADO').word.test(l.brand||''))&&R_GROUPS.includes(group)){
        if(!set.includes('RADO'))set.push('RADO');br.RADO='RADO';
        if(!radoGroups.includes(group))radoGroups.push(group);
        if(v.photoCheck)photo.RADO=1;return;
      }
      let q='';if(v.ebay){try{q=new URL(v.ebay).searchParams.get('_nkw')||''}catch(e){}}
      let m='';
      if(cfg)m=[v['型番'],l.name,v.label,q].map(x=>findFor(cfg,x)).find(Boolean)||'';
      if(!m){for(const c of BRANDS){const x=[v['型番'],v.label,q].map(y=>findFor(c,y)).find(Boolean);if(x){m=x;if(!cfg)br[x]=c.key;break;}}}
      if(m){if(cfg)br[m]=cfg.key;if(!set.includes(m))set.push(m);if(v.photoCheck)photo[m]=1;}
      else skip.push(`${l.brand}/${l.name}/${v.label||'（呼び名なし）'}`);});});
  return{set,skip,br,photo,hermesGroups,radoGroups};}
/* 手入力 → 型番リスト（ブランド名が書いてあればそれを優先） */
function modelsFromText(t){const out=[],br={};
  t.split(/[\n,、]+/).map(s=>s.trim()).filter(Boolean).forEach(s=>{
    if(rGroup(s)){if(!out.includes('RADO'))out.push('RADO');br.RADO='RADO';return;}
    const named=BRANDS.find(b=>b.word.test(s));
    const cands=named?[named]:BRANDS;
    for(const c of cands){const m=findFor(c,named?s.replace(c.word,' '):s);
      if(m){out.push(m);br[m]=c.key;break;}}});
  return{out,br};}

/* ---------- 画面 ---------- */
const box=document.createElement('div');box.id='souba-box';
box.innerHTML=`<style>#souba-box{position:fixed;right:16px;top:16px;z-index:2147483647;width:470px;max-height:90vh;overflow:auto;background:#161b24;color:#e4e8f4;font:13px/1.6 sans-serif;border:1px solid #f5a623;border-radius:10px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.5)}#souba-box h3{margin:0 0 8px;color:#f5a623;font-size:14px}#souba-box button{background:#f5a623;color:#000;border:0;border-radius:6px;padding:6px 10px;margin:4px 4px 0 0;font-weight:700;cursor:pointer}#souba-box button.s{background:#2a3348;color:#e4e8f4}#souba-box textarea{width:100%;box-sizing:border-box;background:#0d1117;color:#e4e8f4;border:1px solid #2a3348;border-radius:6px;font:12px monospace}#souba-box table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}#souba-box td,#souba-box th{border-bottom:1px solid #2a3348;padding:2px 4px;text-align:left}#souba-box .m{color:#6e7a9e;font-size:12px}</style>
<h3>相場収集ツール <span class="m">v3.5</span><button class="s" id="sb-x" style="float:right">閉じる</button></h3>
<div class="m">ギャラリーの書き出しJSONを選ぶか、型番を並べて入力（改行・カンマ区切り）。ブランド名を頭に付けると確実（例：gucci 1500L／rado 129.0266.3／oris 7400B／fendi 640L）。Ship To=UK・Convert prices to JPY のチェックなしを確認してから開始。旧版のパネルがある場合はページを再読み込みしてください。</div>
<input type="file" id="sb-f" accept=".json"><textarea id="sb-t" rows="3" placeholder="例：WK1312, gucci 1500L, rado 129.0266.3, oris 7400B"></textarea>
<div><button id="sb-go">開始</button><button class="s" id="sb-stop">一時停止</button><button class="s" id="sb-reset">最初からやり直す</button></div>
<div id="sb-st" style="margin-top:8px"></div><table id="sb-tb"></table>
<div id="sb-out" style="display:none;margin-top:8px"><b>ギャラリー取り込み用JSON</b><textarea id="sb-j" rows="6" readonly></textarea><button id="sb-copy">コピー</button><button class="s" id="sb-dl">ファイルで保存</button></div>`;
document.body.appendChild(box);
const $=id=>box.querySelector('#'+id);
window.__souba={show:()=>{box.style.display='block'}};
$('sb-x').onclick=()=>{box.style.display='none'};

const flat=m=>[].concat(S.res[m]);
function render(){
  if(!S){$('sb-st').textContent='待機中';$('sb-tb').innerHTML='';$('sb-out').style.display='none';return;}
  const errs=Object.keys(S.err||{}),done=Object.keys(S.res).length+errs.length;
  $('sb-st').innerHTML=`調査日 ${S.date}／${done} / ${S.models.length} 型番 ${running?'<b style="color:#3fb950">実行中…</b>':(done<S.models.length?'（一時停止中。「開始」で続きから）':'<b style="color:#3fb950">完了</b>')}${S.skip.length?`<div class="m">対象外（型番の形でない）${S.skip.length}件：${S.skip.slice(0,6).join('、')}${S.skip.length>6?' …':''}</div>`:''}`;
  const f=x=>x.上限==null?'—':`${x.上限.toLocaleString()} <span class="m">${x.ラベル}/${x.採用元||''}</span>`;
  $('sb-tb').innerHTML='<tr><th>型番</th><th>EXC+5</th><th>Near MINT</th><th></th></tr>'+S.models.filter(m=>S.res[m]).map(m=>flat(m).map(r=>
    `<tr><td>${m.replace(/^GUCCI /,'G ')}${r.区分?`<div class="m">${r.区分}</div>`:''}</td><td>${f(r.exc5)}</td><td>${f(r.nm)}</td><td>${/棚卸し：写真確認/.test(r.備考)?'📷':''}${/要目視|読めず/.test(r.備考)?'⚠':''}</td></tr>`).join('')).join('')+errs.map(m=>`<tr><td>${m}</td><td colspan="3" style="color:#f87171">読めず：${S.err[m]}</td></tr>`).join('');
  if(Object.keys(S.res).length){const j=JSON.stringify({調査日:S.date,結果:S.models.filter(m=>S.res[m]).flatMap(flat)});$('sb-j').value=j;$('sb-out').style.display='block';}
}
async function run(){
  if(running)return;
  if(!S){let list=[],skip=[],br={},photo={},hermesGroups=[],radoGroups=[];const t=$('sb-t').value.trim(),file=$('sb-f').files[0];
    if(file){const g=modelsFromGallery(JSON.parse(await file.text()));list=g.set;skip=g.skip;br=g.br;photo=g.photo;hermesGroups=g.hermesGroups;radoGroups=g.radoGroups;}
    if(t){const r=modelsFromText(t);r.out.forEach(x=>{if(!list.includes(x))list.push(x);br[x]=r.br[x];});}
    if(!list.length){alert('型番がありません。ファイルを選ぶか入力してください');return;}
    const d=new Date();S={date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,models:list,skip,br,photo,hermesGroups,radoGroups,res:{}};save(S);}
  running=true;stop=false;render();
  for(const m of S.models){if(stop)break;if(S.res[m]||(S.err&&S.err[m]))continue;
    $('sb-st').insertAdjacentHTML('beforeend',`<div class="m">${m} を調査中（UK→US）…</div>`);
    try{const A=await getA(m);const B=await getB(m);
      let r=m==='HERMES'?calcH(A,B.rows,B.err):m==='RADO'?calcR(A,B.rows,B.err):isGucci(m)?calcG(m,A,B.rows,B.err):calc(m,A,B.rows,B.err);
      if(S.photo&&S.photo[m]){[].concat(r).forEach(x=>{x.備考='【棚卸し：写真確認】ツールの数字をそのまま使わず、Chromeで落札一覧の写真を見て数え直す。'+x.備考;});}
      S.res[m]=r;}
    catch(e){S.err=S.err||{};S.err[m]=e.message;}
    save(S);render();}
  running=false;render();
}
$('sb-go').onclick=run;
$('sb-stop').onclick=()=>{stop=true;$('sb-st').insertAdjacentHTML('beforeend','<div class="m">今の型番が終わったら止まります</div>')};
$('sb-reset').onclick=()=>{if(running){alert('一時停止してから押してください');return;}S=null;localStorage.removeItem(KEY);render();};
$('sb-copy').onclick=()=>{$('sb-j').select();navigator.clipboard.writeText($('sb-j').value).then(()=>{$('sb-copy').textContent='コピーしました'})};
$('sb-dl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([$('sb-j').value],{type:'application/json'}));a.download=`gallery_import_${S.date}.json`;a.click();};
render();
})();
