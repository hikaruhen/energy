import {defaults} from '../site/config.js';
import {scene,workGeometry} from '../site/scenes.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {work,directionalWork,axisDisplacement,kinetic,gravity,elastic,springAt,flightAt,pendulumInitial,pendulumStep,pendulumEnergy,machine,fmt} from '../site/physics.js';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('正功、反功、零功',()=>{
  assert.equal(work(10,2,1),20);assert.equal(work(10,2,-1),-20);assert.equal(work(10,2,0),0);assert.equal(work(0,2),0);assert.equal(work(10,0),0);
});
test('質量線性、速率平方與零速率',()=>{assert.equal(kinetic(2,2),4);assert.equal(kinetic(2,4),16);assert.equal(kinetic(4,2),8);assert.equal(kinetic(2,0),0);});
test('落下、上拋、地面停止保持能量',()=>{
  const p={m:2,g:9.8,h:2,v:2};near(gravity(2,9.8,2),39.2);
  const z=flightAt(p,Math.sqrt(2/9.8));near(z.h,1);near(z.K,19.6);near(z.U,19.6);
  const end=flightAt(p,100);assert.equal(end.h,0);assert.equal(end.ended,true);near(end.K,39.2);
  const top=flightAt(p,2/9.8,true);near(top.v,0);near(top.K,0);near(top.U,43.2);
  assert.equal(flightAt({...p,h:0},0).ended,true);
});
test('彈簧壓縮與拉長、解析解長時間能量',()=>{
  near(elastic(50,.2),1);near(elastic(50,-.2),1);assert.equal(elastic(50,0),0);
  for(let t=0;t<60;t+=.13){const z=springAt({m:2,k:50,x:-.2},t);near(z.K+z.U,1);}
});
test('非線性擺及阻力60秒守恆誤差低於0.1%',()=>{
  for(const damping of [false,true]){
    const p={m:2,g:9.8,L:1,angle:60,damping};let s=pendulumInitial(p);const e0=pendulumEnergy(p,s).E;near(e0,9.8);let last=e0;
    for(let i=0;i<60*240;i++){s=pendulumStep(p,s,1/240);const z=pendulumEnergy(p,s);near(z.E,e0,e0*.001);if(damping){assert.ok(z.K+z.U<=last+1e-9);last=z.K+z.U;}}
    if(damping)assert.ok(s.Q>9);else assert.equal(s.Q,0);
  }
  const p={m:2,g:9.8,L:1,angle:0};let s=pendulumStep(p,pendulumInitial(p),1/240);assert.equal(pendulumEnergy(p,s).E,0);
});
test('理想機械省力不省功、幾何邊界',()=>{
  const common={m:2,g:9.8};let z=machine('incline',{...common,H:1,L:2,progress:1});near(z.F,9.8);near(z.W,19.6);near(z.W,z.U);
  assert.throws(()=>machine('incline',{...common,H:2,L:1,progress:1}));
  z=machine('incline',{...common,H:1,L:1,progress:0});near(z.F,19.6);near(z.W,0);
  z=machine('lever',{...common,a:1,b:.5,phi:20});near(z.F,9.8);near(z.W,z.U);
  near(machine('lever',{...common,a:1,b:1,phi:0}).F,19.6);
  for(const id of ['fixed','movable']){z=machine(id,{...common,lift:1});near(z.W,19.6);near(z.U,19.6);near(z.F,id==='fixed'?19.6:9.8);near(z.s,id==='fixed'?1:2);}
  for(const drive of ['wheel','axle']){z=machine('wheel',{...common,R:.2,r:.1,lift:1,drive});near(z.F,drive==='wheel'?9.8:39.2);near(z.s,drive==='wheel'?2:.5);near(z.W,19.6);}
  assert.throws(()=>machine('wheel',{...common,R:0,r:0,lift:1,drive:'wheel'}));
});
test('顯示不把非零變為零',()=>{assert.equal(fmt(0),'0');assert.equal(fmt(-0),'0');assert.equal(fmt(.001),'<0.01');assert.equal(fmt(-.001),'−<0.01');assert.equal(fmt(19.6),'19.6');});

test('二維位移：四方向施力、斜向位移與垂直零功',()=>{
  for(const [direction,dx,dy,expected] of [['right',2,3,20],['left',2,3,-20],['up',2,3,30],['down',2,3,-30],['right',-2,0,-20],['left',-2,0,20],['up',0,-3,-30],['down',0,-3,30],['right',0,5,0],['up',5,0,0]]){
    const z=directionalWork(10,dx,dy,direction);near(z.W,expected);near(z.Wx+z.Wy,z.W);
  }
  near(directionalWork(0,5,5,'up').W,0);near(directionalWork(10,0,0,'left').W,0);
  assert.throws(()=>directionalWork(-1,0,0,'right'));assert.throws(()=>directionalWork(1,0,0,'bad'));
});

