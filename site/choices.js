// Native phone pickers do not follow CSS rotation. Keep choices inside the app.
const bindings=new Map();let active=null;
const layer=document.createElement('div');layer.className='choice-overlay';layer.hidden=true;layer.id='choice-overlay';
layer.innerHTML='<section class="choice-panel" role="dialog" aria-modal="true" aria-labelledby="choice-title"><div class="choice-heading"><h2 id="choice-title"></h2><button class="choice-close" type="button">關閉</button></div><div class="choice-options"></div></section>';
document.querySelector('main').append(layer);
function close(){const previous=active;active=null;layer.hidden=true;document.body.classList.remove('choice-open');for(const b of bindings.values())b.setAttribute('aria-expanded','false');if(previous){const button=bindings.get(previous);if(button?.isConnected)button.focus({preventScroll:true});}}
function label(select){return select.dataset.choiceLabel||select.getAttribute('aria-label')||'選項';}
function sync(){
 for(const select of document.querySelectorAll('select')){
  let button=bindings.get(select);
  if(!button){
   const sourceLabel=document.querySelector(`label[for="${select.id}"]`);select.dataset.choiceLabel=sourceLabel?.textContent.trim()||select.getAttribute('aria-label')||'選項';
   button=document.createElement('button');button.type='button';button.className='choice-trigger';button.id=select.id+'-choice';button.dataset.choiceFor=select.id;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','choice-overlay');button.setAttribute('aria-expanded','false');button.innerHTML='<span></span>';
   select.classList.add('native-choice');select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.after(button);if(sourceLabel)sourceLabel.htmlFor=button.id;bindings.set(select,button);button.addEventListener('click',()=>open(select));
  }
  const text=select.selectedOptions[0]?.textContent||'選擇';button.querySelector('span').textContent=text;button.setAttribute('aria-label',label(select)+'：'+text);button.disabled=select.disabled;
 }
 for(const [select,button]of bindings)if(!select.isConnected){bindings.delete(select);if(button.isConnected)button.remove();}
 if(active&&!active.isConnected)close();
}
function open(select){
 sync();active=select;const trigger=bindings.get(select);trigger.setAttribute('aria-expanded','true');document.querySelector('#choice-title').textContent='選擇'+label(select);const list=layer.querySelector('.choice-options');list.replaceChildren();
 for(const option of select.options){const button=document.createElement('button');button.type='button';button.className='choice-option';button.dataset.choiceValue=option.value;button.textContent=option.textContent;button.disabled=option.disabled;button.setAttribute('aria-pressed',String(option.selected));button.addEventListener('click',()=>{const target=active;close();target.value=option.value;target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));sync();});list.append(button);}
 layer.hidden=false;document.body.classList.add('choice-open');(list.querySelector('[aria-pressed=true]')||list.querySelector('button')||layer.querySelector('.choice-close')).focus({preventScroll:true});
}
layer.querySelector('.choice-close').addEventListener('click',close);layer.addEventListener('click',e=>{if(e.target===layer)close();});
layer.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
 if(e.key==='Tab'){const items=[...layer.querySelectorAll('button:not(:disabled)')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
document.addEventListener('keydown',e=>{if(!layer.hidden&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}},true);
document.addEventListener('choices-sync',sync);document.addEventListener('change',e=>{if(e.target.matches('select'))sync();});
new MutationObserver(records=>{if(records.some(r=>r.target.nodeType===1&&r.target.matches('select,option,optgroup')||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('select')||n.querySelector('select')))))sync();}).observe(document.querySelector('main'),{subtree:true,childList:true});
sync();
