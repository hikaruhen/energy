import {comparisonAt} from './physics.js?v=32';

export const compareLayout={supply:{x:535,y:52},rows:{A:230,B:410},start:100,pixelsPerMeter:30};
export function comparisonScene(p,time,dragPixels){
 const z=comparisonAt(p,time),{supply,rows,start,pixelsPerMeter}=compareLayout;
 let html=`<rect x="480" y="12" width="144" height="82" rx="8" class="block-tray"/><text x="40" y="48">每塊 2 kg</text>`;
 const block=(x,y)=>`<rect x="${x-28}" y="${y-32}" width="56" height="32" rx="2" class="object"/><path d="M${x-5} ${y-32}v7h10v-7" class="block-seam"/>`;
 html+=block(supply.x,supply.y+12)+`<text x="590" y="62" text-anchor="middle" class="tray-symbol">＋</text><rect x="${552-Math.max(144,dragPixels)/2}" y="${53-Math.max(82,dragPixels)/2}" width="${Math.max(144,dragPixels)}" height="${Math.max(82,dragPixels)}" class="drag-zone" data-drag="supply" tabindex="0" role="button" aria-label="2公斤方塊供應及回收區"/>`;
 const meta={rows:{},...z};
 for(const id of ['A','B']){
  const mass=id==='A'?p.m:p.mB,v=id==='A'?p.v:p.vB,n=mass/2,x=start+(id==='A'?z.dxA:z.dxB)*pixelsPerMeter,y=rows[id],right=x+Math.floor((n-1)/4)*56+28;
  html+=`<text x="28" y="${y-85}" class="lane-name">${id}</text><line x1="50" y1="${y+2}" x2="610" y2="${y+2}" class="ground"/>`;
  for(let i=0;i<n;i++)html+=block(x+Math.floor(i/4)*56,y-(i%4)*32);
  const sy=y-16,end=right+v*12;
  for(let tick=0;tick<=10;tick++)html+=`<line x1="${right+tick*12}" y1="${sy+17}" x2="${right+tick*12}" y2="${sy+24}" class="speed-tick"/>`+(tick%5===0?`<text x="${right+tick*12}" y="${sy+46}" text-anchor="middle" class="tick-number">${tick}</text>`:'');
  html+=v>0?`<line x1="${right}" y1="${sy}" x2="${end}" y2="${sy}" class="path" marker-end="url(#move-head)"/>`:`<circle cx="${right+12}" cy="${sy}" r="5" class="speed-zero"/>`;
  html+=`<text x="600" y="${y+65}" text-anchor="end" class="speed-label">${v} m/s</text>`;
  // The visible stack and speed tip stay distinct even when transparent targets overlap.
  const stackWidth=Math.ceil(n/4)*56,stackHeight=Math.min(n,4)*32,hitWidth=Math.max(stackWidth+dragPixels/3,dragPixels),hitHeight=Math.max(stackHeight+dragPixels/3,dragPixels);
  html+=`<rect x="${x-28+(stackWidth-hitWidth)/2}" y="${y-stackHeight+(stackHeight-hitHeight)/2}" width="${hitWidth}" height="${hitHeight}" class="drag-zone" data-drag="mass${id}" tabindex="0" role="slider" aria-label="${id}質量，拖取或回收方塊" aria-valuemin="2" aria-valuemax="20" aria-valuenow="${mass}" aria-valuetext="${mass}公斤"/>`;
  html+=`<line x1="${right}" y1="${sy}" x2="${v>0?end:right+24}" y2="${sy}" class="drag-line" stroke-width="${dragPixels}" data-drag="speed${id}" tabindex="0" role="slider" aria-label="${id}速率" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${v}" aria-valuetext="${v}公尺每秒"/>`;
  meta.rows[id]={x,y,right,sy,end,n,stackHeight};
 }
 return {html,meta};
}

export function comparisonDrop(q){
 if(q.x>=480&&q.x<=624&&q.y>=12&&q.y<=94)return 'supply';
 if(q.x>=45&&q.x<=465){if(q.y>=105&&q.y<=245)return 'A';if(q.y>=275&&q.y<=425)return 'B';}
 return null;
}


