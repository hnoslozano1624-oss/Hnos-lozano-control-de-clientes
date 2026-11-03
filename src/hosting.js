/* ───────── Hosting y dominio: panel propio, alertas y ajuste de la caja proyectada ───────── */
NAV_ICONS.host='<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>';
NAV_ITEMS.splice(2,0,['host','Clientes hosting']);

const hostClients=()=>S.clients.filter(c=>c.status!=='cerrado'&&(c.services||[]).includes('hosting'));
const daysIn=(y,m)=>new Date(y,m+1,0).getDate();
const monthBack=s=>{ const d=parse(s), day=d.getDate(), y=d.getFullYear(), m=d.getMonth()-1; const yy=m<0?y-1:y, mm=(m+12)%12; return ymd(new Date(yy,mm,Math.min(day,daysIn(yy,mm)))); };
const yearFwd=s=>{ const d=parse(s), y=d.getFullYear()+1, m=d.getMonth(); return ymd(new Date(y,m,Math.min(d.getDate(),daysIn(y,m)))); };
const whenTxt=n=>n===0?'hoy':(n===1?'mañana':'en '+n+' días');
function hostInfo(c){
  const h=c.host||{}, t=todayS();
  if(!h.end) return {c,h,lvl:'bad',key:'nodate',alert:true,sort:'0',text:'Falta registrar las fechas'};
  const days=dayDiff(h.end,t), rem=monthBack(h.end), sent=h.remindedFor===h.end;
  const base={c,h,days,rem,sent,sort:h.end};
  if(days<0) return Object.assign(base,{lvl:'bad',key:'expired',alert:true,text:'Vencido hace '+(-days)+' '+plural(-days,'día','días')});
  if(t>=rem) return sent
    ? Object.assign(base,{lvl:'info',key:'sent',alert:false,text:'Recordatorio enviado · vence '+whenTxt(days)})
    : Object.assign(base,{lvl:'warn',key:'due',alert:true,text:'Enviar recordatorio ahora · vence '+whenTxt(days)});
  return Object.assign(base,{lvl:'',key:'ok',alert:false,text:'Recordatorio el '+fmtD(rem)});
}
const hostAll=()=>hostClients().map(hostInfo);

function drawHost(){
  const list=hostAll().sort((a,b)=>a.sort.localeCompare(b.sort)||(a.c.name||'').localeCompare(b.c.name||'','es'));
  const nAlert=list.filter(x=>x.alert).length, soon=list.filter(x=>x.h.end&&x.days>=0&&x.days<=60).length;
  let h=head();
  h+='<div style="margin-bottom:6px"><h1>Hosting y dominio</h1><div class="hint" style="margin-top:4px">Clientes con este servicio. Registre el inicio y el vencimiento: un mes antes se activa la alerta para recordarle la renovación al cliente.</div></div>';
  h+='<section class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:16px" aria-label="Resumen de hosting y dominio">'
   +stat('Clientes con hosting y dominio',String(list.length),'Marcados en la pestaña Servicios','')
   +stat('Requieren acción',String(nAlert),nAlert?'Recordatorio por enviar, vencidos o sin fechas':'Todo al día',nAlert?'hot':'good')
   +stat('Vencen en 60 días',String(soon),'Renovaciones próximas','')
   +'</section>';
  if(!list.length) return h+'<div class="empty">Aún no hay clientes con Hosting y dominio. Márquelo en la pestaña Servicios de cada cliente y aparecerá aquí automáticamente.</div>';
  h+='<div class="tbl-wrap"><table><thead><tr><th>Cliente</th><th>Dominio</th><th>Inicio</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead><tbody>';
  list.forEach(x=>{ const c=x.c, k=x.h;
    h+='<tr><td style="min-width:180px"><div style="display:flex;gap:10px;align-items:center">'+logoHTML(c,'sm')+'<b>'+esc(c.name)+'</b></div></td><td>'+esc(k.domain||'—')+'</td><td class="num" style="white-space:nowrap">'+fmtD(k.start)+'</td><td class="num" style="white-space:nowrap">'+fmtD(k.end)+'</td>'
     +'<td style="min-width:200px"><span class="pill '+x.lvl+'">'+esc(x.text)+'</span>'+(k.note?'<div class="r-sub">'+esc(k.note)+'</div>':'')+'</td>'
     +'<td style="text-align:right;min-width:230px">'+(k.end
        ?'<button class="btn sm'+(x.alert?' pri':'')+'" data-host="remind" data-id="'+esc(c.id)+'" type="button">Recordar al cliente</button> <button class="link" data-host="edit" data-id="'+esc(c.id)+'" type="button">Fechas</button> <button class="link" data-host="renew" data-id="'+esc(c.id)+'" type="button">Renovar</button>'
        :'<button class="btn sm pri" data-host="edit" data-id="'+esc(c.id)+'" type="button">Registrar fechas</button>')+'</td></tr>'; });
  return h+'</tbody></table></div>';
}

