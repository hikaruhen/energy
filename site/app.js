import {classroomTools,fairWheelTable,pairTable} from './classroom.js?v=31';
import {groups,modes,defaults,shortNames,dragKeys} from './config.js?v=31';
import {clamp,fmt,kinetic,gravity,elastic,directionalWork,axisDisplacement,springAt,flightAt,projectileAt,pendulumInitial,pendulumForces,pendulumStep,pendulumEnergy,machine,inclineComparison,leverComparison,pulleyComparison,wheelComparison,approx,springObservationTime,pendulumObservation} from './physics.js?v=31';
import {scene,workGeometry} from './scenes.js?v=31';
import {comparisonDrop} from './comparison.js?v=31';
const $=s=>document.querySelector(s);
const states=Object.fromEntries(Object.keys(modes).map(id=>[id,defaults(id)]));
let current='work2d',groupId='work',running=false,drag=null,lastFrame=0,paintTime=0;
const svg=$('#scene'),wrap=$('#scene-wrap');
let geometry={},workView=null;
const machineIds=['incline','lever','pulley','fixed','movable','wheel'];
const pendIds=['pendulum','damped'];
const state=()=>states[current];
const lastModes=Object.fromEntries(groups.map(g=>[g.id,g.modes[0]]));
function physicsParams(s=state(),id=current){return {...s.p,progress:s.p.progress/100,damping:id==='damped'};}
function bounds(d){
  if(current==='wheel'&&d.key==='stroke')return {min:0,max:wheelComparison(state().p).targetStroke};
  if(current==='lever'&&state().p.layout==='same-short'){
    const p=state().p;
    if(d.key==='loadPos')return {min:p.forcePos+.4,max:3.8};
    if(d.key==='pivotPos')return {min:.2,max:p.forcePos-.4};
    if(d.key==='forcePos')return {min:p.pivotPos+.4,max:p.loadPos-.4};
  }
  if(current==='lever'&&state().p.layout==='same'){
    const p=state().p;
    if(d.key==='loadPos')return {min:p.pivotPos+.4,max:p.forcePos-.4};
    if(d.key==='pivotPos')return {min:.2,max:p.loadPos-.4};
    if(d.key==='forcePos')return {min:p.loadPos+.4,max:3.8};
  }
  if(current==='lever'){
    if(d.key==='loadPos')return {min:.2,max:state().p.pivotPos-.4};
    if(d.key==='pivotPos')return {min:state().p.loadPos+.4,max:state().p.forcePos-.4};
    if(d.key==='forcePos')return {min:state().p.pivotPos+.4,max:3.8};
  }
  if(current==='fall'&&d.key==='h')return {min:0,max:Math.max(20,state().p.h)};
  if(current==='incline'&&d.key==='L')return {min:state().p.H,max:5};
  if(current==='wheel'&&d.key==='r')return {min:.05,max:Math.min(.25,Math.round((state().p.R-.01)*100)/100)};
  return {min:d.min,max:d.max};
}
function energyData(){
  const s=state(),p=s.p;let rows=[],facts=[],note='',scale=1;
  const row=(label,value,color,unit='J',total=false)=>({label,value,color,unit,total});
  const K=(v)=>row('動能',v,'var(--kinetic)');
  const U=(v)=>row('重力位能',v,'var(--gravity)');
  if(current==='work2d'){
    const displacement=axisDisplacement(p.axis,p.s),z=directionalWork(p.F,displacement.dx,displacement.dy,p.direction),name={right:'向右',left:'向左',up:'向上',down:'向下'}[p.direction];
    rows=[row(`指定向<span class="work-direction">${name.slice(1)}</span>施力作功`,z.W,'var(--kinetic)')];
    const movement=p.s===0?'位移':(p.axis==='x'?(p.s>0?'向右位移':'向左位移'):(p.s>0?'向上位移':'向下位移'));facts=[['施力大小',p.F,'N'],[movement,Math.abs(p.s),'m']];scale=Math.max(50,Math.abs(z.W));
  }else if(current==='compare'){
    rows=[row('A 動能',kinetic(p.m,p.v),'var(--kinetic)'),row('B 動能',kinetic(p.mB,p.vB),'var(--gravity)')];
    facts=[['A 質量',p.m,'kg'],['A 速率',p.v,'m/s'],['B 質量',p.mB,'kg'],['B 速率',p.vB,'m/s']];scale=Math.max(1,kinetic(p.m,p.v),kinetic(p.mB,p.vB));
  }else if(current==='fall'){
    const z=projectileAt(p,s.time);rows=[K(z.K),U(z.U),row('力學能合計',z.E,'var(--ink)','J',true)];
    facts=[['目前高度',z.h,'m'],['目前速率',z.v,'m/s'],['水平位移（右正）',z.x,'m'],['水平速度（右正）',z.vx,'m/s'],['鉛直速度（上正）',z.vy,'m/s'],['播放時間',z.t,'s']];
    scale=z.E||1;note=z.ended?'演示截至接地前，不模擬碰撞。':'動能與位能互換，無阻力時總量不變。';
  }else if(current==='spring'){
    const z=springAt(p,s.time);rows=[K(z.K),row('彈力位能',z.U,'var(--spring)'),row('力學能合計',z.E,'var(--ink)','J',true)];
    facts=[['初始設定形變',p.x,'m'],['目前形變',z.x,'m'],['回復力（右正）',-p.k*z.x,'N'],['速度（右正）',z.v,'m/s'],['播放時間',s.time,'s']];scale=z.E||1;note='經過原長位置時，彈力位能最小、動能最大。';
  }else if(pendIds.includes(current)){
    const z=pendulumEnergy(physicsParams(),s.pend||pendulumInitial(p));
    rows=[K(z.K),U(z.U)];if(current==='damped')rows.push(row('力學能小計＝動能＋重力位能',z.K+z.U,'var(--ink)','J',true),row('本次累積轉移的熱能',z.Q,'var(--heat)'));
    rows.push(row(current==='damped'?'包含熱能的合計':'力學能合計',z.E,'var(--ink)','J',true));
    const initial=gravity(p.m,p.g,p.L*(1-Math.cos(p.angle*Math.PI/180)));
    const at=s.pend||pendulumInitial(p);
    scale=initial||1;facts=[['初始釋放角度',p.angle,'°'],['目前角度',at.theta*180/Math.PI,'°'],['播放時間',s.time,'s'],['重力',p.m*p.g,'N'],['繩張力',pendulumForces(p,at).tension,'N']];
    if(current==='damped')facts.push(['阻力大小',Math.abs(.3*p.L*at.omega),'N']);
    note=current==='damped'?'阻力使力學能轉為熱能；此總量包括熱能。':'最高點動能為0，最低點重力位能為0。';
  }else if(current==='wheel'){
    const z=wheelComparison(p);rows=[row('目前輸入功',z.W,'var(--kinetic)'),row('目前增加的位能',z.U,'var(--gravity)')];
    facts=[['已拉繩',z.s,'m'],['物件上升',z.h,'m']];scale=z.targetWork;note='同軸、同轉角；兩端路程比等於半徑比。忽略摩擦與慣性。';
  }else if(current==='pulley'){
    const z=pulleyComparison(p);rows=[row('目前輸入功',z.W,'var(--kinetic)'),row('目前增加的位能',z.U,'var(--gravity)')];
    facts=[['目前提升',z.h,'m'],['目前施力端路程',z.s,'m']];scale=z.targetWork;note='忽略繩、滑輪重量與摩擦；準靜態提升。';
  }else if(current==='lever'){
    const z=leverComparison(p);rows=[row('目前輸入功',z.W,'var(--kinetic)'),row('目前增加的位能',z.U,'var(--gravity)')];
    facts=[['施力臂 a',z.effortArm,'m'],['抗力臂 b',z.loadArm,'m'],['目前提升',z.h,'m'],['目前施力端路程',z.s,'m']];scale=z.targetWork||1;note='力矩平衡：F × 施力臂 = mg × 抗力臂；不含桿重與摩擦。';
  }else if(machineIds.includes(current)){
    const z=machine(current,physicsParams());
    rows=[row('輸入功',z.W,'var(--kinetic)'),row('增加的重力位能',z.U,'var(--gravity)')];
    facts=[['所需施力',z.F,'N'],['施力端路程',z.s,'m'],['負載重量',z.weight,'N'],['負載提升',z.h,'m']];
    if(current==='lever')facts.push(['施力臂',p.a*Math.cos(p.phi*Math.PI/180),'m'],['抗力臂',p.b*Math.cos(p.phi*Math.PI/180),'m']);
    if(current==='incline'){const c=inclineComparison(physicsParams());facts=[['斜面角度',c.angle,'°'],['施力為直提的',c.ratio,'倍'],['負載重量',c.weight,'N'],['提升高度',c.h,'m']];}
    note='緩慢提升、忽略摩擦：輸入功等於位能增加，不能省功。';scale=Math.max(1,z.U);
  }
  return {rows,facts,note,scale};
}
function arrangeCalculation(){
  const panel=$('#energy-calculation'),host=$('#results');if(panel.parentElement!==host)host.append(panel);
}
function calculationSteps(){
  const panel=$('#energy-calculation');panel.hidden=!['compare','fall'].includes(current);if(panel.hidden)return;
  arrangeCalculation();const s=state(),p=s.p,answer=(value,exact=false)=>s.calculated?`${exact?'=':'≈'} ${fmt(value)} J`:'= — J';
  const inputValue=value=>value!==0&&Math.abs(value)<.000001?value.toExponential(3):new Intl.NumberFormat('zh-TW',{maximumFractionDigits:6}).format(value);
  const kineticCard=(label,m,v,exact=false)=>`<div class="formula-card"><h3>${label}</h3><p>K = ½mv²</p><p class="substitution">½ × ${fmt(m)} × (${inputValue(v)})²</p><strong>${answer(kinetic(m,v),exact)}</strong></div>`;
  if(current==='compare')panel.innerHTML=`<h2>動能怎麼算</h2><div class="formula-grid">${kineticCard('A 動能',p.m,p.v,true)}${kineticCard('B 動能',p.mB,p.vB,true)}</div>`;
  else{
    const z=projectileAt(p,s.time);
    panel.innerHTML=`<h2>能量怎麼算</h2><div class="formula-grid">${kineticCard('動能',p.m,z.v)}<div class="formula-card"><h3>重力位能</h3><p>U = mgh</p><p class="substitution">${fmt(p.m)} × ${fmt(p.g)} × ${inputValue(z.h)}</p><strong>${answer(z.U)}</strong></div></div><p class="energy-sum">力學能 E = K + U ${answer(z.E)}</p><p class="calculation-note">採 SI 單位，代入值最多顯示6位小數。</p>`;
  }
}
function results(){
  calculationSteps();const direct=$('[data-direct-value]');if(direct){const key=dragKeys[current],d=modes[current].params.find(d=>d.key===key);direct.textContent=current==='pulley'?`${fmt(state().p.progress)} % · ${approx(pulleyComparison(state().p).duration*state().p.progress/100)} s`:current==='lever'?`${fmt(state().p.progress)} % · ${fmt(leverComparison(state().p).duration*state().p.progress/100)} s`:`${fmt(state().p[key])} ${d.unit}`;}
  const s=state();$('#work-scales').hidden=current!=='work2d';if(current==='work2d')$('#force-readout').textContent=`施力 ${s.p.F} N`;$('#live-state').textContent=current==='compare'?(s.calculated?(running?'演示中':'已暫停'):'按計算演示'):(s.calculated?'即時更新':'按計算看結果');$('#live-state').classList.toggle('active',s.calculated);
  $('#results-title').textContent=current==='work2d'?'作功':'觀察結果';
  const d=energyData(),expanded=$('#extra-results')?.open||false;
  const showFacts=true;
  const facts=list=>list.length?`<div class="facts">${list.map(([label,value,unit])=>`<div class="fact"><span>${label}</span><strong title="${showFacts?value+' '+unit:'待計算'}">${showFacts?(['pulley','wheel'].includes(current)?approx(value):fmt(value)):'—'} <small>${unit}</small></strong></div>`).join('')}</div>`:'';
  const c=current==='incline'?inclineComparison(physicsParams()):null;
  const lever=current==='lever'?leverComparison(state().p):null;
  const leverTable=lever?`<div class="lever-comparison"><p class="lever-condition">同升高 ${fmt(lever.targetHeight)} m<br>施力端速度同為 ${fmt(lever.inputSpeed)} m/s</p><table><thead><tr><th>完成全程</th><th>直接提升</th><th>槓桿</th></tr></thead><tbody><tr><th>施力</th><td>${fmt(lever.weight)} N</td><td>${fmt(lever.F)} N</td></tr><tr><th>路程</th><td>${fmt(lever.targetHeight)} m</td><td>${fmt(lever.targetStroke)} m</td></tr><tr><th>所需時間</th><td>${fmt(lever.directTime)} s</td><td>${fmt(lever.duration)} s</td></tr><tr><th>全程作功</th><td>${s.calculated?fmt(lever.targetWork):'—'} J</td><td>${s.calculated?fmt(lever.targetWork):'—'} J</td></tr></tbody></table><p class="lever-conclusion">${Math.abs(lever.forceRatio-1)<1e-12?'等臂：施力、路程與時間相同。':lever.forceRatio<1?'省力、路程較長、費時；不省功。':'費力、路程較短、省時；不省功。'}</p></div>`:'';
  const wheel=current==='wheel'?wheelComparison(s.p):null;
  const wheelTable=wheel&&s.p.compareMode==='height'?fairWheelTable(s.p,s.calculated):wheel?`<div class="lever-comparison wheel-comparison"><p class="lever-condition">固定拉繩 3 m；本配置升高 ${approx(wheel.targetHeight)} m<br>施力端速率同為 0.5 m/s</p><table><thead><tr><th>完成全程</th><th>直接提升</th><th>輪軸</th></tr></thead><tbody>${[['施力',wheel.weight,wheel.F,'N'],['路程',wheel.targetHeight,3,'m'],['所需時間',wheel.directTime,6,'s'],['全程作功',wheel.targetWork,wheel.targetWork,'J']].map(([label,a,b,u])=>`<tr><th>${label}</th><td>${u==='J'&&!s.calculated?'—':approx(a)} ${u}</td><td>${u==='J'&&!s.calculated?'—':approx(b)} ${u}</td></tr>`).join('')}</tbody></table><p class="lever-conclusion">${wheel.ratio>1?'省力、拉繩路程長、費時；不省功。':'費力、拉繩路程短、省時；不省功。'}<br>兩端路程比＝兩端半徑比</p></div>`:'';
  const pulley=current==='pulley'?pulleyComparison(s.p):null;
  const pulleyTable=pulley?`<div class="lever-comparison pulley-comparison"><p class="lever-condition">同升高 ${fmt(pulley.targetHeight)} m<br>施力端速率同為 ${fmt(pulley.inputSpeed)} m/s</p><table><thead><tr><th>完成全程</th><th>直接提升</th><th>滑輪</th></tr></thead><tbody>${[['施力',pulley.weight,pulley.F,'N'],['路程',pulley.targetHeight,pulley.targetStroke,'m'],['所需時間',pulley.directTime,pulley.duration,'s'],['全程作功',pulley.targetWork,pulley.targetWork,'J']].map(([label,a,b,u])=>`<tr><th>${label}</th><td>${u==='J'&&!s.calculated?'—':fmt(a)} ${u}</td><td>${u==='J'&&!s.calculated?'—':fmt(b)} ${u}</td></tr>`).join('')}</tbody></table><p class="lever-conclusion">${pulley.ratio===1?'不省力、不省時；不省功。':pulley.reverse?'費力、路程較短、省時；不省功。':'省力、路程較長、費時；不省功。'}</p></div>`:'';
  const compare=c?`<div class="incline-comparison"><p>同一物體，兩種提升方式</p><p>目前同升高：${fmt(c.h)} m</p><p class="full-distance">到頂端：直提 ${fmt(state().p.H)} m／斜面 ${fmt(state().p.L)} m</p><table><thead><tr><th></th><th>直接提升</th><th>沿斜面</th></tr></thead><tbody><tr><th>施力</th><td>${fmt(c.directForce)} N</td><td>${fmt(c.F)} N</td></tr><tr><th>已走路程</th><td>${fmt(c.directDistance)} m</td><td>${fmt(c.s)} m</td></tr><tr><th>作功</th><td>${s.calculated?fmt(c.directWork):'—'} J</td><td>${s.calculated?fmt(c.W):'—'} J</td></tr></tbody></table><p class="incline-reason">${c.ratio===1?'斜面直立時，與直接提升相同，不省力。':'相同高度需要相同功；路程變長，所需施力較小。'}<br>同步僅供對照，不代表同拉繩速率時等時。</p></div>`:'';
  $('#result-content').innerHTML=(current==='fall'&&projectileAt(s.p,s.time).ended?'<p class="endpoint-note">演示截至接地前，不模擬碰撞</p>':'')+d.rows.map(r=>`<div class="energy-row ${r.total?'total':''}"><div class="energy-label"><span>${r.label}</span><strong title="${s.calculated?r.value+' '+r.unit:'待計算'}">${s.calculated?(current==='pulley'?approx(r.value):fmt(r.value)):'—'} <small>${r.unit}</small></strong></div>${!r.total?`<div class="track"><div class="fill" style="--color:${r.color};width:${s.calculated?clamp(Math.abs(r.value)/d.scale*100,0,100):0}%"></div></div>`:''}</div>`).join('')+
    compare+leverTable+pulleyTable+wheelTable+pairTable(s.pair)+facts(current==='compare'?d.facts:d.facts.slice(0,2))+(current==='work2d'||current==='compare'?'':`<details id="extra-results" class="extra-results" ${expanded?'open':''}><summary>更多數值與量尺</summary>${facts(d.facts.slice(2))}<p class="result-note">${d.note}</p><p class="scale-note">所有能量條使用同一量尺；滿格 ${s.calculated?fmt(d.scale):'—'} J。</p></details>`);

}
function renderControls(){
  $('#parameters').hidden=false;$('[data-jump=parameters]').hidden=false;
  if(current==='compare'){$('#controls').innerHTML=classroomTools(current,state());return;}
  const field=d=>{
    if(d.options)return `<div class="parameter"><label for="p-${d.key}">${d.label}</label><select id="p-${d.key}" data-key="${d.key}">${d.options.map(([value,label])=>`<option value="${value}" ${String(state().p[d.key])===String(value)?'selected':''}>${label}</option>`).join('')}</select></div>`;
    const b=bounds(d);
    return `<div class="parameter" data-param="${d.key}"><div class="parameter-head"><label for="p-${d.key}">${d.label}<span class="unit">${d.unit}</span></label><input id="p-${d.key}" data-key="${d.key}" type="number" inputmode="decimal" min="${b.min}" max="${b.max}" step="${d.step}" value="${state().p[d.key]}" aria-describedby="error-${d.key}"></div><div class="param-inputs"><button type="button" data-adjust="${d.key}" data-sign="-1" aria-label="減少${d.label}">−</button><input type="range" data-key="${d.key}" min="${b.min}" max="${b.max}" step="${d.step}" value="${state().p[d.key]}" aria-label="${d.label}滑桿"><button type="button" data-adjust="${d.key}" data-sign="1" aria-label="增加${d.label}">＋</button></div><p id="error-${d.key}" class="error" role="status"></p>${d.key==='x'?'<p class="scale-note">負值：壓縮　正值：拉長</p>':''}</div>`;
  };
  const list=modes[current].params.filter(d=>(current!=='work2d'||d.key==='direction')&&d.key!==dragKeys[current]&&!(current==='lever'&&['loadPos','pivotPos','forcePos'].includes(d.key))&&!(current==='pulley'&&['count','drive'].includes(d.key))&&!(current==='wheel'&&d.key==='targetHeight'&&state().p.compareMode!=='height'));
  const direct=modes[current].params.find(d=>d.key===dragKeys[current]);
  $('#controls').innerHTML=classroomTools(current,state())+(direct?`<div class="direct-value"><span>${direct.label}</span><strong data-direct-value>${fmt(state().p[direct.key])} ${direct.unit}</strong></div>`:'')+list.map(field).join('');
  if(current==='lever')$('#controls').insertAdjacentHTML('afterbegin','<div class="lever-presets"><button data-lever-preset="easy">省力費時</button><button data-lever-preset="equal">等臂</button><button data-lever-preset="fast">省時費力</button><button data-lever-preset="same">同側：施力臂較長</button><button data-lever-preset="same-short">同側：施力臂較短</button></div>');
  if(current==='pulley')$('#controls').insertAdjacentHTML('afterbegin','<div class="pulley-buttons"><button data-pulley="fixed">定滑輪</button><button data-pulley="single">單一動滑輪</button><button data-pulley="add">＋定輪與動輪</button><button data-pulley="remove">−一組</button><button data-pulley="reverse">延伸：反向使用</button></div><p class="pulley-state" aria-live="polite"></p>');
}
function syncControls(skip=null){
  if(current==='pulley'){
    const p=state().p;$('.pulley-state').textContent=p.count?`${p.drive==='single'?'單一動滑輪 · 向上拉繩':`${p.count} 組動滑輪＋${p.count} 個定滑輪 · ${p.drive==='reverse'?'拉滑輪座':'拉繩端'}`}`:'定滑輪 · 拉繩端';
    $('[data-pulley=remove]').disabled=p.count===0;$('[data-pulley=add]').disabled=p.count===3;
    $('[data-pulley=reverse]').setAttribute('aria-pressed',String(p.drive==='reverse'&&p.count>0));
  }
  for(const d of modes[current].params){
    document.querySelectorAll(`#controls [data-key="${d.key}"]`).forEach(el=>{
      if(!d.options){const b=bounds(d);el.min=b.min;el.max=b.max;}
      if(el!==skip){el.value=state().p[d.key];el.removeAttribute('aria-invalid');const error=$('#error-'+d.key);if(error)error.textContent='';}
    });
  }
}
function rebase(){state().time=0;state().pend=null;running=false;updateButtons();}
function changeParam(key,value,from=null){
  const d=modes[current].params.find(d=>d.key===key);if(!d)return;
  let next=value;
  if(!d.options){
    const b=bounds(d),num=Number(value),err=$(`#error-${key}`);
    if(String(value).trim()===''||!Number.isFinite(num)||num<b.min||num>b.max){
      if(err)err.textContent=`未套用：請輸入 ${b.min}–${b.max} ${d.unit}。`;if(from)from.setAttribute('aria-invalid','true');$('#status').textContent='無效輸入未套用；圖形與結果保留最後有效值。';return;
    }
    next=Math.round(num/d.step)*d.step;next=Number(clamp(next,b.min,b.max).toFixed(6));
    if(err)err.textContent='';if(from)from.removeAttribute('aria-invalid');
  }else if(typeof d.value==='number')next=Number(value);
  const s=state();
  if(pendIds.includes(current))delete s.pair;
  if(current==='lever'&&['loadPos','pivotPos','forcePos'].includes(key))s.p.progress=0;
  if(current==='fall'&&key!=='h'&&s.time>0){
    const at=projectileAt(s.p,s.time);s.launchX=(s.launchX||0)+(geometry.motionX??at.x);s.p.h=geometry.motionH??at.h;s.camera={x:geometry.cameraX||0,y:geometry.cameraY||0};
  }
  s.p[key]=next;if(current==='wheel'&&key==='compareMode')renderControls();let message=modes[current].animate?'已設定新的起始狀態。':'已更新。';
  if(current==='fall'&&key==='direction'&&next==='none')s.p.v=0;
  if(current==='fall'&&key==='v'&&next>0&&s.p.direction==='none')s.p.direction='up';
  if(current==='incline'&&s.p.L<s.p.H){s.p.L=s.p.H;message+='斜面長度已同步調整為高度。';}
  if(current==='wheel'&&['drive','R','r','compareMode','targetHeight'].includes(key))s.p.stroke=0;
  if(current==='wheel'&&s.p.r>=s.p.R){s.p.r=Number((s.p.R-.01).toFixed(2));message+='軸半徑已同步縮小以保持小於輪半徑。';}
  rebase();syncControls(from);draw();results();$('#status').textContent=message;if(current==='damped'){hint('已建立新起點，熱能從 0 重新累計');}if(current==='wheel'&&['R','r','drive','compareMode','targetHeight'].includes(key))hint('已建立新配置，拉繩行程重新起算');
}
function draw(){
  // Size interaction targets in CSS pixels, not in fixed SVG units.
  $('#work-scales').hidden=current!=='work2d';if(current==='work2d')$('#force-readout').textContent=`施力 ${state().p.F} N`;
  svg.setAttribute('viewBox',current==='work2d'?workGeometry(state().p).viewBox:current==='compare'?'0 0 640 500':current==='fall'?'0 0 640 500':current==='wheel'?'0 0 640 560':['lever','pulley'].includes(current)?'0 0 640 520':current==='incline'?'0 0 640 460':'0 0 640 370');
  const matrix=svg.getScreenCTM();const scale=matrix?Math.hypot(matrix.a,matrix.b):1;const width=640*(scale||1);
  svg.style.setProperty('--diagram-font',`${Math.max(20,16*640/width)}px`);
  if(current==='work2d'){svg.dataset.movementAxis=state().p.axis;svg.dataset.displacement=state().p.s;}
  const {html,meta}=scene(current,state(),96*640/width);svg.innerHTML=html;geometry=meta;
  if(current==='lever'&&drag){const key={'lever-load':'loadPos','lever-force':'forcePos','lever-pivot':'pivotPos'}[drag.target],lim=bounds(modes.lever.params.find(d=>d.key===key));svg.insertAdjacentHTML('beforeend',`<line x1="${60+lim.min*geometry.sc}" y1="${geometry.cy}" x2="${60+lim.max*geometry.sc}" y2="${geometry.cy}" class="valid-range"/>`);}
  if(current==='compare'&&drag?.ghost)svg.insertAdjacentHTML('beforeend',`<rect x="${drag.ghost.x-28}" y="${drag.ghost.y-16}" width="56" height="32" class="object block-ghost"/>`);
  if(current==='pulley'&&drag?.ghost)svg.insertAdjacentHTML('beforeend',`<circle cx="${drag.ghost.x}" cy="${drag.ghost.y}" r="25" class="pulley-ghost"/>`);
  $('#vector-legend .force-scale')?.remove();
  if(current!=='work2d'&&svg.querySelector('.force'))$('#vector-legend').insertAdjacentHTML('beforeend',`<span class="force-scale"><i style="width:${meta.forceRuler}px"></i>${fmt(meta.forceUnit)} N</span>`);
  if(current==='fall'){
    const p=state().p,z=projectileAt(p,state().time);
    $('#vector-legend').innerHTML=`<div class="legend-reading applied"><b>重力：</b><strong>${fmt(p.m*p.g)} <small>N</small></strong></div><div class="legend-reading velocity"><b>速度：</b><strong>${fmt(z.v)} <small>m/s</small></strong></div><div class="legend-reading ruler-reading"><b>力的比例尺：</b><div><i style="width:${meta.forceRuler}px"></i><strong>${fmt(meta.forceUnit)} <small>N</small></strong></div></div>`;
  }
  if(current==='fall'&&state().view?.components){const z=projectileAt(state().p,state().time);$('#vector-legend').insertAdjacentHTML('beforeend',`<div class="component-reading">水平速度 ${approx(z.vx)} m/s · 鉛直速度 ${approx(z.vy)} m/s（右／上正）</div>`);}
  if(pendIds.includes(current))$('#vector-legend').hidden=state().view?.forces===false;
  // Transparent targets use screen pixels; do not enlarge the visible vectors.
  svg.querySelectorAll('circle.drag-zone').forEach(z=>z.setAttribute('r',48*640/width));
  svg.querySelectorAll('.drag-line').forEach(z=>z.setAttribute('stroke-width',112*640/width));
  if(dragKeys[current]){
    const d=modes[current].params.find(d=>d.key===dragKeys[current]),b=bounds(d);
    svg.querySelectorAll('[data-drag=object]').forEach(z=>{for(const [key,value] of Object.entries({tabindex:0,role:'slider','aria-label':d.label,'aria-valuemin':b.min,'aria-valuemax':b.max,'aria-valuenow':state().p[d.key],'aria-valuetext':`${fmt(state().p[d.key])} ${d.unit}`}))z.setAttribute(key,value);});
  }
  if(current==='lever')for(const [target,key,label]of [['lever-load','loadPos','物件位置'],['lever-pivot','pivotPos','支點位置'],['lever-force','forcePos','施力點，左右調位置，上下演示提升']]){
    const d=modes.lever.params.find(d=>d.key===key),b=bounds(d);
    svg.querySelectorAll(`[data-drag=${target}]`).forEach(el=>{for(const [attr,value]of Object.entries({tabindex:0,role:'slider','aria-label':label,'aria-valuemin':b.min,'aria-valuemax':b.max,'aria-valuenow':state().p[key],'aria-valuetext':`${fmt(state().p[key])} m`}))el.setAttribute(attr,value);});
  }
  if(current==='pulley'){
    syncControls();
    for(const [target,label]of [['pulley-add','拖入增加一組滑輪'],['pulley-pull',state().p.drive==='single'?'施力端，向上拉動':'施力端，向下拉動'],['pulley-load','物件，向上提升']]){
      const el=svg.querySelector(`[data-drag=${target}]`);el.setAttribute('tabindex','0');el.setAttribute('aria-label',label);el.setAttribute('role',target==='pulley-add'?'button':'slider');
      if(target!=='pulley-add')for(const [k,v]of Object.entries({'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':state().p.progress}))el.setAttribute(k,v);
    }
  }
}
function updateButtons(){
  if(current==='compare')$('#live-state').textContent=state().calculated?(running?'演示中':'已暫停'):'按計算演示';
  $('#work-locate').hidden=current!=='work2d';$('#work-center').hidden=current!=='work2d';$('#play').hidden=!modes[current].animate;$('#step').hidden=!modes[current].animate;
  const ended=['fall','throw'].includes(current)&&projectileAt(state().p,state().time).ended||['incline','lever','pulley'].includes(current)&&state().p.progress>=100||current==='wheel'&&state().p.stroke>=wheelComparison(state().p).targetStroke;
  $('#play').textContent=running?'暫停':ended||current==='compare'&&state().time>=geometry.duration?'重播':'播放';
  if(current==='incline'&&!running&&!ended)$('#play').textContent='同步提升';
  if(['lever','pulley','wheel'].includes(current)&&!running&&!ended)$('#play').textContent='演示提升';
  $('#calculate').textContent=current==='compare'?'計算並演示':state().calculated?'已計算':'計算';$('#calculate').setAttribute('aria-pressed',String(state().calculated));
}
let hintTimer;
function hint(message,persist=false){clearTimeout(hintTimer);$('#gesture-hint').textContent=message;$('#gesture-hint').hidden=false;if(!persist)hintTimer=setTimeout(()=>$('#gesture-hint').hidden=true,2200);}
function locateWork(onlyIfOutside=false){
 const pane=$('#canvas-scroll'),{x,y}=workGeometry(state().p),px=x+256,py=y+256;
 if(!onlyIfOutside||px-30<pane.scrollLeft||px+30>pane.scrollLeft+pane.clientWidth||py-28<pane.scrollTop||py+28>pane.scrollTop+pane.clientHeight){pane.scrollLeft=px-pane.clientWidth/2;pane.scrollTop=py-pane.clientHeight/2;}
 workView={left:pane.scrollLeft,top:pane.scrollTop};
}
$('#work-locate').addEventListener('click',()=>locateWork());
function centerWork(){const pane=$('#canvas-scroll');pane.scrollLeft=256-pane.clientWidth/2;pane.scrollTop=256-pane.clientHeight/2;}
function choose(id,resetView=false){
  if(current==='work2d'&&!resetView)workView={left:$('#canvas-scroll').scrollLeft,top:$('#canvas-scroll').scrollTop};
  if(drag&&svg.hasPointerCapture(drag.id))svg.releasePointerCapture(drag.id);
  running=false;if(state().pair)state().pair.running=false;drag=null;$('#gesture-hint').hidden=true;current=id;groupId=groups.find(g=>g.modes.includes(id)).id;
  lastModes[groupId]=id;$('#group').innerHTML=groups.map(g=>`<option value="${g.id}" ${g.id===groupId?'selected':''}>${g.label}</option>`).join('');
  const group=groups.find(g=>g.id===groupId);
  $('#mode').innerHTML=group.modes.map(mid=>`<option value="${mid}" ${mid===id?'selected':''}>${shortNames[mid]}</option>`).join('');
  $('#scene-title').textContent=modes[id].title;$('#task').textContent=modes[id].task;$('#scene-description').textContent=modes[id].hint;
  document.body.dataset.mode=id;
  const legend=$('#vector-legend');
  const items=id==='wheel'?[['applied','施力／輸入半徑'],['gravity','重力／輸出半徑']]:id==='pulley'?[['applied','施力'],['gravity','重力'],['tension','繩張力']]:id==='lever'?[['applied','施力'],['gravity','重力']]:id==='incline'?[['lift','直接提升'],['applied','沿斜面施力']]:id==='compare'?[['velocity','速度']]:['fall','throw'].includes(id)?[['applied','重力'],['velocity','速度']]:id==='spring'?[['applied','回復力']]:pendIds.includes(id)?[['gravity','重力'],['tension','繩張力'],...(id==='damped'?[['resistance','阻力']]:[])]:machineIds.includes(id)?[['applied',['fixed','movable','wheel'].includes(id)?'施力':'施力／重力']]:[];
  legend.hidden=!items.length;legend.innerHTML=items.map(([kind,label])=>`<span class="${kind}">${label}</span>`).join('');
  $('#task').hidden=true;$('#mode').parentElement.hidden=group.modes.length===1;$('.selectors').classList.toggle('single',group.modes.length===1);
  $('#extra-results')?.removeAttribute('open');renderControls();draw();results();updateButtons();if(current==='work2d'){if(resetView||!workView)centerWork();else{$('#canvas-scroll').scrollLeft=workView.left;$('#canvas-scroll').scrollTop=workView.top;}}$('#status').textContent=state().calculated?'已保留此實驗的參數與結果；目前暫停。':'調整參數後，按下計算。';
}
$('#group').addEventListener('change',e=>choose(lastModes[e.target.value]));
$('.panel-nav').addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(!b)return;const pane=$('.inspector'),target=$('#'+b.dataset.jump);pane.scrollTop+=target.getBoundingClientRect().top-pane.getBoundingClientRect().top-$('.panel-nav').offsetHeight-6;});
$('#mode').addEventListener('change',e=>choose(e.target.value));
$('#controls').addEventListener('input',e=>{if(e.target.dataset.key)changeParam(e.target.dataset.key,e.target.value,e.target);});
$('#controls').addEventListener('change',e=>{if(e.target.dataset.key&&e.target.getAttribute('aria-invalid')!=='true')syncControls();});
$('#controls').addEventListener('click',e=>{const b=e.target.closest('[data-adjust]');if(!b)return;const d=modes[current].params.find(x=>x.key===b.dataset.adjust),lim=bounds(d);changeParam(d.key,clamp(state().p[d.key]+Number(b.dataset.sign)*d.step,lim.min,lim.max));});
$('#controls').addEventListener('click',e=>{const button=e.target.closest('[data-lever-preset]');if(!button||current!=='lever')return;const id=button.dataset.leverPreset,short=id==='same-short',same=id==='same'||short;Object.assign(state().p,{layout:same?id:'opposite',loadPos:short?3.5:same?1.5:.5,forcePos:short?1.5:3.5,pivotPos:{easy:1.5,equal:2,fast:2.5,same:.5,'same-short':.5}[id],progress:0});rebase();syncControls();draw();results();});
function configurePulley(action){
  const p=state().p;
  if(action==='fixed'){p.count=0;p.drive='normal';}
  if(action==='single'){p.count=1;p.drive='single';}
  if(action==='add'){p.count=Math.min(3,p.count+1);p.drive='normal';}
  if(action==='remove'){p.count=Math.max(0,p.count-1);if(!p.count)p.drive='normal';}
  if(action==='reverse'){if(!p.count)p.count=1;p.drive=p.drive==='reverse'?'normal':'reverse';}
  p.progress=0;rebase();syncControls();draw();results();
}
$('#controls').addEventListener('click',e=>{const b=e.target.closest('[data-pulley]');if(b&&current==='pulley')configurePulley(b.dataset.pulley);});
$('#controls').addEventListener('click',e=>{
 const action=e.target.closest('[data-lesson]')?.dataset.lesson;if(!action)return;
 const s=state(),p=s.p;s.view??={};
 if(current==='compare'){
  if(action==='mass-double')Object.assign(p,{m:2,mB:4,v:2,vB:2});
  else if(action==='speed-double')Object.assign(p,{m:2,mB:2,v:2,vB:4});
  else{const key=action.startsWith('A')?'v':'vB';p[key]=clamp(p[key]+(action.endsWith('plus')?1:-1),0,10);}
  rebase();
 }
 if(current==='wheel')return;
 if(current==='fall'){
  if(['near','full'].includes(action)){if(running){hint('先暫停，再切換觀察尺度');return;}s.view.fallScale=action;delete s.camera;}
  if(action==='components')s.view.components=!s.view.components;
 }
 if(current==='spring'){
  running=false;
  if(action.startsWith('set-')){p.x=(action==='set-compress'?-1:1)*Math.abs(p.x);rebase();}
  else s.time=springObservationTime(p,s.time,action.slice(7));
 }
 if(pendIds.includes(current)){
  if(action==='forces')s.view.forces=s.view.forces===false;
  if(action.startsWith('pend-')){
   running=false;const z=pendulumObservation(physicsParams(),s.pend||pendulumInitial(p),action.slice(5));
   if(z.reached){s.pend=z.state;s.time+=z.elapsed;}else hint('此阻尼條件未經過所選位置，保留目前狀態');
  }
  if(action==='pair'){
   running=false;
   if(!s.pair)s.pair={p:{...p},no:pendulumInitial(p),yes:pendulumInitial(p),time:0,running:false};
   s.pair.running=!s.pair.running;s.pair.last=0;
  }
 }
 renderControls();syncControls();draw();results();updateButtons();
});
$('#calculate').addEventListener('click',()=>{const invalid=$('#controls [aria-invalid="true"]');if(invalid){invalid.closest('details')?.setAttribute('open','');invalid.focus();$('#status').textContent='請先修正未套用的輸入，再按計算。';return;}state().calculated=true;results();updateButtons();$('#status').textContent='已啟用：拖曳、調整或播放時，結果會持續即時更新。';});
$('#calculate').addEventListener('click',()=>{if(current==='compare'){state().time=0;running=true;lastFrame=0;draw();results();updateButtons();}});
$('#work-center').addEventListener('click',()=>{
  if(current!=='work2d')return;
  if(drag&&svg.hasPointerCapture(drag.id))svg.releasePointerCapture(drag.id);drag=null;
  state().p.s=0;rebase();syncControls();draw();results();updateButtons();centerWork();
  workView={left:$('#canvas-scroll').scrollLeft,top:$('#canvas-scroll').scrollTop};
  $('#status').textContent='方箱已回到起點，位移為0；施力設定保留。';
});
$('#reset').addEventListener('click',()=>{states[current]=defaults(current);choose(current,true);$('#status').textContent='本功能已重設，其他功能的狀態仍保留。';});
function advance(dt){
  const s=state();if(pendIds.includes(current)){
    if(!s.pend)s.pend=pendulumInitial(s.p);let left=dt;
    while(left>1e-10){let step=Math.min(left,1/240);s.pend=pendulumStep(physicsParams(),s.pend,step);left-=step;}
  }
  s.time+=dt;
  if(current==='incline'){s.p.progress=Math.min(100,s.p.progress+dt*20);if(s.p.progress>=100){running=false;updateButtons();}}
  if(current==='wheel'){s.p.stroke=Math.min(wheelComparison(s.p).targetStroke,s.p.stroke+dt*.5);if(s.p.stroke>=wheelComparison(s.p).targetStroke){running=false;updateButtons();}}
  if(current==='pulley'){s.p.progress=Math.min(100,s.p.progress+dt/pulleyComparison(s.p).duration*100);if(s.p.progress>=100){running=false;updateButtons();}}
  if(current==='lever'){s.p.progress=Math.min(100,s.p.progress+dt/leverComparison(s.p).duration*100);if(s.p.progress>=100){running=false;updateButtons();}}
  if(current==='compare'&&s.time>=geometry.duration){s.time=geometry.duration;running=false;updateButtons();}
  if(['fall','throw'].includes(current)&&projectileAt(s.p,s.time).ended){running=false;updateButtons();$('#status').textContent='演示截至接地前，不模擬碰撞。';}
}
$('#play').addEventListener('click',()=>{
  if(state().pair)state().pair.running=false;
  if(current==='wheel'&&state().p.stroke>=wheelComparison(state().p).targetStroke){state().p.stroke=0;state().time=0;draw();results();}
  if(['incline','lever','pulley'].includes(current)&&state().p.progress>=100){state().p.progress=0;state().time=0;draw();results();}
  if(current==='compare'&&state().time>=geometry.duration)state().time=0;
  if(['fall','throw'].includes(current)&&projectileAt(state().p,state().time).ended)state().time=0;
  running=!running;lastFrame=0;updateButtons();$('#status').textContent=running?'播放中；可隨時暫停或抓取物件。':'已暫停，可繼續播放。';
});
$('#step').addEventListener('click',()=>{running=false;advance(1/30);draw();results();updateButtons();$('#status').textContent='前進1/30秒，保留計算啟用狀態。';});
function frame(t){
  const pair=state().pair;
  if(pair?.running){const dt=pair.last?Math.min((t-pair.last)/1000,.05):0;pair.last=t;let left=dt;while(left>1e-10){const h=Math.min(left,1/240);pair.no=pendulumStep({...pair.p,damping:false},pair.no,h);pair.yes=pendulumStep({...pair.p,damping:true},pair.yes,h);left-=h;}pair.time+=dt;}

  if(running){if(lastFrame){advance(Math.min((t-lastFrame)/1000,.1));}lastFrame=t;if(t-paintTime>30){draw();results();paintTime=t;}}
  if(pair?.running&&t-(pair.paint||0)>80){pair.paint=t;results();}
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state().pair)state().pair.running=false;if(document.hidden&&running){running=false;updateButtons();$('#status').textContent='頁面暫時隱藏，動畫已暫停。';}});
function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const m=svg.getScreenCTM();return m?p.matrixTransform(drag?.inverse||m.inverse()):{x:0,y:0};}
function dragUpdate(e){
  if(!drag||e.pointerId!==drag.id)return;const q=point(e),p=state().p,g=geometry;let key,value;
  if(current==='work2d'){
    if(drag.target==='force'){
      const axis={right:[1,0],left:[-1,0],up:[0,-1],down:[0,1]}[p.direction];
      key='F';value=drag.startValue+((q.x-drag.startPoint.x)*axis[0]+(q.y-drag.startPoint.y)*axis[1])/g.sc*10;
    }else{
      const mx=q.x-drag.startPoint.x,my=q.y-drag.startPoint.y;
      if(!drag.moveAxis){
        const scale=svg.getScreenCTM().a;
        if(Math.hypot(mx,my)*scale<4)return;
        drag.moveAxis=Math.abs(mx)>=Math.abs(my)?'x':'y';
      }
      const axis=drag.moveAxis,seed=axis===drag.workAxis?drag.workS:0;
      hint(`${axis==='x'?'水平':'垂直'}移動 · 改軸會清除另一軸位移`);state().p.axis=axis;state().p.s=clamp(Math.round(seed+(axis==='x'?mx:-my)/g.sc),-8,8);
      rebase();syncControls();draw();results();return;
    }
  }else if(current==='compare'){
    if(drag.target.startsWith('speed')){key=drag.target==='speedA'?'v':'vB';value=drag.startValue+(q.x-drag.startPoint.x)/12;}
    else{drag.ghost=q;draw();return;}
  }
  else if(['height','fall','throw'].includes(current)){key='h';value=((g.groundY||315)+(g.cameraY||0)-q.y-drag.offsetY)/g.sy;}
  else if(current==='spring'){key='x';value=(q.x-drag.offsetX-355)/340;}
  else if(pendIds.includes(current)){key='angle';value=Math.atan2(q.x-drag.offsetX-g.cx,q.y-drag.offsetY-g.cy)*180/Math.PI;}
  else if(current==='incline'){key='progress';value=drag.startValue+((q.x-drag.startPoint.x)*g.dx-(q.y-drag.startPoint.y)*g.dy)/(g.dx*g.dx+g.dy*g.dy)*100;}
  else if(current==='pulley'){
    if(drag.target==='pulley-add'){drag.ghost=q;draw();return;}
    key='progress';value=drag.startValue+(q.y-drag.startPoint.y)*(drag.target==='pulley-load'?-1:geometry.forceSign)/(geometry.sc*(drag.target==='pulley-load'?geometry.targetHeight:geometry.targetStroke))*100;
  }
  else if(current==='lever'){
    const mx=q.x-drag.startPoint.x,my=q.y-drag.startPoint.y;
    if(!drag.leverAxis){if(Math.hypot(mx,my)*svg.getScreenCTM().a<4)return;drag.leverAxis=drag.target==='lever-pivot'||Math.abs(mx)>=Math.abs(my)?'x':'y';}
    if(drag.leverAxis==='y'){
      key='progress';value=drag.leverProgress+(drag.target==='lever-load'?-my/(.2*g.sc):my* g.forceSign/(drag.leverStroke*g.sc))*100;
    }else{key={'lever-load':'loadPos','lever-pivot':'pivotPos','lever-force':'forcePos'}[drag.target];value=drag.startValue+mx/(g.sc*drag.leverCos);}
  }
  else if(current==='fixed'){key='lift';value=(q.y-g.start-drag.offsetY)/g.scale;}
  else if(current==='movable'){key='lift';value=(g.start-q.y+drag.offsetY)/g.scale;}
  else if(current==='wheel'){key='stroke';value=(q.y-g.start-drag.offsetY)/g.scale;}
  if(key){const d=modes[current].params.find(d=>d.key===key),b=bounds(d);changeParam(key,clamp(value,b.min,b.max));}
}
svg.addEventListener('pointerdown',e=>{
  const target=e.target.closest('[data-drag]');if(!target||drag||e.button>0)return;
  e.preventDefault();const q=point(e),p=state().p;let offsetX=0,offsetY=0;
  let dragTarget=target.dataset.drag;
  // Large screen-pixel hit areas may overlap. Pick the nearest visible feature.
  if(current==='work2d'){
    const {x,y,fx,fy,ax,ay,start,end}=geometry;
    const along=clamp((q.x-fx)*ax+(q.y-fy)*ay,start,end);
    const forceDistance=Math.hypot(q.x-(fx+along*ax),q.y-(fy+along*ay));
    const boxDistance=Math.hypot(q.x-x,q.y-y);
    const zeroHandle=p.F===0&&boxDistance>8&&Math.hypot(q.x-(fx+end*ax),q.y-(fy+end*ay))<=8;
    dragTarget=zeroHandle?'force':(Math.abs(q.x-x)<=29&&Math.abs(q.y-y)<=26)||boxDistance<forceDistance?'object':'force';
  }
  if(current==='lever'){
    const g=geometry,load=Math.hypot(Math.max(g.lx-27-q.x,0,q.x-g.lx-27),Math.max(g.ly+48-q.y,0,q.y-g.ly-94)),pivot=Math.hypot(q.x-g.cx,q.y-(g.cy+25)),effort=Math.hypot(q.x-g.rx,q.y-clamp(q.y,Math.min(g.ry,g.forceEnd),Math.max(g.ry,g.forceEnd)));
    dragTarget=load<=pivot&&load<=effort?'lever-load':pivot<=effort?'lever-pivot':'lever-force';
  }
  if(current==='pulley'){
    const g=geometry,rectDistance=(x,y,right,bottom)=>Math.hypot(Math.max(x-q.x,0,q.x-right),Math.max(y-q.y,0,q.y-bottom));
    const candidates=[{target:'pulley-add',distance:rectDistance(475,80,605,240)},
      {target:'pulley-load',distance:rectDistance(g.bx-27,g.by-46,g.bx+27,g.by)},
      {target:'pulley-pull',distance:Math.hypot(q.x-g.ex,q.y-clamp(q.y,Math.min(g.ey,g.ey+g.forceSign*g.F*g.forceScale),Math.max(g.ey,g.ey+g.forceSign*g.F*g.forceScale)))}];
    candidates.sort((a,b)=>a.distance-b.distance);dragTarget=candidates[0].target;
  }
  if(current==='compare'){
    // Expanded targets can overlap: resolve against visible tray, stacks and shafts.
    const rectDistance=(x,y,right,bottom)=>Math.hypot(Math.max(x-q.x,0,q.x-right),Math.max(y-q.y,0,q.y-bottom));
    const candidates=[{target:'supply',distance:rectDistance(480,12,624,94)}];
    for(const id of ['A','B']){
      const r=geometry.rows[id];
      candidates.push({target:'mass'+id,distance:rectDistance(r.x-28,r.y-r.stackHeight,r.right,r.y)});
      candidates.push({target:'speed'+id,distance:Math.hypot(q.x-clamp(q.x,r.right,r.end>r.right?r.end:r.right+24),q.y-r.sy)});
    }
    candidates.sort((a,b)=>a.distance-b.distance);dragTarget=candidates[0].target;
  }
  if(['height','fall','throw'].includes(current)){const h=current==='height'?p.h:projectileAt(p,state().time).h;offsetY=((geometry.groundY||315)+(geometry.cameraY||0)-h*geometry.sy)-q.y;}
  if(current==='spring')offsetX=q.x-(355+springAt(p,state().time).x*340);
  if(pendIds.includes(current)){
    const at=state().pend||pendulumInitial(p);
    offsetX=q.x-(geometry.cx+p.L*120*Math.sin(at.theta));
    offsetY=q.y-(geometry.cy+p.L*120*Math.cos(at.theta));
  }
  if(current==='fixed')offsetY=q.y-(geometry.start+p.lift*geometry.scale);
  if(current==='wheel')offsetY=q.y-(geometry.start+p.stroke*geometry.scale);
  if(current==='movable')offsetY=q.y-(geometry.start-p.lift*geometry.scale);
  drag={id:e.pointerId,inverse:svg.getScreenCTM().inverse(),target:dragTarget,offsetX,offsetY,startPoint:q,workAxis:p.axis,workS:p.s,moveAxis:null,startValue:current==='incline'?p.progress:p.F};running=false;svg.setPointerCapture(e.pointerId);updateButtons();
  if(current==='compare')drag.startValue=dragTarget==='speedB'?p.vB:p.v;
  if(current==='pulley')drag.startValue=p.progress;
  if(current==='lever'){hint('左右改位置 · 上下演示提升；淡色線為有效範圍',true);const z=leverComparison(p);drag.startValue=p[{'lever-load':'loadPos','lever-pivot':'pivotPos','lever-force':'forcePos'}[dragTarget]];drag.leverProgress=p.progress;drag.leverStroke=z.targetStroke;drag.leverCos=Math.cos(z.phi);}
  $('#status').textContent=modes[current].animate?'已抓取並暫停；移動將設定新的釋放狀態。':'拖曳中，物件與參數即時更新。';
});
svg.addEventListener('keydown',e=>{
  if(current==='pulley'){
    const target=e.target.dataset.drag;if(!target)return;
    if(target==='pulley-add'){if(['Enter',' '].includes(e.key)){e.preventDefault();configurePulley('add');}return;}
    if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
    e.preventDefault();const value=e.key==='Home'?0:e.key==='End'?100:state().p.progress+(e.key==='ArrowDown'?1:-1)*(target==='pulley-load'?-1:pulleyComparison(state().p).forceSign)*5;
    changeParam('progress',clamp(value,0,100));svg.querySelector(`[data-drag=${target}]`)?.focus({preventScroll:true});return;
  }
  if(current==='lever'){
    const target=e.target.dataset.drag,key={'lever-load':'loadPos','lever-pivot':'pivotPos','lever-force':'forcePos'}[target];if(!key)return;
    const isStroke=['ArrowUp','ArrowDown'].includes(e.key)&&target!=='lever-pivot',d=modes.lever.params.find(d=>d.key===(isStroke?'progress':key)),b=bounds(d);let value=state().p[d.key];
    if(e.key==='ArrowRight')value+=d.step;else if(e.key==='ArrowLeft')value-=d.step;else if(isStroke)value+=(e.key==='ArrowDown'?1:-1)*(target==='lever-load'?-1:leverComparison(state().p).forceSign)*5;else if(e.key==='Home')value=b.min;else if(e.key==='End')value=b.max;else return;
    e.preventDefault();changeParam(d.key,clamp(value,b.min,b.max));svg.querySelector(`[data-drag=${target}]`)?.focus({preventScroll:true});return;
  }
  if(current==='compare'){
    const target=e.target.dataset.drag;if(!target)return;
    if(target==='supply'){if(e.key==='Enter'||e.key===' '){e.preventDefault();svg.querySelector('[data-drag=massA]')?.focus();}return;}
    const key={massA:'m',massB:'mB',speedA:'v',speedB:'vB'}[target];if(!key)return;
    const d=modes.compare.params.find(d=>d.key===key);let value=state().p[key];
    if(['ArrowRight','ArrowUp'].includes(e.key))value+=d.step;else if(['ArrowLeft','ArrowDown'].includes(e.key))value-=d.step;
    else if(e.key==='Home')value=d.min;else if(e.key==='End')value=d.max;else return;
    e.preventDefault();changeParam(key,clamp(value,d.min,d.max));svg.querySelector(`[data-drag=${target}]`)?.focus({preventScroll:true});return;
  }
  if(dragKeys[current]&&e.target.matches('[data-drag=object]')){
    const key=dragKeys[current],d=modes[current].params.find(d=>d.key===key),b=bounds(d);let value=state().p[key];
    if(current==='wheel'&&['ArrowUp','ArrowDown'].includes(e.key))value+=(e.key==='ArrowDown'?1:-1)*d.step*(e.shiftKey?10:1);
    else if(['ArrowRight','ArrowUp'].includes(e.key))value+=d.step*(e.shiftKey?10:1);
    else if(['ArrowLeft','ArrowDown'].includes(e.key))value-=d.step*(e.shiftKey?10:1);
    else if(e.key==='Home')value=b.min;else if(e.key==='End')value=b.max;else return;
    e.preventDefault();changeParam(key,clamp(value,b.min,b.max));svg.querySelector('[data-drag=object]')?.focus({preventScroll:true});return;
  }
  if(current!=='work2d')return;
  if(e.target.matches('[data-drag=object]')){
    const directions={ArrowRight:['x',1],ArrowLeft:['x',-1],ArrowUp:['y',1],ArrowDown:['y',-1]},move=directions[e.key];
    if(!move&&e.key!=='Home')return;e.preventDefault();
    if(e.key==='Home')state().p.s=0;
    else{const seed=state().p.axis===move[0]?state().p.s:0;state().p.axis=move[0];state().p.s=clamp(seed+move[1],-8,8);}
    rebase();syncControls();draw();results();svg.querySelector('[data-drag=object]')?.focus({preventScroll:true});return;
  }
  if(!e.target.matches('[data-drag=force]'))return;
  let value=state().p.F;const step=e.shiftKey?20:10;
  if(['ArrowRight','ArrowUp'].includes(e.key))value+=step;else if(['ArrowLeft','ArrowDown'].includes(e.key))value-=step;else if(e.key==='Home')value=0;else if(e.key==='End')value=100;else return;
  e.preventDefault();changeParam('F',clamp(value,0,100));svg.querySelector('[data-drag=force]')?.focus({preventScroll:true});
});
svg.addEventListener('pointermove',e=>{if(drag){e.preventDefault();dragUpdate(e);}});
// Safari and other touch browsers must not turn an accepted object drag into a pan.
// Keep blank work-grid panning and scrolling outside the diagram available.
for(const type of ['touchstart','touchmove'])wrap.addEventListener(type,e=>{
  if((drag||e.target.closest?.('[data-drag]'))&&e.cancelable)e.preventDefault();
},{passive:false});
function endDrag(e){
  if(!drag||e.pointerId!==drag.id)return;
  if(current==='lever')hint('位置與提升已更新');
  const active=drag,drop=current==='compare'?comparisonDrop(point(e)):null;
  const pulleyDrop=current==='pulley'&&active.target==='pulley-add'?point(e):null;
  if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);drag=null;
  if(pulleyDrop){if(e.type==='pointerup'&&pulleyDrop.x>=90&&pulleyDrop.x<=450&&pulleyDrop.y>=60&&pulleyDrop.y<=420)configurePulley('add');else draw();}
  if(current==='compare'){
    if(e.type==='pointerup'){
      if(active.target==='supply'&&['A','B'].includes(drop)){const key=drop==='A'?'m':'mB';changeParam(key,Math.min(20,state().p[key]+2));}
      else if(active.target.startsWith('mass')&&drop==='supply'){const key=active.target==='massA'?'m':'mB';changeParam(key,Math.max(2,state().p[key]-2));}
    }
    draw();
  }
}
svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);svg.addEventListener('lostpointercapture',()=>drag=null);
let lastWorkSize='';
const sceneResize=new ResizeObserver(()=>{if(drag){if(svg.hasPointerCapture(drag.id))svg.releasePointerCapture(drag.id);drag=null;}arrangeCalculation();draw();if(current==='work2d'){const pane=$('#canvas-scroll'),size=`${pane.clientWidth}:${pane.clientHeight}`;if(size!==lastWorkSize){lastWorkSize=size;locateWork(true);}}});sceneResize.observe(wrap);sceneResize.observe(svg);
choose('work2d',true);requestAnimationFrame(frame);










