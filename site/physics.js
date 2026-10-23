// All lengths are metres, mass kg, force N, time seconds, energy J.
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function fmt(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  if (Math.abs(value) < 0.01) return value < 0 ? '−<0.01' : '<0.01';
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value);
}
export function kinetic(m, v) { return m * v * v / 2; }
export function gravity(m, g, h) { return m * g * h; }
export function elastic(k, x) { return k * x * x / 2; }
export function work(F, s, dir = 1) { return F * s * dir; }
export function springAt(p, t) {
  const w=Math.sqrt(p.k/p.m),phase=w*t,q=Math.round(phase/(Math.PI/2)),exact=Math.abs(phase-q*Math.PI/2)<1e-12;
  const c=exact?[1,0,-1,0][((q%4)+4)%4]:Math.cos(phase),sn=exact?[0,1,0,-1][((q%4)+4)%4]:Math.sin(phase),x=p.x*c,v=-p.x*w*sn;
  return { x, v, K: kinetic(p.m, v), U: elastic(p.k, x), E: elastic(p.k, p.x) };
}
export function flightAt(p, t, upward = false) {
  const v0 = upward ? p.v : 0;
  const end = (v0 + Math.sqrt(v0 * v0 + 2 * p.g * p.h)) / p.g;
  const time = Math.min(t, end);
  const h = time >= end ? 0 : Math.max(0, p.h + v0 * time - p.g * time * time / 2);
  const v = v0 - p.g * time;
  return { h, v, K: kinetic(p.m, v), U: gravity(p.m, p.g, h), E: kinetic(p.m, v0) + gravity(p.m, p.g, p.h), ended: t >= end };
}
export function projectileAt(p,t=0){
  const [ux,uy]={none:[0,0],up:[0,1],down:[0,-1],left:[-1,0],right:[1,0]}[p.direction];
  const vx=p.v*ux,vy0=p.v*uy;
  const root=Math.sqrt(vy0*vy0+2*p.g*p.h);
  const end=vy0<0?2*p.h/(root-vy0):(vy0+root)/p.g;
  const time=clamp(t,0,end),h=time>=end?0:Math.max(0,p.h+vy0*time-p.g*time*time/2),vy=vy0-p.g*time;
  const speed=Math.hypot(vx,vy);
  return {x:vx*time,h,vx,vy,v:speed,t:time,end,K:kinetic(p.m,speed),U:gravity(p.m,p.g,h),E:kinetic(p.m,Math.hypot(vx,vy0))+gravity(p.m,p.g,p.h),ended:t>=end};
}
export function pendulumInitial(p) { return { theta: p.angle * Math.PI / 180, omega: 0, Q: 0 }; }
export function pendulumForces(p,s){
  const cos=Math.abs(s.theta)===Math.PI/2?0:Math.cos(s.theta);
  return {weight:p.m*p.g,tension:Math.max(0,p.m*(p.g*cos+p.L*s.omega*s.omega))};
}
export function pendulumEnergy(p, s) {
  const K = kinetic(p.m, p.L * s.omega), U = gravity(p.m, p.g, p.L * (1 - Math.cos(s.theta)));
  return { K, U, Q: s.Q, E: K + U + s.Q };
}
// RK4 integrates angle, angular velocity and dissipated energy together.
// Drag force = -b*v, b = 0.3 kg/s in the resistance mode.
export function pendulumStep(p, s, dt) {
  const b = p.damping ? 0.3 : 0;
  const f = a => [a[1], -p.g / p.L * Math.sin(a[0]) - b / p.m * a[1], b * p.L * p.L * a[1] * a[1]];
  const a = [s.theta, s.omega, s.Q], add = (v, k, h) => v.map((x, i) => x + h * k[i]);
  const k1 = f(a), k2 = f(add(a, k1, dt / 2)), k3 = f(add(a, k2, dt / 2)), k4 = f(add(a, k3, dt));
  const z = a.map((x, i) => x + dt / 6 * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]));
  return { theta: z[0], omega: z[1], Q: z[2] };
}
export function machine(id, p) {
  const weight = p.m * p.g;
  let F, s, h;
  if (id === 'incline') {
    if (!(p.H > 0 && p.L >= p.H)) throw new RangeError('斜面長度不可小於高度');
    F = weight * p.H / p.L; s = p.L * p.progress; h = p.H * p.progress;
  } else if (id === 'lever') {
    if (!(p.a > 0 && p.b > 0)) throw new RangeError('力臂必須大於零');
    const sin = Math.sin(p.phi * Math.PI / 180);
    F = weight * p.b / p.a; s = p.a * sin; h = p.b * sin;
  } else if (id === 'fixed' || id === 'movable') {
    F = weight / (id === 'movable' ? 2 : 1); h = p.lift; s = p.lift * (id === 'movable' ? 2 : 1);
  } else {
    if (!(p.R > p.r && p.r > 0)) throw new RangeError('輪半徑必須大於軸半徑');
    const input = p.drive === 'wheel' ? p.R : p.r, output = p.drive === 'wheel' ? p.r : p.R;
    F = weight * output / input; h = p.lift; s = h * input / output;
  }
  return { F, s, h, W: F*s, U: weight*h, weight };
}

