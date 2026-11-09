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
/* proyección: de los clientes mensuales solo se ve lo pendiente hasta el fin del mes siguiente;
   lo programado más adelante sigue guardado y aparece cuando llegue su mes */
const payHidden=p=>!p.received&&p.kind==='mensual'&&(p.billDate||'')>horizonEnd();
const _drawBase2=draw;
draw=function(){
  const all=S.pays; S.pays=all.filter(p=>!payHidden(p));
  try{ _drawBase2(); } finally{ S.pays=all; }
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
function monthSpan(){ const t=todayS(), q=t.split('-').map(Number); return {ms:t.slice(0,7)+'-01', me:ymd(new Date(q[0],q[1],0))}; }
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
/* Cuentas por cobrar del Panel general: solo lo pendiente del mes actual (lo vencido de meses anteriores se informa aparte) */
function cxcRows(){ const m=monthSpan(); return cxcAll().filter(p=>(p.billDate||'')>=m.ms&&(p.billDate||'')<=m.me); }
function cxcPrev(){ const m=monthSpan(); return cxcAll().filter(p=>(p.billDate||'')<m.ms); }
function cxcTable(rows,totalLabel){
  const total=sum(rows,p=>p.amount), by=new Map();
  rows.forEach(p=>{ if(!by.has(p.clientId)) by.set(p.clientId,[]); by.get(p.clientId).push(p); });
  const groups=[...by.entries()].map(([id,ps])=>({c:clientById(id),ps:ps.sort((a,b)=>(a.billDate||'').localeCompare(b.billDate||'')),sub:sum(ps,p=>p.amount)})).sort((a,b)=>b.sub-a.sub);
  let b='<div class="tbl-wrap"><table style="min-width:640px"><thead><tr><th>Concepto</th><th>Facturar</th><th>Pago esperado</th><th>Estado</th><th>Valor</th></tr></thead><tbody>';
  groups.forEach(g=>{
    b+='<tr style="background:var(--surface-2)"><td colspan="4"><b>'+esc(g.c.name)+'</b> <button class="link" type="button" data-cxc-open="'+esc(g.c.id)+'">Ver pagos del cliente</button></td><td class="num" style="font-weight:800">'+money(g.sub)+'</td></tr>';
    g.ps.forEach(p=>{ b+='<tr><td style="min-width:200px">'+esc(p.label)+'</td><td class="num" style="white-space:nowrap">'+fmtD(p.billDate)+'</td><td class="num" style="white-space:nowrap">'+fmtD(p.dueDate)+'</td><td>'+payPill(p,g.c)+'</td><td class="num">'+money(p.amount)+'</td></tr>'; });
  });
  return b+'<tr style="background:var(--surface-2)"><td colspan="4" style="font-weight:800">'+totalLabel+'</td><td class="num" style="font-weight:800">'+money(total)+'</td></tr></tbody></table></div>';
}
function cxcDetail(){
  const rows=cxcRows(), prev=cxcPrev(), mes=MESES[Number(todayS().slice(5,7))-1];
  let b='<p class="hint" style="margin:0">Cobros pendientes de los clientes activos que corresponden a '+mes+' ('+rows.length+' '+plural(rows.length,'cobro','cobros')+'). El total coincide con la cifra del Panel general.</p>';
  b+=rows.length?cxcTable(rows,'Total por cobrar de '+mes):'<div class="empty">No hay cobros pendientes este mes.</div>';
  if(prev.length) b+='<h3 style="margin:18px 0 6px">Vencido de meses anteriores</h3><p class="hint" style="margin:0 0 8px">Estos cobros no están sumados en la cifra del Panel general; siguen pendientes de pago.</p>'+cxcTable(prev,'Total vencido de meses anteriores');
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
    const rows=cxcRows(), tot=sum(rows,p=>p.amount), prev=sum(cxcPrev(),p=>p.amount), mes=MESES[Number(todayS().slice(5,7))-1];
    const sub='Pendiente de '+mes+' · '+rows.length+' '+plural(rows.length,'cobro','cobros')+(prev?' · aparte: '+money(prev)+' vencido de meses anteriores':'')+' · clic para ver el detalle';
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
/* admite 3.294,03 · 3,294.03 · 3294,03 · 3294.03: el último separador es el decimal; un solo punto con 3 dígitos se toma como miles */
const parseDec=v=>{
  v=String(v||'').trim().replace(/[^\d.,]/g,''); if(!v) return 0;
  const lc=v.lastIndexOf(','), ld=v.lastIndexOf('.');
  if(lc>=0&&ld>=0){ const dec=lc>ld?',':'.', th=dec===','?'.':','; v=v.split(th).join('').replace(dec,'.'); }
  else if(lc>=0){ v=v.match(/,/g).length>1?v.split(',').join(''):v.replace(',','.'); }
  else if(ld>=0){ if(v.match(/\./g).length>1||/\.\d{3}$/.test(v)) v=v.split('.').join(''); }
  return Number(v)||0;
};
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
    +'<div class="fld" id="b-rd-f" style="max-width:240px"><label for="b-rdate">Fecha de la TRM</label><input class="inp" id="b-rdate" type="date"></div>'
    +'<div class="hint" id="b-usd-hint"></div>';
  dateFld.closest('.fld').insertAdjacentElement('afterend',box);
  const cur=$('#b-cur'), rate=$('#b-rate'), hint=$('#b-usd-hint'), rdate=$('#b-rdate');
  cur.value=BF.cur; rdate.value=BF.rateDate||todayS();
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
    $('#b-rd-f').style.display=(usd&&BF.rateSrc!=='trm')?'':'none';
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
  rate.addEventListener('input',()=>{ BF.rate=parseDec(rate.value); if(BF.rateSrc!=='manual') rdate.value=todayS(); BF.rateSrc='manual'; BF.rateDate=rdate.value||todayS(); paint(); updateBillTot(); });
  rdate.addEventListener('change',()=>{ BF.rateDate=rdate.value||todayS(); });
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
  if(usd&&Number(BF.rate)<500){ toast('La TRM parece incorrecta ('+trmTxt(BF.rate)+'). Escríbala como 3294,03 o 3.294,03.'); return false; }
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
  const eq='Valor equivalente: $ '+new Intl.NumberFormat('es-CO').format(totalCop)+' COP, liquidado a la TRM de $ '+trmTxt(RT)+' por dólar'+(b.rateSrc==='trm'?' (TRM oficial vigente del '+longDate(b.rateFrom||b.rateDate,'es')+(b.rateTo&&b.rateTo!==b.rateFrom?' al '+longDate(b.rateTo,'es'):'')+', Superfinanciera de Colombia).':' (TRM del '+longDate(b.rateDate||b.date,'es')+').');
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

/* ───────── Pagos: registrar directamente lo que entró (sin factura ni cuenta de cobro) y retenciones ───────── */
const retOf=p=>p.received?(Number(p.retention)||0):0;
const _statsBase=stats;
stats=function(c){
  const s=_statsBase(c), r=sum(s.ps,retOf);
  if(r){ s.ret=r; s.saldo=Math.max(0,s.total-s.paid-r); }
  return s;
};
const _jobStatsBase=jobStats;
jobStats=function(ps){
  const s=_jobStatsBase(ps), r=sum(ps,retOf);
  if(r){ s.ret=r; s.saldo=Math.max(0,s.total-s.paid-r); }
  return s;
};
const _payCardBase=payCard;
payCard=function(p,c){
  let h=_payCardBase(p,c);
  /* la factura o cuenta de cobro es opcional */
  h=h.replace(/<div class="step[^"]*"><span class="dot"><\/span><div><div class="t">Falta emitir factura o cuenta de cobro<\/div><div class="d">[^<]*<\/div><\/div><\/div>/,()=>p.received?'':'<div class="step"><span class="dot"></span><div><div class="t">Sin factura ni cuenta de cobro</div><div class="d">Es opcional: puede registrar el pago directamente</div></div></div>');
  if(!p.received){
    h=h.replace(/<button class="recv" data-act="receive"[\s\S]*?<\/button>/,()=>'<button class="btn sm pri" data-act="receive" data-id="'+esc(p.id)+'" type="button">Registrar pago recibido</button>');
    h=h.replace('<button class="btn sm pri" data-act="invoice"','<button class="btn sm" data-act="invoice"').replace('>Registrar factura o cuenta de cobro</button>','>Registrar factura o cuenta de cobro (opcional)</button>');
  } else if(retOf(p)>0){
    h=h.replace(/(Dinero recibido · [^<]*)(<\/div>)/,(m,a,b)=>a+' · retención o diferencia '+esc(money(retOf(p)))+b);
  }
  return h;
};
receiveForm=function(p){
  const sched=Number(p.amount)||0;
  openModal({title:'Registrar pago recibido',
    body:'<p style="margin:0;font-weight:600">'+esc(p.label)+(p.invoiced?' · '+(p.docType==='cuenta'?'cuenta de cobro ':'factura ')+(p.invoiceNo?'N.º '+esc(p.invoiceNo):'registrada'):'')+'</p>'
     +'<p class="hint" style="margin:0">Valor programado: <b>'+money(sched)+'</b>. Escriba el valor exacto que entró a la cuenta; no necesita factura ni cuenta de cobro.</p>'
     +'<div class="f2"><div class="fld"><label for="rc-date">Fecha en que ingresó</label><input class="inp" id="rc-date" type="date" value="'+todayS()+'"></div><div class="fld"><label for="rc-amt">Valor que entró (COP)</label><input class="inp num" id="rc-amt" inputmode="numeric" value="'+grp(sched)+'"></div></div>'
     +'<div id="rc-diff" class="hint" style="margin:0"></div>'
     +'<div class="fld" id="rc-mode-f" style="display:none"><label for="rc-mode">La diferencia corresponde a</label><select class="inp" id="rc-mode"><option value="ret">Retención (el cobro queda completo)</option><option value="part">Pago parcial (el resto queda pendiente)</option></select></div>'
     +'<div class="fld"><label for="rc-note">Nota (opcional)</label><input class="inp" id="rc-note" placeholder="Ej. Retención en la fuente, transferencia Bancolombia"></div>'
     +'<p class="hint" style="margin:0">Al confirmar, este cobro deja de estar por cobrar y entra al Flujo de caja como ingreso por el valor exacto recibido, en el mes de la fecha de ingreso.</p>',
    onMount:()=>{
      const amt=$('#rc-amt'), diff=$('#rc-diff'), mf=$('#rc-mode-f');
      const upd=()=>{ const v=num(amt.value), d=sched-v; mf.style.display=d>0?'':'none';
        diff.textContent=d>0?'Diferencia frente a lo programado: '+money(d):(d<0?'Entró '+money(-d)+' más de lo programado.':'Entró el valor completo.'); };
      amt.addEventListener('input',upd); amt.addEventListener('change',e=>{ e.target.value=grp(num(e.target.value)); upd(); }); upd(); },
    actions:[{label:'Cancelar',fn:()=>true},{label:'Registrar pago',kind:'pri',fn:async()=>{
      const v=num($('#rc-amt').value), date=$('#rc-date').value||todayS(), note=$('#rc-note').value.trim(), diff=sched-v, mode=$('#rc-mode').value;
      if(!(v>0)){ toast('Indique el valor que entró.'); return false; }
      const base={received:true,receivedDate:date,receivedAmount:v,receivedNote:note};
      if(diff>0&&mode==='part'){
        await saveDoc('payments',null,{clientId:p.clientId,kind:p.kind,job:p.job||'',label:p.label+' (saldo pendiente)',amount:diff,billDate:p.billDate,dueDate:p.dueDate||p.billDate,invoiced:false,received:false,seq:(p.seq||0)+0.5,createdAt:new Date().toISOString(),log:[{at:new Date().toISOString(),text:'Saldo pendiente de un pago parcial de '+money(v)}]});
        await patchDoc('payments',p.id,Object.assign(base,{amount:v,retention:0,log:logEntry(p,'Pago parcial recibido · '+money(v)+' · quedan '+money(diff)+' pendientes')}));
        toast('Pago parcial registrado; el saldo de '+money(diff)+' quedó pendiente');
      } else {
        await patchDoc('payments',p.id,Object.assign(base,{retention:diff>0?diff:0,log:logEntry(p,'Pago recibido · '+money(v)+(diff>0?' (retención o diferencia '+money(diff)+')':''))}));
        toast('Pago registrado: ya no está por cobrar y entró a caja por '+money(v));
      } }}]});
};

/* ───────── Pagos de otro concepto (no programados): fecha, concepto, valor y destino del dinero ───────── */
const otrosOf=c=>S.exps.filter(e=>e.kind==='ingreso'&&e.clientId===c.id&&e.status!=='pendiente').sort((a,b)=>(b.date||'').localeCompare(a.date||''));
const destTxt=s=>s==='laura'?'Bolsillo de Laura':(s==='diego'?'Bolsillo de Diego':'Flujo de caja D&L');
function otroForm(c,e){
  const o=e||{date:todayS(),concept:'',amount:0,source:'caja',note:''};
  openModal({title:e?'Editar pago de otro concepto':'Registrar pago de otro concepto · '+c.name,
    body:'<p class="hint" style="margin:0">Para dinero que entra de este cliente y no estaba programado (por ejemplo un ajuste, un trabajo adicional o un reembolso). No requiere factura ni cuenta de cobro.</p>'
     +'<div class="f2"><div class="fld"><label for="ot-date">Fecha en que entró</label><input class="inp" id="ot-date" type="date" value="'+esc(o.date||todayS())+'"></div><div class="fld"><label for="ot-amt">Valor que entró (COP)</label><input class="inp num" id="ot-amt" inputmode="numeric" value="'+(o.amount?grp(o.amount):'')+'"></div></div>'
     +'<div class="fld"><label for="ot-con">Concepto</label><input class="inp" id="ot-con" placeholder="Ej. Ajuste de diseño, trabajo adicional, reembolso de pauta" value="'+esc(o.concept||'')+'"></div>'
     +'<div class="fld" style="max-width:420px"><label for="ot-src">A dónde entró</label><select class="inp" id="ot-src">'+srcOpts(o.source||'caja')+'</select><span class="hint">Si entró al bolsillo de Laura o de Diego, queda registrado pero no suma al Flujo de caja de D&L.</span></div>'
     +'<div class="fld"><label for="ot-note">Nota (opcional)</label><input class="inp" id="ot-note" placeholder="Ej. Transferencia Bancolombia" value="'+esc(o.note||'')+'"></div>',
    onMount:()=>{ $('#ot-amt').addEventListener('change',ev=>{ ev.target.value=grp(num(ev.target.value)); }); },
    actions:[...(e?[{label:'Eliminar',kind:'danger',fn:async()=>{ await delDoc('expenses',e.id); toast('Pago eliminado'); }}]:[]),{label:'Cancelar',fn:()=>true},{label:'Guardar',kind:'pri',fn:async()=>{
      const amount=num($('#ot-amt').value), concept=$('#ot-con').value.trim();
      if(!(amount>0)){ toast('Indique el valor que entró.'); return false; }
      if(!concept){ toast('Indique el concepto del pago.'); return false; }
      const data={kind:'ingreso',status:'pagado',clientId:c.id,amount,concept,payee:'',cat:'',rec:false,link:'',socio:'',date:$('#ot-date').value||todayS(),source:$('#ot-src').value,note:$('#ot-note').value.trim()};
      if(e) await patchDoc('expenses',e.id,data); else await saveDoc('expenses',null,Object.assign({createdAt:new Date().toISOString()},data));
      toast(data.source==='caja'?'Pago registrado: entró al Flujo de caja por '+money(amount):'Pago registrado en el '+destTxt(data.source).toLowerCase()+' (no suma a la caja de D&L)'); }}]});
}
const _tabPayBase2=tabPay;
tabPay=function(c,s){
  let h=_tabPayBase2(c,s);
  h=h.split('<button class="btn sm pri" data-act="new-job" type="button">+ Nuevo trabajo</button>').join('<button class="btn sm" data-otro="new" type="button">Registrar pago de otro concepto</button><button class="btn sm pri" data-act="new-job" type="button">+ Nuevo trabajo</button>');
  const os=otrosOf(c);
  if(os.length){
    h+='<section class="panel" style="margin-top:18px"><div class="panel-h"><h2>Pagos de otros conceptos</h2><span class="hint">'+os.length+' '+plural(os.length,'pago','pagos')+' · '+money(sum(os,x=>x.amount))+'</span></div>'
     +'<div class="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>A dónde entró</th><th>Valor</th><th></th></tr></thead><tbody>'
     +os.map(x=>'<tr><td class="num" style="white-space:nowrap">'+fmtD(x.date)+'</td><td style="min-width:200px">'+esc(x.concept||'—')+(x.note?'<div class="r-sub">'+esc(x.note)+'</div>':'')+'</td><td>'+esc(destTxt(x.source))+'</td><td class="num" style="font-weight:700">'+money(x.amount)+'</td><td style="text-align:right"><button class="link" data-otro="edit" data-id="'+esc(x.id)+'" type="button">Editar</button></td></tr>').join('')
     +'</tbody></table></div></section>';
  }
  return h;
};
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-otro]'); if(!b||!$('#app').contains(b)) return;
  if(b.dataset.otro==='new'){ const c=clientById(S.cid); if(c) otroForm(c); }
  else { const x=S.exps.find(y=>y.id===b.dataset.id), c=x&&clientById(x.clientId); if(x&&c) otroForm(c,x); }
});

