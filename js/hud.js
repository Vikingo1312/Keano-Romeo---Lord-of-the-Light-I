// ===== HUD (MODERNIZED & CAPCOM STYLE) =====

function drawHUD(p1, p2, ld) {
  const bw = C.width * 0.38; // Wider bars
  const bh = 30; // Thicker bars
  const by = 20;

  // Draw P1 (Left) Health Bar Background (Angled Capcom style)
  X.save();
  X.transform(1, 0, -0.4, 1, 0, 0); // Skew it!
  X.fillStyle = 'rgba(0, 0, 0, 0.8)';
  X.fillRect(20 + by * 0.4, by, bw, bh);

  // P1 Health Fill (Gradient: Neon Blue to Purple to Red)
  const p1Pct = Math.max(0, p1.hp / 100);
  const gw1 = X.createLinearGradient(20 + by * 0.4, by, 20 + by * 0.4 + bw, by);
  gw1.addColorStop(0, '#ff00aa');
  gw1.addColorStop(0.5, '#7700ff');
  gw1.addColorStop(1, '#00ffff');

  X.fillStyle = p1.hp > 25 ? gw1 : '#ff0055';
  X.shadowBlur = 15; X.shadowColor = X.fillStyle;
  if (p1Pct > 0) X.fillRect(20 + by * 0.4, by, bw * p1Pct, bh);

  // Frame and Shine
  X.strokeStyle = '#fff'; X.lineWidth = 3;
  X.strokeRect(20 + by * 0.4, by, bw, bh);
  X.fillStyle = 'rgba(255,255,255,0.2)';
  X.fillRect(20 + by * 0.4, by, bw, bh * 0.4);
  X.restore();

  // P1 Name
  const p1Label = gameMode === 'story' ? 'KEANO' : (arcadeSelectedName || 'PLAYER 1');
  X.font = `bold ${Math.min(26, C.width * 0.028)}px "Orbitron"`;
  X.fillStyle = '#fff'; X.shadowBlur = 8; X.shadowColor = '#000';
  X.fillText(p1Label, 25, by + bh + 25, bw - 10);

  // P1 WINS (Golden stars)
  for (let i = 0; i < p1Wins; i++) {
    X.font = '18px serif'; X.fillText('★', 30 + (i * 22), by + bh + 45);
  }

  // P1 Super Meter (Bottom Left)
  const sw = bw * 0.6;
  const sh = 12;
  const sY = C.height - sh - 20;
  X.save();
  X.transform(1, 0, -0.5, 1, 0, 0);
  X.fillStyle = 'rgba(0,0,0,0.8)'; X.fillRect(40, sY, sw, sh);
  X.fillStyle = p1.super >= 100 ? '#00ffff' : '#0055ff';
  X.shadowBlur = p1.super >= 100 ? 15 : 0; X.shadowColor = '#00ffff';
  X.fillRect(40, sY, sw * (p1.super / 100), sh);
  X.strokeStyle = '#fff'; X.lineWidth = 2; X.strokeRect(40, sY, sw, sh);
  X.restore();
  if (p1.super >= 100) {
    X.fillStyle = '#00ffff'; X.font = 'bold 16px "Orbitron"';
    X.fillText('SUPER', 20, sY - 10);
  }

  // Draw P2 (Right) Health Bar Background
  const rx = C.width - 20 - bw;
  X.save();
  X.transform(1, 0, 0.4, 1, 0, 0); // Skew opposite way!
  X.fillStyle = 'rgba(0, 0, 0, 0.8)';
  X.fillRect(rx - by * 0.4, by, bw, bh);

  // P2 Health Fill
  const p2Pct = Math.max(0, p2.hp / p2.maxHP);
  const gw2 = X.createLinearGradient(rx - by * 0.4, by, rx - by * 0.4 + bw, by);
  gw2.addColorStop(0, '#00ffff');
  gw2.addColorStop(0.5, '#7700ff');
  gw2.addColorStop(1, '#ff00aa');

  X.fillStyle = p2.hp > (p2.maxHP * 0.25) ? gw2 : '#ff0055';
  X.shadowBlur = 15; X.shadowColor = X.fillStyle;
  // Right-aligned fill
  if (p2Pct > 0) {
    const fw = bw * p2Pct;
    X.fillRect(rx - by * 0.4 + (bw - fw), by, fw, bh);
  }

  // Frame and Shine
  X.strokeStyle = '#fff'; X.lineWidth = 3;
  X.strokeRect(rx - by * 0.4, by, bw, bh);
  X.fillStyle = 'rgba(255,255,255,0.2)';
  X.fillRect(rx - by * 0.4, by, bw, bh * 0.4);
  X.restore();

  // P2 Name
  X.textAlign = 'right'; X.fillStyle = '#fff'; X.font = 'bold 22px "Orbitron"';
  X.shadowBlur = 4; X.shadowColor = '#000';
  X.fillText(ld.name, C.width - 25, by + bh + 25, bw - 10);

  // P2 WINS
  for (let i = 0; i < p2Wins; i++) {
    X.font = '22px serif'; X.fillText('★', C.width - 30 - (i * 24), by + bh + 50);
  }

  // P2 Super Meter (Bottom Right)
  X.save();
  X.transform(1, 0, 0.5, 1, 0, 0);
  X.fillStyle = 'rgba(0,0,0,0.8)'; X.fillRect(C.width - 40 - sw - (C.height - sY) * 0.5, sY, sw, sh);
  X.fillStyle = p2.super >= 100 ? '#ff00ff' : '#aa00aa';
  X.shadowBlur = p2.super >= 100 ? 15 : 0; X.shadowColor = '#ff00ff';
  const p2Sw = sw * (p2.super / 100);
  X.fillRect(C.width - 40 - sw - (C.height - sY) * 0.5 + (sw - p2Sw), sY, p2Sw, sh);
  X.strokeStyle = '#fff'; X.lineWidth = 2; X.strokeRect(C.width - 40 - sw - (C.height - sY) * 0.5, sY, sw, sh);
  X.restore();

  // VERSUS or STAGE text in center
  X.textAlign = 'center'; X.fillStyle = '#ff8800'; X.font = 'bold 36px "Orbitron"';
  let stageText = gameMode === 'arcade' ? `STAGE ${currentLevel + 1}` : 'VS';
  if (gameMode === 'story') {
    stageText = ld.name === 'VIKINGO' ? 'FINAL STAGE' : `STAGE ${currentLevel + 1}`;
  }
  X.fillText(stageText, C.width / 2, by + 105);

  // TIMER (Classic Big Arcade Numbers)
  X.fillStyle = 'rgba(0,0,0,0.8)';
  X.beginPath(); X.arc(C.width / 2, by + 30, 45, 0, Math.PI * 2); X.fill();
  X.strokeStyle = '#00ffff'; X.lineWidth = 6; X.stroke();
  X.strokeStyle = '#aa00ff'; X.lineWidth = 2; X.stroke();

  X.fillStyle = '#fff'; X.font = 'bold 45px "Orbitron"';
  let roundTimerNumDisplay = Math.ceil(roundTimerNum);
  const tStr = gameTimerStyle === 'infinite' ? '∞' : roundTimerNumDisplay;
  if (gameTimerStyle !== 'infinite' && roundTimerNumDisplay <= 15) {
    X.fillStyle = '#ff0055'; X.shadowBlur = 20; X.shadowColor = '#ff0055';
  }
  X.fillText(tStr, C.width / 2, by + 45);
  X.shadowBlur = 0;
}

function drawBigText(t, c, s = 1) {
  const fSize = Math.min(80 * s, C.width * 0.08 * s, C.height * 0.1 * s);
  X.save(); X.font = `italic 900 ${fSize}px "Orbitron"`;
  X.textAlign = 'center'; X.fillStyle = c;
  X.shadowBlur = 0; X.shadowColor = '#000';
  X.lineWidth = 8; X.strokeStyle = '#000';
  X.strokeText(t, C.width / 2, C.height * 0.45);
  X.fillText(t, C.width / 2, C.height * 0.45);
  X.restore();
}

// ===== GAME STATE =====
