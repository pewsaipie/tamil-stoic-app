const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const toast = (message) => { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>el.classList.remove('show'),2600); };

// Section navigation keeps the experience feeling like one calm app without a router dependency.
const labels={home:'Your morning ritual',discover:'Mood-based discovery',library:'Your library',analytics:'Your insights',bridges:'Cross-philosophy bridges',valluvar:'Ask Valluvar'};
function showSection(id){ $$('.page-section').forEach(s=>s.classList.toggle('active-section',s.id===id)); $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.target===id)); $('#page-label').textContent=labels[id]||''; window.scrollTo({top:0,behavior:'smooth'}); }
$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>showSection(btn.dataset.target)));

// Ritual: a four-step daily practice with progress persisted locally.
let ritualStep=Number(localStorage.getItem('tamilStoicRitualStep')||1);
const ritualSteps=[
 {kicker:'01 · ARRIVE',title:'Before the world<br>asks anything of you.',copy:'Let your shoulders soften. Breathe in for four, hold for four, and release for six.',button:"I’m here"},
 {kicker:'02 · RECEIVE',title:'Let a wise voice<br>meet you here.',copy:'Read slowly. Notice the line that catches. There is no need to understand everything at once.',button:'I have read it'},
 {kicker:'03 · REFLECT',title:'What is this asking<br>of you today?',copy:'A small question can change the shape of a day. Name one place where you can practice this wisdom.',button:'I see it'},
 {kicker:'04 · INTEND',title:'Carry one thing<br>into the day.',copy:'Choose your intention: steady, kind, or clear. Return to it whenever the day becomes noisy.',button:'Set my intention'}
];
function renderRitual(){const s=ritualSteps[ritualStep-1]; $('#ritual-step-label').textContent=`${ritualStep} of 4`; $('#ritual-progress-bar').style.width=`${ritualStep*25}%`; $('.step-kicker').textContent=s.kicker; $('.ritual-copy h2').innerHTML=s.title; $('.ritual-copy p').textContent=s.copy; $('#ritual-next').innerHTML=`${s.button} <span>→</span>`; if(ritualStep===4) $('.breath-ring span').textContent='steady';}
$('#ritual-next').addEventListener('click',()=>{if(ritualStep<4){ritualStep++;localStorage.setItem('tamilStoicRitualStep',ritualStep);renderRitual();toast(ritualStep===4?'Your intention is set. Have a gentle day.':'A little deeper.');}else{ritualStep=1;localStorage.setItem('tamilStoicRitualStep',1);renderRitual();toast('Morning ritual complete — see you tomorrow.');}}); renderRitual();

// Save and reflection actions.
let saved=JSON.parse(localStorage.getItem('tamilStoicSaved')||'false');
$('.save-quote').addEventListener('click',e=>{saved=!saved;e.currentTarget.textContent=saved?'♥':'♡';localStorage.setItem('tamilStoicSaved',saved);toast(saved?'Saved to your library.':'Removed from your library.');});
$('.share-quote').addEventListener('click',async()=>{const text='“He who does not chase after pleasure, will not be shaken by the arrival of pain.” — Thirukkural 629'; try{await navigator.clipboard.writeText(text);toast('Quote copied to your clipboard.')}catch{toast('A quiet thought, ready to share.')}});
$('#reflect-button').addEventListener('click',()=>{showSection('home');toast('Take a breath. What would steadiness look like today?');});
$('#quote-detail').addEventListener('click',()=>toast('Context: Thirukkural Book of Virtue, chapter 63 — on freedom from attachment.'));