export function comparisonAt(p,time=0) {
  const maxSpeed=Math.max(p.v,p.vB),duration=maxSpeed>0?8/maxSpeed:0,t=clamp(time,0,duration);
  return {t,duration,dxA:p.v*t,dxB:p.vB*t,KA:kinetic(p.m,p.v),KB:kinetic(p.mB,p.vB),ended:time>=duration};
}
export function inclineComparison(p){
  const z=machine('incline',p);
  return {...z,angle:Math.asin(p.H/p.L)*180/Math.PI,ratio:p.H/p.L,directForce:z.weight,directDistance:z.h,directWork:z.weight*z.h};
}
export function leverComparison(p){
  const sameSide=['same','same-short'].includes(p.layout),a=Math.abs(p.forcePos-p.pivotPos),b=Math.abs(p.loadPos-p.pivotPos);
  const ordered=p.layout==='same-short'?p.pivotPos<p.forcePos&&p.forcePos<p.loadPos:sameSide?p.pivotPos<p.loadPos&&p.loadPos<p.forcePos:p.loadPos<p.pivotPos&&p.pivotPos<p.forcePos;
  if(a<.399999999||b<.399999999||!ordered||(sameSide&&Math.abs(p.loadPos-p.forcePos)<.399999999))throw new RangeError('物件、支點與施力點需保持有效間距與配置');
  const targetHeight=.2,inputSpeed=.1,h=targetHeight*clamp(p.progress/100,0,1),phi=Math.asin(h/b),weight=p.m*p.g,F=weight*b/a,s=h*a/b;
  return {sameSide,forceSign:sameSide?-1:1,a,b,phi,effortArm:a*Math.cos(phi),loadArm:b*Math.cos(phi),weight,F,s,h,W:F*s,U:weight*h,targetHeight,inputSpeed,targetStroke:targetHeight*a/b,duration:targetHeight*a/b/inputSpeed,directTime:targetHeight/inputSpeed,targetWork:weight*targetHeight,forceRatio:b/a,timeRatio:a/b};
}

export function directionalWork(F, dx, dy, direction) {
  const unit = {right:[1,0],left:[-1,0],up:[0,1],down:[0,-1]}[direction];
  if (!unit || ![F,dx,dy].every(Number.isFinite) || F < 0) throw new RangeError('施力或位移無效');
  const projection = dx*unit[0] + dy*unit[1];
  return { Fx:F*unit[0], Fy:F*unit[1], projection, Wx:F*unit[0]*dx, Wy:F*unit[1]*dy, W:F*projection };
}

export function axisDisplacement(axis, s) {
  if (!['x','y'].includes(axis) || !Number.isFinite(s)) throw new RangeError('位移無效');
  return {dx:axis==='x'?s:0,dy:axis==='y'?s:0};
}