function hostForm(c){
  const k=c.host||{};
  openModal({title:'Hosting y dominio · '+c.name,
    body:'<div class="f2"><div class="fld"><label for="hs-start">Fecha de inicio</label><input class="inp" id="hs-start" type="date" value="'+esc(k.start||'')+'"></div><div class="fld"><label for="hs-end">Fecha de vencimiento</label><input class="inp" id="hs-end" type="date" value="'+esc(k.end||'')+'"></div></div>'
     +'<div class="fld"><label for="hs-dom">Dominio (opcional)</label><input class="inp" id="hs-dom" placeholder="Ej. empresa.com" value="'+esc(k.domain||'')+'"></div>'
     +'<div class="fld"><label for="hs-note">Notas (opcional)</label><input class="inp" id="hs-note" value="'+esc(k.note||'')+'"></div>'
     +'<p class="hint" style="margin:0">El recordatorio al cliente se activa un mes antes de la fecha de vencimiento. Al elegir la fecha de inicio se sugiere el vencimiento a un año; puede cambiarlo.</p>',
    onMount:()=>{ const s=$('#hs-start'), e=$('#hs-end'); s.addEventListener('change',()=>{ if(s.value&&!e.value) e.value=yearFwd(s.value); }); },
    actions:[{label:'Cancelar',fn:()=>true},{label:'Guardar',kind:'pri',fn:async()=>{
      const start=$('#hs-start').value, end=$('#hs-end').value;
      if(!end){ toast('Indique la fecha de vencimiento.'); return false; }
      if(start&&dayDiff(end,start)<0){ toast('El vencimiento no puede ser anterior al inicio.'); return false; }
      await patchDoc('clients',c.id,{host:Object.assign({},k,{start,end,domain:$('#hs-dom').value.trim(),note:$('#hs-note').value.trim()})});
      toast('Fechas de hosting y dominio guardadas'); }}]});
}
function hostRenew(c){
  const k=c.host||{}; if(!k.end) return hostForm(c);
  const ne=yearFwd(k.end);
  openModal({title:'Renovar hosting y dominio · '+c.name,
    body:'<p style="margin:0">El período actual vence el <b>'+fmtD(k.end)+'</b>. Al renovar, el nuevo período inicia en esa fecha y vence el <b>'+fmtD(ne)+'</b>. El recordatorio se vuelve a programar un mes antes.</p>',
    actions:[{label:'Cancelar',fn:()=>true},{label:'Renovar un año',kind:'pri',fn:async()=>{ await patchDoc('clients',c.id,{host:Object.assign({},k,{start:k.end,end:ne})}); toast('Hosting y dominio renovado hasta '+fmtD(ne)); }}]});
}
function hostMsg(c,k){
  const parts=(c.contact||'').split(/\s*·\s*/), isPh=p=>p.replace(/\D/g,'').length>=7;
  const person=parts.find(p=>p.trim()&&!/@/.test(p)&&!isPh(p))||c.name;
  const fecha=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'long',year:'numeric'}).format(parse(k.end));
  return 'Estimado(a) '+person+':\n\nLe saludamos de D&L Hnos. Lozano. Le recordamos que el servicio de hosting y dominio'+(k.domain?' ('+k.domain+')':'')+' de '+c.name+' vence el '+fecha+'. Para evitar que el sitio web y los correos asociados dejen de funcionar, le sugerimos programar la renovación con anticipación.\n\nQuedamos atentos para enviarle la cuenta de cobro o factura y coordinar la renovación.\n\nCordialmente,\nEquipo D&L Hnos. Lozano';
}
function hostRemind(c){
  const k=c.host||{}; if(!k.end) return hostForm(c);
  const parts=(c.contact||'').split(/\s*·\s*/), em=(c.contact||'').match(/[^\s·|,;]+@[^\s·|,;]+\.[^\s·|,;]+/), phRaw=parts.find(p=>p.replace(/\D/g,'').length>=7);
  let ph=phRaw?phRaw.replace(/\D/g,''):''; if(ph.length===10&&ph[0]==='3') ph='57'+ph;
  const cur=()=>($('#hs-msg')||{}).value||'';
  openModal({title:'Recordatorio de renovación · '+c.name,wide:true,
    body:'<p class="hint" style="margin:0">Vence el '+fmtD(k.end)+'. Revise o edite el mensaje, envíelo al cliente y luego márquelo como enviado para que la alerta desaparezca.</p><div class="fld"><label for="hs-msg">Mensaje al cliente</label><textarea class="inp" id="hs-msg" rows="11">'+esc(hostMsg(c,k))+'</textarea></div>'
     +'<p class="hint" style="margin:0">'+(ph||em?'Datos de contacto detectados: '+esc([ph?'WhatsApp '+ph:'',em?em[0]:''].filter(Boolean).join(' · ')):'No se detectó teléfono ni correo en los datos del cliente; copie el mensaje y envíelo por su canal habitual.')+'</p>',
    actions:[{label:'Copiar mensaje',keep:true,fn:async()=>{ try{ await navigator.clipboard.writeText(cur()); }catch(e){ const t=$('#hs-msg'); t.select(); try{ document.execCommand('copy'); }catch(e2){} } toast('Mensaje copiado'); }},
      ...(ph?[{label:'Abrir WhatsApp',keep:true,fn:()=>{ window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(cur()),'_blank','noopener'); }}]:[]),
      ...(em?[{label:'Abrir correo',keep:true,fn:()=>{ window.open('mailto:'+em[0]+'?subject='+encodeURIComponent('Renovación de hosting y dominio · '+c.name)+'&body='+encodeURIComponent(cur()),'_blank','noopener'); }}]:[]),
      {label:'Cerrar',fn:()=>true},
      {label:'Marcar como enviado',kind:'pri',fn:async()=>{ await patchDoc('clients',c.id,{host:Object.assign({},k,{remindedFor:k.end,remindedAt:todayS()})}); toast('Recordatorio registrado como enviado'); }}]});
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-host]'); if(!b||!$('#app').contains(b)) return;
  const c=clientById(b.dataset.id); if(!c) return;
  const a=b.dataset.host; if(a==='edit') hostForm(c); else if(a==='remind') hostRemind(c); else if(a==='renew') hostRenew(c);
});

