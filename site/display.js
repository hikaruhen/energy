const root=document.documentElement, body=document.body;
const rotate=document.querySelector('#rotate-screen'), full=document.querySelector('#fullscreen');
const notice=document.querySelector('#display-notice');
let turned=false,timer;
function say(message){notice.textContent=message;notice.hidden=false;clearTimeout(timer);timer=setTimeout(()=>notice.hidden=true,4500);}
function layout(){
 const w=window.innerWidth,h=window.innerHeight;
 // A physical landscape viewport needs no additional CSS rotation.
 const rotated=turned&&h>w;
 body.classList.toggle('screen-turned',rotated);
 body.classList.toggle('landscape-wide',(rotated?h:w)>=800);
 body.classList.toggle('compact-landscape',(rotated?w:h)<=600&&(rotated?h:w)>(rotated?w:h));
 root.style.setProperty('--screen-w',`${w}px`);root.style.setProperty('--screen-h',`${h}px`);
 rotate.textContent=turned?'還原方向':'橫向';rotate.setAttribute('aria-pressed',String(turned));
 const active=!!(document.fullscreenElement||document.webkitFullscreenElement);
 full.textContent=active?'離開全螢幕':'全螢幕';full.setAttribute('aria-pressed',String(active));
}
rotate.addEventListener('click',()=>{turned=!turned;layout();});
full.addEventListener('click',async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else if(document.webkitFullscreenElement)document.webkitExitFullscreen();
  else if(root.requestFullscreen)await root.requestFullscreen();
  else if(root.webkitRequestFullscreen)root.webkitRequestFullscreen();
  else {say('此瀏覽器不支援全螢幕，可使用「橫向」放大操作畫面。');return;}
 }catch{say('未能進入全螢幕，可使用「橫向」或手機的螢幕旋轉。');}
 layout();
});
window.addEventListener('resize',layout);document.addEventListener('fullscreenchange',layout);document.addEventListener('webkitfullscreenchange',layout);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&turned){turned=false;layout();}});
layout();
