(() => {
  'use strict';

  /* =====================================================
     RÉGLAGES — c'est ici que tu personnalises
     ===================================================== */
  // 1) Remplace ce nom par ta photo (ex: 'head.png' ou 'head.jpg'),
  //    placée dans le même dossier que index.html
  const HEAD_SRC = 'head.svg';
  // 2) Taille de la tête en pixels (le jeu fait 288x512)
  const HEAD_SIZE = 34;
  // 3) Texte affiché à la place de "GAME OVER"
  const GAME_OVER_TEXT = 'SINGLE';
  // Clé de sauvegarde du meilleur score (localStorage)
  const STORAGE_KEY = 'flappy-head-best';

  /* =====================================================
     CONSTANTES DE JEU (réglées sur l'original, 60 FPS)
     ===================================================== */
  const W = 288, H = 512;
  const GROUND_H = 112, GROUND_Y = H - GROUND_H;
  const BIRD_X = 70;
  const GRAVITY = 0.25;
  const FLAP = -4.6;
  const SPEED = 2;
  const PIPE_W = 52, CAP_H = 26;
  const GAP = 100;
  const SPACING = 150;
  const RAD = 13;               // rayon de collision
  const STEP = 1 / 60;

  const OUT = '#543847';
  const FONT = "'Arial Black', Impact, 'Helvetica Neue', Arial, sans-serif";

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let scale = 1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    scale = Math.max(1, (r.width * dpr) / W);
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- Image de la tête ---------- */
  const head = new Image();
  let headOK = false;
  head.onload = () => { headOK = true; };
  head.src = HEAD_SRC;

  /* ---------- Sons (synthétisés, aucun fichier) ---------- */
  let actx = null;
  function snd(f1, f2, d, type, v) {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t = actx.currentTime;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f1, t);
      o.frequency.linearRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(v || 0.06, t);
      g.gain.linearRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + d);
    } catch (e) { /* audio indisponible */ }
  }

  /* ---------- Meilleur score ---------- */
  let best = 0;
  try { best = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0; } catch (e) {}
  function saveBest() {
    try { localStorage.setItem(STORAGE_KEY, String(best)); } catch (e) {}
  }

  /* ---------- État ---------- */
  let state = 'ready'; // ready | play | dead
  let bird, pipes, score, groundX, deadTime, flash, newBest, time;
  let btnActive = false;
  const BTN = { x: 94, y: 312, w: 100, h: 40 };

  function reset() {
    state = 'ready';
    bird = { y: 240, vy: 0, rot: 0 };
    pipes = [];
    score = 0;
    deadTime = 0;
    flash = 0;
    newBest = false;
    btnActive = false;
    if (groundX === undefined) groundX = 0;
    if (time === undefined) time = 0;
  }
  reset();

  function spawnPipe(x) {
    const min = 60, max = GROUND_Y - 60 - GAP;
    pipes.push({ x, gapTop: min + Math.random() * (max - min), scored: false });
  }

  function flap() {
    if (state === 'ready') {
      state = 'play';
      spawnPipe(W + 20);
    }
    if (state === 'play') {
      bird.vy = FLAP;
      snd(420, 640, 0.1, 'square', 0.05);
    }
  }

  function die() {
    state = 'dead';
    flash = 1;
    deadTime = 0;
    snd(220, 50, 0.3, 'sawtooth', 0.09);
    if (score > best) { best = score; newBest = true; saveBest(); }
  }

  function hitsRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  /* ---------- Mise à jour (pas fixe 60 Hz) ---------- */
  function update() {
    time += STEP;
    if (flash > 0) flash = Math.max(0, flash - 0.06);

    if (state !== 'dead') groundX = (groundX + SPEED) % 24;

    if (state === 'ready') {
      bird.y = 240 + Math.sin(time * 6) * 5;
      bird.rot = 0;
      return;
    }

    if (state === 'play') {
      bird.vy += GRAVITY;
      bird.y += bird.vy;
      bird.rot = Math.max(-0.45, Math.min(1.5, bird.vy * 0.12));
      if (bird.y < -RAD) bird.y = -RAD;

      for (const p of pipes) p.x -= SPEED;
      if (pipes.length && pipes[0].x + PIPE_W < -4) pipes.shift();
      const last = pipes[pipes.length - 1];
      if (!last || last.x <= W - SPACING + 20) spawnPipe(W + 4);

      for (const p of pipes) {
        if (!p.scored && p.x + PIPE_W < BIRD_X - RAD) {
          p.scored = true; score++;
          snd(900, 1400, 0.12, 'square', 0.05);
        }
      }

      if (bird.y + RAD >= GROUND_Y) {
        bird.y = GROUND_Y - RAD;
        die();
        return;
      }
      for (const p of pipes) {
        if (hitsRect(BIRD_X, bird.y, RAD, p.x, 0, PIPE_W, p.gapTop) ||
            hitsRect(BIRD_X, bird.y, RAD, p.x, p.gapTop + GAP, PIPE_W, GROUND_Y - p.gapTop - GAP)) {
          die();
          return;
        }
      }
      return;
    }

    if (state === 'dead') {
      deadTime += STEP;
      if (bird.y < GROUND_Y - RAD) {
        bird.vy += GRAVITY;
        bird.y += bird.vy;
        bird.rot = Math.min(1.57, bird.rot + 0.12);
        if (bird.y >= GROUND_Y - RAD) { bird.y = GROUND_Y - RAD; bird.rot = 1.57; }
      }
      btnActive = deadTime > 0.75;
    }
  }

  /* ---------- Dessin ---------- */
  function outlineText(str, x, y, size, fill, stroke, lw, align) {
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    ctx.fillStyle = '#4ec0ca';
    ctx.fillRect(0, 0, W, H);

    // nuages
    ctx.fillStyle = '#d8f3ee';
    const clouds = [[30, 330, 1], [120, 345, 1.3], [215, 325, 1], [275, 350, 1.2]];
    for (const [cx, cy, s] of clouds) {
      for (const [dx, dy, r] of [[0, 0, 16], [16, -6, 20], [34, 2, 15], [16, 6, 16]]) {
        ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
      }
    }
    // immeubles
    ctx.fillStyle = '#b6e2d9';
    for (let i = 0; i * 26 < W + 26; i++) {
      const h = 40 + ((i * 37) % 5) * 12;
      ctx.fillRect(i * 26, GROUND_Y - h - 14, 22, h + 14);
    }
    ctx.fillStyle = '#a0d6cc';
    for (let i = 0; i * 26 < W + 26; i++) {
      const h = 40 + ((i * 37) % 5) * 12;
      for (let wy = GROUND_Y - h - 6; wy < GROUND_Y - 22; wy += 14) {
        ctx.fillRect(i * 26 + 5, wy, 4, 6);
        ctx.fillRect(i * 26 + 13, wy, 4, 6);
      }
    }
    // buissons
    ctx.fillStyle = '#6fcf4b';
    for (let x = -8; x < W + 20; x += 22) {
      ctx.beginPath(); ctx.arc(x, GROUND_Y - 2, 16, Math.PI, 0); ctx.fill();
    }
  }

  function block(x, y, w, h) {
    ctx.fillStyle = '#73bf2e'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#9ce659'; ctx.fillRect(x + 3, y, 6, h);
    ctx.fillStyle = '#558022'; ctx.fillRect(x + w - 9, y, 6, h);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  function drawPipes() {
    for (const p of pipes) {
      const x = Math.round(p.x);
      // haut
      block(x + 2, -4, PIPE_W - 4, p.gapTop - CAP_H + 4);
      block(x, p.gapTop - CAP_H, PIPE_W, CAP_H);
      // bas
      const by = p.gapTop + GAP;
      block(x, by, PIPE_W, CAP_H);
      block(x + 2, by + CAP_H, PIPE_W - 4, GROUND_Y - by - CAP_H + 4);
    }
  }

  function drawGround() {
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, GROUND_Y, W, GROUND_H);
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, GROUND_Y + 2, W, 12);
    ctx.fillStyle = '#9ce659';
    for (let x = -groundX - 8; x < W + 24; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 2);
      ctx.lineTo(x + 12, GROUND_Y + 2);
      ctx.lineTo(x + 4, GROUND_Y + 14);
      ctx.lineTo(x - 8, GROUND_Y + 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = OUT;
    ctx.fillRect(0, GROUND_Y, W, 2);
    ctx.fillStyle = '#558022';
    ctx.fillRect(0, GROUND_Y + 14, W, 2);
    ctx.fillStyle = '#d0a54c';
    for (let x = -groundX; x < W + 24; x += 24) ctx.fillRect(x, GROUND_Y + 26, 12, 3);
  }

  function drawBird() {
    const r = HEAD_SIZE / 2;
    ctx.save();
    ctx.translate(BIRD_X, bird.y);
    ctx.rotate(bird.rot);
    if (headOK) {
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
      const iw = head.naturalWidth || 128, ih = head.naturalHeight || 128;
      const s = Math.min(iw, ih);
      ctx.drawImage(head, (iw - s) / 2, (ih - s) / 2, s, s, -r, -r, HEAD_SIZE, HEAD_SIZE);
      ctx.restore();
    } else {
      ctx.fillStyle = '#f8d34a';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.restore();
  }

  function medalColor() {
    if (score >= 40) return '#e3f6fa';
    if (score >= 30) return '#f5c518';
    if (score >= 20) return '#cfd8dc';
    if (score >= 10) return '#c8742f';
    return null;
  }

  function drawDead() {
    const t = Math.min(1, Math.max(0, (deadTime - 0.35) / 0.35));
    if (t <= 0) return;
    const e = 1 - Math.pow(1 - t, 3);
    ctx.save();
    ctx.globalAlpha = e;
    outlineText(GAME_OVER_TEXT, W / 2, 118 - (1 - e) * 20, 42, '#fc7a2c', OUT, 7);
    ctx.restore();

    const off = (1 - e) * 280;
    // panneau
    roundRect(24, 168 + off, 240, 116, 8);
    ctx.fillStyle = '#ded895'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();

    // médaille
    outlineText('MEDAL', 62, 192 + off, 12, '#e86101', '#ded895', 0);
    const mc = medalColor();
    ctx.beginPath(); ctx.arc(62, 232 + off, 24, 0, Math.PI * 2);
    ctx.fillStyle = mc || '#c9bf7a'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
    if (mc) {
      ctx.beginPath(); ctx.arc(62, 232 + off, 15, 0, Math.PI * 2);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(84,56,71,.45)'; ctx.stroke();
    }

    // scores
    outlineText('SCORE', 248, 192 + off, 12, '#e86101', '#ded895', 0, 'right');
    outlineText(String(score), 248, 214 + off, 26, '#fff', OUT, 5, 'right');
    outlineText('BEST', 248, 242 + off, 12, '#e86101', '#ded895', 0, 'right');
    outlineText(String(best), 248, 264 + off, 26, '#fff', OUT, 5, 'right');
    if (newBest) outlineText('NEW', 168, 264 + off, 14, '#f4402c', '#fff', 4);

    // bouton
    roundRect(BTN.x, BTN.y + off, BTN.w, BTN.h, 6);
    ctx.fillStyle = '#e86101'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    outlineText('OK', BTN.x + BTN.w / 2, BTN.y + BTN.h / 2 + off + 1, 22, '#fff', OUT, 4);
  }

  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawBackground();
    drawPipes();
    drawGround();
    drawBird();

    if (state === 'play' || (state === 'dead' && deadTime < 0.35)) {
      outlineText(String(score), W / 2, 70, 44, '#fff', OUT, 7);
    }
    if (state === 'ready') {
      outlineText('GET READY!', W / 2, 150, 34, '#fc7a2c', OUT, 6);
      outlineText('TAP / SPACE', W / 2, 330, 18, '#fff', OUT, 5);
    }
    if (state === 'dead') drawDead();

    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + flash + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- Contrôles ---------- */
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * W / r.width;
    const y = (e.clientY - r.top) * H / r.height;
    if (state === 'dead') {
      if (btnActive && x >= BTN.x && x <= BTN.x + BTN.w && y >= BTN.y && y <= BTN.y + BTN.h) reset();
    } else {
      flap();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
      e.preventDefault();
      if (state === 'dead') { if (btnActive) reset(); }
      else flap();
    }
  });

  /* ---------- Boucle ---------- */
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