/* vista propia + alerta en el Panel general */
const _drawHomeBase=drawHome;
drawHome=function(){
  if(S.view==='host') return drawHost();
  const h=_drawHomeBase(), al=hostAll().filter(x=>x.alert).sort((a,b)=>a.sort.localeCompare(b.sort));
  if(!al.length) return h;
  const p='<section class="panel" style="margin-top:16px;border-color:var(--warn)"><div class="panel-h"><h2>Alerta: hosting y dominio</h2><span class="hint">'+al.length+' '+plural(al.length,'cliente por atender','clientes por atender')+'</span></div><div class="list">'
    +al.slice(0,6).map(x=>'<div class="row click" data-act="nav" data-v="host" tabindex="0">'+logoHTML(x.c,'sm')+'<div class="r-main"><div class="r-title">'+esc(x.c.name)+'</div><div class="r-sub">'+(x.h.end?'Vence '+fmtD(x.h.end):'Sin fechas registradas')+'</div></div><div class="r-end"><span class="pill '+x.lvl+'">'+esc(x.text)+'</span></div></div>').join('')
    +(al.length>6?'<div class="hint" style="padding-top:8px">y '+(al.length-6)+' más en el panel de Hosting y dominio.</div>':'')+'</div></section>';
  return h+p;
};
const _drawBase2=draw;
draw=function(){
  _drawBase2();
};

/* flujo de caja: la "caja proyectada al cierre" pasa a ser lo que los clientes deben pagar en el mes,
   acumulando lo pendiente de meses anteriores */
const _drawCajaBase=drawCaja;
drawCaja=function(){
  const h=_drawCajaBase(), t=todayS(), cm=t.slice(0,7), m=S.gMonth||cm;
  if(m<cm) return h;
  const q=m.split('-').map(Number), mEnd=ymd(new Date(q[0],q[1],0));
  const cobrar=S.pays.filter(p=>!p.received&&p.billDate<=mEnd&&clientById(p.clientId));
  const tot=sum(cobrar,p=>p.amount), prev=cobrar.filter(p=>p.billDate<m+'-01');
  const sub=cobrar.length+' '+plural(cobrar.length,'cobro por recibir','cobros por recibir')+(prev.length?' · incluye '+money(sum(prev,p=>p.amount))+' pendiente de meses anteriores':'');
  return h.replace(/<div class="stat [^"]*"><div class="k">Caja proyectada al cierre<\/div><div class="v num">[^<]*<\/div><div class="s">[^<]*<\/div><\/div>/,()=>stat('Caja proyectada al cierre',money(tot),sub,''));
};

/* editar el valor del trabajo: el total (abonos) o el valor mensual se reparte entre los cobros pendientes;
   lo ya cobrado no cambia */
editJobForm=function(c,job){
  const ps=paysOf(c.id).filter(p=>jobOf(p)===job);
  const men=ps.some(p=>p.kind==='mensual');
  const open=ps.filter(p=>!p.received).sort((a,b)=>(a.billDate||'').localeCompare(b.billDate||''));
  const recAmt=sum(ps.filter(p=>p.received),p=>p.amount), total=sum(ps,p=>p.amount);
  const valBox=!open.length
    ? '<p class="hint" style="margin:0">Todos los cobros de este trabajo ya fueron recibidos. Para cambiar su valor, agregue un pago o edite uno desde la lista.</p>'
    : (men
      ? '<div class="fld" style="max-width:320px"><label for="ej-val">Valor mensual (COP)</label><input class="inp num" id="ej-val" inputmode="numeric" value="'+grp(open[0].amount)+'"><span class="hint">Se aplica a los '+open.length+' '+plural(open.length,'mes pendiente','meses pendientes')+'. Los meses ya cobrados no cambian.</span></div>'
      : '<div class="fld" style="max-width:320px"><label for="ej-val">Valor total del trabajo (COP)</label><input class="inp num" id="ej-val" inputmode="numeric" value="'+grp(total)+'"><span class="hint">Ya cobrado: '+money(recAmt)+'. Si cambia el total, la diferencia se reparte proporcionalmente entre los '+open.length+' '+plural(open.length,'pago pendiente','pagos pendientes')+' (anticipo, saldo, etc.). Lo ya cobrado no cambia.</span></div>');
  openModal({title:'Editar trabajo',
    body:'<div class="fld"><label for="ej-name">Nombre del trabajo</label><input class="inp" id="ej-name" value="'+esc(job)+'" placeholder="Ej. Página web"><span class="hint">Al cambiar el nombre se actualizan los '+ps.length+' '+plural(ps.length,'cobro','cobros')+' de este trabajo.</span></div>'
     +valBox
     +'<p class="hint" style="margin:0">Para eliminar el trabajo se borran también sus '+ps.length+' '+plural(ps.length,'cobro','cobros')+'. No se puede deshacer.</p>',
    onMount:()=>{ const v=$('#ej-val'); if(v) v.addEventListener('change',e=>{ e.target.value=grp(num(e.target.value)); }); },
    actions:[{label:'Eliminar trabajo',kind:'danger',keep:true,fn:b=>{ if(!b.dataset.armed){ b.dataset.armed='1'; b.classList.add('armed'); b.textContent='¿Confirmar eliminación?'; return; } (async()=>{ for(const p of ps) await delDoc('payments',p.id); closeModal(); toast('Trabajo eliminado'); })().catch(fail); }},
      {label:'Cancelar',fn:()=>true},
      {label:'Guardar',kind:'pri',fn:async()=>{
        const nn=($('#ej-name').value||'').trim(), renamed=nn!==job;
        if(renamed&&nn&&jobsOf(c).some(j=>j.name.toLowerCase()===nn.toLowerCase()&&j.name!==job)){ toast('Ya existe un trabajo con ese nombre.'); return false; }
        const amounts=new Map(), v=$('#ej-val');
        if(v){ const nv=num(v.value);
          if(men){
            if(nv<=0){ toast('Indique un valor mensual mayor que cero.'); return false; }
            open.forEach(p=>{ if(p.amount!==nv) amounts.set(p.id,nv); });
          } else if(nv!==total){
            if(nv<=recAmt){ toast('El valor total debe ser mayor a lo ya cobrado ('+money(recAmt)+').'); return false; }
            const R=nv-recAmt, P=sum(open,p=>p.amount); let acc=0;
            open.forEach((p,i)=>{ const a=i===open.length-1?R-acc:Math.round(P>0?p.amount*R/P:R/open.length); acc+=a; if(a!==p.amount) amounts.set(p.id,a); });
          }
        }
        if(!renamed&&!amounts.size) return true;
        for(const p of ps){
          const d={};
          if(renamed){ d.job=nn; d.label=relabel(p.label,job,nn); }
          if(amounts.has(p.id)){ d.amount=amounts.get(p.id); d.log=logEntry(p,'Valor ajustado de '+money(p.amount)+' a '+money(d.amount)); }
          if(Object.keys(d).length) await patchDoc('payments',p.id,d);
        }
        if(men&&v&&amounts.size&&job===(c.job||'')) await patchDoc('clients',c.id,{monthly:num(v.value)});
        toast(amounts.size?'Valor del trabajo actualizado':'Trabajo actualizado'); }}]});
};
/* cliente con un solo trabajo: botón visible para editar su valor */
const _tabPayBase=tabPay;
tabPay=function(c,s){
  let h=_tabPayBase(c,s); const jobs=jobsOf(c);
  if(jobs.length===1){
    const j0=jobs[0].name;
    h=h.replace('<button class="btn sm pri" data-act="new-job" type="button">+ Nuevo trabajo</button>',()=>'<button class="btn sm" data-act="edit-job" data-job="'+esc(j0)+'" type="button">Editar valor del trabajo</button><button class="btn sm pri" data-act="new-job" type="button">+ Nuevo trabajo</button>');
  }
  return h;
};

