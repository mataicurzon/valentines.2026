/**
 * ui.js - common UI utilities: confetti, SFX, toast, vibration for valentines site
 */

// Simple toast for brief messages
function showToast(msg, ms=1800) {
  let t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = "position:fixed;bottom:8vh;left:50%;transform:translateX(-50%);background:#fff;border-radius:1em;box-shadow:0 4px 18px #d12c6355;font-family:Poppins,sans-serif;font-size:1.09em;color:#d12c63;padding:0.8em 1.5em;z-index:333;opacity:1;transition:opacity .33s;";
  document.body.appendChild(t);
  setTimeout(()=>t.style.opacity=0.03,ms-400);
  setTimeout(()=>t.remove(),ms);
}

// Tiny dependency-free confetti burst
function confetti(durationMs=2000) {
  // Adapted: just floats emoji for now, will improve for real animation
  let emojis = ["💖","💕","🎉","✨","💝","🎀"];
  let b = document.body;
  for (let i=0; i<22; i++) {
    let s = document.createElement("span");
    s.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    s.style.cssText = `position:fixed;left:${Math.random()*98}vw;top:-2.1em;font-size:${1.4+Math.random()*1.8}em;pointer-events:none;z-index:310;animation:fall${i} ${1+Math.random()*1.15}s linear forwards;`
      +`@keyframes fall${i}{100%{top:93vh;opacity:0.6;transform:rotate(${Math.random()*167-83}deg);}}`;
    b.appendChild(s);
    setTimeout(()=>s.remove(),1500+Math.random()*800);
  }
}

// Mobile vibration
function vibrateLight(ms=32) {
  if (window.navigator && window.navigator.vibrate) { window.navigator.vibrate(ms); }
}

// Sound effects (swish, click, win); muted by default
let sfxMuted = true;
function playSfx(name) {
  if (sfxMuted) return;
  let path = 'assets/sounds/' + name + '.mp3';
  let a = new Audio(path);
  a.volume = 0.27;
  a.play();
}
function toggleMute(b) {
  sfxMuted = typeof b === 'boolean' ? b : !sfxMuted;
  showToast('Sounds ' + (sfxMuted ? 'muted':'on'));
}