test('單軸位移的正負、零值與作功',()=>{
  for(const axis of ['x','y'])for(const s of [-5,-.1,0,.1,5]){
    const d=axisDisplacement(axis,s);assert.equal(axis==='x'?d.dy:d.dx,0);
    near(directionalWork(10,d.dx,d.dy,axis==='x'?'right':'up').W,10*s);
    near(directionalWork(10,d.dx,d.dy,axis==='x'?'up':'right').W,0);
  }
  assert.throws(()=>axisDisplacement('z',1));
});

test('方格施力比例及視野：每格10N，最大力與位移端點均可見',()=>{
  for(const direction of ['right','left','up','down'])for(const axis of ['x','y'])for(const s of [-8,0,8])for(const F of [0,10,50,100]){
    const g=workGeometry({direction,axis,s,F});
    if(F>0)near((g.end-g.start)/g.sc,F/10);
    const x=g.fx+g.ax*g.end,y=g.fy+g.ay*g.end;
    near(g.fx-g.x,g.ax*29);near(g.fy-g.y,g.ay*26);
    near(axis==='x'?g.x:g.y,axis==='x'?s*g.sc:-s*g.sc);
  }
});

test('功的視野與格寬不隨物件或力量變動',()=>{
  const baseline=workGeometry({axis:'x',s:0,F:0,direction:'right'});
  for(const s of [-8,0,8])for(const F of [0,10,100])for(const direction of ['up','down','left','right']){
    const g=workGeometry({axis:'y',s,F,direction});assert.equal(g.viewBox,baseline.viewBox);assert.equal(g.sc,24);
  }
});

test('方向符號獨立於數值，完整線段才對應格數',async()=>{
 const {scene}=await import('../site/scenes.js');
 for(const F of [0,10,20,100]){
  const p={axis:'x',s:8,direction:'right',F};const g=workGeometry(p);assert.equal(g.vw,512);assert.equal(g.vh,512);
  if(F>0)near(g.end-g.start,F/10*24);
  const html=scene('work2d',{p}).html;
  assert.match(html,/markerUnits="userSpaceOnUse"/);assert.match(html,/refX="0"/);assert.match(html,/fill="none"/);
 }
});

test('施力跟隨物體並對齊水平垂直，位移跨過起點不換側',async()=>{
 const {scene}=await import('../site/scenes.js');
 for(const axis of ['x','y'])for(const s of [-8,-1,1,8])for(const direction of ['left','right','up','down']){
  const p={axis,s,direction,F:100},g=workGeometry(p);
  if(g.ax!==0)near(g.fy,g.y);else near(g.fx,g.x);
  const small=workGeometry({...p,s:s>0?1:-1,F:10});near(small.fx,small.x+small.ax*29);near(small.fy,small.y+small.ay*26);
  const html=scene('work2d',{p}).html;
  if(axis==='x')assert.match(html,/<line x1="0" y1="50" x2="[^"]+" y2="50" class="path work-vector"/);
  else assert.match(html,/<line x1="50" y1="0" x2="50" y2="[^"]+" class="path work-vector"/);
 }
});



