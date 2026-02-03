// Simple swipe basketball game: make 3 shots to win
(function(){
  const canvas = document.getElementById('bbCanvas');
  const ctx = canvas.getContext('2d');
  const msgEl = document.getElementById('bbMsg');
  const backBtn = document.getElementById('bbBackBtn');
  const makesEl = document.getElementById('bbMakes');

  // Canvas sizing
  function resize(){
    const w = Math.min(420, Math.floor(window.innerWidth*0.92));
    const h = Math.min(620, Math.floor(window.innerHeight*0.75));
    canvas.width = w; canvas.height = h;
    layout();
  }
  window.addEventListener('resize', resize);

  // Game state
  let ball = { x: 0, y: 0, r: 14, vx: 0, vy: 0, inAir: false };
  let hoop = { x: 0, y: 0, r: 44, rimW: 6 };// center & radius
  let makes = 0;
  let shotsInARow = 0; // display message text
  let gravity = 980; // px/s^2
  let lastTime = 0;
  let animId = null;

  function layout(){
    // Place hoop near top center
    hoop.x = canvas.width/2;
    hoop.y = Math.max(90, canvas.height*0.22);
    // Place ball at bottom center
    ball.x = canvas.width/2;
    ball.y = canvas.height - 40;
    ball.vx = 0; ball.vy = 0; ball.inAir = false;
  }

  function drawHoop(){
    // Rim
    ctx.strokeStyle = '#c22254';
    ctx.lineWidth = hoop.rimW;
    ctx.beginPath();
    ctx.arc(hoop.x, hoop.y, hoop.r, 0, Math.PI*2);
    ctx.stroke();
    // Backboard (simple rectangle)
    ctx.fillStyle = '#d12c6366';
    const bbW=8, bbH=80;
    ctx.fillRect(hoop.x+hoop.r+6, hoop.y-bbH/2, bbW, bbH);
  }
  function drawBall(){
    ctx.fillStyle = '#ff7e00';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#a24c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r*0.6, 0, Math.PI*2);
    ctx.stroke();
  }

  function update(dt){
    if (ball.inAir){
      ball.vy += gravity*dt;
      ball.x += ball.vx*dt;
      ball.y += ball.vy*dt;
      // collisions with walls
      if (ball.x - ball.r < 0){ ball.x = ball.r; ball.vx = -ball.vx*0.5; }
      if (ball.x + ball.r > canvas.width){ ball.x = canvas.width - ball.r; ball.vx = -ball.vx*0.5; }
      // floor
      if (ball.y + ball.r > canvas.height){
        ball.y = canvas.height - ball.r;
        ball.inAir = false;
        shotsInARow = 0; // missed
      }
      // Detect score: center of ball passes through inner rim area going downward
      const withinX = Math.abs(ball.x - hoop.x) < (hoop.r - ball.r*0.7);
      const crossingY = (ball.y - ball.r) > (hoop.y - hoop.r*0.4) && (ball.y - ball.r) < (hoop.y + hoop.r*0.4);
      if (withinX && crossingY && ball.vy > 0){
        scored();
      }
    }
  }

  function scored(){
    ball.inAir = false;
    makes++;
    shotsInARow++;
    makesEl.textContent = `Makes: ${makes}/3`;
    if (window.playSfx) playSfx('swish');
    msgEl.textContent = shotsInARow>=3 ? 'On fire! 🔥' : 'Nice shot!';
    if (makes >= 3){
      win();
    } else {
      resetBallSoon();
    }
  }

  function resetBallSoon(){
    setTimeout(()=>{
      ball.x = canvas.width/2; ball.y = canvas.height-40; ball.vx=0; ball.vy=0; ball.inAir=false;
    }, 500);
  }

  function win(){
    cancelAnimationFrame(animId);
    msgEl.textContent = 'You did it! 3 baskets!';
    markChallengeComplete('basketball');
    backBtn.style.display = 'inline-block';
    if (window.confetti) confetti(1600);
  }

  function loop(ts){
    const t = ts/1000;
    const dt = lastTime ? Math.min(0.033, t-lastTime) : 0;
    lastTime = t;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawHoop();
    update(dt);
    drawBall();
    animId = requestAnimationFrame(loop);
  }

  // Input handling: swipe/drag to launch
  let startPos = null;
  function pointerDown(x,y){
    if (ball.inAir) return;
    startPos = {x,y,time:performance.now()};
  }
  function pointerUp(x,y){
    if (!startPos) return;
    const dx = x - startPos.x;
    const dy = y - startPos.y;
    const dt = Math.max(16, performance.now() - startPos.time); // ms
    startPos = null;
    if (Math.hypot(dx,dy) < 12) return; // ignore taps
    // Velocity scale factors tuned for mobile-friendly feels
    const vx = dx * 2.2; // px/s approx (we'll normalize by dt)
    const vy = dy * 2.2;
    ball.vx = vx / (dt/1000);
    ball.vy = vy / (dt/1000);
    // invert y so upward swipe gives negative vy
    ball.vy = Math.min(ball.vy, -200); // ensure upward
    // cap speeds
    const maxV = 1200;
    ball.vx = Math.max(-maxV, Math.min(maxV, ball.vx));
    ball.vy = Math.max(-maxV, Math.min(-200, ball.vy));
    ball.inAir = true;
    if (window.playSfx) playSfx('click');
  }

  canvas.addEventListener('mousedown', e=> pointerDown(e.offsetX, e.offsetY));
  canvas.addEventListener('mouseup', e=> pointerUp(e.offsetX, e.offsetY));
  canvas.addEventListener('touchstart', e=>{ const t=e.changedTouches[0]; const rect=canvas.getBoundingClientRect(); pointerDown(t.clientX-rect.left, t.clientY-rect.top); });
  canvas.addEventListener('touchend', e=>{ const t=e.changedTouches[0]; const rect=canvas.getBoundingClientRect(); pointerUp(t.clientX-rect.left, t.clientY-rect.top); });

  // Kickoff
  resize(); layout();
  makesEl.textContent = `Makes: ${makes}/3`;
  requestAnimationFrame(loop);
})();
