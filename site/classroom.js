import {approx,wheelComparison,pendulumEnergy} from './physics.js?v=30';
const button=(action,label)=>`<button type="button" data-lesson="${action}">${label}</button>`;
export function classroomTools(id,s){
 const v=s.view||{},group=(title,html)=>`<div class="lesson-tools"><p>${title}</p><div class="lesson-buttons">${html}</div></div>`;
 if(id==='compare')return group('比較預設',button('mass-double','同速、質量兩倍')+button('speed-double','同質量、速度兩倍'))+group('速率精調（每次 1 m/s）',button('A-minus','A −')+button('A-plus','A ＋')+button('B-minus','B −')+button('B-plus','B ＋'));
 if(id==='fall')return group('觀察尺度（播放中固定）',button('near',`${v.fallScale!=='full'?'● ':''}近距離`)+button('full',`${v.fallScale==='full'?'● ':''}完整高度`)+button('components',`${v.components?'● ':''}速度分量`));
 if(id==='spring')return group('等量比較（沿用初始形變絕對值）',button('set-compress','等量壓縮')+button('set-stretch','等量拉長'))+group('停在關鍵位置',button('spring-natural','原長')+button('spring-compress','最大壓縮')+button('spring-stretch','最大拉長'));
 if(['pendulum','damped'].includes(id))return group('停在關鍵位置',button('pend-left','左端點')+button('pend-bottom','最低點')+button('pend-right','右端點'))+group('觀察選項',button('forces',v.forces===false?'顯示力向量':'隱藏力向量')+button('pair',s.pair?.running?'暫停同條件比較':'演示同條件比較'))+'<p class="lesson-note">比較使用本實驗初始條件，不改另一實驗。</p>';
 return '';
}
export function fairWheelTable(p,calculated){
 const a=wheelComparison({...p,drive:'wheel'}),b=wheelComparison({...p,drive:'axle'});
 const rows=[['施力',a.F,b.F,'N'],['拉繩路程',a.targetStroke,b.targetStroke,'m'],['時間（同速）',a.duration,b.duration,'s'],['全程作功',a.targetWork,b.targetWork,'J']];
 return `<div class="lever-comparison wheel-comparison"><p class="lever-condition">固定同升高 ${approx(a.targetHeight)} m<br>施力端速率同為 0.5 m/s</p><table><thead><tr><th>完成全程</th><th>在輪上施力</th><th>在軸上施力</th></tr></thead><tbody>${rows.map(([label,x,y,u])=>`<tr><th>${label}</th><td>${u==='J'&&!calculated?'—':approx(x)} ${u}</td><td>${u==='J'&&!calculated?'—':approx(y)} ${u}</td></tr>`).join('')}</tbody></table><p class="lever-conclusion">同高度，兩種施力方式作功相同。</p></div>`;
}
export function pairTable(pair){
 if(!pair)return '';
 const a=pendulumEnergy(pair.p,pair.no),b=pendulumEnergy(pair.p,pair.yes);
 return `<div class="pair-comparison"><b>同初始條件 · ${approx(pair.time)} s</b><p>m=${approx(pair.p.m)} kg · L=${approx(pair.p.L)} m · ${approx(pair.p.angle)}° · g=${approx(pair.p.g)}</p><table><tr><th>J</th><th>無阻力</th><th>有阻力</th></tr>${[['力學能',a.K+a.U,b.K+b.U],['累積熱能',0,b.Q],['含熱能總量',a.E,b.E]].map(([label,x,y])=>`<tr><th>${label}</th><td>${approx(x)}</td><td>${approx(y)}</td></tr>`).join('')}</table></div>`;
}
