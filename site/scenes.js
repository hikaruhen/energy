import { springAt, flightAt, projectileAt, pendulumInitial, pendulumForces, axisDisplacement, machine, inclineComparison, leverComparison, pulleyComparison, wheelComparison, approx, fmt } from './physics.js?v=33';
import {comparisonScene} from './comparison.js?v=33';
const line=(x1,y1,x2,y2,cls='ground',more='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" ${more}/>`;
const text=(x,y,t,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls} ${y<80||y>315?'caption':''}" text-anchor="${anchor}">${t}</text>`;
const box=(x,y,w=58,h=52)=>`<rect x="${x-w/2}" y="${y-h}" width="${w}" height="${h}" rx="4" class="object"/><path d="M${x-8} ${y-h}v13h16v-13" fill="none" stroke="#795516" stroke-width="2"/>`;
const force=(x,y,dx,dy,kind='force')=>dx===0&&dy===0?'':line(x,y,x+dx,y+dy,`force ${kind}`,`marker-end="url(#${kind}-head)"`);
const motion=(x,y,dx,dy)=>dx===0&&dy===0?'':line(x,y,x+dx,y+dy,'path','marker-end="url(#move-head)"');
const circle=(x,y,r,fill,stroke='#405c66')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
const zone=(x,y,target,r=48)=>`<circle cx="${x}" cy="${y}" r="${r}" class="drag-zone" data-drag="${target}"/>`;
const lineZone=(x1,y1,x2,y2,target,width=96)=>line(x1,y1,x2,y2,'drag-line',`stroke-width="${width}" data-drag="${target}"`);
const ground=()=>line(40,315,600,315)+text(45,350,'參考面 h = 0','small');
// The full shaft carries the magnitude; a separate, fixed head indicates direction.
function arrowDefs(scale){
 const marker=(id,color)=>`<marker id="${id}" markerUnits="userSpaceOnUse" viewBox="0 -6 12 12" refX="0" refY="0" markerWidth="${12/scale}" markerHeight="${12/scale}" orient="auto-start-reverse" overflow="visible"><path d="M2 -4.5L10 0L2 4.5" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></marker>`;
 return `<defs>${marker('force-head','#b34829')}${marker('lift-head','#536675')}${marker('move-head','#476d7e')}${marker('tension-head','#124735')}${marker('gravity-head','#8656a3')}${marker('resistance-head','#267044')}</defs>`;
}
export function scene(id,s,dragPixels=96) {
  const p=s.p,scale=96/dragPixels;let out='',hits='',meta={};
  let maxForce=p.m*p.g||0;
  if(id==='spring')maxForce=p.k*.5;
  if(['pendulum','damped'].includes(id))maxForce=3*p.m*p.g;
  if(id==='lever')maxForce=Math.max(maxForce,leverComparison(p).F);
  if(id==='pulley')maxForce=Math.max(maxForce,pulleyComparison(p).F);
  if(id==='wheel')maxForce=Math.max(maxForce,wheelComparison(p).F);
  else if(['incline','fixed','movable'].includes(id))maxForce=Math.max(maxForce,machine(id,{...p,progress:p.progress/100}).F);
  const power=10**Math.floor(Math.log10(maxForce||1)),forceUnit=[1,2,5,10].map(n=>n*power).find(n=>n>=maxForce)||power*10,forceScale=(id==='fall'||id==='incline'?80:id==='throw'?25:60)/forceUnit;
  const hit=(x,y,t)=>zone(x,y,t,dragPixels/2);
  if(id==='work2d'){
    const {dx,dy}=axisDisplacement(p.axis,p.s);
    const {sc,cx,cy,x,y,fx,fy,ax,ay,start,end,vx0,vy0,vw,vh}=workGeometry(p);

    const arrow=(x1,y1,x2,y2,cls,marker)=>line(x1,y1,x2,y2,cls,`vector-effect="non-scaling-stroke" marker-end="url(#${marker})"`);
    for(let i=-10;i<=10;i++)out+=line(i*sc,-240,i*sc,240,'faint')+line(-240,i*sc,240,i*sc,'faint');
    out+=line(-240,cy,240,cy,'reference')+line(cx,-240,cx,240,'reference');
    if(dx!==0||dy!==0){
      const vx=dx*sc,vy=-dy*sc,ox=p.axis==='y'?50:0,oy=p.axis==='x'?50:0;
      out+=arrow(cx+ox,cy+oy,cx+ox+vx,cy+oy+vy,'path work-vector','move-head');
    }
    out+=box(x,y+26)+circle(cx,cy,5,'white','#476d7e');
    if(p.F>0)out+=arrow(fx+ax*start,fy+ay*start,fx+ax*end,fy+ay*end,'force work-vector','force-head');
    else out+=line(fx+ax*start,fy+ay*start,fx+ax*end,fy+ay*end,'zero-force','vector-effect="non-scaling-stroke"')+circle(fx+ax*end,fy+ay*end,4/scale,'white','#7a8d85');
    hits+=lineZone(fx+ax*start,fy+ay*start,fx+ax*end,fy+ay*end,'force',dragPixels).replace('/>',` tabindex="0" role="slider" aria-label="拖曳調整施力，每格10N" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.F}" aria-valuetext="${p.F} N"/>`)+hit(x,y,'object').replace('/>',` tabindex="0" role="slider" aria-label="拖曳移動方箱，每格1m" aria-valuemin="-8" aria-valuemax="8" aria-valuenow="${p.s}" aria-valuetext="${p.axis==='x'?'水平':'垂直'}位移 ${p.s} m"/>`);
    meta={x,y,fx,fy,ax,ay,start,end,cx,cy,sc};
  }else if(id==='compare'){
    const comparison=comparisonScene(p,s.time,dragPixels);out=comparison.html;meta=comparison.meta;
  }else if(id==='fall'){
    const z=projectileAt(p,s.time),sy=s.view?.fallScale==='full'?10:60,groundY=365;
    const wx=320+((s.launchX||0)+z.x)*sy,wy=groundY-z.h*sy;
    // Parameter edits retain a fixed metre scale. Only actual motion can pan the view.
    const tipX=wx+(z.vx>0?29:z.vx<0?-29:0)+z.vx*8,tipY=wy-26+(z.vy>0?-26:z.vy<0?26:0)-z.vy*8;
    const low=Math.min(wy-52,tipY),high=Math.max(wy+30,tipY);
    const cameraX=s.time>0?Math.max(0,55-Math.min(wx-29,tipX))+Math.min(0,585-Math.max(wx+29,tipX)):(s.camera?.x||0),cameraY=s.time>0?(low<45?45-low:high>450?450-high:0):(s.camera?.y??Math.max(0,97-wy));
    const x=wx+cameraX,y=wy+cameraY;
    out=line(40,groundY+cameraY,600,groundY+cameraY)+box(x,y);
    out+=force(x,y,0,p.m*p.g*forceScale);
    if(z.v>0){const nx=z.vx/z.v,ny=-z.vy/z.v,edge=Math.min(nx!==0?29/Math.abs(nx):Infinity,ny!==0?26/Math.abs(ny):Infinity),vs=8;out+=motion(x+nx*edge,y-26+ny*edge,z.vx*vs,-z.vy*vs);}
    if(s.view?.components){out+=motion(x+(z.vx>=0?29:-29),y-26,z.vx*8,0)+motion(x,y-26+(z.vy>=0?-26:26),0,-z.vy*8);}
    const tickStep=sy===60?1:5,labelEvery=Math.max(1,Math.ceil(24/(tickStep*sy*scale)));for(let h=0;h<=Math.max(20,p.h);h+=tickStep){const ty=groundY+cameraY-h*sy;if(ty>=50&&ty<=390)out+=line(75,ty,90,ty,'reference')+(Math.round(h/tickStep)%labelEvery===0?text(65,ty+6,`${h}`,'height-tick','end'):'');}
    out+=text(35,450,sy===60?'近距離：1 m／格':'全高：5 m／格','small')+text(605,450,'地面 h=0','small','end');
    hits+=hit(x,y-26,'object');meta={sy,x,groundY,cameraX,cameraY,motionX:z.x,motionH:z.h};
  }else if(['height','throw'].includes(id)){
    const state=id==='height'?{h:p.h,v:0}:flightAt(p,s.time,id==='throw');
    const maxHeight=id==='throw'?5+100/(2*9.8):5, sy=210/maxHeight;
    const y=315-state.h*sy,x=320;
    out=ground()+line(180,315,180,75,'reference')+box(x,y)+text(75,50,id==='height'?'靜止狀態比較':'忽略空氣阻力');
    if(id!=='height'){out+=force(x,y,0,p.m*p.g*forceScale);if(state.v!==0)out+=motion(x-29,y-26,0,-state.v*4);}
    hits+=hit(x,y-26,'object');meta={sy};
  }else if(id==='spring'){
    const z=springAt(p,s.time),x=355+z.x*340, y=250;
    let path='M75 222L95 222';const end=x-30;
    for(let i=0;i<=24;i++)path+=`L${95+(end-110)*i/24} ${222+(i===0||i===24?0:(i%2?14:-14))}`;
    path+=`L${end} 222`;
    out=line(45,y,600,y)+line(74,160,74,y)+`<path d="${path}" class="rope"/>`+line(355,130,355,285,'reference')+box(x,y)+text(355,325,'原長位置','small','middle')+text(80,75,'壓縮 ←   形變   → 拉長');
    if(z.x!==0)out+=force(x+(z.x>0?-29:29),y-26,-p.k*z.x*forceScale,0)+text(435,120,'回復力','small');
    hits+=hit(x,y-26,'object');
  }else if(id==='pendulum'||id==='damped'){
    const z=s.pend||pendulumInitial(p),scale=120,L=p.L*scale,cx=320,cy=50;
    const x=cx+L*Math.sin(z.theta),y=cy+L*Math.cos(z.theta);
    const a=cx-L,b=cx+L,top=cy;
    out=line(230,30,410,30)+circle(cx,cy,6,'#405c66')+`<path d="M${a} ${top} A${L} ${L} 0 0 0 ${b} ${top}" class="reference"/>`+line(cx,cy,x,y,'rope')+line(60,cy+L+12,580,cy+L+12,'reference')+circle(x,y,12,'#f1bb55','#795516')+text(50,345,'最低點位能 = 0','small');
    // Weight, tension and (optionally) resistance arrows are distinct.
    const tension=pendulumForces(p,z).tension,tensionLength=tension*forceScale;
    if(s.view?.forces!==false){out+=force(x,y+12,0,p.m*p.g*forceScale,'gravity');if(tension>0)out+=force(x-Math.sin(z.theta)*12,y-Math.cos(z.theta)*12,-Math.sin(z.theta)*tensionLength,-Math.cos(z.theta)*tensionLength,'tension');
    if(id==='damped'&&z.omega!==0){const dampingForce=.3*p.L*z.omega*forceScale;out+=force(x-Math.sign(dampingForce)*Math.cos(z.theta)*12,y+Math.sign(dampingForce)*Math.sin(z.theta)*12,-Math.cos(z.theta)*dampingForce,Math.sin(z.theta)*dampingForce,'resistance');}
    }
    hits+=lineZone(cx+Math.sin(z.theta)*28,cy+Math.cos(z.theta)*28,x,y,'object',dragPixels)+hit(x,y,'object');meta={cx,cy};
  }else if(id==='incline'){
    const sc=Math.min(300/p.L,150/p.H),dx=Math.sqrt(Math.max(0,p.L*p.L-p.H*p.H))*sc,dy=p.H*sc,x0=190,y0=345;
    const x=x0+dx*p.progress/100,y=y0-dy*p.progress/100,angle=-Math.atan2(dy,dx)*180/Math.PI;
    const z=inclineComparison({...p,progress:p.progress/100});
    out=line(30,y0,615,y0)+text(35,35,'同一物體・兩種提升方式')+`<path d="M${x0} ${y0}L${x0+dx} ${y0-dy}V${y0}Z" fill="#e1ebe0" stroke="#6f8873" stroke-width="2"/>`;
    out+=line(45,y,605,y,'reference')+line(85,y0,85,y,'lift-travel')+line(x0,y0,x,y,'ramp-travel')+box(85,y,64,50)+`<g transform="translate(${x} ${y}) rotate(${angle})">${box(32,0,64,50)}</g>`;
    const ux=dx/(p.L*sc),uy=-dy/(p.L*sc);
    out+=force(85,y-50,0,-z.directForce*forceScale,'lift')+force(x+64*ux+25*uy,y+64*uy-25*ux,ux*z.F*forceScale,uy*z.F*forceScale);
    const r=32,ex=x0+r*ux,ey=y0+r*uy;
    out+=`<path d="M${x0+r} ${y0} A${r} ${r} 0 0 0 ${ex} ${ey}" class="angle-arc"/>`+text(380,435,`θ = ${fmt(z.angle)}°`,'angle-label')+text(35,435,'等速・無摩擦','small');
    hits+=hit(x+32*ux+25*uy,y+32*uy-25*ux,'object');meta={x0,y0,dx,dy};
  }else if(id==='lever'){
    const z=leverComparison(p),sc=z.sameSide?110:130,cy=z.sameSide?300:200,cx=60+p.pivotPos*sc,c=Math.cos(z.phi),sin=Math.sin(z.phi);
    const lx=cx+(z.sameSide?1:-1)*z.b*sc*c,ly=cy-z.b*sc*sin,rx=cx+z.a*sc*c,ry=cy+z.forceSign*z.a*sc*sin;
    out=text(35,40,'相同提升高度・比較施力與時間')+line(60,cy,580,cy,'reference')+line(z.sameSide?cx:lx,z.sameSide?cy:ly,z.sameSide&&z.b>z.a?lx:rx,z.sameSide&&z.b>z.a?ly:ry,'lever-beam')+`<path d="M${cx} ${cy}l-24 48h48Z" class="lever-pivot"/>`;
    out+=line(lx,ly,lx,ly+48,'rope')+box(lx,ly+94,54,46)+force(lx,ly+94,0,z.weight*forceScale,'gravity')+circle(rx,ry,7,'#b34829','#b34829')+force(rx,ry,0,z.forceSign*z.F*forceScale);
    out+=line(lx,cy+94,lx,ly+94,'lift-travel')+line(rx,cy,rx,ry,'ramp-travel');
    const by=z.sameSide?210:125;
    out+=line(lx,ly,lx,by,'reference')+line(rx,ry,rx,125,'reference')+line(lx,by,cx,by,'path arm-output')+line(cx,125,rx,125,'path arm-input');
    out+=line(cx,115,cx,z.sameSide?220:135,'ground')+text(35,90,'抗力臂 b','arm-label arm-output')+text(35,175,'施力臂 a','arm-label arm-input');
    out+=text(lx,ly+44,'物件','handle-name','middle')+text(cx,cy+125,'支點','handle-name','middle')+text(535,70,'● 施力點','lever-handle-label','middle')+text(35,490,'準靜態・忽略桿重及摩擦','small');
    hits+=hit(lx,ly+71,'lever-load')+lineZone(rx,ry,rx,ry+z.forceSign*z.F*forceScale,'lever-force',dragPixels)+hit(cx,cy+25,'lever-pivot');
    meta={cx,cy,sc,lx,ly,rx,ry,forceEnd:ry+z.forceSign*z.F*forceScale,...z};
  }else if(id==='pulley'){
    const z=pulleyComparison(p),sc=70,n=p.count,top=90,low=260+(z.reverse?z.s:-z.h)*sc;
    const wheel=(x,y)=>circle(x,y,25,'#dbe9dc')+circle(x,y,5,'#405c66')+line(x-16,y,x+16,y,'pulley-spoke');
    let ex,ey,bx,by,path='';
    out=text(35,38,n?`${n} 組動滑輪・${z.strands} 段繩支撐滑輪座`:'定滑輪：改變施力方向')+line(95,55,445,55,'ground');
    if(n===1&&p.drive==='single'){
      ex=305;ey=160-z.s*sc;bx=265;by=low+92;
      out+=circle(265,low,40,'#dbe9dc')+circle(265,low,5,'#405c66')+line(225,55,225,top,'rope')+line(265,low,265,low+46,'ground');
      path=`M225 ${top}V${low}A40 40 0 0 0 305 ${low}V${ey}`;
      out+=text(210,(top+low)/2,'①','strand-number','middle')+text(325,(ey+low)/2,'②','strand-number','middle');
      out+=force(225,low-40,0,-z.tension*forceScale,'tension')+force(305,low-40,0,-z.tension*forceScale,'tension');
    }else if(n){
      path=`M110 ${top}V${low}`;
      for(let i=0;i<n;i++){
        const x=135+i*100;out+=text(x-35,(top+low)/2,['①','③','⑤'][i],'strand-number','middle')+text(x+35,(top+low)/2,['②','④','⑥'][i],'strand-number','middle');
        out+=wheel(x,low)+wheel(x+50,top)+line(x+50,55,x+50,top,'ground');
        out+=force(x-25,low-40,0,-z.tension*forceScale,'tension')+force(x+25,low-40,0,-z.tension*forceScale,'tension');
        path+=`A25 25 0 0 0 ${x+25} ${low}V${top}A25 25 0 0 1 ${x+75} ${top}`;
        if(i<n-1)path+=`V${low}`;
      }
      const right=110+n*100,mid=135+(n-1)*50,free=z.reverse?300-z.h*sc:150+z.s*sc;
      path+=`V${free}`;
      out+=line(110,55,110,top,'rope')+line(135,low,mid,low+45,'ground')+line(135+(n-1)*100,low,mid,low+45,'ground');
      if(z.reverse){bx=right;by=free+52;ex=mid;ey=low+45;out+=line(right,free,right,free+6,'rope');}
      else{bx=mid;by=low+97;ex=right;ey=free;out+=line(mid,low+45,mid,low+51,'rope');}
    }else{
      bx=190;by=335-z.h*sc;ex=330;ey=150+z.s*sc;
      out+=circle(260,135,70,'#dbe9dc')+circle(260,135,6,'#405c66')+line(260,55,260,135,'ground');
      path=`M190 ${by-52}V135A70 70 0 0 1 330 135V${ey}`;
    }
    out+=line(bx-38,by+z.h*sc,bx-38,by,'lift-travel')+line(ex+32,ey-z.forceSign*z.s*sc,ex+32,ey,'ramp-travel');
    out+=line(bx-45,by+z.h*sc,bx-31,by+z.h*sc,'reference')+line(ex+25,ey-z.forceSign*z.s*sc,ex+39,ey-z.forceSign*z.s*sc,'reference');
    out+=`<path d="${path}" class="rope pulley-rope"/>`+box(bx,by,54,46)+force(bx,by,0,z.weight*forceScale,'gravity')+line(ex-15,ey,ex+15,ey,'ground')+force(ex,ey,0,z.forceSign*z.F*forceScale);
    out+=text(bx-36,by-20,'物件','small','end')+text(ex+16,ey+15,'拉','small');
    out+=text(35,425,n?`繩向上拉滑輪座：${z.strands} × ${approx(z.tension)} N`:`承重繩張力：${fmt(z.tension)} N`,'small');
    out+=`<rect x="475" y="80" width="130" height="160" rx="10" class="pulley-tray"/>`+wheel(540,115)+wheel(540,180)+text(540,268,'拖入定＋動','small','middle');
    if(dragPixels)hits+=hit(540,150,'pulley-add')+lineZone(ex,ey,ex,ey+z.forceSign*z.F*forceScale,'pulley-pull',dragPixels)+hit(bx,by-23,'pulley-load');
    meta={...z,ex,ey,bx,by,sc,low,forceScale,drop:{left:90,right:450,top:60,bottom:420}};
  }else if(id==='fixed'){
    const cx=300,cy=85,r=45,yl=310-p.lift*65,yr=145+p.lift*65;
    out=line(200,30,400,30)+line(cx,30,cx,cy,'rope')+circle(cx,cy,r,'#dbe9dc')+`<path d="M${cx-r} ${yl-52}V${cy}A${r} ${r} 0 0 1 ${cx+r} ${cy}V${yr}" class="rope"/>`+box(cx-r,yl)+line(cx+r-18,yr,cx+r+18,yr,'ground')+force(cx+r,yr,0,p.m*p.g*forceScale)+text(70,80,'中心固定','small')+text(430,320,'向下拉','small');
    hits+=lineZone(cx+r,cy+65,cx+r,yr,'object',dragPixels)+hit(cx+r,yr,'object');meta={start:145,scale:65};
  }else if(id==='movable'){
    const cx=300,r=42,cy=275-p.lift*45,yf=230-p.lift*90;
    out=line(180,35,430,35)+circle(cx-r,42,5,'#405c66')+circle(cx,cy,r,'#dbe9dc')+`<path d="M${cx-r} 42V${cy}A${r} ${r} 0 0 0 ${cx+r} ${cy}V${yf}" class="rope"/>`+line(cx,cy,cx,cy+42,'rope')+box(cx,cy+93)+line(cx+r-18,yf,cx+r+18,yf,'ground')+force(cx+r,yf,0,-p.m*p.g/2*forceScale)+text(65,85,'左端固定','small')+text(430,320,'向上拉','small');
    hits+=hit(cx+r,yf,'object');meta={start:230,scale:90};
  }else if(id==='wheel'){
    const z=wheelComparison(p),R=130,r=R*p.r/p.R,cx=320,cy=190,input=p.drive==='wheel'?R:r,output=p.drive==='wheel'?r:R;
    const sc=Math.min(60,130/z.targetHeight,180/(p.compareMode==='height'?z.targetHeight*p.R/p.r:z.targetStroke)),yl=450-z.h*sc,yr=225+z.s*sc;
    out=text(35,35,'輪與軸固定在一起・同轉角')+circle(cx,cy,R,'#e0eadb')+circle(cx,cy,r,'#afc9b1');
    for(const radius of [R,r])for(const a of [0,Math.PI/2,Math.PI,3*Math.PI/2])out+=line(cx,cy,cx+radius*Math.cos(z.phi+a),cy+radius*Math.sin(z.phi+a),radius===R?'wheel-spoke':'axle-spoke');
    out+=line(cx,cy,cx+input,cy,'wheel-input-radius')+line(cx,cy,cx-output,cy,'wheel-output-radius')+circle(cx,cy,6,'#405c66');
    out+=line(cx-output,cy,cx-output,yl-52,'rope')+line(cx+input,cy,cx+input,yr,'rope')+box(cx-output,yl,64,52)+line(cx+input-20,yr,cx+input+20,yr,'ground')+force(cx+input,yr,0,z.F*forceScale)+force(cx-output,yl,0,z.weight*forceScale,'gravity');
    out+=line(cx-output-44,450,cx-output-44,yl,'lift-travel')+line(cx+input+40,225,cx+input+40,yr,'ramp-travel');
    out+=text(35,75,`物件端／輸出 ${approx(z.output)} m`,'small')+text(35,110,`施力端／輸入 ${approx(z.input)} m`,'small')+text(cx-output-38,yl-15,'物件','small','end')+text(cx+input+25,yr+10,'拉','small');
    out+=text(35,535,`拉繩 ${fmt(z.s)} m → 物件上升 ${fmt(z.h)} m`,'small');
    hits+=lineZone(cx+input,cy,cx+input,yr,'object',dragPixels)+hit(cx+input,yr,'object');meta={...z,start:225,scale:sc,yl,yr};
  }
  return {html:arrowDefs(scale)+out+hits,meta:{...meta,forceUnit,forceRuler:(id==='fall'||id==='incline'?80:id==='throw'?25:60)*scale}};
}

export function workGeometry(p) {
  const {dx,dy}=axisDisplacement(p.axis,p.s),sc=24,cx=0,cy=0,x=dx*sc,y=-dy*sc;
  const [ax,ay]={right:[1,0],left:[-1,0],up:[0,-1],down:[0,1]}[p.direction];
  const start=0,end=p.F>0?p.F/10*sc:sc;
  // The force shaft stays attached to the matching face of the box.
  const fx=x+ax*29,fy=y+ay*26;
  const vw=512,vh=512,vx0=-256,vy0=-256;
  return {cx,cy,x,y,fx,fy,ax,ay,start,end,sc,vx0,vy0,vw,vh,viewBox:`${vx0} ${vy0} ${vw} ${vh}`};
}









