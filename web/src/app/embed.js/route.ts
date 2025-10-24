import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const script = () => `(()=>{
  const ATTR='data-liveblog-id';
  function base(){
    try{
      const s = document.currentScript;
      if(s && s.src){ const u=new URL(s.src); return u.origin; }
    }catch(_){ }
    return location.origin;
  }
  function init(){
    const currentScript = document.currentScript;
    const mount = currentScript && currentScript.previousElementSibling && (currentScript.previousElementSibling.getAttribute(ATTR) ? currentScript.previousElementSibling : null) || document.querySelector('[data-liveblog-id]');
    if(!mount) return;
    const id = mount.getAttribute(ATTR);
    const mode = mount.getAttribute('data-mode') || 'iframe';
    const lazy = (mount.getAttribute('data-lazy')||'').toLowerCase()==='true';
    if(mode === 'iframe'){
      const shadow = mount.attachShadow({mode:'open'});
      const iframe = document.createElement('iframe');
      iframe.src = base() + '/embed/' + id;
      iframe.style.width = '100%';
      iframe.style.border = '0';
      iframe.loading = 'lazy';
      iframe.allow = 'notifications; clipboard-read; clipboard-write';
      shadow.appendChild(iframe);
      return;
    }
    // native mode
    const shadow = mount.attachShadow({mode:'open'});
    const style = document.createElement('style');
    style.textContent = ':host{all:initial;}\n'
      + '*,*::before,*::after{box-sizing:border-box}\n'
      + ':host,:host *{font:inherit}\n'
      + 'img,video{max-width:100%;height:auto}\n'
      + 'a{color:inherit}\n'
      + ':root{--lb-bg:#fff;--lb-fg:#111}\n'
      + '.lb{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica Neue,Arial,sans-serif;color:var(--lb-fg)}\n'
      + '.item{border:1px solid #e5e7eb;border-radius:8px;padding:12px}';
    shadow.appendChild(style);
    const root = document.createElement('div');
    root.className = 'lb';
    shadow.appendChild(root);
    function fmt(d){ try{ return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'UTC'}).format(new Date(d)); }catch{ return '' } }
    function render(list){
      root.innerHTML='';
      const grid = document.createElement('div');
      grid.style.display='grid';
      grid.style.gap='8px';
      list.forEach(u=>{
        const div=document.createElement('div');
        div.className='item';
        const c=u.content;
        if(c && c.type==='text'){
          const p=document.createElement('p'); p.textContent=c.text; div.appendChild(p);
        } else if(c && c.type==='image'){
          const img=document.createElement('img'); img.src='${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/'+c.path; img.style.maxWidth='100%'; img.style.height='auto'; div.appendChild(img);
        } else if(c && c.type==='link'){
          try{
            const u=new URL(c.url);
            const host=u.hostname.toLowerCase();
            let ytid='';
            if(host.includes('youtube.com')){ ytid = u.searchParams.get('v')||''; }
            else if(host==='youtu.be'){ ytid = u.pathname.slice(1); }
            if(ytid){
              const wrap=document.createElement('div'); wrap.style.border='1px solid #e5e7eb'; wrap.style.borderRadius='8px'; wrap.style.overflow='hidden'; wrap.style.background='#000';
              if(c.title){ const head=document.createElement('div'); head.textContent=c.title; head.style.fontSize='13px'; head.style.fontWeight='600'; head.style.color='#fff'; head.style.background='#0b0b0c'; head.style.padding='8px 10px'; wrap.appendChild(head); }
              const aspect=document.createElement('div'); aspect.style.position='relative'; aspect.style.width='100%'; aspect.style.paddingBottom='56.25%';
              const iframe=document.createElement('iframe'); iframe.src='https://www.youtube.com/embed/'+ytid; iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; iframe.allowFullscreen=true; iframe.loading='lazy';
              iframe.style.position='absolute'; iframe.style.inset='0'; iframe.style.width='100%'; iframe.style.height='100%'; iframe.style.border='0';
              aspect.appendChild(iframe); wrap.appendChild(aspect); div.appendChild(wrap);
              grid.appendChild(div); return;
            }
          }catch{}
          const a=document.createElement('a'); a.href=c.url; a.target='_blank'; a.rel='noopener noreferrer'; a.style.textDecoration='none'; a.style.color='inherit';
          const wrap=document.createElement('div'); wrap.style.border='1px solid #e5e7eb'; wrap.style.borderRadius='8px'; wrap.style.overflow='hidden';
          const inner=document.createElement('div'); inner.style.padding='10px';
          if(c.siteName){ const cap=document.createElement('div'); cap.textContent=c.siteName; cap.style.fontSize='10px'; cap.style.textTransform='uppercase'; cap.style.letterSpacing='0.26em'; cap.style.color='#6b7280'; cap.style.fontWeight='600'; inner.appendChild(cap); }
          const t=document.createElement('div'); t.textContent=(c.title||c.url); t.style.fontSize='14px'; t.style.fontWeight='600'; t.style.color='#111827'; inner.appendChild(t);
          if(c.description){ const d=document.createElement('div'); d.textContent=c.description; d.style.fontSize='12px'; d.style.color='#6b7280'; d.style.marginTop='4px'; inner.appendChild(d); }
          const urlEl=document.createElement('div'); urlEl.textContent=c.url; urlEl.style.fontSize='11px'; urlEl.style.color='#6b7280'; urlEl.style.textDecoration='underline'; urlEl.style.textDecorationStyle='dotted'; urlEl.style.marginTop='6px'; inner.appendChild(urlEl);
          wrap.appendChild(inner);
          if(c.image){ const img=document.createElement('img'); img.src=c.image; img.style.width='100%'; img.style.height='auto'; img.loading='lazy'; wrap.appendChild(img); }
          a.appendChild(wrap); div.appendChild(a);
        } else {
          const pre=document.createElement('pre'); pre.textContent=JSON.stringify(c); pre.style.fontSize='12px'; pre.style.background='#f9fafb'; pre.style.padding='8px'; pre.style.borderRadius='6px'; pre.style.overflow='auto'; div.appendChild(pre);
        }
        const meta=document.createElement('div'); meta.textContent = u.published_at ? fmt(u.published_at) : ''; meta.style.fontSize='12px'; meta.style.color='#6b7280'; meta.style.marginTop='6px'; div.appendChild(meta);
        grid.appendChild(div);
      });
      root.appendChild(grid);
    }
    function sort(list){
      const order = mount.getAttribute('data-order') || 'newest';
      return list.sort((a,b)=>{ if(a.pinned!==b.pinned) return a.pinned?-1:1; const at=a.published_at?Date.parse(a.published_at):0; const bt=b.published_at?Date.parse(b.published_at):0; return order==='newest'?bt-at:at-bt; });
    }
    const sid = (()=>{ try{ const k='lb_sid_'+id; const v=localStorage.getItem(k); if(v) return v; const n=Math.random().toString(36).slice(2); localStorage.setItem(k,n); return n; }catch{ return Math.random().toString(36).slice(2) } })();
    function track(ev){ try{ fetch(base()+'/api/embed/'+id+'/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ sessionId: sid, event: ev, mode })}); }catch{} }
    function ping(){ try{ fetch(base()+'/api/embed/'+id+'/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ sessionId: sid, event: 'ping', mode })}); }catch{} }

    let pingTimer=null; function schedulePing(){ try{ if(pingTimer) clearInterval(pingTimer); if(document.visibilityState==='visible'){ pingTimer=setInterval(ping,15000);} }catch{} }
    let pollTimer=null; function startPoll(){ try{ if(pollTimer) clearInterval(pollTimer); pollTimer=setInterval(()=>{ fetch(base()+'/api/embed/'+id+'/feed',{mode:'cors'}).then(r=>r.json()).then(d=>render(sort(d.updates||[]))); },5000);}catch{} }
    function stopPoll(){ try{ if(pollTimer) clearInterval(pollTimer); pollTimer=null; }catch{} }

    let es=null; let attempt=0; function connect(){ try{ if(es){ try{ es.close(); }catch{} es=null; } const url=base()+'/api/embed/'+id+'/sse'; const src=new EventSource(url);
      es=src; src.onopen=()=>{ attempt=0; };
      src.onmessage=(e)=>{ try{ const payload=JSON.parse(e.data); if(!payload) return; const t=payload.event; if(t==='INSERT' || t==='UPDATE' || t==='DELETE'){ fetch(base()+'/api/embed/'+id+'/feed',{mode:'cors'}).then(r=>r.json()).then(d=>render(sort(d.updates||[]))); } }catch{} };
      src.onerror=()=>{ try{ src.close(); }catch{} es=null; if(document.visibilityState==='hidden'){ return; } const baseDelay=1000; const maxDelay=30000; const jitter=0.8+Math.random()*0.4; const delay=Math.min(maxDelay, Math.pow(2,attempt++)*baseDelay)*jitter; setTimeout(()=>{ connect(); }, delay); };
    } catch(_) { /* fall back below */ }
    }

    function handleVisibility(){ if(document.visibilityState==='hidden'){ try{ if(es){ try{ es.close(); }catch{} es=null; } stopPoll(); } catch{} } else { stopPoll(); connect(); schedulePing(); ping(); } }

    function start(){ fetch(base()+'/api/embed/'+id+'/feed',{mode:'cors'}).then(r=>r.json()).then(d=>{ render(sort(d.updates||[])); track('start'); ping(); schedulePing(); connect(); }).catch(()=>{ startPoll(); schedulePing(); }); }
    if(lazy){
      try{
        const io2=new IntersectionObserver((entries,obs)=>{ entries.forEach(entry=>{ if(entry.isIntersecting){ start(); obs.disconnect(); } }); }, { threshold:[0,0.25] });
        io2.observe(mount);
      }catch{ start(); }
    } else {
      start();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', ()=>{ try{ track('stop'); }catch{} });

    // One-time impression after visible for dwell time
    let impressed=false; let dwellTimer=null;
    try{
      const io=new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if(impressed) return;
          if(entry.isIntersecting && entry.intersectionRatio>=0.5){
            if(dwellTimer) clearTimeout(dwellTimer);
            dwellTimer=setTimeout(()=>{ if(!impressed){ impressed=true; track('impression'); } }, 1000);
          } else {
            if(dwellTimer) { clearTimeout(dwellTimer); dwellTimer=null; }
          }
        });
      }, { threshold:[0,0.5,1] });
      io.observe(mount);
    }catch{}

    // Track outbound link clicks rendered inside the shadow
    try{
      shadow.addEventListener('click', (ev)=>{
        const t=ev.target; if(!t) return;
        let el=t; while(el && el!==shadow){ if(el.tagName==='A'){ const href=el.getAttribute('href')||''; if(href){ try{ fetch(base()+'/api/embed/'+id+'/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ sessionId: sid, event: 'link_click', mode, metadata:{ url: href } })}); }catch{} } break; } el=el.parentNode; }
      });
    }catch{}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();`;

export async function GET() {
  const body = script();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=5, s-maxage=5, stale-while-revalidate=30',
      'Permissions-Policy': 'notifications=(self)',
    },
  });
}

