/* 標出連結帶來的詞：網址帶 #hl=詞 或 ?hl=詞 時，把文章和題幹裡的那個詞標成黃底，並捲到第一處。 */
(function(){
  function getKeys(){
    var v=null, m;
    try{ v=new URLSearchParams(location.search).get('hl'); }catch(e){}
    if(!v){ m=(location.hash||'').match(/[#&]hl=([^&]+)/); if(m){ try{ v=decodeURIComponent(m[1]); }catch(e){ v=m[1]; } } }
    return v?v.split('|').map(function(s){return s.trim();}).filter(Boolean):[];
  }
  function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function pat(k){
    return esc(k).replace(/['’]/g,"['’]").replace(/\s+/g,'\\s+');
  }
  function apply(root){
    var keys=getKeys(); if(!keys.length) return 0;
    var re=new RegExp('(^|[^A-Za-z])('+keys.map(pat).join('|')+')(?![A-Za-z])','gi');
    var hosts=root.querySelectorAll('.passage,.stem,.pIntro,.qStem');
    var count=0, first=null;
    hosts.forEach(function(h){
      var w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT,null), nodes=[], n;
      while((n=w.nextNode())) nodes.push(n);
      nodes.forEach(function(t){
        var s=t.nodeValue; re.lastIndex=0; if(!re.test(s)) return; re.lastIndex=0;
        var frag=document.createDocumentFragment(), last=0, m;
        while((m=re.exec(s))){
          var st=m.index+m[1].length;
          frag.appendChild(document.createTextNode(s.slice(last,st)));
          var mk=document.createElement('mark'); mk.className='ht-target'; mk.textContent=m[2];
          frag.appendChild(mk); if(!first) first=mk; count++;
          last=st+m[2].length;
        }
        frag.appendChild(document.createTextNode(s.slice(last)));
        t.parentNode.replaceChild(frag,t);
      });
    });
    if(count){
      var st=document.createElement('style');
      st.textContent='mark.ht-target{background:#F4D774;color:#221F1A;padding:0 .12em;border-radius:2px;box-shadow:0 0 0 2px #F4D774}'+
        '.ht-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:.8rem;z-index:2147482000;background:#221F1A;color:#fff;font:14px/1.5 system-ui,"Noto Sans TC","PingFang TC",sans-serif;padding:.35rem .9rem;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.3);max-width:92vw}'+
        '.ht-bar button{font:inherit;margin-left:.6rem;background:none;border:0;color:#F4D774;cursor:pointer;text-decoration:underline}'+
        '@media print{.ht-bar{display:none}mark.ht-target{background:none;box-shadow:none}}';
      document.head.appendChild(st);
      var bar=document.createElement('div'); bar.className='ht-bar'; bar.setAttribute('role','status');
      bar.appendChild(document.createTextNode('連結要你看的地方已標成黃底：'+keys.join('、')));
      var b=document.createElement('button'); b.type='button'; b.textContent='取消標示';
      b.onclick=function(){
        document.querySelectorAll('mark.ht-target').forEach(function(m){ m.replaceWith(document.createTextNode(m.textContent)); });
        bar.remove();
      };
      bar.appendChild(b); document.body.appendChild(bar);
      setTimeout(function(){ first.scrollIntoView({block:'center'}); },80);
    }
    return count;
  }
  window.htApply=function(root){ return apply(root||document); };
  if(!window.__htManual){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){apply(document);});
    else apply(document);
  }
})();

/* 「這一篇的生字表」底下的匯出列：複製到 Quizlet、下載 Anki 匯入檔。
 * 單字與字詞搭配都從頁面上的生字表讀（.vbRow 的 .vbW 與 .vbZh），不另存一份資料；
 * 共用程式與音標表從題庫總站載入，載入失敗時不顯示匯出列，生字表照常使用。 */
(function(){
  var BASE='https://staresto-create.github.io/JCEE-vocab-questions/';
  function load(src){
    return new Promise(function(ok){
      var s=document.createElement('script'); s.src=BASE+src;
      s.onload=function(){ok(true);}; s.onerror=function(){ok(false);};
      document.head.appendChild(s);
    });
  }
  function items(box){
    var out=[];
    [].forEach.call(box.querySelectorAll('.vbRow'),function(r){
      var w=r.querySelector('.vbW'), z=r.querySelector('.vbZh'); if(!w||!z) return;
      var first=w.firstChild, word=((first&&first.nodeType===3)?first.nodeValue:w.textContent).trim();
      var p=r.querySelector('.vbPos'), pos=p?p.textContent.trim():'';
      var zh=z.textContent.trim(); if(!word||!zh) return;
      out.push({w:word,d:(pos?pos+' ':'')+zh});
    });
    return out;
  }
  function init(){
    var box=document.querySelector('details.vbBox'); if(!box||!box.querySelector('.vbRow')) return;
    var id=(location.pathname.split('/').pop()||'').replace(/\.html$/,'')||'passage';
    Promise.all([window.VE?true:load('vocab-export.js'),window.KK?true:load('kk.js')]).then(function(r){
      if(!window.VE) return;
      var go=function(){
        var host=document.createElement('div'); host.className='vbExport';
        box.appendChild(host);
        VE.mount(host,function(){return items(box);},{scope:'這一篇生字表裡的全部條目（關鍵字彙、參考字彙和字詞搭配）',file:'reading_'+id,unit:'條'});
      };
      if(window.KK&&KK.ready&&KK.ready.then) KK.ready.then(go,go); else go();
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

/* 從題目地圖點格子進來時（地圖頁在 sessionStorage 留下 rcFromMap），在麵包屑下方加「← 回題目地圖」。
 * 旗標讀到就清掉，所以只有這一次從地圖進來的頁面會出現；回到地圖時，地圖頁自己還原捲動位置與篩選（rcMapState）。 */
(function(){
  var fm=null;
  try{ fm=sessionStorage.getItem('rcFromMap'); sessionStorage.removeItem('rcFromMap'); }catch(e){}
  if(!fm) return;
  function add(){
    var crumb=document.querySelector('.crumb'); if(!crumb||document.getElementById('backMap')) return;
    var a=document.createElement('a'); a.id='backMap'; a.href='../map/?back'; a.textContent='← 回題目地圖';
    a.style.cssText='display:inline-flex;align-items:center;min-height:44px;margin:-6px 0 8px;font-size:14px;font-weight:700;color:var(--crimson);text-decoration:none';
    crumb.parentNode.insertBefore(a,crumb.nextSibling);
    /* 讀完、作答完通常停在頁尾的「下一篇」，所以那裡也放一個，不必捲回頁首 */
    var nav=document.querySelector('.nav');
    if(nav && !document.getElementById('backMapEnd')){
      var e=document.createElement('a'); e.id='backMapEnd'; e.className='toMapEnd'; e.href='../map/?back'; e.textContent='← 回題目地圖';
      nav.parentNode.insertBefore(e,nav.nextSibling);
    }
    var st=document.createElement('style'); st.textContent='@media print{#backMap{display:none!important}}'; document.head.appendChild(st);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',add); else add();
})();
