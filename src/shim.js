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
    if(r.type==='opaqueredirect'||r.status===0) throw mkErr('session','La sesión de acceso venció. Recargue la página para volver a ingresar.');
    const ct=r.headers.get('content-type')||'';
    let j=null; if(ct.includes('json')) j=await r.json().catch(()=>null);
    if(!r.ok||!j){
      if(!j&&r.ok) throw mkErr('session','La sesión de acceso venció. Recargue la página para volver a ingresar.');
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

  window.claude={
    async use(k){
      if(k==='db'){
        try{ await api('/api/me'); }
        catch(e){ window.__DL_ERR=e.message; return null; }
        return db;
      }
      if(k==='assets') return assets;
      if(k==='downloads') return downloads;
      if(k==='mcp') return mcp;
      return null;
    }
  };
})();
