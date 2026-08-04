/**
 * NEON XO - Tic-Tac-Toe Javascript Logic
 * Framework-free, responsive, modular implementation.
 */

// Game Constants
const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

const PLAYER_X = 'X';
const PLAYER_O = 'O';

// State Variables
let boardState = Array(9).fill(null);
let currentPlayer = PLAYER_X;
let gameActive = true;
let gameMode = 'pvc'; // 'pvp' or 'pvc'
let aiDifficulty = 'hard'; // 'easy', 'medium', 'hard'
let scoreState = {
  xWins: 0,
  oWins: 0,
  draws: 0
};
let moveHistory = []; // Stores state snapshots for undo: { boardState: Array, currentPlayer: String }
let soundEnabled = true;

// DOM Elements
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('game-status');
const modeSelect = document.getElementById('mode-select');
const difficultySelect = document.getElementById('difficulty-select');
const difficultyGroup = document.getElementById('difficulty-group');
const scoreXElement = document.getElementById('score-x');
const scoreOElement = document.getElementById('score-o');
const scoreDrawsElement = document.getElementById('score-draws');
const scoreCardX = document.getElementById('score-card-x');
const scoreCardO = document.getElementById('score-card-o');
const labelO = document.getElementById('label-o');
const btnUndo = document.getElementById('btn-undo');
const btnRestart = document.getElementById('btn-restart');
const btnResetScore = document.getElementById('btn-reset-score');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const soundIconPath = document.getElementById('sound-icon-path');
const themeIconPath = document.getElementById('theme-icon-path');
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');

// --- SOUND EFFECTS (Web Audio API) ---
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'move') {
      // Short click/sweep sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(currentPlayer === PLAYER_X ? 350 : 280, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'click') {
      // Standard button click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'win') {
      // Triad Arpeggio: major happy chord
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        const noteOsc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();
        noteOsc.connect(noteGain);
        noteGain.connect(audioCtx.destination);
        
        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
        noteGain.gain.setValueAtTime(0.12, now + idx * 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);
        
        noteOsc.start(now + idx * 0.1);
        noteOsc.stop(now + idx * 0.1 + 0.25);
      });
    } else if (type === 'draw') {
      // Descending sigh sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.4);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    console.warn('Audio play block or unsupported browser:', e);
  }
}

// --- CONFETTI ANIMATION (Vanilla Canvas) ---
let confettiParticles = [];
let confettiAnimationId = null;

class ConfettiParticle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height - canvas.height;
    this.size = Math.random() * 8 + 4;
    this.speedY = Math.random() * 4 + 2;
    this.speedX = Math.random() * 4 - 2;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 4 - 2;
    // Neon palette colors
    const colors = ['#00f2fe', '#a100ff', '#ff007f', '#00ff66', '#ffff00'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.rotation += this.rotationSpeed;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function startConfetti() {
  resizeCanvas();
  confettiParticles = [];
  for (let i = 0; i < 120; i++) {
    confettiParticles.push(new ConfettiParticle());
  }
  
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
  }
  animateConfetti();
  
  // Stop spawning and clear canvas after 4 seconds
  setTimeout(() => {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 4000);
}

function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let active = false;
  confettiParticles.forEach((particle) => {
    particle.update();
    particle.draw();
    if (particle.y < canvas.height) {
      active = true;
    }
  });
  if (active) {
    confettiAnimationId = requestAnimationFrame(animateConfetti);
  }
}

// Window resize listener for confetti
window.addEventListener('resize', () => {
  if (confettiAnimationId) {
    resizeCanvas();
  }
});


// --- LOCAL STORAGE SCORE MANAGEMENT ---
function loadScores() {
  const saved = localStorage.getItem(`neon_xo_scores_${gameMode}`);
  if (saved) {
    scoreState = JSON.parse(saved);
  } else {
    scoreState = { xWins: 0, oWins: 0, draws: 0 };
  }
  updateScoreboardUI();
}

function saveScores() {
  localStorage.setItem(`neon_xo_scores_${gameMode}`, JSON.stringify(scoreState));
  updateScoreboardUI();
}

function updateScoreboardUI() {
  scoreXElement.textContent = scoreState.xWins;
  scoreOElement.textContent = scoreState.oWins;
  scoreDrawsElement.textContent = scoreState.draws;
}


