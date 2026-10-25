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
    var hosts=root.querySelectorAll('.passage,.stem,.pIntro');
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
      bar.appendChild(document.createTextNode('黃底是你點選的詞：'+keys.join('、')));
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
