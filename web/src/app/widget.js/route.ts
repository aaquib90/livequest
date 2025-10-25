import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const script = () => `(()=>{
  const ATTR_ID='data-widget-id';
  const ATTR_TYPE='data-type';
  function base(){
    try{ const s=document.currentScript; if(s&&s.src){ const u=new URL(s.src); return u.origin; } }catch(_){ }
    return location.origin;
  }
  function init(){
    const s=document.currentScript;
    const mount = s && s.previousElementSibling && (s.previousElementSibling.getAttribute(ATTR_ID) ? s.previousElementSibling : null) || document.querySelector('[data-widget-id]');
    if(!mount) return;
    const id = mount.getAttribute(ATTR_ID);
    const type = mount.getAttribute(ATTR_TYPE) || 'hot-take';
    const mode = mount.getAttribute('data-mode') || 'iframe';
    const shadow = mount.attachShadow({mode:'open'});
    if(mode==='iframe'){
      const iframe=document.createElement('iframe');
      iframe.src = base() + '/widgets/' + encodeURIComponent(type) + '/' + encodeURIComponent(id);
      iframe.style.width='100%';
      iframe.style.border='0';
      iframe.loading='lazy';
      iframe.allow='clipboard-read; clipboard-write';
      shadow.appendChild(iframe);
      return;
    }
    // For now, native mode falls back to iframe
    const iframe=document.createElement('iframe');
    iframe.src = base() + '/widgets/' + encodeURIComponent(type) + '/' + encodeURIComponent(id);
    iframe.style.width='100%';
    iframe.style.border='0';
    iframe.loading='lazy';
    shadow.appendChild(iframe);
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
    },
  });
}