/* los pagos de otro concepto que entran al bolsillo de un socio se muestran en el libro, pero no suman a la caja de D&L */
const _ledgerBase=ledgerData;
ledgerData=function(){
  const r=_ledgerBase(), st=S.caja||{}, from=st.fecha||'';
  let bal=Number(st.saldo)||0;
  r.L.forEach(x=>{
    if(x.ref==='e'&&x.dir==='in'&&(x.src==='laura'||x.src==='diego')){ x.personal=x.src; x.dir='pin'; x.concept+=' · '+money(x.amount)+' entraron al bolsillo de '+(x.src==='laura'?'Laura':'Diego'); }
    if(x.date>=from){ if(!x.personal) bal+=x.dir==='in'?x.amount:-x.amount; x.bal=bal; } else x.bal=null;
  });
  return r;
};
/* editar una entrada desde el Flujo de caja conserva (y permite cambiar) a dónde entró */
const _expenseFormBase=expenseForm;
expenseForm=function(e,defStatus,defDate,preset){
  if(e&&e.kind==='ingreso'){ const c=e.clientId?clientById(e.clientId):null; if(c) return otroForm(c,e); }
  return _expenseFormBase(e,defStatus,defDate,preset);
};

/* ───────── Pago mensual: siempre se factura el día 1 y el pago se espera hasta el día 5 de cada mes ───────── */
const _jobFormBase=jobForm;
jobForm=function(c){ _jobFormBase(c); if(JB){ JB.billDay=1; JB.term=4; } };
const fixMonthly=()=>{
  [['jb-day','jb-term'],['pf-day','pf-term']].forEach(([a,b])=>{
    const d=document.getElementById(a), t=document.getElementById(b); if(!d||!t||d.dataset.fx) return; d.dataset.fx='1';
    const set=(el,v)=>{ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
    set(d,1); set(t,4);
    const fd=d.closest('.fld'), ft=t.closest('.fld'); if(!fd||!ft) return;
    fd.style.display='none'; ft.style.display='none';
    const n=document.createElement('div'); n.className='fld';
    n.innerHTML='<span class="lab">Fechas de cada mes</span><div class="hint">Se factura el día 1 y el pago se espera del 1 al 5 de cada mes. Se programa hasta el mes siguiente y el sistema agrega cada mes automáticamente.</div>';
    fd.parentNode.insertBefore(n,fd);
  });
  [['jb-months','jb-first'],['pf-months','pf-first']].forEach(([a,b])=>{
    const m=document.getElementById(a), f=document.getElementById(b); if(!m||!f||m.dataset.fx) return; m.dataset.fx='1';
    const mf=m.closest('.fld'); if(mf) mf.style.display='none';
    monthsAuto(m,f);
  });
};
/* meses a programar: desde el primer mes hasta el mes siguiente al actual (mínimo uno) */
function monthsAuto(m,f){
  const q=todayS().split('-').map(Number), nx=q[0]*12+q[1], fm=(f.value||'').split('-').map(Number);
  const n=fm.length>1&&fm[0]?Math.min(36,Math.max(1,nx-(fm[0]*12+(fm[1]-1))+1-0)):1;
  m.value=Math.max(1,n); m.dispatchEvent(new Event('input',{bubbles:true}));
}
document.addEventListener('input',e=>{
  const t=e.target; if(!t||(t.id!=='jb-first'&&t.id!=='pf-first')) return;
  const m=document.getElementById(t.id==='jb-first'?'jb-months':'pf-months'); if(m) monthsAuto(m,t);
});
/* cada trabajo mensual activo siempre tiene programado el mes siguiente: se agrega solo al cambiar de mes */
const rollBusy=new Set();
function rollMonthly(){
  if(!S.db||!S.loaded||!S.loaded.c||!S.loaded.p) return;
  const q=todayS().split('-').map(Number), nx=q[0]*12+q[1]+1, cur=q[0]*12+q[1];   /* meses absolutos (mes 1-12) */
  const ab=b=>{ const x=b.split('-').map(Number); return x[0]*12+x[1]; };
  S.clients.filter(c=>c.status!=='cerrado').forEach(c=>{
    const by=new Map();
    paysOf(c.id).filter(p=>p.kind==='mensual'&&p.billDate).forEach(p=>{ const j=jobOf(p); if(!by.has(j)) by.set(j,[]); by.get(j).push(p); });
    by.forEach((ps,job)=>{
      ps.sort((a,b)=>a.billDate.localeCompare(b.billDate));
      const last=ps[ps.length-1], lm=ab(last.billDate);
      if(lm<cur-1||lm>=nx) return;      /* contrato sin movimiento reciente, o ya programado */
      if(ps.some(p=>Date.now()-Date.parse(p.createdAt||0)<180000)) return;   /* trabajo recién creado: sus meses aún se están guardando */
      const day=Number(last.billDate.slice(8,10)), term=Math.max(0,dayDiff(last.dueDate||last.billDate,last.billDate));
      for(let k=lm+1;k<=nx;k++){
        const y=Math.floor((k-1)/12), m=((k-1)%12)+1, key=c.id+'|'+job+'|'+y+'-'+pad(m);
        if(rollBusy.has(key)||ps.some(p=>ab(p.billDate)===k)) continue;
        rollBusy.add(key);
        const bill=y+'-'+pad(m)+'-'+pad(Math.min(day,new Date(y,m,0).getDate())), now=new Date().toISOString();
        saveDoc('payments',null,{clientId:c.id,kind:'mensual',job,label:jobLabel(job,'Mensualidad '+monthName(y,m)),amount:last.amount,billDate:bill,dueDate:addDays(bill,term),invoiced:false,received:false,seq:paysOf(c.id).length+1,createdAt:now,log:[{at:now,text:'Mes programado automáticamente'}]}).catch(()=>rollBusy.delete(key));
      }
    });
  });
}
const _drawBase3=draw;
draw=function(){ _drawBase3(); try{ rollMonthly(); }catch(e){} };
new MutationObserver(fixMonthly).observe(document.body,{childList:true,subtree:true});

/* ───────── Panel general más claro: Clientes · Ingresos · Por cobrar y por pagar ───────── */
const secT=t=>'<div class="hint" style="margin:26px 0 10px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;font-size:11.5px">'+esc(t)+'</div>';
const recIn=pre=>sum(S.pays.filter(p=>p.received&&(p.receivedDate||'').startsWith(pre)),p=>p.receivedAmount!=null?p.receivedAmount:p.amount)+sum(S.exps.filter(e=>e.status!=='pendiente'&&e.kind==='ingreso'&&(e.date||'').startsWith(pre)),e=>e.amount);
function flowRow(label,amount,sub,big){
  return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 0;border-top:1px solid var(--line)"><div><div style="font-weight:700">'+esc(label)+'</div><div class="hint">'+esc(sub)+'</div></div><div class="num" style="font-weight:800;font-size:'+(big?'22':'18')+'px;white-space:nowrap">'+money(amount)+'</div></div>';
}
const _drawHomeBase3=drawHome;
drawHome=function(){
  let h=_drawHomeBase3();
  if(S.view==='host'||!S.clients.length) return h;
  const t=todayS(), q=t.split('-').map(Number), cm=t.slice(0,7), yr=t.slice(0,4);
  const nmD=new Date(q[0],q[1],1), nm=ymd(nmD).slice(0,7), pmD=new Date(q[0],q[1]-2,1), pm=ymd(pmD).slice(0,7);
  const mes=MESES[q[1]-1], mesSig=MESES[nmD.getMonth()], mesAnt=MESES[pmD.getMonth()];
  const ms=cm+'-01', me=ymd(new Date(q[0],q[1],0));
  /* ingresos */
  const acum=recIn(yr), mesIn=recIn(cm), antIn=recIn(pm), dif=mesIn-antIn;
  const cmp=antIn?(dif>=0?'$ '+grp(dif)+' más que en '+mesAnt:'$ '+grp(-dif)+' menos que en '+mesAnt):'Cobrado en el mes en curso';
  const ing='<section class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr))" aria-label="Ingresos">'
    +stat('Ingresos acumulados '+yr,money(acum),'Todo lo cobrado en lo que va del año','good')
    +stat('Ingresos de '+mes,money(mesIn),cmp,'good')+'</section>';
  /* por cobrar: este mes y el siguiente */
  const pend=cxcAll(), cMes=pend.filter(p=>(p.billDate||'')>=ms&&(p.billDate||'')<=me), cSig=pend.filter(p=>ymOf(p.billDate)===nm), cAnt=pend.filter(p=>(p.billDate||'')<ms);
  const sCMes=sum(cMes,p=>p.amount), sCSig=sum(cSig,p=>p.amount), sCAnt=sum(cAnt,p=>p.amount);
  const cob='<section class="panel"><div class="panel-h" style="min-height:36px;align-items:center"><h2>Por cobrar</h2><button class="link" data-cxc="1" type="button">Ver detalle</button></div>'
    +flowRow('Este mes ('+mes+')',sCMes,cMes.length+' '+plural(cMes.length,'cobro pendiente','cobros pendientes'),true)
    +flowRow('Mes siguiente ('+mesSig+')',sCSig,cSig.length+' '+plural(cSig.length,'cobro programado','cobros programados'))
    +(sCAnt?flowRow('Vencido de meses anteriores',sCAnt,cAnt.length+' '+plural(cAnt.length,'cobro sin pagar','cobros sin pagar')+' · no suma arriba'):'')
    +'</section>';
  /* por pagar: gastos proyectados */
  const pg=S.exps.filter(e=>e.status==='pendiente'&&e.kind!=='ingreso'), gMes=pg.filter(e=>(e.date||'')<=me), gSig=pg.filter(e=>ymOf(e.date)===nm);
  const sGMes=sum(gMes,e=>e.amount), sGSig=sum(gSig,e=>e.amount);
  const prox=gMes.concat(gSig).sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(0,4);
  const pag='<section class="panel"><div class="panel-h" style="min-height:36px;align-items:center"><h2>Por pagar</h2><span style="display:flex;gap:8px;align-items:center"><button class="link" data-act="nav" data-v="caja" type="button">Ver en Flujo de caja</button><button class="btn sm pri" data-pp="new" type="button">+ Proyectar gasto</button></span></div>'
    +flowRow('Este mes ('+mes+')',sGMes,gMes.length+' '+plural(gMes.length,'pago pendiente','pagos pendientes'),true)
    +flowRow('Mes siguiente ('+mesSig+')',sGSig,gSig.length+' '+plural(gSig.length,'pago proyectado','pagos proyectados'))
    +(prox.length?'<div class="hint" style="margin-top:6px">Próximos: '+prox.map(e=>esc((e.payee||e.concept||expLabel(e))+' '+fmtD(e.date)+' · '+money(e.amount))).join(' · ')+'</div>':'<div class="hint" style="margin-top:6px">Aún no hay gastos proyectados. Use «+ Proyectar gasto» para anotar lo que debe pagar (pauta, plataformas, equipo, proveedores).</div>')
    +'</section>';
  const money2=secT('Ingresos')+ing+secT('Lo que viene: por cobrar y por pagar')+'<div class="cols" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">'+cob+pag+'</div>';
  h=h.replace(/<section class="stats" aria-label="Dinero">[\s\S]*?<\/section>/,()=>money2);
  h=h.replace('<section class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr))" aria-label="Clientes">',()=>secT('Clientes').replace('margin:26px 0 10px','margin:8px 0 10px')+'<section class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr))" aria-label="Clientes">');
  h=h.replace('<div class="cols" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><section class="panel"><div class="panel-h"><h2>Ingresos por mes</h2>',()=>secT('Resumen del año')+'<div class="cols" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><section class="panel"><div class="panel-h"><h2>Ingresos por mes</h2>');
  h=h.replace('<div class="cols" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><section class="panel"><div class="panel-h"><h2>Por cobrar este mes</h2>',()=>secT('Detalle de cobros')+'<div class="cols" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><section class="panel"><div class="panel-h"><h2>Por cobrar: este mes y vencido</h2>');
  return h;
};
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-pp]'); if(b&&$('#app').contains(b)) expenseForm(null,'pendiente',todayS()); });

