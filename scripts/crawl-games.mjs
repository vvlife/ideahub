import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORE_PATH = join(__dirname, '..', '.data', 'store.json')

// ── 精选 HTML5 游戏源 ─────────────────────────────────────────
// 这些是公开可访问的 HTML5 小游戏 URL，可直接抓取
const GAME_URLS = [
  // Hextris - 开源俄罗斯方块变体
  'https://hextris.io/',
  // 2048 - 经典
  'https://play2048.co/',
  // Tetris (开源版)
  'https://chvin.github.io/react-tetris/',
  // A-Maze - 迷宫游戏
  'https://www.jqueryscript.net/demo/html5-canvas-maze-game/',
]

// ── 内置经典游戏（自包含 HTML） ───────────────────────────────
// 这些是经过精心编写的自包含 HTML5 游戏，无需外部资源
const BUILTIN_GAMES = [
  {
    name: '井字棋',
    tagline: '经典三连棋游戏，人机对战',
    url: null,
    html: `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>井字棋</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;user-select:none}.title{font-size:28px;font-weight:800;margin-bottom:4px;background:linear-gradient(90deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.subtitle{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:16px}.status{font-size:16px;margin-bottom:12px;min-height:24px}.status .turn{font-weight:700}.status .x{color:#60a5fa}.status .o{color:#f472b6}.board{display:grid;grid-template-columns:repeat(3,80px);gap:8px;margin-bottom:16px}.cell{width:80px;height:80px;border-radius:12px;background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:700;transition:all .2s}.cell:hover:not(.taken){background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2)}.cell.x{color:#60a5fa}.cell.o{color:#f472b6}.cell.taken{cursor:default}.cell.winning{animation:winPulse .5s ease infinite alternate}@keyframes winPulse{from{background:rgba(34,197,94,.2)}to{background:rgba(34,197,94,.4)}}.scores{display:flex;gap:12px;margin-bottom:16px}.score{background:rgba(255,255,255,.05);padding:6px 16px;border-radius:10px;text-align:center}.score .label{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase}.score .val{font-size:20px;font-weight:700}.score.x .val{color:#60a5fa}.score.o .val{color:#f472b6}.score.draw .val{color:rgba(255,255,255,.6)}button{padding:8px 24px;border-radius:10px;border:none;background:linear-gradient(90deg,#60a5fa,#a78bfa);color:#fff;font-weight:600;font-size:14px;cursor:pointer;transition:.2s}button:hover{opacity:.9}button:active{transform:scale(.95)}.mode-toggle{display:flex;gap:1px;background:rgba(255,255,255,.05);border-radius:10px;padding:1px;margin-bottom:12px}.mode-toggle button{background:transparent;padding:6px 16px;font-size:12px;font-weight:500;border-radius:9px}.mode-toggle button.active{background:rgba(255,255,255,.1)}footer{margin-top:20px;font-size:10px;color:rgba(255,255,255,.2)}</style></head><body><div class="title">⭕ 井字棋</div><div class="subtitle" id="subtitle">人机对战</div><div class="mode-toggle"><button id="modeAi" class="active" onclick="setMode('ai')">vs AI</button><button id="mode2p" onclick="setMode('2p')">双人</button></div><div class="scores"><div class="score x"><div class="label">X 胜</div><div class="val" id="scoreX">0</div></div><div class="score draw"><div class="label">平局</div><div class="val" id="scoreD">0</div></div><div class="score o"><div class="label">O 胜</div><div class="val" id="scoreO">0</div></div></div><div class="status" id="status"><span class="turn x">X</span> 的回合</div><div class="board" id="board"></div><button onclick="reset()">🔄 重新开始</button><footer>点击格子下棋 · 三连即胜</footer><script>let board,currentPlayer,gameOver,mode='ai',scores={X:0,O:0,D:0};const WIN_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];function init(){board=Array(9).fill('');currentPlayer='X';gameOver=false;render()}function render(){const el=document.getElementById('board');el.innerHTML='';board.forEach((v,i)=>{const c=document.createElement('div');c.className='cell'+(v?' ' +v+' taken':'');c.textContent=v;c.onclick=()=>play(i);el.appendChild(c)})}function play(i){if(board[i]||gameOver)return;if(mode==='ai'&&currentPlayer==='O')return;board[i]=currentPlayer;render();if(checkWin()){endGame(currentPlayer);return}if(board.every(c=>c)){endGame(null);return}currentPlayer=currentPlayer==='X'?'O':'X';updateStatus();if(mode==='ai'&&!gameOver&&currentPlayer==='O'){setTimeout(aiMove,500)}}function aiMove(){const best=minimax(board,'O');if(best.index!==undefined){board[best.index]='O';render();if(checkWin()){endGame('O');return}if(board.every(c=>c)){endGame(null);return}currentPlayer='X';updateStatus()}}function minimax(b,player){const avail=b.map((v,i)=>v===''?i:null).filter(v=>v!==null);if(checkWinFor(b,'X'))return{score:-10};if(checkWinFor(b,'O'))return{score:10};if(avail.length===0)return{score:0};const moves=[];for(const i of avail){b[i]=player;const result=minimax(b,player==='O'?'X':'O');moves.push({index:i,score:result.score});b[i]=''}if(player==='O'){let best=moves[0];for(const m of moves)if(m.score>best.score)best=m;return best}else{let best=moves[0];for(const m of moves)if(m.score<best.score)best=m;return best}}function checkWin(){return WIN_LINES.some(line=>{const[a,b,c]=line;return board[a]&&board[a]===board[b]&&board[a]===board[c]})}function checkWinFor(b,p){return WIN_LINES.some(line=>{const[a,b,c]=line;return b[a]===p&&b[b]===p&&b[c]===p})}function getWinLine(){return WIN_LINES.find(line=>{const[a,b,c]=line;return board[a]&&board[a]===board[b]&&board[a]===board[c]})}function endGame(winner){gameOver=true;const line=getWinLine();if(line){line.forEach(i=>{const cells=document.querySelectorAll('.cell');cells[i].classList.add('winning')})}if(winner){scores[winner]++;document.getElementById('status').innerHTML='<span class="'+winner.toLowerCase()+'">'+winner+'</span> 获胜! 🎉'}else{scores.D++;document.getElementById('status').textContent='平局! 🤝'}updateScores()}function updateStatus(){document.getElementById('status').innerHTML='<span class="turn '+currentPlayer.toLowerCase()+'">'+currentPlayer+'</span> 的回合'}function updateScores(){document.getElementById('scoreX').textContent=scores.X;document.getElementById('scoreO').textContent=scores.O;document.getElementById('scoreD').textContent=scores.D}function reset(){init();updateStatus()}function setMode(m){mode=m;document.getElementById('modeAi').classList.toggle('active',m==='ai');document.getElementById('mode2p').classList.toggle('active',m==='2p');document.getElementById('subtitle').textContent=m==='ai'?'人机对战':'双人对战';reset()}init()</script></body></html>`
  },
  {
    name: '打地鼠',
    tagline: '经典打地鼠游戏，30秒挑战',
    url: null,
    html: `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>打地鼠</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:linear-gradient(180deg,#1a472a,#0d2818);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;user-select:none;touch-action:none}.title{font-size:24px;font-weight:800;margin-bottom:4px;color:#86efac}.subtitle{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:12px}.stats{display:flex;gap:8px;margin-bottom:16px}.stat{background:rgba(255,255,255,.08);padding:6px 14px;border-radius:10px;text-align:center}.stat .label{font-size:9px;color:rgba(255,255,255,.4);text-transform:uppercase}.stat .val{font-size:18px;font-weight:700;color:#86efac}.grid{display:grid;grid-template-columns:repeat(3,80px);gap:12px;margin-bottom:16px}.hole{width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,#3a2a1a 0%,#1a0f08 70%);border:3px solid rgba(0,0,0,.3);position:relative;overflow:hidden;cursor:pointer}.mole{position:absolute;bottom:-80px;left:50%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;background:radial-gradient(circle,#a16207 0%,#78350f 100%);transition:bottom .15s ease;display:flex;align-items:center;justify-content:center;font-size:30px}.mole.up{bottom:10px}.mole.hit{animation:hitAnim .3s ease forwards}@keyframes hitAnim{0%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.2) rotate(10deg)}100%{transform:translateX(-50%) scale(0) rotate(180deg);bottom:-80px}}.start-screen,.end-screen{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;z-index:100}.start-screen.hide,.end-screen.hide{display:none}.start-screen h2,.end-screen h2{font-size:28px;color:#86efac}.start-screen p,.end-screen p{font-size:14px;color:rgba(255,255,255,.6);text-align:center}.btn{padding:12px 32px;border-radius:12px;border:none;background:linear-gradient(90deg,#22c55e,#16a34a);color:#fff;font-weight:700;font-size:16px;cursor:pointer;transition:.2s}.btn:hover{opacity:.9}.btn:active{transform:scale(.95)}.final-score{font-size:36px;font-weight:800;color:#fbbf24}.combo-display{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:48px;font-weight:800;color:#fbbf24;text-shadow:0 0 20px rgba(251,191,36,.5);pointer-events:none;opacity:0;transition:all .3s}.combo-display.show{opacity:1;transform:translate(-50%,-50%) scale(1.2)}footer{margin-top:16px;font-size:10px;color:rgba(255,255,255,.2)}</style></head><body><div class="title">🔨 打地鼠</div><div class="subtitle">30 秒内尽可能多地打中地鼠</div><div class="stats"><div class="stat"><div class="label">分数</div><div class="val" id="score">0</div></div><div class="stat"><div class="label">时间</div><div class="val" id="time">30</div></div><div class="stat"><div class="label">连击</div><div class="val" id="combo">0</div></div><div class="stat"><div class="label">最高</div><div class="val" id="best">0</div></div></div><div class="grid" id="grid"></div><footer>点击地鼠头部得分 · 连击有额外加分</footer><div class="combo-display" id="comboDisplay"></div><div class="start-screen" id="startScreen"><h2>🔨 打地鼠</h2><p>30 秒内尽可能多地打中冒出来的地鼠<br>连击越高分数越多！</p><button class="btn" onclick="startGame()">开始游戏</button></div><div class="end-screen hide" id="endScreen"><h2 id="endTitle">游戏结束!</h2><div class="final-score" id="finalScore">0</div><p id="endMessage">不错的成绩！</p><button class="btn" onclick="startGame()">再来一局</button></div><script>let score,time,combo,maxCombo,gameTimer,moleTimer,playing,best=parseInt(localStorage.getItem('whack_best')||'0');const EMOJIS=['🐭','🐰','🦔','🐨'];let curEmoji='🐭';document.getElementById('best').textContent=best;const grid=document.getElementById('grid');const holes=[];for(let i=0;i<9;i++){const h=document.createElement('div');h.className='hole';h.innerHTML='<div class="mole"></div>';h.onclick=()=>whack(i);grid.appendChild(h);holes.push(h.querySelector('.mole'))}function startGame(){score=0;time=30;combo=0;maxCombo=0;playing=true;document.getElementById('startScreen').classList.add('hide');document.getElementById('endScreen').classList.add('hide');updateStats();gameTimer=setInterval(()=>{time--;updateStats();if(time<=0)endGame()},1000);moleTimer=setInterval(spawnMole,800)}function spawnMole(){const idx=Math.floor(Math.random()*9);if(holes[idx].classList.contains('up'))return;curEmoji=EMOJIS[Math.floor(Math.random()*EMOJIS.length)];holes[idx].textContent=curEmoji;holes[idx].classList.add('up');holes[idx].classList.remove('hit');setTimeout(()=>{if(holes[idx].classList.contains('up')){holes[idx].classList.remove('up');combo=0;updateStats()}},1500)}function whack(i){if(!playing)return;if(!holes[i].classList.contains('up')||holes[i].classList.contains('hit'))return;holes[i].classList.add('hit');combo++;maxCombo=Math.max(maxCombo,combo);const points=10+Math.floor(combo/3)*5;score+=points;showCombo(combo);updateStats();setTimeout(()=>{holes[i].classList.remove('up');holes[i].classList.remove('hit')},300)}function showCombo(c){if(c<3)return;const el=document.getElementById('comboDisplay');el.textContent=c+' COMBO!';el.classList.add('show');setTimeout(()=>el.classList.remove('show'),500)}function updateStats(){document.getElementById('score').textContent=score;document.getElementById('time').textContent=time;document.getElementById('combo').textContent=combo}function endGame(){playing=false;clearInterval(gameTimer);clearInterval(moleTimer);holes.forEach(h=>{h.classList.remove('up');h.classList.remove('hit')});if(score>best){best=score;localStorage.setItem('whack_best',best);document.getElementById('best').textContent=best}document.getElementById('finalScore').textContent=score;let msg='继续努力!';if(score>=200)msg='🏆 你是打地鼠大师!';else if(score>=150)msg='🔥 太厉害了!';else if(score>=100)msg='👍 不错的成绩!';document.getElementById('endMessage').textContent=msg;document.getElementById('endScreen').classList.remove('hide')}</script></body></html>`
  },
  {
    name: '飞鸟穿障',
    tagline: 'Flappy Bird 风格游戏，点击穿越管道',
    url: null,
    html: `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>飞鸟穿障</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:linear-gradient(180deg,#0c4a6e,#075985);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;user-select:none;touch-action:none}.title{font-size:22px;font-weight:800;margin-bottom:4px;color:#7dd3fc}.subtitle{font-size:11px;color:rgba(255,255,255,.4);margin-bottom:8px}.score-display{position:absolute;top:60px;left:50%;transform:translateX(-50%);font-size:48px;font-weight:800;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.5);z-index:10}.canvas-wrap{position:relative;border-radius:16px;overflow:hidden;box-shadow:0 0 40px rgba(125,211,252,.2)}.overlay{position:absolute;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;z-index:20;backdrop-filter:blur(4px)}.overlay.hide{display:none}.overlay h2{font-size:24px;color:#7dd3fc}.overlay .score-final{font-size:36px;font-weight:800;color:#fbbf24}.overlay .best{font-size:12px;color:rgba(255,255,255,.5)}.btn{padding:10px 28px;border-radius:12px;border:none;background:linear-gradient(90deg,#0ea5e9,#0284c7);color:#fff;font-weight:700;font-size:16px;cursor:pointer;transition:.2s}.btn:active{transform:scale(.95)}.hint{font-size:10px;color:rgba(255,255,255,.3);margin-top:8px}</style></head><body><div class="title">🐦 飞鸟穿障</div><div class="subtitle">点击屏幕让小鸟飞起，穿越管道</div><div class="canvas-wrap"><div class="score-display" id="scoreDisplay">0</div><canvas id="c" width="300" height="420"></canvas><div class="overlay" id="overlay"><h2>飞鸟穿障</h2><p style="font-size:12px;color:rgba(255,255,255,.5)">点击/空格让小鸟飞起</p><button class="btn" onclick="startGame()">开始游戏</button></div></div><div class="hint">点击屏幕或按空格键</div><script>const canvas=document.getElementById('c');const ctx=canvas.getContext('2d');const W=canvas.width,H=canvas.height;const GRAVITY=0.4,JUMP=-7,PIPE_W=50,GAP=130,PIPE_SPEED=2;let bird,pipes,score,best=parseInt(localStorage.getItem('flappy_best')||'0'),playing,frameCount;document.getElementById('overlay').querySelector('.best').textContent='最高: '+best;function startGame(){bird={x:80,y:H/2,vy:0,r:12};pipes=[];score=0;frameCount=0;playing=true;document.getElementById('overlay').classList.add('hide');document.getElementById('scoreDisplay').textContent='0';loop()}function loop(){if(!playing)return;update();draw();requestAnimationFrame(loop)}function update(){bird.vy+=GRAVITY;bird.y+=bird.vy;frameCount++;if(frameCount%90===0){const gapY=80+Math.random()*(H-GAP-160);pipes.push({x:W,gapY:gapY,passed:false})}pipes.forEach(p=>{p.x-=PIPE_SPEED;if(!p.passed&&p.x+PIPE_W<bird.x){p.passed=true;score++;document.getElementById('scoreDisplay').textContent=score}});pipes=pipes.filter(p=>p.x>-PIPE_W);if(bird.y+bird.r>H-20||bird.y-bird.r<0){gameOver()}for(const p of pipes){if(bird.x+bird.r>p.x&&bird.x-bird.r<p.x+PIPE_W){if(bird.y-bird.r<p.gapY||bird.y+bird.r>p.gapY+GAP){gameOver();break}}}}function draw(){ctx.fillStyle='#075985';ctx.fillRect(0,0,W,H);ctx.fillStyle='#0c4a6e';ctx.fillRect(0,H-20,W,20);pipes.forEach(p=>{ctx.fillStyle='#22c55e';ctx.fillRect(p.x,0,PIPE_W,p.gapY);ctx.fillRect(p.x,p.gapY+GAP,PIPE_W,H-GAP-p.gapY-20);ctx.fillStyle='#16a34a';ctx.fillRect(p.x-2,p.gapY-4,PIPE_W+4,4);ctx.fillRect(p.x-2,p.gapY+GAP,PIPE_W+4,4)});ctx.beginPath();ctx.arc(bird.x,bird.y,bird.r,0,Math.PI*2);ctx.fillStyle='#fbbf24';ctx.fill();ctx.beginPath();ctx.arc(bird.x+4,bird.y-3,3,0,Math.PI*2);ctx.fillStyle='#000';ctx.fill();ctx.beginPath();ctx.moveTo(bird.x+bird.r,bird.y);ctx.lineTo(bird.x+bird.r+8,bird.y-3);ctx.lineTo(bird.x+bird.r+8,bird.y+3);ctx.fill();ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.moveTo(bird.x+bird.r+8,bird.y-3);ctx.lineTo(bird.x+bird.r+12,bird.y);ctx.lineTo(bird.x+bird.r+8,bird.y+3);ctx.fill()}function gameOver(){playing=false;if(score>best){best=score;localStorage.setItem('flappy_best',best)}const ov=document.getElementById('overlay');ov.classList.remove('hide');ov.innerHTML='<h2>游戏结束</h2><div class="score-final">'+score+'</div><div class="best">最高: '+best+'</div><button class="btn" onclick="startGame()">再来一局</button>'}function flap(){if(playing){bird.vy=JUMP}else{startGame()}}canvas.addEventListener('click',flap);canvas.addEventListener('touchstart',e=>{e.preventDefault();flap()});document.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();flap()}})</script></body></html>`
  },
  {
    name: '弹球消砖',
    tagline: '控制挡板弹球消除所有砖块',
    url: null,
    html: `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>弹球消砖</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#0a0a0f;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;user-select:none;touch-action:none}.title{font-size:22px;font-weight:800;margin-bottom:4px;color#a78bfa}.subtitle{font-size:11px;color:rgba(255,255,255,.4);margin-bottom:8px}.stats{display:flex;gap:8px;margin-bottom:8px}.stat{background:rgba(255,255,255,.08);padding:4px 12px;border-radius:8px}.stat .label{font-size:9px;color:rgba(255,255,255,.4)}.stat .val{font-size:16px;font-weight:700;color:#a78bfa}.canvas-wrap{border-radius:12px;overflow:hidden;box-shadow:0 0 40px rgba(167,139,250,.2)}.overlay{position:absolute;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;z-index:10;backdrop-filter:blur(4px)}.overlay.hide{display:none}.overlay h2{font-size:24px;color:#a78bfa}.btn{padding:10px 28px;border-radius:12px;border:none;background:linear-gradient(90deg,#8b5cf6,#a78bfa);color:#fff;font-weight:700;font-size:16px;cursor:pointer}.btn:active{transform:scale(.95)}.hint{font-size:10px;color:rgba(255,255,255,.3);margin-top:8px}</style></head><body><div class="title">🧱 弹球消砖</div><div class="subtitle">移动挡板，弹球消除所有砖块</div><div class="stats"><div class="stat"><div class="label">分数</div><div class="val" id="score">0</div></div><div class="stat"><div class="label">生命</div><div class="val" id="lives">3</div></div><div class="stat"><div class="label">关卡</div><div class="val" id="level">1</div></div></div><div class="canvas-wrap" style="position:relative"><canvas id="c" width="300" height="400"></canvas><div class="overlay" id="overlay"><h2>弹球消砖</h2><p style="font-size:12px;color:rgba(255,255,255,.5)">移动鼠标或触摸控制挡板</p><button class="btn" onclick="start()">开始游戏</button></div></div><div class="hint">鼠标/触摸/方向键控制挡板</div><script>const c=document.getElementById('c'),ctx=c.getContext('2d');const W=c.width,H=c.height;const PW=60,PH=8,BR=5;let padX,ball,bricks,score,lives,level,playing;function start(){score=0;lives=3;level=1;newLevel();playing=true;document.getElementById('overlay').classList.add('hide');loop()}function newLevel(){createBricks();resetBall()}function createBricks(){bricks=[];const cols=5,rows=3+level;const bw=(W-20)/cols-4;for(let r=0;r<rows;r++)for(let i=0;i<cols;i++)bricks.push({x:10+i*(bw+4),y:30+r*18,w:bw,h:14,alive:true,color:['#f472b6','#a78bfa','#60a5fa','#34d399','#fbbf24','#fb923c'][r%6]})}function resetBall(){padX=W/2-PW/2;ball={x:W/2,y:H-30,dx:2,dy:-3}}function loop(){if(!playing)return;update();draw();requestAnimationFrame(loop)}function update(){ball.x+=ball.dx;ball.y+=ball.dy;if(ball.x<BR||ball.x>W-BR)ball.dx=-ball.dx;if(ball.y<BR)ball.dy=-ball.dy;if(ball.y>H){lives--;if(lives<=0){gameOver(false);return}resetBall()}if(ball.y>H-PH-12&&ball.y<H-12&&ball.x>padX&&ball.x<padX+PW){ball.dy=-Math.abs(ball.dy);ball.dx+=(ball.x-(padX+PW/2))*0.08}for(const b of bricks){if(!b.alive)continue;if(ball.x>b.x&&ball.x<b.x+b.w&&ball.y>b.y&&ball.y<b.y+b.h){b.alive=false;ball.dy=-ball.dy;score+=10;updateUI();break}}if(bricks.every(b=>!b.alive)){level++;newLevel();updateUI()}}function draw(){ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,W,H);bricks.forEach(b=>{if(b.alive){ctx.fillStyle=b.color;ctx.fillRect(b.x,b.y,b.w,b.h)}});ctx.fillStyle='#a78bfa';ctx.fillRect(padX,H-12,PW,PH);ctx.beginPath();ctx.arc(ball.x,ball.y,BR,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill()}function updateUI(){document.getElementById('score').textContent=score;document.getElementById('lives').textContent=lives;document.getElementById('level').textContent=level}function gameOver(win){playing=false;const ov=document.getElementById('overlay');ov.classList.remove('hide');ov.innerHTML='<h2>'+(win?'🎉 通关!':'游戏结束')+'</h2><p style="font-size:14px;color:rgba(255,255,255,.6)">分数: '+score+' · 关卡: '+level+'</p><button class="btn" onclick="start()">重新开始</button>'}c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect();padX=e.clientX-r.left-PW/2;padX=Math.max(0,Math.min(W-PW,padX))});c.addEventListener('touchmove',e=>{e.preventDefault();const r=c.getBoundingClientRect();padX=e.touches[0].clientX-r.left-PW/2;padX=Math.max(0,Math.min(W-PW,padX))},{passive:false});document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')padX=Math.max(0,padX-20);if(e.key==='ArrowRight')padX=Math.min(W-PW,padX+20)});updateUI()</script></body></html>`
  },
  {
    name: '颜色记忆',
    tagline: 'Simon Says 颜色记忆游戏，跟着序列点击',
    url: null,
    html: `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>颜色记忆</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#1a1a2e;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;user-select:none;touch-action:none}.title{font-size:24px;font-weight:800;margin-bottom:4px;background:linear-gradient(90deg,#ef4444,#fbbf24,#22c55e,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.subtitle{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:16px}.info{display:flex;gap:12px;margin-bottom:16px}.info span{background:rgba(255,255,255,.08);padding:6px 16px;border-radius:10px;font-size:12px}.info b{color:#fbbf24;font-size:16px}.game-area{position:relative;width:260px;height:260px;margin-bottom:16px}.quadrant{position:absolute;width:50%;height:50%;cursor:pointer;transition:all .15s;opacity:.6}.quadrant.active{opacity:1;box-shadow:0 0 30px currentColor}.q1{top:0;left:0;background:#ef4444;border-radius:12px 0 0 0;color:#ef4444}.q2{top:0;right:0;background:#fbbf24;border-radius:0 12px 0 0;color:#fbbf24}.q3{bottom:0;left:0;background:#3b82f6;border-radius:0 0 0 12px;color:#3b82f6}.q4{bottom:0;right:0;background:#22c55e;border-radius:0 0 12px 0;color:#22c55e}.center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;border-radius:50%;background:#1a1a2e;border:3px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fbbf24;z-index:10}.status{text-align:center;min-height:24px;font-size:14px;color:rgba(255,255,255,.6);margin-bottom:12px}.btn{padding:10px 28px;border-radius:12px;border:none;background:linear-gradient(90deg,#fbbf24,#f59e0b);color:#1a1a2e;font-weight:700;font-size:16px;cursor:pointer;transition:.2s}.btn:active{transform:scale(.95)}.btn:disabled{opacity:.3;cursor:not-allowed}footer{margin-top:12px;font-size:10px;color:rgba(255,255,255,.2)}</style></head><body><div class="title">🎨 颜色记忆</div><div class="subtitle">观察颜色序列，按顺序重复点击</div><div class="info"><span>关卡: <b id="level">0</b></span><span>最高: <b id="best">0</b></span></div><div class="game-area"><div class="quadrant q1" id="q1" onclick="handleClick(0)"></div><div class="quadrant q2" id="q2" onclick="handleClick(1)"></div><div class="quadrant q3" id="q3" onclick="handleClick(2)"></div><div class="quadrant q4" id="q4" onclick="handleClick(3)"></div><div class="center" id="center">▶</div></div><div class="status" id="status">点击开始按钮</div><button class="btn" id="startBtn" onclick="startGame()">开始游戏</button><footer>记住颜色亮起的顺序，然后重复一遍</footer><script>let sequence=[],playerInput=[],level,playing,acceptingInput,best=parseInt(localStorage.getItem('simon_best')||'0');document.getElementById('best').textContent=best;const QUADS=[document.getElementById('q1'),document.getElementById('q2'),document.getElementById('q3'),document.getElementById('q4')];const SOUNDS=[261,329,392,523];function startGame(){sequence=[];level=0;playing=true;document.getElementById('startBtn').disabled=true;document.getElementById('center').textContent='';nextRound()}function nextRound(){level++;document.getElementById('level').textContent=level;playerInput=[];acceptingInput=false;sequence.push(Math.floor(Math.random()*4));document.getElementById('status').textContent='观察序列...';playSequence()}async function playSequence(){for(let i=0;i<sequence.length;i++){await sleep(400);flash(sequence[i])}document.getElementById('status').textContent='轮到你了!';acceptingInput=true}function flash(idx){const q=QUADS[idx];q.classList.add('active');beep(SOUNDS[idx],200);setTimeout(()=>q.classList.remove('active'),200)}function handleClick(idx){if(!acceptingInput||!playing)return;flash(idx);playerInput.push(idx);const i=playerInput.length-1;if(playerInput[i]!==sequence[i]){gameOver();return}if(playerInput.length===sequence.length){acceptingInput=false;document.getElementById('status').textContent='✓ 正确!';setTimeout(nextRound,800)}}function gameOver(){playing=false;acceptingInput=false;document.getElementById('status').textContent='❌ 游戏结束 · 到达第 '+level+' 关';document.getElementById('startBtn').disabled=false;document.getElementById('center').textContent='✗';if(level-1>best){best=level-1;localStorage.setItem('simon_best',best);document.getElementById('best').textContent=best}}function sleep(ms){return new Promise(r=>setTimeout(r,ms))}function beep(freq,duration){try{const ac=new(window.AudioContext||window.webkitAudioContext)();const osc=ac.createOscillator();const gain=ac.createGain();osc.connect(gain);gain.connect(ac.destination);osc.frequency.value=freq;gain.gain.setValueAtTime(.15,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration/1000);osc.start();osc.stop(ac.currentTime+duration/1000)}catch(e){}}</script></body></html>`
  },
  {
    name: '太空射击',
    tagline: '驾驶飞船消灭入侵的外星人',
    url: null,
    html: `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>太空射击</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;user-select:none;touch-action:none}.title{font-size:22px;font-weight:800;margin-bottom:4px;color:#60a5fa}.subtitle{font-size:11px;color:rgba(255,255,255,.4);margin-bottom:8px}.stats{display:flex;gap:8px;margin-bottom:8px}.stat{background:rgba(255,255,255,.08);padding:4px 12px;border-radius:8px}.stat .label{font-size:9px;color:rgba(255,255,255,.4)}.stat .val{font-size:16px;font-weight:700;color:#60a5fa}.canvas-wrap{position:relative;border-radius:12px;overflow:hidden;box-shadow:0 0 40px rgba(96,165,250,.2)}.overlay{position:absolute;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;z-index:10}.overlay.hide{display:none}.overlay h2{font-size:24px;color:#60a5fa}.btn{padding:10px 28px;border-radius:12px;border:none;background:linear-gradient(90deg,#3b82f6,#60a5fa);color:#fff;font-weight:700;font-size:16px;cursor:pointer}.hint{font-size:10px;color:rgba(255,255,255,.3);margin-top:8px}</style></head><body><div class="title">🚀 太空射击</div><div class="subtitle">消灭所有外星入侵者</div><div class="stats"><div class="stat"><div class="label">分数</div><div class="val" id="score">0</div></div><div class="stat"><div class="label">生命</div><div class="val" id="lives">3</div></div><div class="stat"><div class="label">关卡</div><div class="val" id="wave">1</div></div></div><div class="canvas-wrap"><canvas id="c" width="300" height="400"></canvas><div class="overlay" id="overlay"><h2>🚀 太空射击</h2><p style="font-size:12px;color:rgba(255,255,255,.5)">A/D 或 ←→ 移动 · 空格射击</p><button class="btn" onclick="start()">开始游戏</button></div></div><div class="hint">键盘 A/D/空格 或 触摸屏幕</div><script>const c=document.getElementById('c'),ctx=c.getContext('2d');const W=c.width,H=c.height;let ship,bullets,aliens,alienDir,score,lives,wave,playing,keys,touchX,lastShot;function start(){ship={x:W/2,y:H-30,w:24,h:16};bullets=[];aliens=[];score=0;lives=3;wave=1;keys={};touchX=null;lastShot=0;spawnAliens();playing=true;document.getElementById('overlay').classList.add('hide');loop()}function spawnAliens(){aliens=[];for(let r=0;r<3;r++)for(let i=0;i<6;i++)aliens.push({x:30+i*40,y:30+r*28,w:20,h:12,alive:true})}function loop(){if(!playing)return;update();draw();requestAnimationFrame(loop)}function update(){if(keys['a']||keys['ArrowLeft'])ship.x-=4;if(keys['d']||keys['ArrowRight'])ship.x+=4;if(touchX!==null)ship.x=touchX-12;ship.x=Math.max(0,Math.min(W-ship.w,ship.x));if((keys[' ']||touchX!==null)&&Date.now()-lastShot>300){bullets.push({x:ship.x+ship.w/2,y:ship.y-5});lastShot=Date.now()}bullets.forEach(b=>b.y-=6);bullets=bullets.filter(b=>b.y>-5);const leftmost=Math.min(...aliens.filter(a=>a.alive).map(a=>a.x),W);const rightmost=Math.max(...aliens.filter(a=>a.alive).map(a=>a.x+a.w),0);if(leftmost<=0||rightmost>=W)alienDir=-alienDir;aliens.forEach(a=>{if(a.alive)a.x+=alienDir*0.5;if(Math.random()<.002)a.y+=4});bullets.forEach(b=>{aliens.forEach(a=>{if(a.alive&&b.x>a.x&&b.x<a.x+a.w&&b.y>a.y&&b.y<a.y+a.h){a.alive=false;b.y=-100;score+=10;updateUI()}})});aliens.forEach(a=>{if(a.alive&&a.y>ship.y){lives--;updateUI();if(lives<=0){gameOver(false);return}a.alive=false}});if(aliens.every(a=>!a.alive)){wave++;spawnAliens();updateUI()}}function draw(){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.fillStyle='#60a5fa';ctx.fillRect(ship.x,ship.y,ship.w,ship.h);ctx.beginPath();ctx.moveTo(ship.x+ship.w/2-3,ship.y);ctx.lineTo(ship.x+ship.w/2,ship.y-8);ctx.lineTo(ship.x+ship.w/2+3,ship.y);ctx.fill();ctx.fillStyle='#fbbf24';bullets.forEach(b=>ctx.fillRect(b.x-1,b.y,2,8));aliens.forEach(a=>{if(a.alive){ctx.fillStyle='#f472b6';ctx.fillRect(a.x,a.y,a.w,a.h);ctx.fillStyle='#ec4899';ctx.fillRect(a.x+3,a.y+3,3,3);ctx.fillRect(a.x+a.w-6,a.y+3,3,3)}})}function updateUI(){document.getElementById('score').textContent=score;document.getElementById('lives').textContent=lives;document.getElementById('wave').textContent=wave}function gameOver(win){playing=false;const ov=document.getElementById('overlay');ov.classList.remove('hide');ov.innerHTML='<h2>'+(win?'🎉 胜利!':'游戏结束')+'</h2><p style="font-size:14px;color:rgba(255,255,255,.6)">分数: '+score+' · 关卡: '+wave+'</p><button class="btn" onclick="start()">重新开始</button>'}document.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key===' ')e.preventDefault()});document.addEventListener('keyup',e=>{keys[e.key]=false});c.addEventListener('touchstart',e=>{e.preventDefault();touchX=e.touches[0].clientX-c.getBoundingClientRect().left});c.addEventListener('touchmove',e=>{e.preventDefault();touchX=e.touches[0].clientX-c.getBoundingClientRect().left});c.addEventListener('touchend',e=>{touchX=null});alienDir=1;updateUI()</script></body></html>`
  }
]

