/* ───────── Hosting y dominio: panel propio, alertas y ajuste de la caja proyectada ───────── */
NAV_ICONS.host='<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>';
NAV_ITEMS.splice(2,0,['host','Hosting y dominio']);

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
  const p='<section class="panel" style="margin-bottom:16px;border-color:var(--warn)"><div class="panel-h"><h2>Alerta: hosting y dominio</h2><span class="hint">'+al.length+' '+plural(al.length,'cliente por atender','clientes por atender')+'</span></div><div class="list">'
    +al.slice(0,6).map(x=>'<div class="row click" data-act="nav" data-v="host" tabindex="0">'+logoHTML(x.c,'sm')+'<div class="r-main"><div class="r-title">'+esc(x.c.name)+'</div><div class="r-sub">'+(x.h.end?'Vence '+fmtD(x.h.end):'Sin fechas registradas')+'</div></div><div class="r-end"><span class="pill '+x.lvl+'">'+esc(x.text)+'</span></div></div>').join('')
    +(al.length>6?'<div class="hint" style="padding-top:8px">y '+(al.length-6)+' más en el panel de Hosting y dominio.</div>':'')+'</div></section>';
  return h.replace(/(<img class="dyl-img"[^>]*><\/div>)/,(m)=>m+p);
};
const _drawBase2=draw;
draw=function(){
  const n=hostAll().filter(x=>x.alert).length, it=NAV_ITEMS.find(x=>x[0]==='host');
  if(it) it[1]='Hosting y dominio'+(n?' · '+n:'');
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