// Ideal massless, frictionless block and tackle, with one continuous rope.
export function pulleyComparison(p){
 if(!Number.isInteger(p.count)||p.count<0||p.count>3||!['normal','single','reverse'].includes(p.drive))throw new RangeError('滑輪配置無效');
 const strands=p.count?2*p.count:1,reverse=p.count>0&&p.drive==='reverse',ratio=reverse?1/strands:strands;
 const targetHeight=.5,inputSpeed=.2,h=targetHeight*clamp(p.progress/100,0,1),weight=p.m*p.g,F=weight/ratio,s=h*ratio;
 return {forceSign:p.drive==='single'?-1:1,strands,reverse,ratio,targetHeight,inputSpeed,h,weight,F,s,W:F*s,U:weight*h,targetStroke:targetHeight*ratio,duration:targetHeight*ratio/inputSpeed,directTime:targetHeight/inputSpeed,targetWork:weight*targetHeight,tension:reverse?weight:F};
}

export function wheelComparison(p){
 if(!['wheel','axle'].includes(p.drive)||!Number.isFinite(p.stroke))throw new RangeError('輪軸輸入無效');
 if(p.compareMode==='height'&&!(p.targetHeight>=.2&&p.targetHeight<=3))throw new RangeError('提升高度須為0.2–3m');
 if(!(p.R>p.r&&p.r>0))throw new RangeError('輪半徑須大於軸半徑');
 const input=p.drive==='wheel'?p.R:p.r,output=p.drive==='wheel'?p.r:p.R;
 const targetHeight=p.compareMode==='height'?(p.targetHeight??1):3*output/input,targetStroke=p.compareMode==='height'?targetHeight*input/output:3;
 const s=clamp(p.stroke,0,targetStroke),h=s*output/input,weight=p.m*p.g,F=weight*output/input,inputSpeed=.5;
 return {input,output,s,h,weight,F,W:F*s,U:weight*h,phi:s/input,ratio:input/output,targetHeight,targetStroke,inputSpeed,duration:targetStroke/inputSpeed,directTime:targetHeight/inputSpeed,targetWork:weight*targetHeight};
}

// A displayed approximation never changes the underlying value.
export function approx(value){if(!Number.isFinite(value))return '—';return (Math.abs(value-Math.round(value*100)/100)>1e-10?'≈ ':'')+fmt(value);}
export function springObservationTime(p,t,target){
 if(!['natural','compress','stretch'].includes(target))throw new RangeError('未知觀察位置');
 const w=Math.sqrt(p.k/p.m);if(p.x===0)return t;
 const phase=target==='natural'?Math.PI/2:((target==='compress')===(p.x<0)?0:Math.PI),period=target==='natural'?Math.PI:2*Math.PI;
 return (phase+Math.max(0,Math.ceil((w*t-phase-1e-12)/period))*period)/w;
}
// Locate the next physical crossing/turning point, then bisect within its RK4 step.
export function pendulumObservation(p,start,target){
 if(!['bottom','left','right'].includes(target))throw new RangeError('未知觀察位置');
 const atTarget=s=>target==='bottom'?s.theta===0:s.omega===0&&(target==='left'?s.theta<0:s.theta>0);
 if(atTarget(start)||(start.theta===0&&start.omega===0))return {state:{...start},elapsed:0,reached:true};
 let s={...start},elapsed=0;const dt=1/480;
 for(let i=0;i<120/dt;i++){
  const next=pendulumStep(p,s,dt),key=target==='bottom'?'theta':'omega';
  if(s[key]*next[key]<0&&(target==='bottom'||(target==='left'?next.theta<0:next.theta>0))){
   let lo=0,hi=dt;for(let j=0;j<42;j++){const mid=(lo+hi)/2,q=pendulumStep(p,s,mid);if(s[key]*q[key]>0)lo=mid;else hi=mid;}
   const result=pendulumStep(p,s,(lo+hi)/2);result[key]=0;
   return {state:result,elapsed:elapsed+(lo+hi)/2,reached:true};
  }
  s=next;elapsed+=dt;
 }
 return {state:start,elapsed:0,reached:false};
}