// --- CORE GAME ACTIONS & RENDER ---
function handleCellClick(e) {
  const cell = e.target;
  const index = parseInt(cell.dataset.index);

  if (boardState[index] !== null || !gameActive) return;

  // Don't allow click if computer is thinking
  if (gameMode === 'pvc' && currentPlayer === PLAYER_O) return;

  makeMove(index);

  // If game is still active in PvC mode, trigger Computer AI
  if (gameActive && gameMode === 'pvc' && currentPlayer === PLAYER_O) {
    disablePlayerInteraction(true);
    statusText.textContent = "AI is thinking...";
    statusText.classList.add('pulse-status');
    
    // Slight humanized delay for computer move
    setTimeout(() => {
      const computerMove = getComputerMove();
      makeMove(computerMove);
      disablePlayerInteraction(false);
      statusText.classList.remove('pulse-status');
    }, 600);
  }
}

function makeMove(index) {
  // Push state snapshot to history (only for Undo availability)
  saveHistoryState();

  boardState[index] = currentPlayer;
  renderCell(index);
  playSound('move');

  const winData = checkWin(boardState, currentPlayer);

  if (winData) {
    handleWin(winData);
  } else if (checkDraw(boardState)) {
    handleDraw();
  } else {
    // Alternate turn
    currentPlayer = currentPlayer === PLAYER_X ? PLAYER_O : PLAYER_X;
    updateStatusMessage();
    updateActiveTurnCard();
    
    // Enable undo button only in PvP and if there is history
    updateUndoButtonState();
  }
}

function renderCell(index) {
  const cell = cells[index];
  cell.disabled = true;
  
  if (boardState[index] === PLAYER_X) {
    cell.innerHTML = `
      <svg class="symbol-x" viewBox="0 0 100 100">
        <path d="M20,20 L80,80 M80,20 L20,80" stroke-dasharray="200" stroke-dashoffset="200" />
      </svg>
    `;
  } else if (boardState[index] === PLAYER_O) {
    cell.innerHTML = `
      <svg class="symbol-o" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="30" stroke-dasharray="200" stroke-dashoffset="200" />
      </svg>
    `;
  } else {
    cell.innerHTML = '';
    cell.disabled = false;
  }
}

function updateStatusMessage() {
  if (gameMode === 'pvp') {
    statusText.textContent = `Player ${currentPlayer}'s Turn`;
  } else {
    statusText.textContent = currentPlayer === PLAYER_X ? "Your Turn (X)" : "AI's Turn (O)";
  }
}

function updateActiveTurnCard() {
  if (currentPlayer === PLAYER_X) {
    scoreCardX.classList.add('active-turn');
    scoreCardO.classList.remove('active-turn');
  } else {
    scoreCardO.classList.add('active-turn');
    scoreCardX.classList.remove('active-turn');
  }
}

function disablePlayerInteraction(disable) {
  cells.forEach((cell, idx) => {
    if (boardState[idx] === null) {
      cell.disabled = disable;
    }
  });
}

function checkWin(board, player) {
  for (let i = 0; i < WIN_PATTERNS.length; i++) {
    const [a, b, c] = WIN_PATTERNS[i];
    if (board[a] === player && board[b] === player && board[c] === player) {
      return { pattern: WIN_PATTERNS[i], player };
    }
  }
  return null;
}

function checkDraw(board) {
  return board.every(cell => cell !== null);
}

function handleWin(winData) {
  gameActive = false;
  playSound('win');
  startConfetti();

  // Glow winning combination
  const glowClass = winData.player === PLAYER_X ? 'winning-cell' : 'winning-cell-o';
  winData.pattern.forEach(index => {
    cells[index].classList.add(glowClass);
  });

  // Update score
  if (winData.player === PLAYER_X) {
    scoreState.xWins++;
    statusText.textContent = gameMode === 'pvc' ? "You Won! 🎉" : "Player X Wins! 🎉";
  } else {
    scoreState.oWins++;
    statusText.textContent = gameMode === 'pvc' ? "AI Wins! 🤖" : "Player O Wins! 🎉";
  }
  saveScores();

  // Disable board
  disablePlayerInteraction(true);
  btnUndo.disabled = true;
  scoreCardX.classList.remove('active-turn');
  scoreCardO.classList.remove('active-turn');
}

function handleDraw() {
  gameActive = false;
  playSound('draw');
  
  scoreState.draws++;
  saveScores();

  statusText.textContent = "It's a Draw! 🤝";
  
  disablePlayerInteraction(true);
  btnUndo.disabled = true;
  scoreCardX.classList.remove('active-turn');
  scoreCardO.classList.remove('active-turn');
}

// --- UNDO HISTORY LOGIC (PvP Only) ---
function saveHistoryState() {
  moveHistory.push({
    boardState: [...boardState],
    currentPlayer: currentPlayer
  });
}

