const n = (key, label, unit, min, max, step, value) => ({key,label,unit,min,max,step,value});
const choice = (key,label,options,value) => ({key,label,options,value});
const mass = () => n('m','物體質量','kg',1,20,1,2);
const g = () => n('g','重力加速度','m/s²',.1,100,.01,9.8);
const height = () => n('h','起始高度','m',0,20,.1,2);
const speed = () => n('v','速率','m/s',0,10,.1,2);
const commonEnergy = '補充模型公式：動能 K = ½mv²；重力位能 Ug = mgh；彈力位能 Us = ½kx²。這些公式用來計算畫面中的能量數值。內部保留完整精度，顯示最多2位小數；近零非零量以 <0.01 標示。';
export const groups = [
  {id:'work',label:'功',modes:['work2d']},
  {id:'energy',label:'動能與位能',modes:['compare','fall']},
  {id:'spring',label:'彈簧儲能',modes:['spring']},
  {id:'conserve',label:'能量守恆',modes:['pendulum','damped']},
  {id:'machines',label:'簡單機械',modes:['incline','lever','pulley','wheel']}
];
export const modes = {
  work2d:{title:'功',task:'',hint:'',params:[n('F','施力大小','N',0,100,10,10),choice('direction','施力方向',[['right','向右 →'],['left','向左 ←'],['up','向上 ↑'],['down','向下 ↓']],'right'),choice('axis','位移方向',[['x','左右 ↔'],['y','上下 ↕']],'x'),n('s','位移','m（右／上為正）',-8,8,1,2)],model:''},
  compare:{title:'動能：兩組方塊比較',task:'',hint:'兩組各自堆疊2kg方塊、調整整數速率，同時演示移動。',params:[n('m','A質量','kg',2,20,2,2),n('v','A速率','m/s',0,10,1,2),n('mB','B質量','kg',2,20,2,2),n('vB','B速率','m/s',0,10,1,2)],animate:true,model:''},
  fall:{title:'落下與拋體運動',task:'',hint:'拖曳設定高度，選擇初始速度大小與方向。',params:[mass(),height(),n('v','初始速率','m/s',0,10,1,0),choice('direction','初始速度方向',[['none','無'],['up','向上 ↑'],['down','向下 ↓'],['left','向左 ←'],['right','向右 →']],'none'),g()],animate:true,model:''},
  spring:{title:'彈簧：形變與儲能',task:'相同的壓縮量與拉長量，儲存的能量相同嗎？',hint:'左右拖方箱。放開不自動播放；灰色虛線是彈簧原長位置。',params:[mass(),n('k','彈簧常數（補充）','N/m',10,100,10,50),n('x','初始設定形變','m',-.5,.5,.01,-.2)],animate:true,model:'理想線性、無質量彈簧，水平無摩擦，方箱始終連接彈簧。回復力 F=−kx，朝向原長；x(t)=x₀cos(√(k/m)t)，以解析解維持能量。'+commonEnergy},
  pendulum:{title:'擺錘：力學能守恆',task:'找出動能最大與重力位能最大的擺動位置。',hint:'拖曳擺錘或繩線設定靜止釋放角度；只能沿圓弧移動。',params:[mass(),n('L','擺長','m',.5,2,.1,1.5),n('angle','初始靜止釋放角度','°',-90,90,1,40),g()],animate:true,model:'固定懸點、繩長不變、無阻力；最低點為零位能。h=L(1−cosθ)，θ″=−g/L·sinθ。繩張力沿繩向懸點，與瞬時速度垂直，不作功。採非線性擺模型與小步長RK4；不是全範圍小角近似。'+commonEnergy},
  damped:{title:'擺錘：阻力與熱能',task:'擺幅逐漸縮小，總能量是否也消失了？',hint:'與無阻力擺比較；熱能條累計本次播放中阻力造成的能量轉移。',params:[mass(),n('L','擺長','m',.5,2,.1,1.5),n('angle','初始靜止釋放角度','°',-90,90,1,40),g()],animate:true,model:'阻力模型是補充設定：F阻=−bv，b=0.3kg/s，沿切線反向；熱能變化率=bv²。力學能減少，動能＋位能＋熱能總量維持。張力不作功，圖中不將阻力畫成重力。'+commonEnergy},
  incline:{animate:true,title:'斜面：省力不省功',task:'保持高度相同，增加斜面長度，比較施力與功。',hint:'沿斜面拖箱提升。紅箭頭沿斜面向上，代表等速提升所需施力。',params:[mass(),n('H','斜面高度','m',.5,2,.1,1),n('L','斜面長度','m',1,5,.1,2),n('progress','提升進度','%',0,100,1,0),g()],model:'理想無摩擦、等速提升；0<H≤L。F=mgH/L，施力路程=L×進度，提升高度=H×進度；輸入功=位能增加。斜面變長省力但路程更長。調高度時，長度下限同步調整，調整訊息會顯示。'},
  lever:{title:'槓桿：施力、路程與時間',task:'',hint:'可拖曳物件、施力箭頭與支點；垂直拖動施力箭頭可演示提升。',params:[mass(),n('loadPos','物件位置','m',.2,3.8,.1,.5),n('pivotPos','支點位置','m',.2,3.8,.1,1.5),n('forcePos','施力點位置','m',.2,3.8,.1,3.5),n('progress','提升進度','%',0,100,1,0),g()],animate:true,model:''},
  pulley:{title:'滑輪組：施力、路程與時間',task:'',hint:'拖取滑輪組加入裝置；拖曳紅色施力端提升物件。',params:[mass(),n('count','動滑輪組數','組',0,3,1,0),choice('drive','使用方式',[['normal','拉繩端（省力）'],['single','單一動滑輪'],['reverse','拉滑輪座（省時費力）']],'normal'),n('progress','提升進度','%',0,100,1,0),g()],animate:true,model:''},
  fixed:{title:'定滑輪：改變施力方向',task:'拉繩1公尺，負載上升多少？施力有比較小嗎？',hint:'拖曳右方拉繩把手向下。滑輪中心固定，負載與自由端反向等距移動。',params:[mass(),n('lift','負載提升高度','m',0,2,.1,1),g()],model:'忽略滑輪、繩索重量及摩擦；準靜態提升。F=mg，施力端拉繩距離=提升高度，能改方向、不省力也不省功。'},
  movable:{title:'動滑輪：兩段繩支撐',task:'同樣提升1公尺，為什麼要拉出2公尺的繩？',hint:'拖曳右方拉繩把手向上。左端固定，兩段鉛直繩支撐動滑輪與負載。',params:[mass(),n('lift','負載提升高度','m',0,2,.1,1),g()],model:'單一動滑輪，忽略繩與滑輪重量及摩擦；自由端向上拉，兩支撐段張力相同。F=mg/2，施力端路程=2×提升高度，省力、不省功。'},
  wheel:{title:'輪軸：施力在輪或軸',task:'切換施力位置，觀察施力大小與拉繩路程。',hint:'拖曳右側把手向下，左側負載上升；兩圓同軸同轉角。',params:[mass(),n('R','輪半徑','m',.1,.5,.01,.2),n('r','軸半徑','m',.05,.19,.01,.1),choice('drive','施力位置',[['wheel','在輪上施力（省力）'],['axle','在軸上施力（費力）']],'wheel'),choice('compareMode','比較條件',[['stroke','固定拉繩行程 0–3 m'],['height','固定相同提升高度']],'stroke'),n('targetHeight','固定提升高度','m',.2,3,.1,1),n('stroke','拉繩行程','m',0,3,.05,0),g()],animate:true,model:'R>r>0，同軸兩圓固定連接。施力在輪：F=mg·r/R、路程比=R/r；施力在軸：F=mg·R/r、路程比=r/R。兩端繩皆切線出入，忽略軸承摩擦、重量與慣性，準靜態提升。'}
};
export function defaults(id) {
  return {p:Object.fromEntries(modes[id].params.map(p=>[p.key,p.value])), calculated:false,time:0,pend:null};
}

export const shortNames={work2d:'功',compare:'比較動能',fall:'落下與拋體運動',spring:'彈簧',pendulum:'擺錘（無阻力）',damped:'擺錘（有阻力）',incline:'斜面',lever:'槓桿',pulley:'滑輪組',fixed:'定滑輪',movable:'動滑輪',wheel:'輪軸'};
export const advancedKeys={work2d:[],compare:[],height:['g'],fall:['g'],throw:['g'],spring:['k'],pendulum:['g'],damped:['g'],incline:['m','g'],lever:['m','g'],fixed:['g'],movable:['g'],wheel:['m','g']};

// Quantities controlled directly by the scene, with the same snapping and limits.
export const dragKeys={height:'h',fall:'h',throw:'h',spring:'x',pendulum:'angle',damped:'angle',incline:'progress',lever:'progress',pulley:'progress',fixed:'lift',movable:'lift',wheel:'stroke'};