/* Panel general: "Cuentas por cobrar" abre el detalle de qué cobros lo componen */
/* horizonte de proyección: hasta el fin del mes siguiente (lo programado más lejos no se suma) */
function horizonEnd(){ const q=todayS().split('-').map(Number); return ymd(new Date(q[0],q[1]+1,0)); }
function cxcAll(){
  return S.pays.filter(p=>{ const c=clientById(p.clientId); return c&&c.status!=='cerrado'&&!p.received; });
}
function cxcRows(){ const he=horizonEnd(); return cxcAll().filter(p=>(p.billDate||'')<=he); }
function cxcDetail(){
  const rows=cxcRows(), total=sum(rows,p=>p.amount), by=new Map();
  rows.forEach(p=>{ if(!by.has(p.clientId)) by.set(p.clientId,[]); by.get(p.clientId).push(p); });
  const groups=[...by.entries()].map(([id,ps])=>({c:clientById(id),ps:ps.sort((a,b)=>(a.billDate||'').localeCompare(b.billDate||'')),sub:sum(ps,p=>p.amount)})).sort((a,b)=>b.sub-a.sub);
  let b='<p class="hint" style="margin:0">Cobros pendientes de los clientes activos hasta el fin del mes siguiente (lo programado más adelante no se suma). El total coincide con la cifra del Panel general ('+rows.length+' '+plural(rows.length,'cobro','cobros')+', '+groups.length+' '+plural(groups.length,'cliente','clientes')+').</p>';
  if(!rows.length) return b+'<div class="empty">No hay cobros pendientes.</div>';
  b+='<div class="tbl-wrap"><table style="min-width:640px"><thead><tr><th>Concepto</th><th>Facturar</th><th>Pago esperado</th><th>Estado</th><th>Valor</th></tr></thead><tbody>';
  groups.forEach(g=>{
    b+='<tr style="background:var(--surface-2)"><td colspan="4"><b>'+esc(g.c.name)+'</b> <button class="link" type="button" data-cxc-open="'+esc(g.c.id)+'">Ver pagos del cliente</button></td><td class="num" style="font-weight:800">'+money(g.sub)+'</td></tr>';
    g.ps.forEach(p=>{ b+='<tr><td style="min-width:200px">'+esc(p.label)+'</td><td class="num" style="white-space:nowrap">'+fmtD(p.billDate)+'</td><td class="num" style="white-space:nowrap">'+fmtD(p.dueDate)+'</td><td>'+payPill(p,g.c)+'</td><td class="num">'+money(p.amount)+'</td></tr>'; });
  });
  b+='<tr style="background:var(--surface-2)"><td colspan="4" style="font-weight:800">Total por cobrar</td><td class="num" style="font-weight:800">'+money(total)+'</td></tr></tbody></table></div>';
  return b;
}
function cxcOpen(){
  openModal({title:'Cuentas por cobrar · detalle',wide:true,body:cxcDetail(),
    onMount:root=>{ root.addEventListener('click',e=>{ const t=e.target.closest('[data-cxc-open]'); if(!t) return; closeModal(); S.view='client'; S.cid=t.dataset.cxcOpen; S.tab='pay'; render(); window.scrollTo(0,0); }); },
    actions:[{label:'Cerrar',fn:()=>true}]});
}
const _drawHomeBase2=drawHome;
drawHome=function(){
  const h=_drawHomeBase2();
  return h.replace(/<div class="stat ([^"]*)"><div class="k">Cuentas por cobrar<\/div>[\s\S]*?<div class="s">[^<]*<\/div><\/div>/,()=>{
    const rows=cxcRows(), tot=sum(rows,p=>p.amount), ms=todayS().slice(0,7)+'-01', atras=sum(rows.filter(p=>(p.billDate||'')<ms),p=>p.amount), lejos=cxcAll().length-rows.length;
    const sub=rows.length+' '+plural(rows.length,'cobro','cobros')+' hasta el mes siguiente'+(atras?' · incluye '+money(atras)+' vencido':'')+' · clic para ver el detalle';
    return stat('Cuentas por cobrar',money(tot),sub,tot?'warm':'').replace(/^<div /,'<div data-cxc="1" role="button" tabindex="0" style="cursor:pointer" ');
  });
};
/* el flujo de caja no avanza más allá del mes siguiente */
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-act="g-next"]'); if(!b) return;
  const q=todayS().split('-').map(Number), nx=ymd(new Date(q[0],q[1],1)).slice(0,7);
  if((S.gMonth||todayS().slice(0,7))>=nx){ e.stopImmediatePropagation(); e.preventDefault(); toast('La proyección llega hasta el mes siguiente'); }
},true);
document.addEventListener('click',e=>{ const t=e.target.closest('[data-cxc]'); if(t&&$('#app').contains(t)) cxcOpen(); });
document.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-cxc]')){ e.preventDefault(); cxcOpen(); } });

