// Improved swipe basketball: nicer visuals, realistic gravity arc, air drag, single score per flight
(function(){
  const canvas = document.getElementById('bbCanvas');
  const ctx = canvas.getContext('2d');
  const msgEl = document.getElementById('bbMsg');
  const backBtn = document.getElementById('bbBackBtn');
  const makesEl = document.getElementById('bbMakes');

  // Canvas sizing responsive
  function resize(){
    const w = Math.min(420, Math.floor(window.innerWidth*0.92));
    const h = Math.min(640, Math.floor(window.innerHeight*0.78));
    canvas.width = w; canvas.height = h;
    layout();
  }
  window.addEventListener('resize', resize);

  // Game state
  let ball = { x: 0, y: 0, r: 14, vx: 0, vy: 0, inAir: false };
  let hoop = { x: 0, y: 0, r: 44, rimW: 6 };// center & radius
  let makes = 0;
  let gravity = 1200; // px/s^2 a bit stronger for snappier arc
  let airDrag = 0.35; // per-second fractional damping
  let lastTime = 0;
  let animId = null;
  let scoredThisFlight = false;
  // Arcade effects
  let netSwish = 0;      // 0..1 swish animation intensity
  let ledFlashT = 0;     // seconds of LED flash effect
  let netSwayA = 0;      // 0..1 net side-to-side sway amplitude
  let netSwayPhase = 0;  // radians advancing over time

  // (Reverted) No external textures; keep procedural only

  function layout(){
    // Center the hoop horizontally
    hoop.x = canvas.width/2;
    hoop.y = Math.max(100, canvas.height*0.22);
    resetBall();
  }

  function resetBall(){
    ball.x = canvas.width/2 - 40;
    ball.y = canvas.height - 36;
    ball.vx = 0; ball.vy = 0; ball.inAir = false;
    scoredThisFlight = false;
  }

  function drawCourt(){
    // 1) Lighter arcade tunnel background (glass feel)
    const bg = ctx.createLinearGradient(0,0,0,canvas.height);
    bg.addColorStop(0,'#e8eef8');
    bg.addColorStop(1,'#b9c7e3');
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // 2) Red mesh side panels (trapezoids with criss-cross lines)
    const railTopY = canvas.height*0.26;
    const railTopInset = 28;
    const leftPoly = [
      {x:10,y:canvas.height},
      {x:10,y:railTopY+10},
      {x:railTopInset,y:railTopY},
      {x:railTopInset,y:canvas.height}
    ];
    const rightPoly = [
      {x:canvas.width-10,y:canvas.height},
      {x:canvas.width-10,y:railTopY+10},
      {x:canvas.width-railTopInset,y:railTopY},
      {x:canvas.width-railTopInset,y:canvas.height}
    ];
    function fillPanel(poly){
      const grad = ctx.createLinearGradient(0,railTopY,0,canvas.height);
      grad.addColorStop(0,'#ff4a3a');
      grad.addColorStop(1,'#b10014');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(poly[0].x,poly[0].y);
      for (let i=1;i<poly.length;i++) ctx.lineTo(poly[i].x,poly[i].y);
      ctx.closePath(); ctx.fill();
      // border
      ctx.strokeStyle = '#8c0010'; ctx.lineWidth = 2; ctx.stroke();
      // mesh
      ctx.save();
      ctx.clip();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      // diagonal one way
      for (let x=-canvas.height; x<canvas.width; x+=12){
        ctx.beginPath();
        ctx.moveTo(x, canvas.height);
        ctx.lineTo(x+200, railTopY-60);
        ctx.stroke();
      }
      // diagonal the other way
      ctx.strokeStyle = 'rgba(170,0,0,0.45)';
      for (let x=-canvas.height; x<canvas.width; x+=12){
        ctx.beginPath();
        ctx.moveTo(x, railTopY-60);
        ctx.lineTo(x+200, canvas.height);
        ctx.stroke();
      }
      ctx.restore();
    }
    fillPanel(leftPoly);
    fillPanel(rightPoly);

    // 3) Wood floor ramp with perspective
    drawWoodRamp();

    // 4) Marquee + LED + Score
    const marqueeH = 36;
    const marqueeGrad = ctx.createLinearGradient(0,0,canvas.width,0);
    marqueeGrad.addColorStop(0,'#ff2d7a');
    marqueeGrad.addColorStop(1,'#1ec5ff');
    ctx.fillStyle = marqueeGrad;
    const marqueeX = canvas.width*0.15;
    ctx.fillRect(marqueeX, 8, canvas.width*0.7, marqueeH);

    // LED strip along marquee (bottom edge)
    drawLedStrip(marqueeX+6, 8+marqueeH-6, canvas.width*0.7-12, 6);
    // Neon scoreboard (top-right)
    drawScoreboard(makes);

    // 5) Soft vignette to focus hoop
    drawVignette();
  }

  function drawHoop(){
    // Backboard glass
    const bbW = 140, bbH = 90;
    const bbX = hoop.x - bbW/2, bbY = hoop.y - bbH/2 - 14;
    const glass = ctx.createLinearGradient(0, bbY, 0, bbY+bbH);
    glass.addColorStop(0,'#ffffffcc');
    glass.addColorStop(1,'#d9e7ff77');
    ctx.fillStyle = glass;
    ctx.strokeStyle = '#8fd1ff';
    ctx.lineWidth = 3;
    ctx.fillRect(bbX, bbY, bbW, bbH);
    ctx.strokeRect(bbX, bbY, bbW, bbH);

    // Glass reflections (two diagonal soft bands)
    const band = ctx.createLinearGradient(bbX, bbY, bbX+bbW, bbY+bbH);
    band.addColorStop(0.15,'rgba(255,255,255,0.18)');
    band.addColorStop(0.3,'rgba(255,255,255,0.04)');
    band.addColorStop(0.55,'rgba(255,255,255,0.12)');
    band.addColorStop(0.7,'rgba(255,255,255,0.02)');
    ctx.fillStyle = band;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); ctx.moveTo(bbX+8, bbY+10); ctx.lineTo(bbX+bbW*0.55, bbY+bbH*0.15); ctx.lineTo(bbX+bbW*0.35, bbY+bbH*0.55); ctx.lineTo(bbX+3, bbY+bbH*0.45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bbX+bbW*0.55, bbY+bbH*0.35); ctx.lineTo(bbX+bbW-8, bbY+bbH*0.5); ctx.lineTo(bbX+bbW-18, bbY+bbH-10); ctx.lineTo(bbX+bbW*0.45, bbY+bbH*0.75); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Small bolt dots
    ctx.fillStyle = '#b7d9ff';
    const bolts = [
      [bbX+10, bbY+10], [bbX+bbW-12, bbY+10], [bbX+10, bbY+bbH-12], [bbX+bbW-12, bbY+bbH-12]
    ];
    for (const [bx,by] of bolts){ ctx.beginPath(); ctx.arc(bx,by,1.8,0,Math.PI*2); ctx.fill(); }

    // Backboard inner square (red like arcade photos)
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 2;
    const sqW = 40, sqH = 30;
    ctx.strokeRect(hoop.x - sqW/2, bbY + 18, sqW, sqH);

    // Rim bracket
    ctx.fillStyle = '#c22254';
    ctx.fillRect(hoop.x - 10, hoop.y - 6, 20, 12);

    // Rim as single ellipse (simple 3D look)
    const rx = hoop.r + 6, ry = hoop.r * 0.55;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ff6a00';
    ctx.beginPath();
    ctx.ellipse(hoop.x, hoop.y, rx, ry, 0, 0, Math.PI*2);
    ctx.stroke();

    // Net mesh with swish animation (simple anchored to a ring just below rim)
    ctx.strokeStyle = '#ffe7f6';
    ctx.lineWidth = 1.8;
    const netTop = hoop.y + ry*0.3;
    const baseBottom = hoop.y + ry + 26;
    const animDrop = 14 * Math.max(0, netSwish); // drop more on swish
    const netBottom = baseBottom + animDrop;
    for (let i=-5;i<=5;i++){
      ctx.beginPath();
      const topX = hoop.x + i* (rx/6);
      // add gentle sway that increases toward the bottom
      const tStrand = Math.abs(i)/5; // outer strands sway a bit more
      const sway = Math.sin(netSwayPhase + i*0.35) * netSwayA * (4 + 2*tStrand);
      const botX = hoop.x + i* (rx/10) + sway;
      ctx.moveTo(topX, netTop);
      ctx.lineTo(botX, netBottom);
      ctx.stroke();
    }
    // Horizontal mesh lines end at the slanted side strings
    const leftTopX = hoop.x - rx, leftBotX = hoop.x - rx*0.6;
    const rightTopX = hoop.x + rx, rightBotX = hoop.x + rx*0.6;
    for (let j=0;j<=3;j++){
      const y = netTop + j * ((netBottom-netTop)/4);
      const t = (y - netTop) / (netBottom - netTop);
      const xL = leftTopX*(1-t) + leftBotX*t;
      const xR = rightTopX*(1-t) + rightBotX*t;
      ctx.beginPath();
      ctx.moveTo(xL, y);
      ctx.lineTo(xR, y);
      ctx.stroke();
    }

    // (single ellipse rim already drawn above)
  }

  function drawBall(){
    // Shadow
    const shadowY = Math.min(canvas.height-25, ball.y + ball.r + 10);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(ball.x, shadowY, ball.r*0.9, ball.r*0.4, 0, 0, Math.PI*2);
    ctx.fill();

    // Ball body with radial gradient (simple, vibrant)
    const grad = ctx.createRadialGradient(ball.x - ball.r*0.5, ball.y - ball.r*0.6, ball.r*0.1, ball.x, ball.y, ball.r);
    grad.addColorStop(0, '#ffb347');
    grad.addColorStop(1, '#e65c00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(ball.x - ball.r*0.35, ball.y - ball.r*0.45, ball.r*0.45, ball.r*0.32, -0.6, 0, Math.PI*2);
    ctx.fill();

    // Seams (simple pattern, slightly thicker for cartoon look)
    ctx.strokeStyle = '#8b3c00';
    ctx.lineWidth = 2.2;
    // Vertical seam
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r*0.85, -Math.PI/2, Math.PI/2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r*0.85, Math.PI/2, 3*Math.PI/2);
    ctx.stroke();
    // Horizontal seam
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r*0.85, 0, Math.PI);
    ctx.stroke();
  }

  function update(dt){
    // decay effects
    if (netSwish > 0) netSwish = Math.max(0, netSwish - dt*3);
    if (ledFlashT > 0) ledFlashT = Math.max(0, ledFlashT - dt);
    if (netSwayA > 0) netSwayA = Math.max(0, netSwayA - dt*0.85);
    netSwayPhase += dt*8;

    if (ball.inAir){
      // gravity
      ball.vy += gravity*dt;
      // simple air drag
      const damp = Math.max(0, 1 - airDrag*dt);
      ball.vx *= damp;
      ball.vy *= damp;
      // integrate
      ball.x += ball.vx*dt;
      ball.y += ball.vy*dt;

      // walls
      if (ball.x - ball.r < 0){ ball.x = ball.r; ball.vx = -ball.vx*0.5; }
      if (ball.x + ball.r > canvas.width){ ball.x = canvas.width - ball.r; ball.vx = -ball.vx*0.5; }
      // floor
      if (ball.y + ball.r > canvas.height-20){ // floor at -20
        ball.y = canvas.height-20 - ball.r;
        // end of flight - keep ball where it lands (no auto reset)
        ball.inAir = false; scoredThisFlight = false; // ready for next shot
        msgEl.textContent = '';
      }

      // score detection once per flight: inside inner rim and going down
      if (!scoredThisFlight && ball.vy > 0){
        const inner = hoop.r - ball.r*0.75;
        const withinX = Math.abs(ball.x - hoop.x) < inner;
        const justBelowRimTop = (ball.y - ball.r) > (hoop.y - hoop.r*0.25);
        const aboveBottomNet = (ball.y + ball.r) < (hoop.y + hoop.r*0.9);
        if (withinX && justBelowRimTop && aboveBottomNet){
          scoredThisFlight = true;
          onScore();
        }
      }
    }
  }

  function onScore(){
    makes++;
    makesEl.textContent = `Makes: ${makes}/3`;
    if (window.playSfx) playSfx('swish');
    msgEl.textContent = makes >= 3 ? 'Great job! 🎉' : 'Nice shot!';
    // trigger effects
    netSwish = 1;
    ledFlashT = 1.2;
    netSwayA = 1.0;
    if (makes >= 3){
      win();
    }
  }

  function win(){
    cancelAnimationFrame(animId);
    markChallengeComplete('basketball');
    msgEl.textContent = 'You did it! 3 baskets!';
    backBtn.style.display = 'inline-block';
    if (window.confetti) confetti(1600);
  }

  function loop(ts){
    const t = ts/1000;
    const dt = lastTime ? Math.min(0.033, t-lastTime) : 0;
    lastTime = t;
    drawCourt();
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
    const dtms = Math.max(16, performance.now() - startPos.time); // ms
    startPos = null;
    const dist = Math.hypot(dx,dy);
    if (dist < 10) return; // ignore taps

    // Velocity mapping: swipe speed and direction. Upward swipe => negative vy
    const speed = Math.min(1400, (dist / dtms) * 2400); // px/s cap
    const angle = Math.atan2(dy, dx); // screen y down
    // Force angle upwards between -100deg to -40deg if user mostly swipes up
    let theta = angle;
    if (Math.sin(angle) < 0){ // some upward component
      theta = Math.max(-Math.PI*5/9, Math.min(-Math.PI*2/9, angle));
    }
    ball.vx = Math.cos(theta) * speed;
    ball.vy = Math.sin(theta) * speed;
    // Ensure upward initial vy
    if (ball.vy > -200) ball.vy = -200;
    // Clamp components
    const maxV = 1600;
    ball.vx = Math.max(-maxV, Math.min(maxV, ball.vx));
    ball.vy = Math.max(-maxV, Math.min(-200, ball.vy));
    ball.inAir = true;
    scoredThisFlight = false;
    if (window.playSfx) playSfx('click');
  }

  canvas.addEventListener('mousedown', e=> pointerDown(e.offsetX, e.offsetY));
  canvas.addEventListener('mouseup', e=> pointerUp(e.offsetX, e.offsetY));
  // On mobile, prevent viewport scrolling while interacting
  canvas.addEventListener('touchstart', e=>{
    e.preventDefault();
    const t=e.changedTouches[0]; const rect=canvas.getBoundingClientRect(); pointerDown(t.clientX-rect.left, t.clientY-rect.top);
  }, {passive:false});
  canvas.addEventListener('touchend', e=>{
    e.preventDefault();
    const t=e.changedTouches[0]; const rect=canvas.getBoundingClientRect(); pointerUp(t.clientX-rect.left, t.clientY-rect.top);
  }, {passive:false});
  canvas.addEventListener('touchmove', e=>{
    // Prevent scroll and rubber-banding during drags
    e.preventDefault();
  }, {passive:false});

  // LED utilities
  function drawLedStrip(x, y, w, h){
    const now = performance.now()/1000;
    const n = Math.floor(w/10);
    for (let i=0;i<n;i++){
      const cx = x + i*10 + 5;
      const phase = (i%4)/4;
      const pulse = (Math.sin((now*6)+phase*2*Math.PI) + 1)/2;
      const flash = ledFlashT>0 ? 0.6 : 0;
      const a = 0.25 + 0.5*pulse + flash;
      ctx.fillStyle = `rgba(255,105,180,${Math.min(1,a)})`;
      ctx.beginPath();
      ctx.arc(cx, y+h/2, h*0.35, 0, Math.PI*2);
      ctx.fill();
    }
  }
  function drawSevenSegmentColor(x, y, s, digit, color){
    const map = {
      '0':[1,1,1,1,1,1,0], '1':[0,1,1,0,0,0,0], '2':[1,1,0,1,1,0,1], '3':[1,1,1,1,0,0,1],
      '4':[0,1,1,0,0,1,1], '5':[1,0,1,1,0,1,1], '6':[1,0,1,1,1,1,1], '7':[1,1,1,0,0,0,0],
      '8':[1,1,1,1,1,1,1], '9':[1,1,1,1,0,1,1]
    };
    const seg = map[digit]||[0,0,0,0,0,0,0];
    ctx.strokeStyle = color || 'rgba(110,255,90,0.95)';
    ctx.lineWidth = s*0.18;
    ctx.shadowColor = color || 'rgba(110,255,90,0.85)';
    ctx.shadowBlur = 8;
    function hseg(cx, cy){ ctx.beginPath(); ctx.moveTo(cx-s*0.4, cy); ctx.lineTo(cx+s*0.4, cy); ctx.stroke(); }
    function vseg(cx, cy){ ctx.beginPath(); ctx.moveTo(cx, cy-s*0.45); ctx.lineTo(cx, cy+s*0.45); ctx.stroke(); }
    if(seg[0]) hseg(x, y-s*0.9);   // a
    if(seg[1]) vseg(x+s*0.5, y-s*0.45); // b
    if(seg[2]) vseg(x+s*0.5, y+s*0.45); // c
    if(seg[3]) hseg(x, y+s*0.9);   // d
    if(seg[4]) vseg(x-s*0.5, y+s*0.45); // e
    if(seg[5]) vseg(x-s*0.5, y-s*0.45); // f
    if(seg[6]) hseg(x, y);         // g
    ctx.shadowBlur = 0;
  }
  function drawScoreboard(score){
    // Panel dimensions (centered at top)
    const pad = 8;
    const w = Math.max(84, canvas.width*0.26);
    const h = 44;
    const x = Math.round((canvas.width - w) / 2);
    const y = pad;
    // Panel background with dark frame
    const bg = ctx.createLinearGradient(0,y,0,y+h);
    bg.addColorStop(0,'#0a0a12');
    bg.addColorStop(1,'#101626');
    ctx.fillStyle = bg;
    roundRect(x,y,w,h,8,true,false);
    // Neon border
    ctx.strokeStyle = 'rgba(110,255,90,0.9)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(110,255,90,0.8)';
    ctx.shadowBlur = 12;
    roundRect(x+1,y+1,w-2,h-2,7,false,true);
    ctx.shadowBlur = 0;
    // Label
    ctx.fillStyle = '#8fffb0';
    ctx.font = 'bold 10px Poppins, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCORE', x + w/2, y+14);
    // Digits centered in panel
    const text = String(score);
    const s = 12; // scale per digit
    const total = text.length * (s*1.2);
    let cx = x + (w/2) - (total/2) + s*0.6;
    for (const ch of text){
      drawSevenSegmentColor(cx, y + h/2 + 4, s, ch, 'rgba(110,255,90,0.95)');
      cx += s*1.2;
    }
  }
  function roundRect(x, y, w, h, r, fill, stroke){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
  // Vertical LED strip helper
  function drawLedStripV(x, y, h, w){
    const now = performance.now()/1000;
    const n = Math.floor(h/10);
    for (let i=0;i<n;i++){
      const cy = y + i*10 + 5;
      const phase = (i%4)/4;
      const pulse = (Math.sin((now*6)+phase*2*Math.PI) + 1)/2;
      const flash = ledFlashT>0 ? 0.6 : 0;
      const a = 0.25 + 0.5*pulse + flash;
      ctx.fillStyle = `rgba(255,105,180,${Math.min(1,a)})`;
      ctx.beginPath();
      ctx.arc(x, cy, w*0.35, 0, Math.PI*2);
      ctx.fill();
    }
  }
  function drawSevenSegment(x, y, s, digit){
    // segments: a,b,c,d,e,f,g
    const map = {
      '0':[1,1,1,1,1,1,0], '1':[0,1,1,0,0,0,0], '2':[1,1,0,1,1,0,1], '3':[1,1,1,1,0,0,1],
      '4':[0,1,1,0,0,1,1], '5':[1,0,1,1,0,1,1], '6':[1,0,1,1,1,1,1], '7':[1,1,1,0,0,0,0],
      '8':[1,1,1,1,1,1,1], '9':[1,1,1,1,0,1,1]
    };
    const seg = map[digit]||[0,0,0,0,0,0,0];
    ctx.strokeStyle = 'rgba(255,0,70,0.9)';
    ctx.lineWidth = s*0.18;
    ctx.shadowColor = 'rgba(255,0,70,0.8)';
    ctx.shadowBlur = 8;
    function hseg(cx, cy){ ctx.beginPath(); ctx.moveTo(cx-s*0.4, cy); ctx.lineTo(cx+s*0.4, cy); ctx.stroke(); }
    function vseg(cx, cy){ ctx.beginPath(); ctx.moveTo(cx, cy-s*0.45); ctx.lineTo(cx, cy+s*0.45); ctx.stroke(); }
    if(seg[0]) hseg(x, y-s*0.9);   // a
    if(seg[1]) vseg(x+s*0.5, y-s*0.45); // b
    if(seg[2]) vseg(x+s*0.5, y+s*0.45); // c
    if(seg[3]) hseg(x, y+s*0.9);   // d
    if(seg[4]) vseg(x-s*0.5, y+s*0.45); // e
    if(seg[5]) vseg(x-s*0.5, y-s*0.45); // f
    if(seg[6]) hseg(x, y);         // g
    ctx.shadowBlur = 0;
  }
  function drawLedScore(cx, cy, text){
    // Draw text like "2/3" using 7-seg digits and a slash
    const s = 12; // scale
    let x = cx - (text.length* (s*1.2))/2 + s*0.6;
    for (const ch of text){
      if (/\d/.test(ch)){
        drawSevenSegment(x, cy, s, ch);
        x += s*1.2;
      } else if (ch === '/'){
        ctx.strokeStyle = 'rgba(255,0,70,0.9)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255,0,70,0.8)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(x-4, cy+8);
        ctx.lineTo(x+4, cy-8);
        ctx.stroke();
        ctx.shadowBlur = 0;
        x += s*0.9;
      } else {
        x += s*0.8;
      }
    }
  }

  // Wood ramp: trapezoid with plank seams converging toward hoop
  function drawWoodRamp(){
    const topY = Math.min(canvas.height*0.5, hoop.y + 38);
    const bottomY = canvas.height - 10;
    const topW = Math.max(120, canvas.width*0.36);
    const bottomW = canvas.width - 36;
    const cx = canvas.width/2;

    const tl = {x: cx - topW/2, y: topY};
    const tr = {x: cx + topW/2, y: topY};
    const bl = {x: cx - bottomW/2, y: bottomY};
    const br = {x: cx + bottomW/2, y: bottomY};

    // Fill base wood gradient
    const wood = ctx.createLinearGradient(0, topY, 0, bottomY);
    wood.addColorStop(0, '#c49a6c');
    wood.addColorStop(1, '#a57a4a');
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    // Plank seams (perspective lines)
    const planks = 9;
    ctx.strokeStyle = 'rgba(60,30,10,0.22)';
    ctx.lineWidth = 1;
    for (let i=1;i<planks;i++){
      const t = i/planks;
      const sx = bl.x + (br.x - bl.x)*t;
      const ex = tl.x + (tr.x - tl.x)*t;
      ctx.beginPath();
      ctx.moveTo(sx, bottomY);
      ctx.lineTo(ex, topY);
      ctx.stroke();
    }

    // Subtle cross grain lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.2;
    for (let i=0;i<3;i++){
      const y = topY + (i+1) * ((bottomY-topY)/4);
      ctx.beginPath(); ctx.moveTo(tl.x+6, y); ctx.lineTo(tr.x-6, y); ctx.stroke();
    }

    // Glossy highlight
    const gloss = ctx.createLinearGradient(0, topY, 0, topY+60);
    gloss.addColorStop(0, 'rgba(255,255,255,0.25)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(tr.x-6, tr.y+22);
    ctx.lineTo(tl.x+6, tr.y+22);
    ctx.closePath();
    ctx.fill();
  }

  function drawVignette(){
    const g = ctx.createRadialGradient(canvas.width/2, canvas.height*0.45, Math.min(canvas.width,canvas.height)*0.35,
                                       canvas.width/2, canvas.height*0.5, Math.max(canvas.width,canvas.height)*0.65);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  // Kickoff
  resize();
  makesEl.textContent = `Makes: ${makes}/3`;
  requestAnimationFrame(loop);
})();