/* ───────── Pestaña Pagos del cliente: cifras claras (pago inicial, mensualidad, cobros recibidos, por cobrar) ───────── */
const recvAmt=p=>p.receivedAmount!=null?p.receivedAmount:p.amount;
const lastOf=ps=>ps.slice().sort((a,b)=>(a.billDate||'').localeCompare(b.billDate||'')).pop();
const unrecv=ps=>sum(ps.filter(p=>!p.received),p=>p.amount);
function jobSum(j){
  const men=j.ps.some(p=>p.kind==='mensual'), rec=j.ps.filter(p=>p.received), pen=j.ps.filter(p=>!p.received), paid=sum(rec,recvAmt), por=unrecv(j.ps);
  let a;
  if(men){ const l=lastOf(j.ps), d=Number(l.billDate.slice(8,10)), v=l.dueDate?Number(l.dueDate.slice(8,10)):0;
    a=stat('Mensualidad acordada',money(l.amount),'Cada mes · se factura el día '+d+(v&&v!==d?' y se paga hasta el '+v:''),''); }
  else a=stat('Valor acordado',money(sum(j.ps,p=>p.amount)),j.ps.length>1?j.ps.length+' pagos (anticipo y saldo)':'Pago único','');
  return '<div class="pay-sum p3">'+a+stat('Cobros recibidos',money(paid),rec.length+' '+plural(rec.length,'cobro recibido','cobros recibidos'),'good')+stat('Por cobrar',money(por),por?pen.length+' '+plural(pen.length,'cobro pendiente','cobros pendientes'):'Al día',por?'warm':'')+'</div>'
    +'<div class="hint" style="font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:11px;margin:6px 0 10px">Cobros pendientes</div>';
}
const _tabPayBase4=tabPay;
tabPay=function(c,s){
  let h=_tabPayBase4(c,s);
  const jobs=jobsOf(c), mon=jobs.filter(j=>j.ps.some(p=>p.kind==='mensual')), one=jobs.filter(j=>!j.ps.some(p=>p.kind==='mensual'));
  const ini=sum(one,j=>sum(j.ps,p=>p.amount)), mens=sum(mon,j=>lastOf(j.ps).amount);
  const rec=s.ps.filter(p=>p.received), pen=s.ps.filter(p=>!p.received), por=unrecv(s.ps), atras=sum(pen.filter(p=>p.billDate<monthStart()),p=>p.amount);
  const cards=[];
  if(one.length) cards.push(stat('Pago inicial acordado',money(ini),one.length===1?one[0].name||'Trabajo principal':one.length+' trabajos',''));
  if(mon.length) cards.push(stat('Mensualidad acordada',money(mens),mon.length===1?(mon[0].name||'Pago mensual')+' · cada mes':'Suma de '+mon.length+' trabajos mensuales',''));
  cards.push(stat('Cobros recibidos',money(sum(rec,recvAmt)),rec.length+' '+plural(rec.length,'cobro recibido','cobros recibidos'),'good'));
  cards.push(stat('Cuentas por cobrar',money(por),por?pen.length+' '+plural(pen.length,'cobro pendiente','cobros pendientes')+(atras?' · '+money(atras)+' vencido':''):'Todo al día',atras?'hot':(por?'warm':'')));
  const top='<div class="pay-sum" style="grid-template-columns:repeat('+cards.length+',minmax(0,1fr))">'+cards.join('')+'</div>';
  h=h.replace(/<div class="pay-sum">(?:<div class="stat [^"]*"><div class="k">[^<]*<\/div><div class="v num">[^<]*<\/div><div class="s">[^<]*<\/div><\/div>){4}<\/div>/,()=>secT('Resumen de pagos').replace('margin:26px 0 10px','margin:2px 0 10px')+top);
  let i=0;
  h=h.replace(/<div class="pay-sum p3">(?:<div class="stat [^"]*"><div class="k">[^<]*<\/div><div class="v num">[^<]*<\/div><div class="s">[^<]*<\/div><\/div>){3}<\/div>/g,m=>jobs[i]?jobSum(jobs[i++]):m);
  h=h.split('<button class="btn sm" data-otro="new" type="button">Registrar pago de otro concepto</button><button class="btn sm pri" data-act="new-job" type="button">+ Nuevo trabajo</button></div>').join('<span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-otro="new" type="button">Registrar pago de otro concepto</button><button class="btn sm pri" data-act="new-job" type="button">+ Nuevo trabajo</button></span></div>');
  h=h.replace(/<div class="hint">(Pago mensual|Abonos|Pago único) · (\d+) pagos?<\/div>/g,(m,t)=>'<div style="margin-top:4px"><span class="pill '+(t==='Pago mensual'?'ok':'info')+'">'+t+'</span></div>');
  h=h.split('<section class="panel" style="margin-bottom:18px">').join('<section class="panel" style="margin-bottom:18px;border-left:4px solid var(--accent)">');
  return h;
};

/* ───────── Tarjeta de cada pago: compacta. Si no está registrado como recibido, está pendiente de cobro ───────── */
payCard=function(p,c){
  const done=!!p.received, doc=p.docType==='cuenta'?'cuenta de cobro':'factura', t=todayS();
  const late=!done&&p.dueDate&&dayDiff(p.dueDate,t)<0;
  const pill=done?'<span class="pill ok">Recibido</span>':(late?'<span class="pill bad">Vencido hace '+(-dayDiff(p.dueDate,t))+' '+plural(-dayDiff(p.dueDate,t),'día','días')+'</span>':'<span class="pill warn">Pendiente de cobro</span>');
  let h='<article class="pay '+(done?'done':'')+'"><div class="pay-h"><div style="min-width:0"><h3>'+esc(p.label)+'</h3><div class="meta">'+pill+'</div></div><div class="pay-amt num">'+money(p.amount)+'</div></div>';
  h+='<div class="hint" style="margin:4px 0 12px">'+(done
    ?'Recibido <b>'+money(recvAmt(p))+'</b> el '+fmtD(p.receivedDate)+(retOf(p)>0?' · retención o diferencia '+money(retOf(p)):'')+(p.receivedNote?' · '+esc(p.receivedNote):'')
    :'Se factura el '+fmtD(p.billDate)+(p.dueDate?' · pago esperado el '+fmtD(p.dueDate):''))
    +(p.invoiced?' · '+doc+(p.invoiceNo?' N.º '+esc(p.invoiceNo):' registrada'):'')+'</div>';
  if(p.invoiced){ const sup=supportHTML({link:p.invoiceLink,fileId:p.invoiceFileId,fileName:p.invoiceFileName,fileType:p.invoiceFileType}); if(sup) h+='<div class="meta" style="margin:-4px 0 10px">'+sup+'</div>'; }
  h+='<div class="pay-acts">';
  if(!done) h+='<button class="btn sm pri" data-act="receive" data-id="'+esc(p.id)+'" type="button">Registrar pago recibido</button>';
  else h+='<button class="link" data-act="unreceive" data-id="'+esc(p.id)+'" type="button">Marcar como no recibido</button>';
  h+='<button class="link" data-act="invoice" data-id="'+esc(p.id)+'" type="button">'+(p.invoiced?'Editar '+doc:'Registrar factura o cuenta de cobro (opcional)')+'</button>';
  h+='<button class="link" data-act="edit-pay" data-id="'+esc(p.id)+'" type="button">Editar pago</button></div>';
  if((p.log||[]).length) h+='<details class="hist"><summary>Historial ('+p.log.length+')</summary><ul>'+p.log.slice().reverse().map(l=>'<li>'+esc(fmtTS(l.at))+' · '+esc(l.text)+'</li>').join('')+'</ul></details>';
  return h+'</article>';
};

/* ───────── Pagos del cliente: trabajos activos primero; lo ya pagado queda abajo como historial ───────── */
const _tabPayBase6=tabPay;
tabPay=function(c,s){
  let h=_tabPayBase6(c,s);
  const jobs=jobsOf(c); if(jobs.length<2) return h;
  const MK='<section class="panel" style="margin-bottom:18px;border-left:4px solid var(--accent)">';
  const first=h.indexOf(MK); if(first<0) return h;
  const secs=[]; let pos=first, last=first;
  for(let i=0;i<jobs.length;i++){ const a=h.indexOf(MK,pos); if(a<0) break; const b=h.indexOf('</section>',a)+10; secs.push([a,b]); pos=b; last=b; }
  if(secs.length!==jobs.length) return h;
  const act=[], fin=[];
  jobs.forEach((j,i)=>{ const html=h.slice(secs[i][0],secs[i][1]); (j.ps.some(p=>!p.received)?act:fin).push({j,html}); });
  if(!fin.length) return h;
  const hist=x=>{
    const j=x.j, rec=j.ps.filter(p=>p.received).sort((a,b)=>(b.receivedDate||'').localeCompare(a.receivedDate||'')), paid=sum(rec,recvAmt), lastD=rec.length?rec[0].receivedDate:'';
    return '<details class="panel" style="margin-bottom:10px;border-left:4px solid var(--line)"><summary style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><span><b>'+esc(jobTitle(j.name))+'</b> <span class="pill ok">Pagado</span> <span class="hint">'+jobMode(j.ps)+' · '+rec.length+' '+plural(rec.length,'cobro','cobros')+(lastD?' · último pago '+fmtD(lastD):'')+'</span></span><span class="num" style="font-weight:800">'+money(paid)+'</span></summary>'
      +'<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="add-pay" data-job="'+esc(j.name)+'" type="button">+ Agregar pago</button><button class="btn sm" data-act="edit-job" data-job="'+esc(j.name)+'" type="button">Editar trabajo</button></div>'
      +'<div style="margin-top:10px">'+rec.map(p=>payCard(Object.assign({},p,{label:stripJob(p)}),c)).join('')+'</div></details>';
  };
  return h.slice(0,first)+act.map(x=>x.html).join('')+(act.length?'':'<div class="empty">No hay trabajos activos: todo lo pactado está pagado.</div>')
    +secT('Historial · trabajos pagados')+fin.map(hist).join('')+h.slice(last);
};

/* ───────── Seguimiento del cliente: tareas pendientes primero; las cumplidas abajo como historial ───────── */
const _tabSegBase=tabSeg;
tabSeg=function(c,s){
  let h=_tabSegBase(c,s);
  const d=s.ts.filter(t=>t.done).sort((a,b)=>(b.doneAt||'').localeCompare(a.doneAt||''));
  if(!d.length) return h;
  return h+secT('Historial · tareas cumplidas')+'<section class="panel" style="opacity:.92"><div class="list">'
    +d.slice(0,6).map(t=>'<div class="row"><div class="r-main"><div class="r-title" style="font-weight:600">'+esc(t.title)+'</div><div class="r-sub">Cumplida el '+fmtD(t.doneAt)+(t.owner?' · '+esc(t.owner):'')+'</div></div><div class="r-end">'+(supportHTML(t)||'')+'<span class="pill ok">Cumplida</span></div></div>').join('')
    +'<div class="hint" style="padding-top:8px">'+(d.length>6?'y '+(d.length-6)+' más. ':'')+'El detalle completo con soportes está en la pestaña Ejecutado.</div></div></section>';
};

/* ───────── Flujo de caja: gráfica de pagos a Laura y a Diego por mes ───────── */
const mCorto=n=>n>=1e6?(Math.round(n/1e5)/10).toString().replace('.',',')+' M':(n>=1000?Math.round(n/1000)+' mil':String(Math.round(n)));
function teamChart(year){
  const L=Array(12).fill(0), D=Array(12).fill(0);
  S.exps.forEach(e=>{ if(isPend(e)||isIn(e)||!e.date||e.date.slice(0,4)!==year) return; const i=Number(e.date.slice(5,7))-1; if(e.kind==='laura') L[i]+=e.amount; else if(e.kind==='diego') D[i]+=e.amount; });
  const pend=sum(S.exps.filter(e=>isPend(e)&&(e.kind==='laura'||e.kind==='diego')&&(e.date||'').slice(0,4)===year),e=>e.amount);
  const tl=sum(L,x=>x), td=sum(D,x=>x), mx=Math.max(1,...L,...D);
  let s0=0; for(let i=0;i<12;i++){ if(L[i]||D[i]){ s0=i; break; } }
  const mag=Math.pow(10,Math.floor(Math.log10(mx/4))), step=[1,2,2.5,5,10].map(k=>k*mag).find(v=>v*4>=mx), top=step*4;
  const legend=(c,t,v)=>'<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:11px;height:11px;border-radius:3px;background:'+c+';display:inline-block"></span><b>'+t+'</b> '+money(v)+'</span>';
  let grid='', cols='';
  for(let i=0;i<=4;i++){ const pc=i*25; grid+='<div style="position:absolute;left:0;right:0;bottom:'+pc+'%;border-top:1px solid var(--line)"></div><div style="position:absolute;left:-46px;width:38px;text-align:right;bottom:calc('+pc+'% - 7px);font-size:11px;color:var(--muted)">'+mCorto(step*i)+'</div>'; }
  for(let i=s0;i<12;i++){
    const nm=MESES[i].charAt(0).toUpperCase()+MESES[i].slice(1,3);
    const bar=(v,col,who)=>v?'<div title="'+who+' · '+MESES[i]+': '+esc(money(v))+'" style="width:min(40px,38%);height:'+Math.max(2,v/top*100)+'%;background:'+col+';border-radius:5px 5px 0 0"></div>':'';
    cols+='<div style="flex:1;min-width:0;display:flex;align-items:flex-end;justify-content:center;gap:4px;height:100%">'+bar(L[i],'var(--accent)','Laura')+bar(D[i],'var(--info)','Diego')+'</div>';
  }
  let foot='';
  for(let i=s0;i<12;i++){
    const nm=MESES[i].charAt(0).toUpperCase()+MESES[i].slice(1,3);
    foot+='<div style="flex:1;min-width:0;text-align:center;font-size:12px"><div style="color:var(--muted);font-weight:600">'+nm+'</div><div class="tc-v" style="color:var(--accent-ink);font-weight:700;font-size:11px;min-height:15px">'+(L[i]?mCorto(L[i]):'')+'</div><div class="tc-v" style="color:var(--info);font-weight:700;font-size:11px;min-height:15px">'+(D[i]?mCorto(D[i]):'')+'</div></div>';
  }
  const chart='<style>.tc{container-type:inline-size}@container (max-width:560px){.tc .tc-v{display:none}}</style>'
    +'<div class="tc" style="margin:18px 0 4px 48px" role="img" aria-label="Pagos a Laura y a Diego por mes en '+year+'"><div style="position:relative;height:200px">'+grid+'<div style="position:absolute;inset:0;display:flex;gap:2px">'+cols+'</div></div><div style="display:flex;gap:2px;margin-top:8px">'+foot+'</div></div>';
  return '<section class="panel" style="margin-bottom:22px"><div class="panel-h"><div><h2>Pagos a Laura y a Diego por mes · '+year+'</h2><div class="hint" style="margin-top:3px">Pagos registrados como «Pago a Laura» o «Pago a Diego» y marcados como pagados.</div></div><span class="hint" style="display:flex;gap:16px;flex-wrap:wrap">'+legend('var(--accent)','Laura',tl)+legend('var(--info)','Diego',td)+'</span></div>'
    +((tl||td)?chart:'<div class="empty" style="margin-top:10px">Aún no hay pagos a Laura o a Diego registrados en '+year+'. Aparecerán aquí cuando registre un movimiento de tipo «Pago a Laura» o «Pago a Diego».</div>')
    +(pend?'<div class="hint" style="margin-top:8px">Además hay '+money(pend)+' proyectados por pagar a Laura o Diego en '+year+' (no incluidos en la gráfica).</div>':'')+'</section>';
}
const _drawCajaBase2=drawCaja;
drawCaja=function(){
  const h=_drawCajaBase2(), y=(S.gMonth||todayS().slice(0,7)).slice(0,4);
  const k=h.search(/<div class="toolbar"><div><h2>(?:Pagos de |Proyección de pagos de )/);
  return k<0?h:h.slice(0,k)+teamChart(y)+h.slice(k);
};

/* Flujo de caja: no se navega antes del primer mes con operación y se quita el atajo a septiembre */
const firstOpMonth=()=>{ let m=''; const f=d=>{ d=(d||'').slice(0,7); if(d&&(!m||d<m)) m=d; };
  S.exps.forEach(e=>f(e.date)); S.pays.forEach(p=>{ f(p.billDate); f(p.receivedDate); });
  return m||todayS().slice(0,7); };
const _drawCajaBase3=drawCaja;
drawCaja=function(){
  const f=firstOpMonth(); if(S.gMonth&&S.gMonth<f) S.gMonth=f;
  let h=_drawCajaBase3();
  h=h.replace('<button class="link" data-act="g-sep" type="button">Ir a septiembre</button>','');
  if((S.gMonth||todayS().slice(0,7))<=f) h=h.replace('<button class="btn sm" data-act="g-prev" type="button"','<button class="btn sm" data-act="g-prev" disabled style="opacity:.4;cursor:not-allowed" type="button"');
  return h;
};
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-act="g-prev"]'); if(!b) return; if((S.gMonth||todayS().slice(0,7))<=firstOpMonth()){ e.stopImmediatePropagation(); e.preventDefault(); toast('La operación inició en '+monthLabel(firstOpMonth())); } },true);

/* cierre de caja mes a mes: el saldo con que cierra cada mes es el saldo inicial del siguiente */
function cajaMeses(upTo){
  const {L,open}=ledgerData(), f=firstOpMonth(), rows=[]; let bal=open;
  for(let y=Number(f.slice(0,4)), mo=Number(f.slice(5,7)); (y+'-'+pad(mo))<=upTo; ){
    const m=y+'-'+pad(mo), ms=m+'-01', me=ymd(new Date(y,mo,0));
    const inM=L.filter(x=>x.dir==='in'&&x.date>=ms&&x.date<=me), out=L.filter(x=>x.dir==='out'&&!x.personal&&x.date>=ms&&x.date<=me);
    const k=n=>sum(out.filter(x=>x.kind===n),x=>x.amount);
    const r={m,ini:bal,tIn:sum(inM,x=>x.amount),tL:k('laura'),tD:k('diego'),tR:k('reembolso')};
    r.tC=sum(out,x=>x.amount)-r.tL-r.tD-r.tR; r.fin=r.ini+r.tIn-r.tL-r.tD-r.tR-r.tC;
    rows.push(r); bal=r.fin; mo++; if(mo>12){ mo=1; y++; }
  }
  return rows;
}
const origenTxt=(prev,mes,ini)=>prev
  ? 'El saldo inicial de '+mes+' ('+pdfMoney(ini)+') es el saldo con que cerró '+monthLabel(prev.m)+': saldo inicial '+pdfMoney(prev.ini)+' + entradas '+pdfMoney(prev.tIn)+' - pagos a Laura '+pdfMoney(prev.tL)+' - pagos a Diego '+pdfMoney(prev.tD)+' - compras y otros gastos '+pdfMoney(prev.tC+prev.tR)+' = '+pdfMoney(prev.fin)+'.'
  : 'Es el primer mes de operación: el saldo inicial es el registrado en el sistema ('+pdfMoney(ini)+').';

/* ───────── Informe mensual de caja en PDF: qué entró, qué salió (compras y pagos a Diego y Laura) y saldo al cierre ───────── */
async function buildCajaPdf(m){
  const JsPDF=await loadJsPdf(), E=empData(), T=pdfTxt;
  const doc=new JsPDF({unit:'mm',format:'a4'}), W=210, H=297, M=14, R=W-M, LIM=H-22;
  const DARK=[26,20,18], GREEN=[126,211,33], GD=[62,142,15], GRAY=[100,100,96], INK=[30,26,24], LINE=[222,222,216], SOFT=[243,246,236];
  const lg=await imgDims(LOGO_H), P=n=>pdfMoney(n);
  const col=c=>doc.setTextColor(c[0],c[1],c[2]);
  const font=(st,sz,c)=>{ doc.setFont('helvetica',st); doc.setFontSize(sz); col(c||INK); };
  const lines=(t,w)=>doc.splitTextToSize(T(t),w);
  const dmy=s=>s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'';
  const q=m.split('-').map(Number), ms=m+'-01', me=ymd(new Date(q[0],q[1],0)), mes=monthLabel(m);
  const nx=ymd(new Date(q[0],q[1],1)).slice(0,7), mesSig=monthLabel(nx);
  const {L,open}=ledgerData();
  let ini=open; L.forEach(x=>{ if(x.bal!=null&&x.date<ms) ini=x.bal; });
  const inM=L.filter(x=>x.dir==='in'&&x.date>=ms&&x.date<=me), outAll=L.filter(x=>x.dir==='out'&&x.date>=ms&&x.date<=me);
  const out=outAll.filter(x=>!x.personal), pers=outAll.filter(x=>x.personal);
  const gL=out.filter(x=>x.kind==='laura'), gD=out.filter(x=>x.kind==='diego'), gR=out.filter(x=>x.kind==='reembolso'), gC=out.filter(x=>x.kind!=='laura'&&x.kind!=='diego'&&x.kind!=='reembolso');
  const tIn=sum(inM,x=>x.amount), tL=sum(gL,x=>x.amount), tD=sum(gD,x=>x.amount), tR=sum(gR,x=>x.amount), tC=sum(gC,x=>x.amount);
  const tOut=tL+tD+tR+tC, fin=ini+tIn-tOut;
  const cn=x=>{ const c=x.clientId?clientById(x.clientId):null; return c?c.name:''; };
  const detOut=x=>{ const base=(x.concept&&x.concept!==x.type)?x.type+' · '+x.concept:x.type; const c=cn(x); return base+(c?' · Cliente: '+c:''); };
  function band(first){
    const bh=first?40:20;
    doc.setFillColor(...DARK); doc.rect(0,0,W,bh,'F');
    [[155,230,53],[109,194,26],[62,142,15]].forEach((c,i)=>{ doc.setFillColor(c[0],c[1],c[2]); doc.rect(i*W/3,bh,W/3+0.3,1.4,'F'); });
    const lh=first?24:11, lw=lh*lg.w/lg.h; doc.addImage(LOGO_H,'PNG',M,(bh-lh)/2,lw,lh);
    if(first){ font('bolditalic',19,GREEN); doc.text('INFORME DE CAJA',R,16,{align:'right'}); font('bold',13,[255,255,255]); doc.text(T(mes.charAt(0).toUpperCase()+mes.slice(1)),R,25,{align:'right'}); font('normal',9,[210,210,204]); doc.text('Del '+dmy(ms)+' al '+dmy(me),R,32,{align:'right'}); }
    else { font('bolditalic',11,GREEN); doc.text('Informe de caja · '+T(mes),R,12.5,{align:'right'}); }
    return first?52:30;
  }
  let y=band(true);
  const need=h=>{ if(y+h>LIM){ doc.addPage(); y=band(false)+2; } };
  const title=t=>{ need(20); font('bold',11,INK); doc.text(T(t),M,y); y+=2.4; doc.setFillColor(...GREEN); doc.rect(M,y,18,0.9,'F'); y+=6.5; };
  /* resumen */
  title('Resumen del mes');
  const line=(lab,val,sign,bold)=>{ need(8); font(bold?'bold':'normal',bold?10:9.5,INK); doc.text(T(lab),M+3,y+4.6); doc.text((sign||'')+(sign?' ':'')+P(val),R-3,y+4.6,{align:'right'}); y+=7.4; doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M,y,R,y); };
  line('Saldo inicial de caja (al empezar '+mes+')',ini,'',true);
  line('Entradas: dinero que ingresó',tIn,'+');
  line('Salidas: pagos a Laura',tL,'-');
  line('Salidas: pagos a Diego',tD,'-');
  line('Salidas: compras y otros gastos',tC,'-');
  if(tR) line('Salidas: reembolsos a socios',tR,'-');
  y+=3; need(16);
  doc.setFillColor(...DARK); doc.roundedRect(M,y,R-M,14,1.5,1.5,'F');
  font('normal',9,[210,210,204]); doc.text('Saldo al cierre de '+T(mes)+' (inicia '+T(mesSig)+')',M+4,y+8.6);
  font('bold',15,GREEN); doc.text(P(fin),R-4,y+9.4,{align:'right'}); y+=21;
  /* trazabilidad: de dónde viene el saldo inicial */
  const meses=cajaMeses(m), prev=meses.length>1?meses[meses.length-2]:null;
  title('De dónde viene el saldo inicial');
  font('normal',9,GRAY); lines(origenTxt(prev,mes,ini),R-M).forEach(l=>{ need(6); doc.text(l,M,y); y+=4.5; }); y+=3;
  if(meses.length>1){
    need(30); doc.setFillColor(...DARK); doc.rect(M,y,R-M,7,'F'); font('bold',7.5,[255,255,255]);
    doc.text('MES',M+3,y+4.8); doc.text('SALDO INICIAL',78,y+4.8,{align:'right'}); doc.text('ENTRADAS',108,y+4.8,{align:'right'}); doc.text('SALIDAS',140,y+4.8,{align:'right'}); doc.text('SALDO AL CIERRE',R-3,y+4.8,{align:'right'}); y+=7;
    meses.forEach(r=>{ need(9); font(r.m===m?'bold':'normal',8.6,INK); doc.text(T(monthLabel(r.m)),M+3,y+5.2); doc.text(P(r.ini),78,y+5.2,{align:'right'}); doc.text(P(r.tIn),108,y+5.2,{align:'right'}); doc.text(P(r.tL+r.tD+r.tC+r.tR),140,y+5.2,{align:'right'}); doc.text(P(r.fin),R-3,y+5.2,{align:'right'});
      y+=8; doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M,y,R,y); });
    y+=8;
  }
  /* tablas */
  function table(rows,totLabel,tot){
    if(!rows.length){ font('italic',9,GRAY); doc.text('Sin movimientos en el mes.',M+3,y+3); y+=10; return; }
    need(22); doc.setFillColor(...DARK); doc.rect(M,y,R-M,7,'F'); font('bold',7.5,[255,255,255]); doc.text('FECHA',M+3,y+4.8); doc.text('DETALLE',M+27,y+4.8); doc.text('VALOR',R-3,y+4.8,{align:'right'}); y+=7;
    rows.forEach(r=>{ const ls=lines(r[1],R-M-27-42), h=Math.max(1,ls.length)*4.4+3.2;
      if(y+h>LIM){ doc.addPage(); y=band(false)+2; }
      font('normal',8.5,INK); doc.text(dmy(r[0]),M+3,y+4.6); ls.forEach((l,i)=>doc.text(l,M+27,y+4.6+i*4.4)); font('bold',8.8,INK); doc.text(P(r[2]),R-3,y+4.6,{align:'right'});
      y+=h; doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M,y,R,y); });
    need(10); doc.setFillColor(...SOFT); doc.rect(M,y,R-M,8,'F'); font('bold',9,INK); doc.text(T(totLabel),M+3,y+5.4); doc.text(P(tot),R-3,y+5.4,{align:'right'}); y+=13;
  }
  title('Entradas: dinero que ingresó · '+P(tIn));
  table(inM.map(x=>[x.date,(x.type==='Cobro de cliente'?x.concept:x.type+' · '+x.concept),x.amount]),'Total de entradas',tIn);
  title('Pagos a Laura · '+P(tL));
  table(gL.map(x=>[x.date,detOut(x),x.amount]),'Total pagado a Laura',tL);
  title('Pagos a Diego · '+P(tD));
  table(gD.map(x=>[x.date,detOut(x),x.amount]),'Total pagado a Diego',tD);
  title('Compras y otros gastos · '+P(tC));
  table(gC.map(x=>[x.date,detOut(x),x.amount]),'Total de compras y otros gastos',tC);
  if(gR.length){ title('Reembolsos a socios · '+P(tR)); table(gR.map(x=>[x.date,detOut(x),x.amount]),'Total de reembolsos',tR); }
  /* notas */
  const notes=[];
  if(!S.caja) notes.push('No hay un saldo inicial de caja registrado: el saldo se calcula únicamente con las entradas y salidas registradas en el sistema.');
  if(pers.length) notes.push('Además hay '+pers.length+' '+plural(pers.length,'gasto pagado','gastos pagados')+' con dinero personal de los socios por '+P(sum(pers,x=>x.amount))+'. No descuentan de la caja hasta que D&L los reembolse.');
  notes.push('Los cobros de clientes se cuentan por el valor exacto recibido, en la fecha en que ingresó el dinero.');
  need(10+notes.length*9); title('Notas'); font('normal',8.8,GRAY);
  notes.forEach(n=>{ lines(n,R-M).forEach(l=>{ if(y>LIM){ doc.addPage(); y=band(false)+4; font('normal',8.8,GRAY); } doc.text(l,M,y); y+=4.4; }); y+=1.8; });
  const n=doc.getNumberOfPages();
  for(let i=1;i<=n;i++){
    doc.setPage(i);
    doc.setFillColor(...DARK); doc.rect(0,H-13,W,13,'F');
    [[155,230,53],[109,194,26],[62,142,15]].forEach((c,k)=>{ doc.setFillColor(c[0],c[1],c[2]); doc.rect(k*W/3,H-14.2,W/3+0.3,1.2,'F'); });
    font('normal',7.5,[200,200,194]);
    const info=[E.nombre,E.nit&&('NIT '+E.nit),E.web,E.tel&&('Tel. '+E.tel),E.email].filter(Boolean).join('  ·  ');
    doc.text(T(info),W/2,H-7.2,{align:'center',maxWidth:W-2*M});
    font('normal',7,[150,150,144]); doc.text('Generado el '+dmy(todayS())+'  ·  Página '+i+' de '+n,W/2,H-3.4,{align:'center'});
  }
  return doc.output('blob');
}
async function pdfCaja(m){
  let blob;
  try{ blob=await buildCajaPdf(m); }
  catch(err){ console.error(err); toast('No se pudo generar el PDF. Revise su conexión e intente de nuevo.'); return false; }
  const fname='Informe-de-caja-'+m+'.pdf';
  try{
    if(S.dl){ await S.dl.save({filename:fname,data:blob}); }
    else { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },4000); }
    toast('Informe de '+monthLabel(m)+' listo.'); return true;
  }catch(err){ console.error(err); toast('No se pudo guardar el PDF.'); return false; }
}
function informeForm(){
  const cm=todayS().slice(0,7), f=firstOpMonth(), opts=[];
  for(let y=Number(f.slice(0,4)), mo=Number(f.slice(5,7)); (y+'-'+pad(mo))<=cm; ){ opts.push(y+'-'+pad(mo)); mo++; if(mo>12){ mo=1; y++; } }
  const sel=(S.gMonth&&opts.includes(S.gMonth))?S.gMonth:cm;
  openModal({title:'Informe de caja en PDF',
    body:'<p class="hint" style="margin:0">Descargue el informe del mes: qué dinero entró, qué dinero salió (pagos a Laura, pagos a Diego y compras y otros gastos) y el saldo para el cierre del mes.</p>'
     +'<div class="fld" style="max-width:320px"><label for="inf-m">Mes del informe</label><select class="inp" id="inf-m">'+opts.slice().reverse().map(o=>'<option value="'+o+'"'+(o===sel?' selected':'')+'>'+esc(monthLabel(o))+'</option>').join('')+'</select></div>',
    actions:[{label:'Cancelar',fn:()=>true},{label:'Descargar PDF',kind:'pri',fn:async()=>{ const ok=await pdfCaja($('#inf-m').value); return ok!==false; }}]});
}
const _drawCajaBase4=drawCaja;
drawCaja=function(){
  return _drawCajaBase4().replace('<button class="btn pri" data-act="add-exp" type="button">+ Registrar entrada o salida</button>',()=>'<button class="btn" data-informe="1" type="button">Descargar informe PDF</button><button class="btn pri" data-act="add-exp" type="button">+ Registrar entrada o salida</button>');
};
const _drawHomeBase4=drawHome;
drawHome=function(){
  const h=_drawHomeBase4(); if(S.view==='host') return h;
  const t=secT('Ingresos');
  return h.replace(t,()=>'<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">'+t+'<button class="btn sm" data-informe="1" type="button" style="margin-bottom:10px">Descargar informe de caja (PDF)</button></div>');
};
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-informe]'); if(b&&$('#app').contains(b)) informeForm(); });