function makeId() {
  return 'prod_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function randomVotes() {
  const votes = Math.floor(Math.random() * 25) + 5
  const votedBy = Array.from({ length: votes }, (_, i) => `user_crawl_${i}`)
  return { votes, votedBy }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 10000,
    }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        return resolve(fetchUrl(resp.headers.location))
      }
      if (resp.statusCode !== 200) {
        return reject(new Error(`HTTP ${resp.statusCode}`))
      }
      let data = ''
      resp.on('data', chunk => data += chunk)
      resp.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
  })
}

async function main() {
  // Read existing store
  let store
  try {
    store = JSON.parse(readFileSync(STORE_PATH, 'utf-8'))
    console.log(`📦 现有 ${store.products.length} 个游戏`)
  } catch {
    store = { products: [], analysis: [], brainstormSessions: [], brainstormRequirements: [], userIdeas: [] }
  }

  const existingNames = new Set(store.products.map(p => p.name))
  const newProducts = []

  // 1. Add built-in games
  for (const game of BUILTIN_GAMES) {
    if (existingNames.has(game.name)) {
      console.log(`⏭️  跳过已存在: ${game.name}`)
      continue
    }
    const { votes, votedBy } = randomVotes()
    const daysAgo = Math.floor(Math.random() * 7)
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()

    newProducts.push({
      id: makeId(),
      ideaId: `idea_crawl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ideaTitle: '热门网页游戏',
      name: game.name,
      tagline: game.tagline,
      problem: '网页游戏娱乐需求',
      solution: game.tagline,
      targetUsers: '所有喜欢休闲游戏的用户',
      coreFeatures: ['即开即玩', '触摸支持', '计分系统'],
      techStack: ['HTML', 'CSS', 'JavaScript'],
      monetization: '免费',
      competitors: '',
      differentiator: '无需下载，直接试玩',
      mvp: '核心玩法',
      createdAt,
      status: 'confirmed',
      generatedHtml: game.html,
      versions: [{ id: `v1_${Date.now()}`, version: 1, html: game.html, createdAt }],
      currentVersion: 1,
      votes,
      votedBy,
    })
    console.log(`✅ 添加内置游戏: ${game.name} (${votes} votes)`)
  }

  // 2. Try to fetch online games (best-effort, don't fail on errors)
  for (const url of GAME_URLS) {
    try {
      console.log(`🌐 抓取: ${url}`)
      const html = await fetchUrl(url)
      if (!html || html.length < 500) {
        console.log(`  ⚠️  内容太短，跳过`)
        continue
      }

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      let name = titleMatch ? titleMatch[1].trim().slice(0, 20) : new URL(url).hostname

      if (existingNames.has(name) || newProducts.some(p => p.name === name)) {
        console.log(`  ⏭️  已存在: ${name}`)
        continue
      }

      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      const tagline = metaDesc ? metaDesc[1].trim().slice(0, 40) : `来自 ${new URL(url).hostname}`

      const { votes, votedBy } = randomVotes()
      const daysAgo = Math.floor(Math.random() * 14) + 1
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()

      newProducts.push({
        id: makeId(),
        ideaId: `idea_crawl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ideaTitle: `来自 ${new URL(url).hostname}`,
        name,
        tagline,
        problem: '网页游戏娱乐需求',
        solution: tagline,
        targetUsers: '所有喜欢网页游戏的用户',
        coreFeatures: ['即开即玩'],
        techStack: ['HTML', 'CSS', 'JavaScript'],
        monetization: '免费',
        competitors: '',
        differentiator: '来自互联网的热门游戏',
        mvp: '可直接试玩',
        createdAt,
        status: 'confirmed',
        generatedHtml: html,
        versions: [{ id: `v1_${Date.now()}`, version: 1, html, createdAt }],
        currentVersion: 1,
        votes,
        votedBy,
        clonedFrom: url,
      })
      console.log(`  ✅ 添加: ${name} (${votes} votes, ${Math.round(html.length / 1024)}KB)`)
    } catch (e) {
      console.log(`  ❌ 失败: ${e.message}`)
    }
  }

  if (newProducts.length === 0) {
    console.log('\n📝 没有新游戏添加')
    process.exit(0)
  }

  // Prepend new products
  store.products = [...newProducts, ...store.products]

  // Write back
  const { mkdirSync } = await import('fs')
  mkdirSync(dirname(STORE_PATH), { recursive: true })
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  console.log(`\n✅ 共添加 ${newProducts.length} 个游戏，总计 ${store.products.length} 个`)
  console.log(`📝 写入 ${STORE_PATH}`)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
