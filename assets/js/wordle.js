// Simple Wordle clone for target word "stink"
(function(){
  const TARGET = "stink"; // lowercase
  const ROWS = 6, COLS = 5;
  const gridEl = document.getElementById('wordleGrid');
  const kbEl = document.getElementById('wordleKeyboard');
  const msgEl = document.getElementById('wordleMsg');
  const backBtn = document.getElementById('wordleBackBtn');

  let row = 0, col = 0;
  const board = Array.from({length: ROWS}, () => Array(COLS).fill(''));
  const statuses = Array.from({length: ROWS}, () => Array(COLS).fill(''));
  let gameOver = false;

  function initGrid(){
    gridEl.innerHTML = '';
    for (let r=0;r<ROWS;r++){
      const rowEl = document.createElement('div');
      rowEl.className = 'w-row';
      for (let c=0;c<COLS;c++){
        const cell = document.createElement('div');
        cell.className = 'w-cell';
        cell.id = `cell-${r}-${c}`;
        rowEl.appendChild(cell);
      }
      gridEl.appendChild(rowEl);
    }
  }

  function render(){
    for (let r=0;r<ROWS;r++){
      for (let c=0;c<COLS;c++){
        const ch = board[r][c] || '';
        const el = document.getElementById(`cell-${r}-${c}`);
        el.textContent = ch.toUpperCase();
        el.setAttribute('data-state', statuses[r][c] || '');
      }
    }
  }

  // Virtual keyboard like iOS: 3 rows, Enter/Del enlarged, staggered key row
  const KB_ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','DEL']
  ];
  function initKeyboard(){
    kbEl.innerHTML = '';
    KB_ROWS.forEach((row, i) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'w-kb-row';
      if(i===1) rowDiv.style.marginLeft = '18px'; // iOS keyboard staggered effect
      row.forEach(k => {
        const b = document.createElement('button');
        b.className = 'w-key' + ((k === 'ENTER' || k === 'DEL') ? ' big' : '');
        b.textContent = (k === 'DEL') ? '⌫' : (k === 'ENTER' ? '↵' : k);
        b.dataset.key = k;
        b.onclick = () => handleKey(k);
        rowDiv.appendChild(b);
      });
      kbEl.appendChild(rowDiv);
    });
  }

  function handleKey(k){
    if (gameOver) return;
    if (k === 'ENTER') return submitRow();
    if (k === 'DEL') return backspace();
    if (/^[A-Z]$/.test(k)) {
      if (col < COLS){
        board[row][col] = k.toLowerCase();
        col++;
        render();
      }
    }
  }
  function backspace(){
    if (col>0){
      col--; board[row][col] = ''; render();
    }
  }

  function scoreGuess(guess){
    const res = Array(COLS).fill('absent');
    const targetArr = TARGET.split('');
    // greens
    for (let i=0;i<COLS;i++){
      if (guess[i] === TARGET[i]){
        res[i] = 'correct';
        targetArr[i] = null; // consume
      }
    }
    // yellows
    for (let i=0;i<COLS;i++){
      if (res[i] === 'correct') continue;
      const idx = targetArr.indexOf(guess[i]);
      if (idx !== -1){
        res[i] = 'present';
        targetArr[idx] = null;
      }
    }
    return res;
  }

  function submitRow(){
    if (col < COLS) return toast('Not enough letters');
    const guess = board[row].join('');
    const res = scoreGuess(guess);
    statuses[row] = res;
    render();
    if (guess === TARGET){
      win();
      return;
    }
    row++; col = 0;
    if (row >= ROWS){
      gameOver = true;
      msgEl.textContent = `The word was "${TARGET.toUpperCase()}"`;
      backBtn.style.display = 'inline-block';
    }
  }

  function win(){
    gameOver = true;
    msgEl.textContent = 'You did it!';
    markChallengeComplete('wordle');
    backBtn.style.display = 'inline-block';
  }

  function toast(t){
    if (window.showToast) showToast(t); else { msgEl.textContent = t; setTimeout(()=>{msgEl.textContent='';}, 1200); }
  }

  // Keyboard events
  document.addEventListener('keydown', (e)=>{
    let k = e.key;
    if (k === 'Backspace') k = 'DEL';
    if (k === 'Enter') k = 'ENTER';
    if (/^[a-zA-Z]$/.test(k)) k = k.toUpperCase();
    if (k === 'DEL' || k==='ENTER' || /^[A-Z]$/.test(k)) handleKey(k);
  });

  // Init
  initGrid();
  initKeyboard();
  render();
})();
