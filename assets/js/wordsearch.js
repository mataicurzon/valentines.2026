// Word Search game: find 8 travel words with simple right/down placement and click-to-select
(function(){
  const WORDS = [
    'AMSTERDAM','TOKYO','OSAKA','QUEENSTOWN','NEWYORK','PARIS'
  ];
  const DISPLAY_MAP = { NEWYORK: 'New York' };
  const ROWS = 12, COLS = 12;
  const STORAGE_KEY = 'ws.state.v2';

  const gridEl = document.getElementById('wsGrid');
  const listEl = document.getElementById('wsList');
  const msgEl = document.getElementById('wsMsg');
  const backBtn = document.getElementById('wsBackBtn');

  let state = loadState() || buildNewState();

  renderGrid();
  buildList();
  markFoundInUI();

  // Click-to-select with prefix tolerance: build a straight horizontal or vertical path
  let selecting = false;
  let path = [];
  let startCell = null;
  let dir = null; // 'H' or 'V'

  function inBounds(r,c){ return r>=0 && r<ROWS && c>=0 && c<COLS; }

  function sameCell(a,b){ return a.r===b.r && a.c===b.c; }

  function addToSelection(r,c){
    const el = gridEl.children[r*COLS + c];
    el.classList.add('selected');
    path.push({r,c});
  }

  gridEl.addEventListener('click', (e) => {
    const target = e.target.closest('.ws-cell');
    if (!target) return;
    const r = +target.dataset.r, c = +target.dataset.c;

    if (!selecting) {
      clearHighlights();
      selecting = true; path = []; dir = null; startCell = {r,c};
      addToSelection(r,c);
      return;
    }

    // prevent reselecting same cell
    if (path.some(cell => cell.r===r && cell.c===c)) return;

    // establish direction on second click
    if (path.length === 1){
      if (r === startCell.r && Math.abs(c - startCell.c) === 1) dir = 'H';
      else if (c === startCell.c && Math.abs(r - startCell.r) === 1) dir = 'V';
      else {
        toast('Select letters in a straight row or column');
        clearHighlights(); selecting=false; path=[]; startCell=null; dir=null; return;
      }
    } else {
      // enforce direction
      if ((dir==='H' && r !== startCell.r) || (dir==='V' && c !== startCell.c)){
        toast('Keep the selection in a straight line');
        clearHighlights(); selecting=false; path=[]; startCell=null; dir=null; return;
      }
      // enforce adjacency forward (right or down only since words are placed that way)
      const last = path[path.length-1];
      if (dir==='H' && !(r===last.r && c===last.c+1)) { toast('Move right to continue the word'); clearHighlights(); selecting=false; path=[]; startCell=null; dir=null; return; }
      if (dir==='V' && !(c===last.c && r===last.r+1)) { toast('Move down to continue the word'); clearHighlights(); selecting=false; path=[]; startCell=null; dir=null; return; }
    }

    addToSelection(r,c);

    // After each addition (length>=2), validate prefix or full match
    if (path.length>=2){
      validateSelection();
    }
  });

  function validateSelection(){
    // candidate words must start at startCell
    const candidates = state.placements.filter(p => sameCell(p.cells[0], startCell));
    if (candidates.length===0){
      toast('No word starts here');
      clearHighlights(); selecting=false; path=[]; startCell=null; dir=null; return;
    }
    // retain those whose first k cells match the current path
    const prefixMatches = candidates.filter(p => path.length <= p.cells.length && path.every((cell,i)=> sameCell(cell, p.cells[i])));
    if (prefixMatches.length === 0){
      toast('Not a word');
      clearHighlights(); selecting=false; path=[]; startCell=null; dir=null; return;
    }
    // If any full match, mark and reset selection
    const full = prefixMatches.find(p => p.cells.length === path.length);
    if (full){
      markFound(full.word, full.cells);
      selecting=false; path=[]; startCell=null; dir=null;
    }
  }

  function tryMatch(cells){
    // Check against placements forward only (we only place right/down)
    for (const p of state.placements){
      if (state.found.includes(p.word)) continue;
      if (equalCells(cells, p.cells)){
        markFound(p.word, p.cells);
        return;
      }
    }
    toast('Not a word');
    clearHighlights();
  }

  function markFound(word, cells){
    // Update UI
    for (const {r,c} of cells){
      const idx = r*COLS + c;
      const el = gridEl.children[idx];
      el.classList.remove('selected');
      el.classList.add('found');
    }
    const li = document.getElementById('li-'+word);
    if (li) li.classList.add('found');

    // Update state and persist
    if (!state.found.includes(word)) state.found.push(word);
    saveState();

    // Win check
    if (state.found.length === WORDS.length){
      msgEl.textContent = 'All words found!';
      markChallengeComplete('wordsearch');
      backBtn.style.display = 'inline-block';
      if (window.confetti) confetti(1600);
    }
  }

  function clearHighlights(){
    for (const child of gridEl.children){ child.classList.remove('selected'); }
  }

  function equalCells(a,b){ if (a.length!==b.length) return false; for (let i=0;i<a.length;i++){ if (a[i].r!==b[i].r||a[i].c!==b[i].c) return false; } return true; }

  function toast(t){ if (window.showToast) showToast(t); else { msgEl.textContent = t; setTimeout(()=>{msgEl.textContent='';}, 900); } }

  function buildNewState(){
    let grid = Array.from({length: ROWS}, () => Array(COLS).fill(''));
    let placements = [];
    // Only right and down directions
    const DIRS = [ {dr:0,dc:1}, {dr:1,dc:0} ];

    // Place longer words first; prefer alternating directions to ensure vertical words
    const toPlace = WORDS.slice().sort((a,b)=> b.length - a.length);
    for (let i=0;i<toPlace.length;i++){
      const raw = toPlace[i];
      const word = raw.replace(/\s/g,'');
      const preferDown = (i % 2 === 0); // alternate: try vertical for some words
      if (!placeWordWithPreference(grid, placements, word, preferDown)){
        // If fails, restart build (should be rare)
        grid = Array.from({length: ROWS}, () => Array(COLS).fill(''));
        placements = [];
        for (let j=0;j<toPlace.length;j++){
          const raw2 = toPlace[j];
          const w2 = raw2.replace(/\s/g,'');
          const prefDown = (j % 2 === 0);
          if (!placeWordWithPreference(grid, placements, w2, prefDown)) break;
        }
        break;
      }
    }
    fillRandom(grid);
    const state = { grid, placements, found: [] };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
    return state;
  }

  function placeWord(grid, placements, word, DIRS){
    const starts = [];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) starts.push({r,c});
    shuffle(starts);
    for (const {r,c} of starts){
      for (const {dr,dc} of DIRS){
        if (canPlace(grid, word, r, c, dr, dc)){
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

  // Prefer placing vertically (down) or horizontally (right) first to ensure variety
  function placeWordWithPreference(grid, placements, word, preferDown){
    const startList = [];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) startList.push({r,c});
    shuffle(startList);
    const down = {dr:1,dc:0}, right = {dr:0,dc:1};
    const dirOrder = preferDown ? [down, right] : [right, down];
    for (const {r,c} of startList){
      for (const d of dirOrder){
        if (canPlace(grid, word, r, c, d.dr, d.dc)){
          const cells = [];
          for (let i=0;i<word.length;i++){
            const rr = r + d.dr*i, cc = c + d.dc*i;
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

  function canPlace(grid, word, r, c, dr, dc){
    for (let i=0;i<word.length;i++){
      const rr = r + dr*i, cc = c + dc*i;
      if (rr<0||rr>=ROWS||cc<0||cc>=COLS) return false;
      const ch = grid[rr][cc];
      if (ch !== '' && ch !== word[i]) return false;
    }
    return true;
  }

  function fillRandom(grid){
    const A=65, Z=90;
    for (let r=0;r<ROWS;r++){
      for (let c=0;c<COLS;c++){
        if (grid[r][c] === ''){
          grid[r][c] = String.fromCharCode(A + Math.floor(Math.random()*(Z-A+1)));
        }
      }
    }
  }

  function renderGrid(){
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    for (let r=0;r<ROWS;r++){
      for (let c=0;c<COLS;c++){
        const d = document.createElement('div');
        d.className = 'ws-cell';
        d.dataset.r = r; d.dataset.c = c;
        d.textContent = state.grid[r][c];
        gridEl.appendChild(d);
      }
    }
  }

  function buildList(){
    listEl.innerHTML = '';
    WORDS.forEach(w => {
      const li = document.createElement('li');
      li.textContent = DISPLAY_MAP[w] || (w[0] + w.slice(1).toLowerCase());
      li.id = 'li-'+w;
      listEl.appendChild(li);
    });
  }

  function markFoundInUI(){
    state.placements.forEach(p => {
      if (state.found.includes(p.word)){
        p.cells.forEach(({r,c})=>{
          const idx = r*COLS + c;
          const el = gridEl.children[idx];
          el.classList.add('found');
        });
        const li = document.getElementById('li-'+p.word);
        if (li) li.classList.add('found');
      }
    });
    if (state.found.length === WORDS.length){
      msgEl.textContent = 'All words found!';
      backBtn.style.display = 'inline-block';
    }
  }

  function loadState(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) { return null; }
  }
  function saveState(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  function shuffle(arr){ for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
})();
