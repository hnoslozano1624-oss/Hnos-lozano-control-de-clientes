/* Capa de compatibilidad para Cloudflare: define window.claude (db, assets, downloads, mcp)
   usando la API del Worker (D1) cuando la página no corre dentro de claude.ai. */
(function(){
  if(window.claude) return;
  window.__DL_CF=true;
  const POLL=4000, MAXF=1400000;
  const mkErr=(code,message)=>Object.assign(new Error(message||code),{code,message:message||code});
  async function api(path,opt){
    let r;
    try{ r=await fetch(path,Object.assign({credentials:'same-origin',redirect:'manual',cache:'no-store'},opt||{})); }
    catch(e){ throw mkErr('network','Sin conexión con el servidor.'); }
    if(r.type==='opaqueredirect'||r.status===0) throw mkErr('session','Su sesión venció. Recargue la página para volver a ingresar.');
    const ct=r.headers.get('content-type')||'';
    let j=null; if(ct.includes('json')) j=await r.json().catch(()=>null);
    if(!r.ok||!j){
      if(!j&&r.ok) throw mkErr('session','Su sesión venció. Recargue la página para volver a ingresar.');
      throw mkErr((j&&j.code)||('http_'+r.status),(j&&j.message)||('Error '+r.status));
    }
    return j;
  }
  const J=(method,body)=>({method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const rid=()=>{ const a=new Uint8Array(10); crypto.getRandomValues(a); return Array.from(a,b=>(b%36).toString(36)).join(''); };

  /* ── base de datos con la forma de Firestore ── */
  const subs={}; let timer=null, known={}, busy=false;
  function snapOf(docs){ return {docs:docs.map(d=>({id:d.id,data:()=>d.data}))}; }
  async function pull(name){
    const j=await api('/api/c/'+name); known[name]=j.rev;
    (subs[name]||[]).forEach(s=>{ try{ s.fn(snapOf(j.docs)); }catch(e){ console.error(e); } });
  }
  async function tick(){
    if(busy||document.hidden) return; busy=true;
    try{
      const names=Object.keys(subs).filter(n=>subs[n].length); if(!names.length) return;
      const revs=await api('/api/revs');
      for(const n of names){ if((revs[n]||0)!==known[n]) await pull(n).catch(()=>{}); }
    }catch(e){} finally{ busy=false; }
  }
  function ensureTimer(){ if(!timer){ timer=setInterval(tick,POLL); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) tick(); }); } }
  const db={
    collection(name){
      return {
        onSnapshot(fn,errFn){
          const s={fn}; (subs[name]=subs[name]||[]).push(s); ensureTimer();
          pull(name).catch(e=>{ if(errFn) errFn({code:e.code,message:e.message}); });
          return ()=>{ subs[name]=(subs[name]||[]).filter(x=>x!==s); };
        },
        doc(id){
          id=id||rid(); const url='/api/c/'+name+'/'+encodeURIComponent(id);
          return {
            id,
            async set(d){ await api(url,J('PUT',{data:d})); await pull(name).catch(()=>{}); },
            async update(d){ await api(url,J('PATCH',{data:d})); await pull(name).catch(()=>{}); },
            async delete(){ await api(url,{method:'DELETE'}); await pull(name).catch(()=>{}); }
          };
        }
      };
    }
  };

  /* ── archivos (se guardan dentro de D1) ── */
  function shrink(file){
    return new Promise((res,rej)=>{
      const img=new Image(), u=URL.createObjectURL(file);
      img.onload=()=>{
        URL.revokeObjectURL(u);
        let w=img.naturalWidth,h=img.naturalHeight,q=.85,sc=Math.min(1,1600/Math.max(w,h));
        const tryIt=()=>{
          const c=document.createElement('canvas'); c.width=Math.round(w*sc); c.height=Math.round(h*sc);
          const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(img,0,0,c.width,c.height);
          c.toBlob(b=>{
            if(!b) return rej(mkErr('file','No se pudo reducir la imagen.'));
            if(b.size<=MAXF||(q<=.4&&sc<=.3)) return res(b);
            if(q>.45) q-=.15; else sc*=.75;
            tryIt();
          },'image/jpeg',q);
        };
        tryIt();
      };
      img.onerror=()=>{ URL.revokeObjectURL(u); rej(mkErr('file','No se pudo leer la imagen.')); };
      img.src=u;
    });
  }
  const assets={
    async upload(file,opts){
      let blob=file;
      if(/^image\//.test(file.type)&&file.size>MAXF) blob=await shrink(file);
      if(blob.size>MAXF) throw mkErr('too_large','El archivo supera 1,4 MB. Reduzca su tamaño o use un enlace.');
      const type=blob.type||(opts&&opts.type)||'application/octet-stream';
      const j=await api('/api/file',{method:'POST',headers:{'content-type':type,'x-filename':encodeURIComponent(file.name||'archivo')},body:blob});
      return {id:j.id,url:'/_blob/'+j.id,contentType:j.contentType||type};
    }
  };

  /* ── descargas ── */
  const downloads={
    async save(r){
      const a=document.createElement('a'), u=URL.createObjectURL(r.data);
      a.href=u; a.download=r.filename||'archivo'; document.body.appendChild(a); a.click();
      setTimeout(()=>{ URL.revokeObjectURL(u); a.remove(); },2000);
      return {status:'saved'};
    }
  };

  /* ── correo (Resend desde el Worker) ── */
  const mcp={
    async callTool(server,tool,input){
      if(server!=='Gmail'||tool!=='send_message') throw mkErr('tool_error','Acción no disponible.');
      const j=await api('/api/send',J('POST',input));
      return {payload:{id:j.id||''}};
    }
  };

  /* ── ingreso con usuario y contraseña ── */
  function showLogin(){
    return new Promise(resolve=>{
      const ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;z-index:99999;background:#0E0B0A;display:flex;align-items:flex-start;justify-content:center;padding:max(24px,7vh) 16px 16px;overflow-y:auto;font-family:Montserrat,Arial,sans-serif;color:#F5F2ED';
      ov.innerHTML='<form id="dl-lg" style="width:100%;max-width:360px;background:#1A1412;border:1px solid #33292A;border-radius:16px;padding:28px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
        +'<img src="/logo-h.png" alt="D&amp;L Hnos. Lozano" style="width:100%;max-width:300px;height:auto;display:block;margin:0 auto 4px">'
        +'<div style="color:#A59C94;font-size:13px;margin-top:-6px">Ingrese para ver el tablero de clientes.</div>'
        +'<label style="font-size:12px;color:#A59C94;display:flex;flex-direction:column;gap:6px">Usuario<input id="dl-u" autocomplete="username" autocapitalize="none" required style="padding:12px;border-radius:10px;border:1px solid #33292A;background:#0E0B0A;color:#F5F2ED;font-size:15px"></label>'
        +'<label style="font-size:12px;color:#A59C94;display:flex;flex-direction:column;gap:6px">Contraseña<input id="dl-p" type="password" autocomplete="current-password" required style="padding:12px;border-radius:10px;border:1px solid #33292A;background:#0E0B0A;color:#F5F2ED;font-size:15px"></label>'
        +'<label style="font-size:13px;color:#A59C94;display:flex;align-items:center;gap:8px;cursor:pointer"><input id="dl-sh" type="checkbox" style="width:18px;height:18px;accent-color:#7ED321">Mostrar contraseña</label>'
        +'<div id="dl-e" role="alert" style="color:#ff8a80;font-size:13px;min-height:18px"></div>'
        +'<button type="submit" style="padding:13px;border:0;border-radius:10px;background:#7ED321;color:#0D0D0D;font-weight:700;font-size:15px;cursor:pointer">Ingresar</button></form>';
      document.body.appendChild(ov);
      const f=ov.querySelector('#dl-lg'), er=ov.querySelector('#dl-e'), bt=f.querySelector('button');
      ov.querySelector('#dl-u').focus();
      ov.querySelector('#dl-sh').addEventListener('change',e=>{ ov.querySelector('#dl-p').type=e.target.checked?'text':'password'; });
      f.addEventListener('submit',async e=>{
        e.preventDefault(); er.textContent=''; bt.disabled=true; bt.textContent='Verificando…';
        try{
          await api('/api/login',J('POST',{user:ov.querySelector('#dl-u').value,pass:ov.querySelector('#dl-p').value}));
          ov.remove(); resolve();
        }catch(err){ er.textContent=err.message||'No se pudo ingresar.'; bt.disabled=false; bt.textContent='Ingresar'; }
      });
    });
  }
  function addLogout(){
    if(document.getElementById('dl-out')) return;
    const b=document.createElement('button'); b.id='dl-out'; b.type='button'; b.textContent='Cerrar sesión';
    b.style.cssText='position:fixed;right:12px;bottom:12px;z-index:9999;padding:7px 12px;border-radius:999px;border:1px solid #33292A;background:#181311;color:#A59C94;font-size:12px;cursor:pointer;opacity:.85';
    b.onclick=async()=>{ try{ await fetch('/api/logout',{method:'POST',credentials:'same-origin'}); }catch(e){} location.reload(); };
    document.body.appendChild(b);
  }

  window.claude={
    async use(k){
      if(k==='db'){
        try{
          try{ await api('/api/me'); }
          catch(e){ if(e.code!=='unauthorized') throw e; await showLogin(); }
        }catch(e){ window.__DL_ERR=e.message; return null; }
        addLogout();
        return db;
      }
      if(k==='assets') return assets;
      if(k==='downloads') return downloads;
      if(k==='mcp') return mcp;
      return null;
    }
  };
})();