test('其他場景的力共用線性比例，播放不改量尺',async()=>{
 const {scene}=await import('../site/scenes.js');const {defaults,modes}=await import('../site/config.js');
 for(const id of Object.keys(modes).filter(id=>id!=='work2d')){
  const s=defaults(id),a=scene(id,s),b=scene(id,{...s,time:.1});assert.equal(a.meta.forceUnit,b.meta.forceUnit);assert.ok(!/NaN|Infinity/.test(a.html));
 }
 const s=defaults('lever'),html=scene('lever',s).html;
 const lengths=[...html.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" class="force (?:gravity|force)"/g)].map(m=>Math.hypot(+m[3]-m[1],+m[4]-m[2]));near(lengths[1]/lengths[0],(s.p.pivotPos-s.p.loadPos)/(s.p.forcePos-s.p.pivotPos));
 const spring=defaults('spring');spring.p.x=0;assert.ok(!scene('spring',spring).html.includes('class="force force"'));
 const fall=defaults('fall'),fall2={...fall,p:{...fall.p,m:4}};
 // Whenever a ruler changes, both its labelled force and shaft length describe the same value.
 for(const s of [fall,fall2]){const r=scene('fall',s),line=[...r.html.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)" class="force force"/g)][0];near((+line[4]-line[2])/r.meta.forceRuler*r.meta.forceUnit,s.p.m*s.p.g);}
});

test('拖曳彈簧形變及擺角不改變力比例尺',async()=>{
 const {scene}=await import('../site/scenes.js');const {defaults}=await import('../site/config.js');
 for(const [id,key,values]of [['spring','x',[-.5,-.2,0,.1,.5]],['pendulum','angle',[-60,-20,0,40,60]]]){
  const s=defaults(id),unit=scene(id,s).meta.forceUnit;for(const value of values)assert.equal(scene(id,{...s,p:{...s.p,[key]:value}}).meta.forceUnit,unit);
 }
});

test('動能比較：兩組獨立、同時鐘、質量不改速度、零速率',async()=>{
 const {comparisonAt}=await import('../site/physics.js');const p={m:2,v:2,mB:4,vB:4},z=comparisonAt(p,1);
 near(z.KA,4);near(z.KB,32);near(z.dxA,2);near(z.dxB,4);near(z.dxB/z.dxA,2);
 const doubled=comparisonAt({...p,m:4},1);near(doubled.KA,8);near(doubled.dxA,z.dxA);
 const faster=comparisonAt({...p,v:4},1);near(faster.KA,16);
 const zero=comparisonAt({...p,v:0,vB:0},10);assert.equal(zero.ended,true);near(zero.dxA,0);near(zero.KB,0);
 const end=comparisonAt(p,999);near(end.dxB,8);near(end.dxA,4);assert.equal(end.ended,true);
});

test('合併拋體：四方向、零初速、落地時間與能量守恆',async()=>{
 const {projectileAt}=await import('../site/physics.js');
 for(const g of [.1,1.62,9.8,100])for(const direction of ['up','down','left','right'])for(const h of [0,2,5,20])for(const v of [0,3,10]){
  const p={m:2,g,h,v,direction},start=projectileAt(p,0),end=projectileAt(p,start.end);
  near(end.h,0);assert.equal(end.ended,true);assert.ok(Number.isFinite(end.end));
  for(const t of [0,start.end/3,start.end*.9,start.end]){const z=projectileAt(p,t);assert.ok(Math.abs(z.K+z.U-z.E)<1e-8);if(direction==='left')assert.ok(z.x<=0);if(direction==='right')assert.ok(z.x>=0);if(['up','down'].includes(direction))near(z.x,0);}
 }
 const p={m:2,g:9.8,h:2,v:4,direction:'right'},z=projectileAt(p,.2);near(z.x,.8);near(z.vx,4);near(z.vy,-1.96);
 const up=projectileAt({...p,direction:'up',h:0},0);assert.ok(up.end>0);assert.equal(up.ended,false);
 const down=projectileAt({...p,direction:'down',h:0},0);assert.equal(down.ended,true);
});

test('無初始方向不帶入初動能；設定速率時位置與箭頭比例固定',async()=>{
 const {projectileAt}=await import('../site/physics.js'),{scene}=await import('../site/scenes.js'),{defaults}=await import('../site/config.js');
 const p={m:2,h:2,v:10,g:9.8,direction:'none'},z=projectileAt(p,0);near(z.K,0);near(z.E,39.2);near(z.v,0);
 const s=defaults('fall');for(const direction of ['up','down','left','right'])for(const v of [1,5,10])for(const g of [.1,9.8,100]){const r=scene('fall',{...s,p:{...s.p,v,g,direction}});near(r.meta.x,320);near(r.meta.sy,60);near(r.meta.motionH,2);}
});



test('90度釋放的張力邊界與非線性擺守恆',async()=>{
 const {pendulumForces}=await import('../site/physics.js');
 for(const angle of [-90,90]){const p={m:2,L:1.5,g:9.8,angle,damping:false};let s=pendulumInitial(p);near(pendulumForces(p,s).tension,0);const initial=pendulumEnergy(p,s).E;
 for(let i=0;i<30*240;i++)s=pendulumStep(p,s,1/240);assert.ok(Math.abs(pendulumEnergy(p,s).E-initial)/initial<.00001);}
 const p={m:2,L:1.5,g:9.8};near(pendulumForces(p,{theta:0,omega:Math.sqrt(2*p.g/p.L)}).tension,3*p.m*p.g);
});

test('斜面與直提對照：角度、距離換施力、功相同',async()=>{
 const {inclineComparison}=await import('../site/physics.js');
 const p={m:2,g:9.8,H:1,L:2,progress:1},a=inclineComparison(p),b=inclineComparison({...p,L:4});near(a.angle,30);near(a.F/a.directForce,.5);near(b.F/a.F,.5);near(b.s/a.s,2);near(a.W,a.directWork);near(b.W,a.W);
 const vertical=inclineComparison({...p,L:1});near(vertical.angle,90);near(vertical.ratio,1);near(vertical.F,vertical.directForce);near(vertical.s,vertical.directDistance);
 const start=inclineComparison({...p,progress:0});near(start.W,0);near(start.s,0);assert.ok(start.F>0);
});


test('槓桿省力費時與省時費力：相同高度、相同施力端速度',async()=>{
 const {leverComparison}=await import('../site/physics.js');
 for(const pivotPos of [1.5,2,2.5])for(const progress of [0,1,50,100]){
  const p={loadPos:.5,pivotPos,forcePos:3.5,progress,m:2,g:9.8},z=leverComparison(p);
  near(z.W,z.U);near(z.F*z.effortArm,z.weight*z.loadArm);near(z.targetStroke/z.duration,.1);near(z.F*z.targetStroke,z.targetWork);near(z.forceRatio*z.timeRatio,1);
 }
 const base={loadPos:.5,forcePos:3.5,progress:100,m:2,g:9.8},easy=leverComparison({...base,pivotPos:1.5}),fast=leverComparison({...base,pivotPos:2.5});
 near(easy.F,9.8);near(easy.duration,4);near(fast.F,39.2);near(fast.duration,1);near(easy.targetWork,fast.targetWork);
});

test('同側槓桿：向上施力、同向上升、力矩平衡與不省功',async()=>{
 const {leverComparison}=await import('../site/physics.js');
 for(const loadPos of [.9,1.5,3.1])for(const progress of [0,1,50,100]){
  const z=leverComparison({layout:'same',pivotPos:.5,loadPos,forcePos:3.5,progress,m:2,g:9.8});
  assert.equal(z.forceSign,-1);near(z.F*z.effortArm,z.weight*z.loadArm);near(z.W,z.U);near(z.targetStroke/z.duration,.1);assert.ok(z.F<z.weight);assert.ok(z.targetStroke>z.targetHeight);
 }
 assert.throws(()=>leverComparison({layout:'same',pivotPos:1.5,loadPos:.5,forcePos:3.5,progress:0,m:2,g:9.8}),RangeError);
});

test('滑輪組：支撐段數、反向使用、距離與時間及能量一致',async()=>{
 const {pulleyComparison}=await import('../site/physics.js');
 for(const count of [0,1,2,3])for(const drive of ['normal','reverse'])for(const progress of [0,1,50,100])for(const m of [1,20]){
  const z=pulleyComparison({count,drive,progress,m,g:9.8});
  near(z.W,z.U);near(z.F*z.targetStroke,z.targetWork);near(z.targetStroke/z.duration,z.inputSpeed);
  if(count){near(z.strands*z.tension,z.reverse?z.F:z.weight);assert.equal(z.reverse,drive==='reverse');}
  else{near(z.F,z.weight);near(z.duration,z.directTime);}
  if(count&&drive==='normal'){assert.ok(z.F<z.weight);assert.ok(z.duration>z.directTime);}
  if(count&&drive==='reverse'){assert.ok(z.F>z.weight);assert.ok(z.duration<z.directTime);}
 }
 assert.throws(()=>pulleyComparison({count:4,drive:'normal'}),RangeError);
});

test('單一動滑輪保留向上拉繩、繩長守恆與兩段承重',async()=>{
 const {pulleyComparison}=await import('../site/physics.js');
 for(const progress of [0,50,100]){
 const p={count:1,drive:'single',progress,m:2,g:9.8},z=pulleyComparison(p);near(z.F,9.8);near(z.s,2*z.h);near(z.W,z.U);assert.equal(z.forceSign,-1);
 const html=(await import('../site/scenes.js')).scene('pulley',{p}).html;
 assert.ok(html.includes('A40 40 0 0 0'));near(2*(260-z.h*70)-(160-z.s*70),360);
 }
});

test('輪軸3m輸入行程：兩端同轉角、力矩與功守恆、半徑邊界',async()=>{
 const {wheelComparison}=await import('../site/physics.js');
 for(const [R,r]of [[.2,.1],[.5,.05],[.1,.09]])for(const drive of ['wheel','axle'])for(const stroke of [0,.05,1.5,3]){
  const z=wheelComparison({R,r,drive,stroke,m:2,g:9.8});near(z.s/z.input,z.h/z.output);near(z.F*z.input,z.weight*z.output);near(z.W,z.U);near(z.targetWork,z.F*3);assert.equal(z.targetStroke,3);
 }
 assert.throws(()=>wheelComparison({R:.1,r:.1}),RangeError);
});

test('公平輪軸比較固定相同高度、同功且時間與路程比一致',async()=>{
 const {wheelComparison}=await import('../site/physics.js');
 for(const [R,r]of [[.2,.1],[.5,.05],[.1,.09]])for(const targetHeight of [.2,1,3]){
 const a=wheelComparison({R,r,compareMode:'height',targetHeight,stroke:100,drive:'wheel',m:2,g:9.8}),b=wheelComparison({R,r,compareMode:'height',targetHeight,stroke:100,drive:'axle',m:2,g:9.8});
 near(a.h,targetHeight);near(b.h,targetHeight);near(a.W,b.W);near(a.F*a.targetStroke,a.targetWork);near(a.duration/a.targetStroke,2);near(b.duration/b.targetStroke,2);
 }
});
test('彈簧關鍵位置用解析相位精確定位，含零振幅與後續週期',async()=>{
 const {springObservationTime}=await import('../site/physics.js');
 for(const x of [-.5,-.2,0,.2,.5])for(const time of [0,.1,2,10])for(const target of ['natural','compress','stretch']){
 const p={x,m:2,k:50},t=springObservationTime(p,time,target),z=springAt(p,t);assert.ok(t>=time-1e-10);near(z.x,x===0?0:target==='natural'?0:(target==='compress'?-1:1)*Math.abs(x),1e-12);near(z.K+z.U,z.E);
 }
});
test('擺錘關鍵位置以物理過零求根，熱能持續累積不重設',async()=>{
 const {pendulumObservation}=await import('../site/physics.js');
 for(const damping of [false,true])for(const angle of [-90,0,40,90]){
 const p={m:2,L:1.5,g:9.8,angle,damping};let s=pendulumInitial(p),E=pendulumEnergy(p,s).E;
 for(const target of ['bottom','left','right','bottom']){const z=pendulumObservation(p,s,target);assert.ok(z.reached);assert.ok(z.state.Q>=s.Q-1e-10);if(angle!==0){assert.equal(target==='bottom'?z.state.theta:z.state.omega,0);}near(pendulumEnergy(p,z.state).E,E,1e-6);s=z.state;}
 }
});
test('手動落下尺度只改圖形，近距離與全高維持相同物理位置',()=>{
 const s=defaults('fall');s.p.h=2;const a=scene('fall',s),b=scene('fall',{...s,view:{fallScale:'full'}});assert.equal(a.meta.sy,60);assert.equal(b.meta.sy,10);near(a.meta.motionH,b.meta.motionH);s.p.v=10;const c=scene('fall',s);near(a.meta.cameraY,c.meta.cameraY);
});

test('新觀察與公平比較拒絕無效條件，零行程仍合法',async()=>{
 const {wheelComparison,springObservationTime,pendulumObservation,approx}=await import('../site/physics.js');
 const p={R:.2,r:.1,drive:'wheel',compareMode:'height',stroke:0,m:2,g:9.8};
 for(const targetHeight of [0,-1,4,NaN])assert.throws(()=>wheelComparison({...p,targetHeight}),RangeError);
 const z=wheelComparison({...p,targetHeight:1});assert.equal(z.W,0);assert.equal(z.U,0);
 assert.throws(()=>springObservationTime({m:2,k:50,x:.2},0,'other'),RangeError);assert.throws(()=>pendulumObservation({}, {},'other'),RangeError);
 assert.equal(approx(0),'0');assert.equal(approx(10),'10');assert.ok(approx(1/3).startsWith('≈ '));assert.ok(approx(.0001).includes('<0.01'));
});

test('同側短施力臂：施力點在支點與物件之間、費力省時不省功',async()=>{
 const {leverComparison}=await import('../site/physics.js');
 for(const forcePos of [.9,1.5,3.1])for(const progress of [0,1,50,100]){
 const p={layout:'same-short',pivotPos:.5,forcePos,loadPos:3.5,progress,m:2,g:9.8},z=leverComparison(p);
 assert.equal(z.forceSign,-1);assert.ok(z.a<z.b);assert.ok(z.F>z.weight);assert.ok(z.duration<z.directTime);near(z.F*z.effortArm,z.weight*z.loadArm);near(z.W,z.U);near(z.targetWork,3.92);
 }
 assert.throws(()=>leverComparison({layout:'same-short',pivotPos:.5,forcePos:3.5,loadPos:1.5,progress:0,m:2,g:9.8}),RangeError);
});