/* Flujo de caja en pantalla: cierre mes a mes con la trazabilidad del saldo inicial */
const _drawCajaBase5=drawCaja;
drawCaja=function(){
  const h=_drawCajaBase5(), cm=todayS().slice(0,7), vm=S.gMonth||cm, upTo=vm>cm?vm:cm;
  const rows=cajaMeses(upTo); if(!rows.length) return h;
  const mes=monthLabel(vm), cur=rows.find(r=>r.m===vm), prev=rows.find(r=>r.m<vm&&ymd(new Date(Number(r.m.slice(0,4)),Number(r.m.slice(5,7)),1)).slice(0,7)===vm);
  const nota=prev?'El saldo inicial de '+mes+' ('+money(cur.ini)+') viene del cierre de '+monthLabel(prev.m)+': '+money(prev.ini)+' de saldo inicial + '+money(prev.tIn)+' que entraron - '+money(prev.tL)+' a Laura - '+money(prev.tD)+' a Diego - '+money(prev.tC+prev.tR)+' en compras y otros gastos.':(cur?'Es el primer mes de operación: el saldo inicial es '+money(cur.ini)+'.':'');
  const tr=rows.slice().reverse().map(r=>'<tr'+(r.m===vm?' style="background:var(--surface-2)"':'')+'><td style="white-space:nowrap"><b>'+esc(monthLabel(r.m))+'</b>'+(r.m===cm?' <span class="hint">(en curso)</span>':'')+'</td><td class="num">'+money(r.ini)+'</td><td class="num">'+money(r.tIn)+'</td><td class="num">'+money(r.tL)+'</td><td class="num">'+money(r.tD)+'</td><td class="num">'+money(r.tC+r.tR)+'</td><td class="num" style="font-weight:800">'+money(r.fin)+'</td></tr>').join('');
  const panel='<section class="panel" style="margin-bottom:22px"><div class="panel-h"><div><h2>Cierre de caja mes a mes</h2><div class="hint" style="margin-top:3px">El saldo con que cierra cada mes pasa automáticamente como saldo inicial del siguiente.</div></div><button class="btn sm" data-informe="1" type="button">Descargar informe PDF</button></div>'
    +(nota?'<div class="hint" style="margin:10px 0">'+esc(nota)+'</div>':'')
    +'<div class="tbl-wrap"><table style="min-width:760px"><thead><tr><th>Mes</th><th>Saldo inicial</th><th>Entradas</th><th>Pagos a Laura</th><th>Pagos a Diego</th><th>Compras y otros</th><th>Saldo al cierre</th></tr></thead><tbody>'+tr+'</tbody></table></div></section>';
  const MK='<section class="panel" style="margin-bottom:22px"><div class="panel-h"><div><h2>Pagos a Laura y a Diego por mes';
  const k=h.indexOf(MK);
  return k<0?h:h.slice(0,k)+panel+h.slice(k);
};