// Mood discovery maps feelings to reviewed passages (demo catalogue data).
const moodQuotes={restless:['அடக்கம் அமரருள் உய்க்கும் அடங்காமை ஆரிருள் உய்த்து விடும்.','Self-control raises one among the immortals; its absence leads into darkness.','Thirukkural · 121'],heavy:['இடுக்கண் வருங்கால் நகுக அதனை அடுத்தூர்வது அஃதொப்பது இல்.','When adversity arrives, smile; there is nothing like it to overcome it.','Thirukkural · 621'],uncertain:['எண்ணித் துணிக கருமம் துணிந்தபின் எண்ணுவம் என்பது இழுக்கு.','Act after thinking; to think after acting is a mistake.','Thirukkural · 467'],grateful:['உற்றநோய் நோன்றல் உயிர்க்குறுகண் செய்யாமை அற்றே தவத்திற்கு உரு.','To endure pain and cause no pain to living things — this is the shape of true practice.','Thirukkural · 312'],brave:['அஞ்சுவது அஞ்சாமை பேதைமை அஞ்சுவது அஞ்சல் அறிவார் தொழில்.','Not fearing what ought to be feared is foolishness; to fear what is worthy is wisdom.','Thirukkural · 428'],curious:['யாதும் ஊரே யாவரும் கேளிர்.','Every place is my town; everyone is my kin.','Purananuru · 192']};
$$('#mood-grid button').forEach(btn=>btn.addEventListener('click',()=>{ $$('#mood-grid button').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');const [ta,en,src]=moodQuotes[btn.dataset.mood];const r=$('#mood-result');r.classList.remove('hidden');r.innerHTML=`<div><small>${src}</small><p lang="ta">${ta}</p><small>“${en}”</small></div><button class="text-button" onclick="toast('Passage saved for your return.')">Save ♡</button>`;r.scrollIntoView({behavior:'smooth',block:'center'});}));
$$('.tag-list button').forEach(b=>b.addEventListener('click',()=>toast(`Opening ${b.textContent.toLowerCase()} passages…`)));

// Ambient sound: a gentle synthesized rain-like layer, entirely local and stoppable.
let audioCtx, noiseSource, ambientGain;
$('#ambient-toggle').addEventListener('click',()=>{if(noiseSource){noiseSource.stop();noiseSource=null;$('#ambient-toggle').style.color='';toast('Ambient sound off.')}else{audioCtx=new (window.AudioContext||window.webkitAudioContext)();const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.12;noiseSource=audioCtx.createBufferSource();noiseSource.buffer=buffer;noiseSource.loop=true;ambientGain=audioCtx.createGain();ambientGain.gain.value=.035;noiseSource.connect(ambientGain).connect(audioCtx.destination);noiseSource.start();$('#ambient-toggle').style.color='var(--coral)';toast('A soft rain layer is playing.');}});

// Quote canvas: renders a shareable card without uploading user content anywhere.
$('#open-canvas').addEventListener('click',()=>$('#canvas-modal').classList.remove('hidden'));
$('.close-modal').addEventListener('click',()=>$('#canvas-modal').classList.add('hidden'));
$('.modal-backdrop').addEventListener('click',()=>$('#canvas-modal').classList.add('hidden'));
$('#share-canvas').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('இன்பம் விழையான் இடும்பை இயல்பென்பான் — திருக்குறள் 629');toast('Canvas words copied to clipboard.')}catch{toast('Your canvas is ready to share.')}});
$('#download-canvas').addEventListener('click',()=>{const c=document.createElement('canvas');c.width=900;c.height=1100;const x=c.getContext('2d');x.fillStyle='#596e5c';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#dfba76';x.lineWidth=4;x.strokeRect(28,28,c.width-56,c.height-56);x.fillStyle='#e8c376';x.font='38px serif';x.textAlign='center';x.fillText('✦',450,150);x.fillStyle='#f5f1e7';x.font='52px Noto Serif Tamil, serif';x.fillText('இன்பம் விழையான்',450,390);x.fillText('இடும்பை இயல்பென்பான்',450,475);x.font='italic 29px Georgia';x.fillText('He who does not chase after pleasure,',450,620);x.fillText('will not be shaken by pain.',450,665);x.fillStyle='#d0d7cb';x.font='18px Manrope';x.fillText('திருக்குறள் · 629',450,820);x.fillStyle='#dfba76';x.font='24px serif';x.fillText('✦  ◇  ✦  ◇  ✦  ◇  ✦',450,1010);const a=document.createElement('a');a.download='tamil-stoic-629.png';a.href=c.toDataURL('image/png');a.click();toast('Your quote canvas has downloaded.');});

// Ask Valluvar: UI demo intentionally responds only with a source-backed answer.
const answers=[['When uncertainty comes, begin with what is yours to do. “Act after thinking; to think after acting is a mistake.” — Thirukkural 467.','Thirukkural · 467'],['Valluvar returns us to character: “Joy flows from virtue; all else is only praise from without.” — Thirukkural 39.','Thirukkural · 39'],['Release what you cannot hold. “When adversity arrives, smile; there is nothing like it to overcome it.” — Thirukkural 621.','Thirukkural · 621']];let answerIndex=0;
function ask(q){const box=$('#chat-messages');box.insertAdjacentHTML('beforeend',`<div class="chat-message user"><div><p>${q.replace(/[<>]/g,'')}</p></div></div>`);setTimeout(()=>{const a=answers[answerIndex++%answers.length];box.insertAdjacentHTML('beforeend',`<div class="chat-message assistant"><span class="chat-avatar">கு</span><div><p>${a[0]}</p><small>Source-backed answer · ${a[1]}</small></div></div>`);box.scrollTop=box.scrollHeight;},500);}
$('#chat-form').addEventListener('submit',e=>{e.preventDefault();const i=$('#chat-input');if(i.value.trim()){ask(i.value.trim());i.value='';}});$$('.suggestion-row button').forEach(b=>b.addEventListener('click',()=>ask(b.textContent)));

// Physical integration affordances.
$('#download-library').addEventListener('click',()=>{const blob=new Blob(['BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Tamil Stoic morning wisdom\nDESCRIPTION:Read one passage and set one intention.\nRRULE:FREQ=DAILY\nEND:VEVENT\nEND:VCALENDAR'],{type:'text/calendar'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tamil-stoic-ritual.ics';a.click();toast('Calendar ritual downloaded.');});

// Set a human-readable current date while preserving the designed Chennai header tone.
const now=new Date();if(!Number.isNaN(now.getTime()))$('#date-greeting').textContent=now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