function undoMove() {
  if (gameMode !== 'pvp' || moveHistory.length === 0 || !gameActive) return;
  
  playSound('click');
  const prevState = moveHistory.pop();
  boardState = prevState.boardState;
  currentPlayer = prevState.currentPlayer;
  
  // Re-render all cells
  boardState.forEach((val, idx) => {
    renderCell(idx);
    cells[idx].classList.remove('winning-cell', 'winning-cell-o');
  });
  
  updateStatusMessage();
  updateActiveTurnCard();
  updateUndoButtonState();
}

function updateUndoButtonState() {
  // Undo is only permitted in Player vs Player, and if there are moves in history, and during active play
  if (gameMode === 'pvp' && moveHistory.length > 0 && gameActive) {
    btnUndo.disabled = false;
  } else {
    btnUndo.disabled = true;
  }
}

// --- RESET AND RESTART CONTROLS ---
function restartMatch() {
  playSound('click');
  boardState = Array(9).fill(null);
  currentPlayer = PLAYER_X;
  gameActive = true;
  moveHistory = [];
  
  cells.forEach((cell, idx) => {
    renderCell(idx);
    cell.classList.remove('winning-cell', 'winning-cell-o');
  });

  updateStatusMessage();
  updateActiveTurnCard();
  updateUndoButtonState();
}

function resetScores() {
  playSound('click');
  if (confirm("Are you sure you want to reset all scores for this mode?")) {
    scoreState = { xWins: 0, oWins: 0, draws: 0 };
    saveScores();
    restartMatch();
  }
}


// --- COMPUTER AI MOTIONS ---
function getComputerMove() {
  if (aiDifficulty === 'easy') {
    return getRandomMove();
  } else if (aiDifficulty === 'medium') {
    return getMediumMove();
  } else {
    return getBestMove(); // Hard (Minimax)
  }
}

