// Word Search game: find 8 travel words
(function(){
  const WORDS = [
    'AMSTERDAM','TOKYO','OSAKA','AUCKLAND','QUEENSTOWN','VANCOUVER','NEWYORK','PARIS'
  ];
  // Represent NEW YORK without space in grid; show with space in list label
  const DISPLAY_MAP = { NEWYORK: 'New York' };
  const ROWS = 14, COLS = 14;

  const gridEl = document.getElementById('wsGrid');
  const listEl = document.getElementById('wsList');
  const msgEl = document.getElementById('wsMsg');
  const backBtn = document.getElementById('wsBackBtn');

  let grid = Array.from({length: ROWS}, () => Array(COLS).fill(''));
  let placements = []; // {word, cells:[{r,c}]}
  let found = new Set();

  function shuffle(arr){ for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

  const DIRS = [
    {dr:0, dc:1}, {dr:0, dc:-1}, {dr:1, dc:0}, {dr:-1, dc:0},
    {dr:1, dc:1}, {dr:1, dc:-1}, {dr:-1, dc:1}, {dr:-1, dc:-1}
  ];

  function canPlace(word, r, c, dr, dc){
    for (let i=0;i<word.length;i++){
      const rr = r + dr*i, cc = c + dc*i;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) return false;
      const ch = grid[rr][cc];
      if (ch !== '' && ch !== word[i]) return false;
    }
    return true;
  }

  function placeWord(word){
    const starts = [];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) starts.push({r,c});
    shuffle(starts); const dirs = shuffle(DIRS.slice());
    for (const {r,c} of starts){
      for (const {dr,dc} of dirs){
        if (canPlace(word, r, c, dr, dc)){
          const cells = [];
          for (let i=0;i<word.length;i++){
            const rr = r + dr*i, cc = c + dc*i;
            grid[rr][cc] = word[i];
            cells.push({r:rr,c:cc});
          }
          placements.push({word, cells});
          return true;
        }
      }
    }
    return false;
  }

  function fillRandom(){
    const A=65, Z=90;
    for (let r=0;r<ROWS;r++){
      for (let c=0;c<COLS;c++){
        if (grid[r][c] === ''){
          grid[r][c] = String.fromCharCode(A + Math.floor(Math.random()*(Z-A+1)));
        }
      }
    }
  }

  function buildList(){
    WORDS.forEach(w => {
      const li = document.createElement('li');
      li.textContent = DISPLAY_MAP[w] || (w[0] + w.slice(1).toLowerCase());
      li.id = 'li-'+w;
      listEl.appendChild(li);
    });
  }

  function renderGrid(){
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    for (let r=0;r<ROWS;r++){
      for (let c=0;c<COLS;c++){
        const d = document.createElement('div');
        d.className = 'ws-cell';
        d.dataset.r = r; d.dataset.c = c;
        d.textContent = grid[r][c];
        gridEl.appendChild(d);
      }
    }
  }

  // Selection logic: drag from start to end; check if straight-line matches a placement
  let dragging = false; let start = null; let selCells = [];
  function cellFromEvent(e){
    const target = e.target.closest('.ws-cell');
    if (!target) return null;
    return { r: +target.dataset.r, c: +target.dataset.c, el: target };
  }
  function clearSel(){ selCells.forEach(el=>el.classList.remove('selected')); selCells=[]; }

  function onDown(e){
    const info = cellFromEvent(e); if (!info) return;
    dragging = true; start = {r:info.r,c:info.c}; clearSel(); info.el.classList.add('selected'); selCells.push(info.el);
  }
  function onMove(e){ if (!dragging) return; const info = cellFromEvent(e); if (!info) return; }
  function onUp(e){
    if (!dragging) return; dragging=false;
    const endInfo = cellFromEvent(e); if (!endInfo) { clearSel(); return; }
    const end = {r:endInfo.r, c:endInfo.c};
    const dr = Math.sign(end.r - start.r), dc = Math.sign(end.c - start.c);
    const len = Math.max(Math.abs(end.r-start.r), Math.abs(end.c-start.c)) + 1;
    if (dr===0 && dc===0){ clearSel(); return; }
    // Build the path and string
    const cells=[]; let r=start.r, c=start.c; let str='';
    for (let i=0;i<len;i++){ cells.push({r,c}); str += grid[r][c]; r+=dr; c+=dc; }
    // Check against placements (forward or reversed)
    for (const p of placements){
      if (found.has(p.word)) continue;
      const forward = p.cells;
      const backward = [...p.cells].reverse();
      const matchForward = equalCells(cells, forward);
      const matchBackward = equalCells(cells, backward);
      if (matchForward || matchBackward){
        markFound(p.word, cells);
        clearSel();
        return;
      }
    }
    // No match
    msgEl.textContent = 'Not a word path';
    clearSel();
    setTimeout(()=> msgEl.textContent='', 900);
  }
  function equalCells(a,b){ if (a.length!==b.length) return false; for (let i=0;i<a.length;i++){ if (a[i].r!==b[i].r||a[i].c!==b[i].c) return false; } return true; }

  function markFound(word, cells){
    found.add(word);
    cells.forEach(({r,c})=>{
      const idx = r*COLS + c;
      const el = gridEl.children[idx];
      el.classList.remove('selected');
      el.classList.add('found');
    });
    const li = document.getElementById('li-'+word);
    if (li) li.classList.add('found');
    if (window.vibrateLight) vibrateLight();
    if (found.size === WORDS.length){ win(); }
  }

  function win(){
    msgEl.textContent = 'All words found!';
    markChallengeComplete('wordsearch');
    backBtn.style.display = 'inline-block';
    if (window.confetti) confetti(1600);
  }

  // Build puzzle
  function build(){
    // place longer words first to increase success
    const toPlace = WORDS.slice().sort((a,b)=> b.length-a.length);
    for (const raw of toPlace){
      const word = raw.replace(/\s/g,'');
      if (!placeWord(word)) {
        // If failed, reset and try again (simple fallback)
        grid = Array.from({length: ROWS}, () => Array(COLS).fill(''));
        placements = []; found.clear();
        return build();
      }
    }
    fillRandom();
    renderGrid();
    buildList();
  }

  gridEl.addEventListener('mousedown', onDown);
  gridEl.addEventListener('mousemove', onMove);
  gridEl.addEventListener('mouseup', onUp);
  gridEl.addEventListener('touchstart', (e)=>{ const t=e.changedTouches[0]; const el=document.elementFromPoint(t.clientX,t.clientY); if (el) onDown({target:el}); });
  gridEl.addEventListener('touchend', (e)=>{ const t=e.changedTouches[0]; const el=document.elementFromPoint(t.clientX,t.clientY); if (el) onUp({target:el}); });

  build();
})();