/* ───────── Cuentas de cobro en dólares: moneda por documento, TRM automática ───────── */
const r2=n=>Math.round((Number(n)||0)*100)/100;
const trmTxt=n=>new Intl.NumberFormat('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
const decTxt=n=>new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(Number(n)||0);
const parseDec=v=>{ v=String(v||'').trim(); if(v.includes(',')) v=v.replace(/\./g,'').replace(',','.'); return Number(v)||0; };
/* documentos nuevos: los valores de los servicios están en USD (usdPrices); los de la primera versión están en COP y se convierten con la TRM */
const isUsdBill=b=>b&&b.cur==='USD'&&Number(b.rate)>0;
const unitUsd=(b,it)=>b.usdPrices?r2(it.price):r2((Number(it.price)||0)/Number(b.rate));
const lineUsd=(b,it)=>b.usdPrices?r2((Number(it.price)||0)*(Number(it.qty)||1)):r2((Number(it.price)||0)*(Number(it.qty)||1)/Number(b.rate));
const billUsd=b=>isUsdBill(b)?r2(sum(b.items||[],i=>lineUsd(b,i))):0;
const billCop=b=>isUsdBill(b)?(b.usdPrices?Math.round(billUsd(b)*Number(b.rate)):billTotal(b)):billTotal(b);
const usdLetras=n=>{
  n=Number(n)||0; const e=Math.floor(n+1e-9), c=Math.round((n-e)*100);
  if(e===1&&!c) return 'Un dólar estadounidense';
  let t=numLetras(e); const mm=e>=1e6&&e%1e6===0;
  if(!mm) t=t.replace(/veintiuno$/,'veintiún').replace(/uno$/,'un');
  t=t.charAt(0).toUpperCase()+t.slice(1)+(mm?' de dólares estadounidenses':' dólares estadounidenses');
  return c?t+' con '+String(c).padStart(2,'0')+'/100':t;
};
async function fetchTRM(dateStr){
  const d=(dateStr||todayS()).slice(0,10);
  const url='https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order='+encodeURIComponent('vigenciadesde DESC')+'&$where='+encodeURIComponent("vigenciadesde<='"+d+"T23:59:59'");
  const r=await fetch(url); if(!r.ok) throw new Error('trm');
  const j=await r.json(); if(!j||!j[0]||!(Number(j[0].valor)>0)) throw new Error('trm');
  return {rate:Number(j[0].valor),from:String(j[0].vigenciadesde).slice(0,10),to:String(j[0].vigenciahasta).slice(0,10)};
}

/* formulario: al cobrar en dólares, los valores de los servicios se escriben y se ven en USD */
const _paintBillItemsBase=paintBillItems;
paintBillItems=function(){
  _paintBillItemsBase();
  if(!BF||BF.cur!=='USD') return;
  BF.items.forEach((it,i)=>{
    const inp=$('#bi-p'+i), lab=document.querySelector('label[for="bi-p'+i+'"]'), tt=$('#bi-t'+i);
    if(lab) lab.textContent='Valor unitario (USD)';
    if(inp){ inp.setAttribute('inputmode','decimal'); inp.value=it.price?decTxt(it.price):''; }
    if(tt) tt.textContent=qMoney(r2((Number(it.price)||0)*(Number(it.qty)||1)),'USD');
  });
};
const _updateBillTotBase=updateBillTot;
updateBillTot=function(){
  if(!BF||BF.cur!=='USD') return _updateBillTotBase();
  const el=$('#b-tot'); if(!el) return;
  const t=r2(sum(BF.items,i=>r2((Number(i.price)||0)*(Number(i.qty)||1))));
  el.innerHTML=t?'<span>Total a cobrar <b>'+esc(qMoney(t,'USD'))+'</b></span><span class="hint">'+esc(usdLetras(t))+(BF.rate?' · equivale a '+esc(money(Math.round(t*Number(BF.rate))))+' con la TRM':'')+'</span>':'<span class="hint">Ingrese cantidad y valor en dólares de cada servicio.</span>';
};
const _billFormBase=billForm;
billForm=function(b){
  _billFormBase(b);
  const dateFld=$('#b-date'); if(!dateFld) return;
  BF.cur=BF.cur==='USD'?'USD':'COP';
  BF.pcur=(BF.cur==='USD'&&BF.usdPrices)?'USD':'COP';   /* moneda en que están hoy los valores del formulario */
  const box=document.createElement('div');
  box.id='b-curbox';
  box.innerHTML='<hr class="hr"><div class="f3"><div class="fld"><label for="b-cur">Moneda de cobro</label><select class="inp" id="b-cur"><option value="COP">Pesos colombianos (COP)</option><option value="USD">Dólares (USD)</option></select></div>'
    +'<div class="fld" id="b-rate-f"><label for="b-rate">TRM (pesos por 1 USD)</label><input class="inp num" id="b-rate" inputmode="decimal" placeholder="Ej. 3.182,99"></div>'
    +'<div class="fld" id="b-trm-f"><span class="lab">&nbsp;</span><button class="btn sm" id="b-trm" type="button">Consultar TRM del día</button></div></div>'
    +'<div class="hint" id="b-usd-hint"></div>';
  dateFld.closest('.fld').insertAdjacentElement('afterend',box);
  const cur=$('#b-cur'), rate=$('#b-rate'), hint=$('#b-usd-hint');
  cur.value=BF.cur;
  if(BF.rate) rate.value=String(BF.rate).replace('.',',');
  /* convierte los valores de los servicios cuando cambia la moneda y ya hay TRM */
  const sync=()=>{
    if(BF.cur===BF.pcur||!(Number(BF.rate)>0)) return;
    const R=Number(BF.rate);
    BF.items.forEach(it=>{ const p=Number(it.price)||0; it.price=BF.cur==='USD'?r2(p/R):Math.round(p*R); });
    BF.pcur=BF.cur; paintBillItems();
  };
  const paint=()=>{
    const usd=BF.cur==='USD';
    $('#b-rate-f').style.display=usd?'':'none'; $('#b-trm-f').style.display=usd?'':'none';
    if(!usd){ hint.textContent='El documento se emite en pesos colombianos.'; return; }
    const src=BF.rateSrc==='trm'&&BF.rate?' TRM oficial vigente del '+fmtD(BF.rateFrom||BF.date)+' al '+fmtD(BF.rateTo||BF.date)+' (Superfinanciera).':(BF.rate?' Tasa ingresada manualmente.':' Consulte o escriba la TRM para convertir los valores a dólares.');
    hint.innerHTML='Escriba el valor de cada servicio en dólares; la TRM se usa para mostrar el equivalente en pesos.'+src;
  };
  const getTrm=async(quiet)=>{
    const btn=$('#b-trm'); if(btn) btn.disabled=true;
    try{ const x=await fetchTRM(BF.date); BF.rate=x.rate; BF.rateSrc='trm'; BF.rateFrom=x.from; BF.rateTo=x.to; BF.rateDate=BF.date; rate.value=String(x.rate).replace('.',','); sync(); }
    catch(e){ if(!quiet) toast('No se pudo consultar la TRM. Escríbala manualmente.'); else hint.textContent='No se pudo consultar la TRM automática. Escríbala manualmente.'; }
    if(btn) btn.disabled=false; paint(); updateBillTot();
  };
  cur.addEventListener('change',()=>{
    if(cur.value==='COP'&&BF.pcur==='USD'&&!(Number(BF.rate)>0)){ toast('Indique la TRM para convertir los valores a pesos.'); cur.value='USD'; return; }
    BF.cur=cur.value; paint();
    if(BF.cur==='USD'&&!(Number(BF.rate)>0)) getTrm(true); else { sync(); paintBillItems(); }
  });
  rate.addEventListener('input',()=>{ BF.rate=parseDec(rate.value); BF.rateSrc='manual'; paint(); updateBillTot(); });
  rate.addEventListener('change',()=>{ sync(); });
  $('#b-trm').addEventListener('click',()=>getTrm(false));
  $('#b-date').addEventListener('change',()=>{ if(BF.cur==='USD'&&BF.rateSrc==='trm') getTrm(true); });
  const mb=$('#m-body');
  /* en dólares el valor admite decimales: se atiende aquí y no con el manejador en pesos */
  mb.addEventListener('input',e=>{ const t=e.target; if(BF.cur!=='USD'||!t.dataset||t.dataset.f!=='price') return;
    e.stopPropagation(); const it=BF.items[Number(t.dataset.i)]; if(!it) return; it.price=parseDec(t.value);
    const tt=$('#bi-t'+t.dataset.i); if(tt) tt.textContent=qMoney(r2(it.price*(Number(it.qty)||1)),'USD'); updateBillTot(); },true);
  mb.addEventListener('change',e=>{ const t=e.target; if(BF.cur!=='USD'||!t.dataset||t.dataset.f!=='price') return;
    e.stopPropagation(); const it=BF.items[Number(t.dataset.i)]; if(it) t.value=it.price?decTxt(it.price):''; },true);
  mb.addEventListener('input',e=>{ if(BF.cur==='USD'&&e.target.dataset&&e.target.dataset.f==='qty'){ setTimeout(()=>{ const i=Number(e.target.dataset.i), it=BF.items[i], tt=$('#bi-t'+i); if(it&&tt) tt.textContent=qMoney(r2((Number(it.price)||0)*(Number(it.qty)||1)),'USD'); updateBillTot(); },0); } });
  mb.addEventListener('click',e=>{ if(e.target.closest('[data-m]')) setTimeout(updateBillTot,0); });
  if(BF.cur==='USD'){ if(Number(BF.rate)>0) sync(); else getTrm(true); }
  paint(); paintBillItems();
};
/* al guardar: moneda, tasa y su origen quedan en el documento */
const _saveBillBase=saveBill;
saveBill=async function(b,andPdf){
  const usd=BF.cur==='USD';
  if(usd&&!(Number(BF.rate)>0)){ toast('Indique la TRM para cobrar en dólares.'); return false; }
  if(usd&&BF.pcur!=='USD'){ toast('Espere a que se convierta el valor a dólares e intente de nuevo.'); return false; }
  const extra=usd?{cur:'USD',usdPrices:true,rate:Number(BF.rate),rateSrc:BF.rateSrc||'manual',rateDate:BF.rateDate||BF.date||todayS(),rateFrom:BF.rateFrom||'',rateTo:BF.rateTo||''}:{cur:'COP',usdPrices:false,rate:null,rateSrc:'',rateDate:'',rateFrom:'',rateTo:''};
  const sd=saveDoc;
  saveDoc=async function(coll,id,data){ if(coll==='bills') Object.assign(data,extra); return sd.apply(this,arguments); };
  try{ return await _saveBillBase(b,andPdf); } finally{ saveDoc=sd; }
};

/* lista: las cuentas en dólares muestran su total en USD y los resúmenes suman su equivalente en pesos */
const _drawCobroBase=drawCobro;
drawCobro=function(){
  let h=_drawCobroBase();
  S.bills.filter(isUsdBill).forEach(b=>{
    const key='<td class="num" style="font-weight:800">'+esc(b.num||billNo(b.n||0))+'</td>', i=h.indexOf(key); if(i<0) return;
    const j=h.indexOf('</tr>',i), row=h.slice(i,j);
    const nr=row.replace(/<td class="num">[^<]*<\/td>/,()=>'<td class="num">'+esc(qMoney(billUsd(b),'USD'))+'<div class="hint">'+esc(money(billCop(b)))+' · TRM '+esc(trmTxt(b.rate))+'</div></td>');
    h=h.slice(0,i)+nr+h.slice(j);
  });
  const pend=S.bills.filter(b=>b.status!=='pagada'), paid=S.bills.filter(b=>b.status==='pagada');
  h=h.replace(/Por cobrar [^<]*/,()=>'Por cobrar '+money(sum(pend,billCop))).replace(/Cobrado [^<]*/,()=>'Cobrado '+money(sum(paid,billCop)));
  return h;
};

/* PDF en dólares: misma presentación, valores en USD y equivalencia en pesos con la TRM */
const _buildBillPdfBase=buildBillPdf;
buildBillPdf=async function(b){
  if(!isUsdBill(b)) return _buildBillPdfBase(b);
  const JsPDF=await loadJsPdf(), E=empData(), T=pdfTxt, RT=Number(b.rate);
  const doc=new JsPDF({unit:'mm',format:'a4'}), W=210, H=297, M=14, R=W-M, LIM=H-22;
  const DARK=[26,20,18], GREEN=[126,211,33], GD=[62,142,15], GRAY=[100,100,96], INK=[30,26,24], LINE=[222,222,216];
  const lg=await imgDims(LOGO_H);
  const col=c=>doc.setTextColor(c[0],c[1],c[2]);
  const font=(st,sz,c)=>{ doc.setFont('helvetica',st); doc.setFontSize(sz); col(c||INK); };
  const lines=(t,w)=>doc.splitTextToSize(T(t),w);
  const NO=b.num||billNo(b.n||0), totalUsd=billUsd(b), totalCop=billCop(b), U=n=>pdfMoney(n,'USD');
  function band(first){
    const bh=first?40:20;
    doc.setFillColor(...DARK); doc.rect(0,0,W,bh,'F');
    [[155,230,53],[109,194,26],[62,142,15]].forEach((c,i)=>{ doc.setFillColor(c[0],c[1],c[2]); doc.rect(i*W/3,bh,W/3+0.3,1.4,'F'); });
    const lh=first?24:11, lw=lh*lg.w/lg.h; doc.addImage(LOGO_H,'PNG',M,(bh-lh)/2,lw,lh);
    if(first){ font('bolditalic',19,GREEN); doc.text('CUENTA DE COBRO',R,15,{align:'right'}); font('bold',12,[255,255,255]); doc.text('N.º '+NO,R,23,{align:'right'}); font('bold',11,[255,255,255]); doc.text(T(longDate(b.date,'es')),R,31,{align:'right'}); }
    else { font('bolditalic',11,GREEN); doc.text('Cuenta de cobro '+NO,R,12.5,{align:'right'}); }
    return first?52:30;
  }
  function label(t,x,y){ font('bold',7.5,GD); doc.text(T(t).toUpperCase(),x,y); }
  let y=band(true);
  const need=h=>{ if(y+h>LIM){ doc.addPage(); y=band(false)+4; } };
  label('Cobrar a',M,y); label('A favor de',124,y); y+=5.5;
  let yl=y, yr=y;
  font('bold',12,INK); lines(b.cName,100).forEach(l=>{ doc.text(l,M,yl); yl+=5.4; });
  font('normal',9.5,INK);
  [b.cNit&&('NIT / C.C. '+b.cNit),b.cContact&&('Atención: '+b.cContact),b.cAddr,b.cEmail,b.cPhone].filter(Boolean).forEach(t=>{ lines(t,100).forEach(l=>{ doc.text(l,M,yl); yl+=4.8; }); });
  font('bold',11,INK); lines(E.cbNombre,R-124).forEach(l=>{ doc.text(l,124,yr); yr+=5.2; });
  font('normal',9.5,INK);
  [E.cbFirma,E.cbCc&&('C.C. '+E.cbCc),(E.laura.phone||E.tel)&&('Tel. '+(E.laura.phone||E.tel)),E.laura.email||E.email].filter(Boolean).forEach(t=>{ lines(t,R-124).forEach(l=>{ doc.text(l,124,yr); yr+=4.8; }); });
  y=Math.max(yl,yr)+6;
  doc.setFillColor(...DARK); doc.roundedRect(M,y,R-M,14,1.5,1.5,'F');
  font('normal',9,[210,210,204]); doc.text('Valor de la cuenta de cobro',M+4,y+8.6);
  font('bold',15,GREEN); doc.text(U(totalUsd),R-4,y+9.4,{align:'right'}); y+=20;
  font('normal',9.5,INK);
  lines('La suma de '+usdLetras(totalUsd).toUpperCase()+', por concepto de:',R-M).forEach(l=>{ doc.text(l,M,y); y+=4.8; }); y+=3;
  const CX={svc:M+3,qty:136,unit:162,sub:R-3}, SW=108;
  function thead(){ doc.setFillColor(...DARK); doc.rect(M,y,R-M,8,'F'); font('bold',7.5,[255,255,255]); doc.text('CONCEPTO',CX.svc,y+5.2); doc.text('CANT.',CX.qty,y+5.2,{align:'right'}); doc.text('VALOR UNIT. (USD)',CX.unit,y+5.2,{align:'right'}); doc.text('TOTAL (USD)',CX.sub,y+5.2,{align:'right'}); y+=8; }
  thead();
  (b.items||[]).forEach(it=>{
    if(y+20>LIM){ doc.addPage(); y=band(false); thead(); }
    const y0=y, qn=Number(it.qty)||1; y+=5.5;
    font('normal',8.5,INK); doc.text(String(qn),CX.qty,y0+5.5,{align:'right'}); doc.text(U(unitUsd(b,it)),CX.unit,y0+5.5,{align:'right'});
    font('bold',9,INK); doc.text(U(lineUsd(b,it)),CX.sub,y0+5.5,{align:'right'});
    font('bold',9.5,INK); lines(it.name,SW).forEach(l=>{ doc.text(l,CX.svc,y); y+=4.6; });
    if(it.detail){ font('normal',8.5,GRAY); lines(it.detail,SW).forEach(l=>{ if(y>LIM){ doc.addPage(); y=band(false)+4; font('normal',8.5,GRAY); } doc.text(l,CX.svc,y); y+=4; }); }
    y+=2.5; doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M,y,R,y);
  });
  y+=5; need(24);
  doc.setFillColor(...DARK); doc.roundedRect(112,y,R-112,10,1.5,1.5,'F'); font('normal',9,[210,210,204]); doc.text('Total a pagar',116,y+6.4); font('bold',12,GREEN); doc.text(U(totalUsd),R-4,y+6.8,{align:'right'}); y+=16;
  const eq='Valor equivalente: $ '+new Intl.NumberFormat('es-CO').format(totalCop)+' COP, liquidado a la TRM de $ '+trmTxt(RT)+' por dólar'+(b.rateSrc==='trm'?' (TRM oficial vigente del '+longDate(b.rateFrom||b.rateDate,'es')+(b.rateTo&&b.rateTo!==b.rateFrom?' al '+longDate(b.rateTo,'es'):'')+', Superfinanciera de Colombia).':' (tasa acordada el '+longDate(b.rateDate||b.date,'es')+').');
  need(12); font('italic',8.5,GRAY); lines(eq,R-M).forEach(l=>{ doc.text(l,M,y); y+=4.2; }); y+=3;
  if(b.notes){ need(20); label('Observaciones',M,y); y+=5; font('normal',9,INK); lines(b.notes,R-M).forEach(l=>{ if(y>LIM){ doc.addPage(); y=band(false)+4; font('normal',9,INK); } doc.text(l,M,y); y+=4.5; }); y+=3; }
  const pago=[E.banco&&('Banco: '+E.banco+(E.tipoCta?' · '+E.tipoCta:'')),E.numCta&&('N.º de cuenta: '+E.numCta),E.titCta&&('Titular: '+E.titCta),E.pagoExtra].filter(Boolean);
  if(pago.length){ need(10+pago.length*5); label('Datos para el pago',M,y); y+=5; font('normal',9.5,INK); pago.forEach(t=>{ lines(t,R-M).forEach(l=>{ doc.text(l,M,y); y+=4.8; }); }); y+=3; }
  if(E.cbLey){ need(10); font('italic',8.5,GRAY); lines(E.cbLey,R-M).forEach(l=>{ doc.text(l,M,y); y+=4.2; }); y+=2; }
  need(34);
  doc.setFillColor(...GREEN); doc.rect(M,y,22,1,'F'); y+=7;
  font('normal',9.5,GRAY); doc.text('Atentamente,',M,y); y+=7;
  font('bolditalic',12,INK); doc.text(T(E.cbFirma),M,y); y+=5.2;
  font('normal',9.5,INK);
  [E.cbCc&&('C.C. '+E.cbCc),E.cbNombre].filter(Boolean).forEach(l=>{ doc.text(T(l),M,y); y+=4.7; });
  const n=doc.getNumberOfPages();
  for(let i=1;i<=n;i++){
    doc.setPage(i);
    doc.setFillColor(...DARK); doc.rect(0,H-13,W,13,'F');
    [[155,230,53],[109,194,26],[62,142,15]].forEach((c,k)=>{ doc.setFillColor(c[0],c[1],c[2]); doc.rect(k*W/3,H-14.2,W/3+0.3,1.2,'F'); });
    font('normal',7.5,[200,200,194]);
    const info=[E.nombre,E.nit&&('NIT '+E.nit),E.dir,E.web,E.tel&&('Tel. '+E.tel),E.email].filter(Boolean).join('  ·  ');
    doc.text(T(info),W/2,H-7.2,{align:'center',maxWidth:W-2*M});
    font('normal',7,[150,150,144]); doc.text('Página '+i+' de '+n,W/2,H-3.4,{align:'center'});
  }
  return doc.output('blob');
};
/* correo: el valor se indica en la moneda del documento */
const _mailBillBase=mailBill;
mailBill=async function(b){
  if(!isUsdBill(b)) return _mailBillBase(b);
  const E=empData(), ok=await pdfBill(b); if(!ok) return;
  const subj='Cuenta de cobro '+(b.num||'')+' - '+E.cbNombre;
  const body='Estimado(a) '+(b.cContact||b.cName||'cliente')+',\n\nAdjunto la cuenta de cobro '+(b.num||'')+' por valor de '+qMoney(billUsd(b),'USD')+' (equivalentes a '+money(billCop(b))+' a la TRM de $ '+trmTxt(b.rate)+'), correspondiente a los servicios prestados por '+E.cbNombre+'.\n\nQuedamos atentos a cualquier inquietud.\n\nCordialmente,\n'+E.cbFirma+'\n'+E.cbNombre;
  window.location.href='mailto:'+encodeURIComponent(b.cEmail||'')+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
  toast('Se abrió el correo: adjunte el PDF que se acaba de descargar.');
};