// 1. Easy Mode: Completely Random
function getRandomMove() {
  const availableMoves = getAvailableMoves(boardState);
  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

// 2. Medium Mode: Defensive blocks + offensive setups, otherwise random
function getMediumMove() {
  // Option A: Can AI win in this turn?
  for (let i = 0; i < WIN_PATTERNS.length; i++) {
    const [a, b, c] = WIN_PATTERNS[i];
    if (boardState[a] === PLAYER_O && boardState[b] === PLAYER_O && boardState[c] === null) return c;
    if (boardState[a] === PLAYER_O && boardState[c] === PLAYER_O && boardState[b] === null) return b;
    if (boardState[b] === PLAYER_O && boardState[c] === PLAYER_O && boardState[a] === null) return a;
  }

  // Option B: Block opponent winning moves
  for (let i = 0; i < WIN_PATTERNS.length; i++) {
    const [a, b, c] = WIN_PATTERNS[i];
    if (boardState[a] === PLAYER_X && boardState[b] === PLAYER_X && boardState[c] === null) return c;
    if (boardState[a] === PLAYER_X && boardState[c] === PLAYER_X && boardState[b] === null) return b;
    if (boardState[b] === PLAYER_X && boardState[c] === PLAYER_X && boardState[a] === null) return a;
  }

  // Option C: Claim center if open
  if (boardState[4] === null) return 4;

  // Option D: Claim random corner
  const corners = [0, 2, 6, 8].filter(idx => boardState[idx] === null);
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // Fallback: Random move
  return getRandomMove();
}

// 3. Hard Mode: Unbeatable Minimax Algorithm
function getBestMove() {
  let bestVal = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (boardState[i] === null) {
      boardState[i] = PLAYER_O;
      let moveVal = minimax(boardState, 0, false);
      boardState[i] = null;

      if (moveVal > bestVal) {
        bestVal = moveVal;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

function minimax(board, depth, isMax) {
  // Terminal evaluation
  const winInfoX = checkWin(board, PLAYER_X);
  if (winInfoX) return -10 + depth; // Minimize, human wins, add depth to prefer longer games if human plays perfectly

  const winInfoO = checkWin(board, PLAYER_O);
  if (winInfoO) return 10 - depth; // Maximize, computer wins, subtract depth to favor faster wins

  if (checkDraw(board)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = PLAYER_O;
        best = Math.max(best, minimax(board, depth + 1, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = PLAYER_X;
        best = Math.min(best, minimax(board, depth + 1, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function getAvailableMoves(board) {
  const moves = [];
  board.forEach((val, idx) => {
    if (val === null) moves.push(idx);
  });
  return moves;
}


// --- THEME TOGGLE (Dark / Light) ---
function initTheme() {
  const savedTheme = localStorage.getItem('neon_xo_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  playSound('click');
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('neon_xo_theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    // Moon outline / half filled icon
    themeIconPath.setAttribute('d', 'M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z');
  } else {
    // Sun icon
    themeIconPath.setAttribute('d', 'M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2A1,1 0 0,1 13,3V5A1,1 0 0,1 11,5V3A1,1 0 0,1 12,2M12,19A1,1 0 0,1 13,20V22A1,1 0 0,1 11,22V20A1,1 0 0,1 12,19M22,12A1,1 0 0,1 21,13H19A1,1 0 0,1 19,11H21A1,1 0 0,1 22,12M5,12A1,1 0 0,1 4,13H2A1,1 0 0,1 2,11H4A1,1 0 0,1 5,12M18.36,5.64A1,1 0 0,1 18.36,7.05L16.95,8.46A1,1 0 0,1 15.54,7.05L16.95,5.64A1,1 0 0,1 18.36,5.64M5.64,18.36A1,1 0 0,1 5.64,16.95L7.05,15.54A1,1 0 0,1 8.46,16.95L7.05,18.36A1,1 0 0,1 5.64,18.36M18.36,18.36A1,1 0 0,1 16.95,18.36L15.54,16.95A1,1 0 0,1 16.95,15.54L18.36,16.95A1,1 0 0,1 18.36,18.36M5.64,5.64A1,1 0 0,1 7.05,5.64L8.46,7.05A1,1 0 0,1 7.05,8.46L5.64,7.05A1,1 0 0,1 5.64,5.64Z');
  }
}


// --- SOUND TOGGLE ---
function initSound() {
  const savedSound = localStorage.getItem('neon_xo_sound');
  soundEnabled = savedSound !== 'false'; // defaults to true
  updateSoundIcon();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('neon_xo_sound', soundEnabled);
  updateSoundIcon();
  if (soundEnabled) {
    playSound('click');
  }
}

function updateSoundIcon() {
  if (soundEnabled) {
    // Sound High Speaker icon
    soundIconPath.setAttribute('d', 'M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18.01,19.86 21,16.28 21,12C21,7.72 18.01,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.77 16.5,12M3,9V15H7L12,20V4L7,9H3Z');
  } else {
    // Sound Off / Mute icon
    soundIconPath.setAttribute('d', 'M12,4L9.91,6.09L12,8.18M19,12C19,11.3 18.9,10.63 18.71,10L20.82,7.89C21.57,9.15 22,10.53 22,12C22,16.28 19,19.86 15,20.77V18.71C17.89,17.85 20,15.17 20,12M3,2.27L21.73,21L20.46,22.27L14.79,16.6C13.91,17.15 12.98,17.57 12,17.78V15.71C12.39,15.63 12.77,15.5 13.13,15.34L8.71,10.92L7,12H3V6H3.82L1.39,3.56M12,2.27V9.78L8.73,6.5L12,3.25V2.27M16.5,12C16.5,11.53 16.39,11.08 16.2,10.68L17.85,9.03C18.26,9.9 18.5,10.9 18.5,12C18.5,13.77 17.5,15.29 16,16V13.92C16.3,13.4 16.5,12.73 16.5,12Z');
  }
}


// --- CONFIGURATION HANDLERS ---
function handleModeChange() {
  playSound('click');
  gameMode = modeSelect.value;
  
  if (gameMode === 'pvp') {
    difficultyGroup.style.display = 'none';
    labelO.textContent = 'Player O';
  } else {
    difficultyGroup.style.display = 'flex';
    labelO.textContent = 'AI (O)';
  }
  
  loadScores();
  restartMatch();
}

function handleDifficultyChange() {
  playSound('click');
  aiDifficulty = difficultySelect.value;
  restartMatch();
}


// --- INITIALIZATION ---
function init() {
  // Theme & Sound Setup
  initTheme();
  initSound();
  
  // Game Setup
  gameMode = modeSelect.value;
  aiDifficulty = difficultySelect.value;
  loadScores();
  restartMatch();
  
  // Event Listeners
  cells.forEach(cell => cell.addEventListener('click', handleCellClick));
  modeSelect.addEventListener('change', handleModeChange);
  difficultySelect.addEventListener('change', handleDifficultyChange);
  btnUndo.addEventListener('click', undoMove);
  btnRestart.addEventListener('click', restartMatch);
  btnResetScore.addEventListener('click', resetScores);
  btnThemeToggle.addEventListener('click', toggleTheme);
  btnSoundToggle.addEventListener('click', toggleSound);
}

// Run main script on DOM load
document.addEventListener('DOMContentLoaded', init);
