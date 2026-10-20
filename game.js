/**
 * MOTOR DE JUEGO PRINCIPAL: LANZA Y ATRAPA
 * Implementa la física 2.5D, renderizado dinámico en Canvas, interactividad y flujo de juego.
 */

(function () {
  // CONFIGURACIÓN Y ESTADO GLOBAL
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // Elementos DOM
  const hud = document.getElementById('game-hud');
  const timerDisplay = document.getElementById('timer-display');
  const timerBox = document.getElementById('timer-box');
  const scoreDisplay = document.getElementById('score-display');
  const streakDisplay = document.getElementById('streak-display');
  const playerTurnBadge = document.getElementById('player-turn-badge');
  const currentPlayerName = document.getElementById('current-player-name');
  const currentPlayerColor = document.getElementById('current-player-color');
  const floatingFeedback = document.getElementById('floating-feedback');
  const launchHints = document.getElementById('launch-hints');
  const hintTextContent = document.getElementById('hint-text-content');
  const btnQuickLaunch = document.getElementById('btn-quick-launch');
  const quickControls = document.getElementById('quick-controls');
  const btnHudSettings = document.getElementById('btn-hud-settings');

  // Ajustes de Sensibilidad y Opciones Nuevas
  const sliderSensitivity = document.getElementById('slider-sensitivity');
  const sensitivityValueLabel = document.getElementById('sensitivity-value-label');
  const chkGuide = document.getElementById('chk-guide');
  const chkFastReload = document.getElementById('chk-fast-reload');
  const chkSoundFx = document.getElementById('chk-sound-fx');

  // Pantallas y modales
  const screenMainMenu = document.getElementById('screen-main-menu');
  const modalMultiplayer = document.getElementById('modal-multiplayer');
  const modalSettings = document.getElementById('modal-settings');
  const modalInstructions = document.getElementById('modal-instructions');
  const screenTurnTransition = document.getElementById('screen-turn-transition');
  const screenResults = document.getElementById('screen-results');

  // Botones
  const btnModeSingle = document.getElementById('btn-mode-single');
  const btnModeMulti = document.getElementById('btn-mode-multi');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnOpenInstructions = document.getElementById('btn-open-instructions');
  const btnMenuBack = document.getElementById('btn-menu-back');
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const soundIcon = document.getElementById('sound-icon');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnCloseInstructions = document.getElementById('btn-close-instructions');
  const btnCancelMulti = document.getElementById('btn-cancel-multi');
  const btnStartMulti = document.getElementById('btn-start-multi');
  const btnStartNextTurn = document.getElementById('btn-start-next-turn');
  const btnRestartGame = document.getElementById('btn-restart-game');
  const btnBackMenuResults = document.getElementById('btn-back-menu-results');

  // Ajustes de partida y Opciones Funcionales
  let currentTheme = 'theme-chicken';
  let controlMode = 'slingshot'; // 'slingshot' o 'tap'
  let singlePlayerTime = 45;
  let multiPlayerTime = 45;
  let gameMode = 'single'; // 'single' o 'multi'

  // Variables de Sensibilidad y Asistencia
  let controlSensitivity = 1.0; // Multiplicador de sensibilidad (0.4x a 2.0x)
  let showTrajectoryGuide = true; // Activar/desactivar guía visual
  let fastReloadEnabled = true; // Recarga rápida de bolas
  let soundFxEnabled = true; // Efectos de sonido activados

  // SISTEMA DE ENERGÍA Y PODERES
  let ballStock = 12; // Munición de pelotas disponibles
  const maxBallStock = 12;
  let activePowers = {
    magnet: false, // Imán: atrae automáticamente las bolas hacia los orificios
    fireMultiplier: false // Fuego x2: duplica los puntos y deja estela de fuego
  };
  let powerInventory = {
    magnet: 2,
    fire: 2
  };

  // Elementos DOM de Munición y Poderes
  const ammoDisplay = document.getElementById('ammo-display');
  const btnReloadBalls = document.getElementById('btn-reload-balls');
  const btnPowerMagnet = document.getElementById('btn-power-magnet');
  const btnPowerFire = document.getElementById('btn-power-fire');
  const badgeMagnet = document.getElementById('badge-magnet');
  const badgeFire = document.getElementById('badge-fire');

  // Jugadores Multijugador
  let playersList = [];
  let currentPlayerIndex = 0;
  const playerPalette = ['#38bdf8', '#f43f5e', '#10b981', '#f59e0b'];

  // Estado de la partida actual
  let isGameRunning = false;
  let remainingTime = 45;
  let timerInterval = null;
  let currentScore = 0;
  let currentStreak = 0;
  let shotStartTime = 0;

  // Catapulta con resorte y animación física
  let catapultArmAnim = {
    recoil: 0, // Vibración de retroceso al disparar
    flashTimer: 0 // Brillo de disparo
  };

  // DIMENSIONES VIRTUALES Y ESCALA DEL CANVAS
  let width = 0;
  let height = 0;
  let dpr = 1;

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    setupLayoutPositions();
  }

  // OBJETOS Y GEOMETRÍA DEL JUEGO
  // Coordenadas normalizadas adaptativas
  let catapult = {
    x: 0,
    y: 0,
    baseRadius: 28,
    dragX: 0,
    dragY: 0,
    isDragging: false,
    maxDrag: 120
  };

  // Cuadrícula de la Huevera / Canastas (3 filas x 4 columnas = 12 casillas)
  let eggCarton = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    rows: 3,
    cols: 4,
    slots: []
  };

  // Pelota activa
  let ball = {
    x: 0,
    y: 0,
    z: 0, // 0 = frente (catapulta), 1 = fondo (huevera)
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 18,
    state: 'ready', // 'ready', 'dragging', 'flying', 'landed', 'lost'
    landedSlot: null
  };

  // Partículas y efectos
  let particles = [];
  let floatingTexts = [];

  // Configuración de posiciones adaptadas a pantalla
  function setupLayoutPositions() {
    catapult.x = width * 0.5;
    catapult.y = Math.min(height * 0.73, height - 120);
    catapult.baseRadius = Math.min(width, height) * 0.052;
    catapult.maxDrag = Math.min(width, height) * 0.20;

    // Caja y huevera elevada
    const cartonW = Math.min(width * 0.72, 420);
    const cartonH = cartonW * 0.55;
    eggCarton.w = cartonW;
    eggCarton.h = cartonH;
    eggCarton.x = width * 0.5 - cartonW * 0.5;
    eggCarton.y = height * 0.36 - cartonH * 0.5;

    // Generar casillas de la huevera con valores de puntos
    eggCarton.slots = [];
    const cellW = cartonW / eggCarton.cols;
    const cellH = cartonH / eggCarton.rows;

    for (let r = 0; r < eggCarton.rows; r++) {
      for (let c = 0; c < eggCarton.cols; c++) {
        // Asignar puntos: centro más puntos, esquinas y bordes
        let points = 20;
        let isSpecial = false;
        if ((r === 1 && c === 1) || (r === 1 && c === 2)) {
          points = 50; // ¡Casillas centrales doradas de máxima precisión!
          isSpecial = true;
        } else if (r === 1 || c === 1 || c === 2) {
          points = 30;
        }

        eggCarton.slots.push({
          row: r,
          col: c,
          x: eggCarton.x + c * cellW + cellW * 0.5,
          y: eggCarton.y + r * cellH + cellH * 0.5,
          radius: Math.min(cellW, cellH) * 0.38,
          points: points,
          isSpecial: isSpecial,
          highlightAnim: 0
        });
      }
    }

    if (ball.state === 'ready') {
      resetBallToCatapult();
    }
  }

  function resetBallToCatapult() {
    ball.x = catapult.x;
    ball.y = catapult.y;
    ball.z = 0;
    ball.vx = 0;
    ball.vy = 0;
    ball.vz = 0;
    ball.state = 'ready';
    ball.landedSlot = null;
    catapult.dragX = 0;
    catapult.dragY = 0;
    shotStartTime = performance.now();
  }

  // ========================================================
  // MECÁNICA DE LANZAMIENTO (DRAG & RELEASE / TAP)
  // ========================================================

  let pointerOrigin = { x: 0, y: 0 };

  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.clientX || 0);
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : (e.clientY || 0);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function onPointerDown(e) {
    if (!isGameRunning) return;

    // Solo interactuar si el evento proviene directamente del canvas del juego
    if (e.target !== canvas) return;

    const pos = getPointerPos(e);

    // Si el toque cae directamente dentro del área del dock de botones rápidos, permitir que el botón maneje el evento
    if (quickControls && !quickControls.classList.contains('hidden')) {
      const qcRect = quickControls.getBoundingClientRect();
      const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : (e.clientX || 0);
      const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : (e.clientY || 0);
      if (
        clientX >= qcRect.left &&
        clientX <= qcRect.right &&
        clientY >= qcRect.top &&
        clientY <= qcRect.bottom
      ) {
        return;
      }
    }

    // Si la bola está volando o atrapada y el usuario pulsa de nuevo, recargar al instante
    if (ball.state !== 'ready' && ball.state !== 'dragging') {
      if (fastReloadEnabled) {
        resetBallToCatapult();
      }
      return;
    }

    pointerOrigin.x = pos.x;
    pointerOrigin.y = pos.y;

    if (controlMode === 'tap') {
      // Modo Toque Directo: Disparar hacia donde se presionó
      launchDirectTowards(pos.x, pos.y);
      return;
    }

    // Modo Catapulta (Slingshot):
    // Iniciar arrastre si toca cerca de la catapulta o en la zona inferior de control
    const distToCatapult = Math.hypot(pos.x - catapult.x, pos.y - catapult.y);
    const isLowerScreen = pos.y > height * 0.52;

    if (distToCatapult < catapult.baseRadius * 4.0 || isLowerScreen) {
      catapult.isDragging = true;
      ball.state = 'dragging';

      // Calcular desplazamiento inicial considerando la sensibilidad
      const deltaX = (pos.x - catapult.x) * controlSensitivity;
      const deltaY = Math.max(10, (pos.y - catapult.y) * controlSensitivity);

      catapult.dragX = deltaX;
      catapult.dragY = deltaY;
      clampDrag();

      window.soundEngine.init();
      if (soundFxEnabled) {
        window.soundEngine.playPull(0.2);
      }
    } else {
      // Si tocó en la mitad superior (la huevera), permitir tiro directo inteligente
      launchDirectTowards(pos.x, pos.y);
    }
  }

  function onPointerMove(e) {
    if (!catapult.isDragging || ball.state !== 'dragging') return;
    const pos = getPointerPos(e);

    // Calcular distancia desde la catapulta multiplicada por la sensibilidad
    const rawDx = (pos.x - catapult.x) * controlSensitivity;
    const rawDy = (pos.y - catapult.y) * controlSensitivity;

    catapult.dragX = rawDx;
    catapult.dragY = Math.max(10, rawDy);
    clampDrag();

    const tension = Math.hypot(catapult.dragX, catapult.dragY) / catapult.maxDrag;
    if (Math.random() < 0.2 && soundFxEnabled) {
      window.soundEngine.playPull(tension);
    }
  }

  function clampDrag() {
    const dist = Math.hypot(catapult.dragX, catapult.dragY);
    if (dist > catapult.maxDrag) {
      const angle = Math.atan2(catapult.dragY, catapult.dragX);
      catapult.dragX = Math.cos(angle) * catapult.maxDrag;
      catapult.dragY = Math.sin(angle) * catapult.maxDrag;
    }
  }

  function onPointerUp(e) {
    if (!catapult.isDragging || ball.state !== 'dragging') {
      catapult.isDragging = false;
      return;
    }
    catapult.isDragging = false;

    const dragDist = Math.hypot(catapult.dragX, catapult.dragY);

    // Si arrastró menos de 14px, considerarlo un toque rápido y hacer tiro asistido
    if (dragDist < 14) {
      triggerEasyLaunch();
      return;
    }

    launchBall();
  }

  // Lanzamiento directo hacia coordenadas objetivo
  function launchDirectTowards(targetX, targetY) {
    if (!isGameRunning) return;
    if (ball.state !== 'ready') {
      resetBallToCatapult();
    }
    window.soundEngine.init();

    const dx = targetX - catapult.x;
    const dy = targetY - catapult.y;

    // Calcular vector proporcional inverso
    const dist = Math.hypot(dx, dy);
    const ratio = Math.min(1.0, Math.max(0.45, dist / (height * 0.65)));

    catapult.dragX = -dx * 0.22 * controlSensitivity;
    catapult.dragY = catapult.maxDrag * 0.82 * ratio;
    clampDrag();

    launchBall();
  }

  // Disparo asistido fácil con botón o barra espaciadora
  function triggerEasyLaunch() {
    if (!isGameRunning) return;
    if (ball.state !== 'ready') {
      resetBallToCatapult();
    }
    window.soundEngine.init();

    // Ángulo ligeramente variado para naturalidad
    const randomAngleVar = (Math.random() - 0.5) * 14;
    catapult.dragX = randomAngleVar;
    catapult.dragY = catapult.maxDrag * (0.80 + (Math.random() - 0.5) * 0.1);
    clampDrag();

    launchBall();
  }

  function launchBall() {
    // Verificar si quedan pelotas disponibles en stock
    if (ballStock <= 0) {
      showFeedback('¡Sin pelotas! Pulsa "Recargar"', '#ef476f');
      window.soundEngine.playMiss();
      return;
    }

    // Descontar una pelota
    ballStock--;
    updateHUD();

    const dragDist = Math.hypot(catapult.dragX, catapult.dragY);
    // Potencia calibrada (mínimo 0.52 para llegar siempre con energía)
    const power = Math.max(0.52, dragDist / catapult.maxDrag);

    // Dirección opuesta a la tensión
    const angle = Math.atan2(-catapult.dragY, -catapult.dragX);

    // ANIMACIÓN DE RETROCESO / VIBRACIÓN DE LA CATAPULTA (Snap effect)
    catapultArmAnim.recoil = 18;
    catapultArmAnim.flashTimer = 8;

    // Velocidades vectoriales
    const launchSpeed = 19 + power * 19;
    ball.vx = Math.cos(angle) * launchSpeed;
    ball.vy = Math.sin(angle) * launchSpeed; // Hacia arriba
    ball.vz = 0.029 + power * 0.022; // Avance hacia el fondo Z
    ball.state = 'flying';

    // Generar ráfaga de chispas en la cazoleta al disparar
    spawnParticles(catapult.x, catapult.y, 14, activePowers.fireMultiplier ? '#ef4444' : '#ffd166');

    if (soundFxEnabled) {
      window.soundEngine.playLaunch();
    }

    // Registro psicomotriz
    const reactionTime = performance.now() - shotStartTime;
    ball.shotData = {
      timestamp: Date.now(),
      reactionTime: Math.min(reactionTime, 8000),
      power: power,
      angle: angle,
      scored: false,
      points: 0,
      slotIndex: -1
    };

    if (launchHints) {
      launchHints.style.opacity = '0.3';
    }

    // Watchdog de seguridad: Si la bola no aterriza en 2.2s, recargar
    setTimeout(() => {
      if (ball.state === 'flying' && isGameRunning) {
        resetBallToCatapult();
      }
    }, 2200);
  }

  // Event Listeners para Mouse y Touch en Canvas
  canvas.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  canvas.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp, { passive: true });
  window.addEventListener('touchcancel', () => {
    catapult.isDragging = false;
    if (ball.state === 'dragging') {
      ball.state = 'ready';
      catapult.dragX = 0;
      catapult.dragY = 0;
    }
  });

  // ========================================================
  // FÍSICA Y DETECCIÓN AUTOMÁTICA DE ENCESTES
  // ========================================================

  function updatePhysics(dt) {
    // Actualizar animación de retroceso de la catapulta
    if (catapultArmAnim.recoil > 0) {
      catapultArmAnim.recoil *= 0.75;
      if (catapultArmAnim.recoil < 0.5) catapultArmAnim.recoil = 0;
    }
    if (catapultArmAnim.flashTimer > 0) {
      catapultArmAnim.flashTimer--;
    }

    if (ball.state === 'flying') {
      // Avanzar en profundidad Z
      ball.z += ball.vz;
      // Posición X e Y con gravedad parabólica
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vy += 0.46;

      // ATENCIÓN MAGNÉTICA AUTOMÁTICA (Imán o Embudo Óculo-Manual):
      // Si la pelota se acerca a la huevera (z >= 0.70) y está cerca de un orificio,
      // los orificios detectan la pelota y la atraen hacia el centro
      if (ball.z >= 0.70) {
        let nearestSlot = null;
        let minDist = Infinity;
        for (let i = 0; i < eggCarton.slots.length; i++) {
          const s = eggCarton.slots[i];
          const d = Math.hypot(ball.x - s.x, ball.y - s.y);
          if (d < minDist) {
            minDist = d;
            nearestSlot = s;
          }
        }

        // Si el poder de Imán está activo, la atracción es muy fuerte
        // Si no, hay una atracción gravitatoria suave natural para asegurar captura
        const pullRadius = activePowers.magnet ? nearestSlot.radius * 3.2 : nearestSlot.radius * 1.5;
        if (nearestSlot && minDist < pullRadius) {
          const pullStrength = activePowers.magnet ? 0.28 : 0.08;
          ball.x += (nearestSlot.x - ball.x) * pullStrength;
          ball.y += (nearestSlot.y - ball.y) * pullStrength;

          // Generar partículas mágicas si el imán está activo
          if (activePowers.magnet && Math.random() < 0.4) {
            particles.push({
              x: ball.x,
              y: ball.y,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              size: 3 + Math.random() * 3,
              color: '#38bdf8',
              gravity: 0,
              decay: 0.05,
              alpha: 0.8
            });
          }
        }
      }

      // Estela de fuego si tiene el poder Fuego x2
      if (activePowers.fireMultiplier && Math.random() < 0.6) {
        particles.push({
          x: ball.x + (Math.random() - 0.5) * 8,
          y: ball.y + (Math.random() - 0.5) * 8,
          vx: -ball.vx * 0.15,
          vy: -ball.vy * 0.15 - 1,
          size: 6 + Math.random() * 5,
          color: Math.random() > 0.5 ? '#f97316' : '#ef4444',
          gravity: -0.1,
          decay: 0.06,
          alpha: 0.9
        });
      }

      // Rebote en paredes laterales de la caja
      const boxLeft = eggCarton.x - 30;
      const boxRight = eggCarton.x + eggCarton.w + 30;
      if (ball.z > 0.5 && (ball.x < boxLeft || ball.x > boxRight)) {
        ball.vx = -ball.vx * 0.55;
        window.soundEngine.playBounce(0.5);
      }

      // Detección automática al alcanzar la huevera (z >= 0.96)
      if (ball.z >= 0.96) {
        checkEggCartonHit();
      }

      // Si cae fuera por fallo
      if (ball.y > height + 60 || ball.z > 1.35) {
        onBallMiss();
      }
    }
    } else if (ball.state === 'landed') {
      // Bola quieta en su orificio
    }

    // Actualizar partículas
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      p.size = Math.max(0, p.size * 0.98);
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    // Actualizar textos flotantes
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;
      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
      }
    }
  }

  function checkEggCartonHit() {
    let bestSlot = null;
    let minDistance = Infinity;

    // Buscar si la pelota cayó dentro de algún orificio (con margen generoso y agradable)
    for (let i = 0; i < eggCarton.slots.length; i++) {
      const slot = eggCarton.slots[i];
      const dist = Math.hypot(ball.x - slot.x, ball.y - slot.y);
      if (dist < slot.radius * 1.38 && dist < minDistance) {
        minDistance = dist;
        bestSlot = slot;
        ball.shotData.slotIndex = i;
      }
    }

    if (bestSlot) {
      // ¡ENCESTÓ EN LA HUEVERA!
      ball.state = 'landed';
      ball.x = bestSlot.x;
      ball.y = bestSlot.y;
      ball.landedSlot = bestSlot;
      bestSlot.highlightAnim = 1.0;

      // Calcular puntos y combo
      currentStreak++;
      let multiplier = currentStreak >= 5 ? 3 : currentStreak >= 3 ? 2 : currentStreak >= 2 ? 1.5 : 1;
      
      // Multiplicador del Poder Fuego x2
      const isFireActive = activePowers.fireMultiplier;
      if (isFireActive) {
        multiplier *= 2;
      }

      const finalPoints = Math.round(bestSlot.points * multiplier);
      currentScore += finalPoints;

      ball.shotData.scored = true;
      ball.shotData.points = finalPoints;

      // Efectos de sonido y partículas
      window.soundEngine.playScore(finalPoints, bestSlot.isSpecial || isFireActive);
      spawnParticles(ball.x, ball.y, isFireActive ? 45 : (bestSlot.isSpecial ? 35 : 22), isFireActive ? '#f97316' : (bestSlot.isSpecial ? '#ffd166' : '#38bdf8'));
      
      const fireLabel = isFireActive ? '🔥 FUEGO x2 ' : '';
      const streakText = multiplier > 1 ? ` (x${multiplier})` : '';
      showFeedback(`¡+${finalPoints} PTS! ${fireLabel}${streakText}`, isFireActive ? '#f97316' : (bestSlot.isSpecial ? '#ffd166' : '#10b981'));
      addFloatingText(`+${finalPoints}`, ball.x, ball.y - 20, isFireActive ? '#ff4500' : (bestSlot.isSpecial ? '#ffd700' : '#00e5ff'));

      // Desactivar poderes de un solo tiro
      if (activePowers.fireMultiplier) {
        activePowers.fireMultiplier = false;
        if (btnPowerFire) btnPowerFire.classList.remove('active');
      }
      if (activePowers.magnet) {
        activePowers.magnet = false;
        if (btnPowerMagnet) btnPowerMagnet.classList.remove('active');
      }

      updateHUD();

      // Guardar en motor psicomotriz
      window.motorEvaluationEngine.recordShot(ball.shotData);

      // Reiniciar la bola tras pausa
      setTimeout(() => {
        if (isGameRunning) resetBallToCatapult();
      }, 700);

    } else {
      // Golpeó fuera de los orificios (en el marco o fondo de la caja)
      window.soundEngine.playBounce(0.9);
      spawnParticles(ball.x, ball.y, 8, '#d97706');
      ball.vx *= 0.3;
      ball.vy = -3; // Rebote hacia adelante/abajo
      ball.vz = 0.04;
      
      onBallMiss();
    }
  }

  function onBallMiss() {
    ball.state = 'lost';
    currentStreak = 0;
    
    // Desactivar poderes si falló
    if (activePowers.fireMultiplier) {
      activePowers.fireMultiplier = false;
      if (btnPowerFire) btnPowerFire.classList.remove('active');
    }
    if (activePowers.magnet) {
      activePowers.magnet = false;
      if (btnPowerMagnet) btnPowerMagnet.classList.remove('active');
    }

    updateHUD();

    if (ball.shotData) {
      ball.shotData.scored = false;
      ball.shotData.points = 0;
      window.motorEvaluationEngine.recordShot(ball.shotData);
    }

    window.soundEngine.playMiss();
    showFeedback('¡Casi! Calibra el pulso', '#ef476f');

    setTimeout(() => {
      if (isGameRunning) resetBallToCatapult();
    }, 600);
  }

  function showFeedback(text, color = '#ffd166') {
    if (!floatingFeedback) return;
    floatingFeedback.textContent = text;
    floatingFeedback.style.color = color;
    floatingFeedback.classList.add('show');
    setTimeout(() => {
      floatingFeedback.classList.remove('show');
    }, 700);
  }

  function addFloatingText(text, x, y, color = '#ffd700') {
    floatingTexts.push({
      text,
      x,
      y,
      vy: -1.8,
      alpha: 1.0,
      color
    });
  }

  function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 6,
        color: Math.random() > 0.4 ? color : '#ffffff',
        gravity: 0.25,
        decay: 0.025 + Math.random() * 0.02,
        alpha: 1.0
      });
    }
  }

  function updateHUD() {
    if (scoreDisplay) scoreDisplay.textContent = currentScore;
    if (streakDisplay) streakDisplay.textContent = `x${currentStreak}`;
    if (ammoDisplay) ammoDisplay.textContent = `x${ballStock}`;
    if (badgeMagnet) badgeMagnet.textContent = powerInventory.magnet;
    if (badgeFire) badgeFire.textContent = powerInventory.fire;

    // Efecto visual si la munición está baja
    const ammoCard = document.getElementById('ammo-card');
    if (ammoCard) {
      if (ballStock <= 3) {
        ammoCard.style.borderColor = '#ef476f';
        ammoCard.style.color = '#ef476f';
      } else {
        ammoCard.style.borderColor = 'var(--glass-border)';
        ammoCard.style.color = '#38bdf8';
      }
    }
  }

  // ========================================================
  // RENDERIZADO VISUAL DEL ESCENARIO Y TEMAS (CANVAS)
  // ========================================================

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // 1. Dibujar el fondo temático y la estructura de caja
    drawThemedEnvironment();

    // 2. Dibujar la huevera elevada sobre palitos (como en la foto)
    drawEggCarton();

    // 3. Dibujar la catapulta y la guía de lanzamiento
    drawCatapult();

    // 4. Dibujar la pelota en su posición 3D
    drawBall();

    // 5. Dibujar partículas y textos flotantes
    drawParticles();
    drawFloatingTexts();

    requestAnimationFrame(draw);
  }

  function drawThemedEnvironment() {
    // Caja contenedora de cartón en perspectiva
    const boxX = eggCarton.x - 35;
    const boxY = eggCarton.y - 120;
    const boxW = eggCarton.w + 70;
    const boxH = eggCarton.h + 230;

    // Pared trasera de cartón
    ctx.save();
    if (currentTheme === 'theme-chicken') {
      // Estilo cartón artesanal amarillo/naranja con textura
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // Bordes y dobleces de cartón corrugado
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 6;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Pestañas superiores plegadas
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(boxX, boxY);
      ctx.lineTo(boxX - 25, boxY - 40);
      ctx.lineTo(boxX + boxW + 25, boxY - 40);
      ctx.lineTo(boxX + boxW, boxY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ILUSTRACIÓN DE LA GALLINA MOMIA (Icono de la foto del usuario)
      drawMummyChicken(boxX + boxW * 0.5, boxY + 70);

    } else if (currentTheme === 'theme-basket') {
      // Tablero de baloncesto callejero
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 6;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Dibujar cuadrado blanco del tablero de básquet
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeRect(boxX + boxW * 0.3, boxY + 30, boxW * 0.4, 60);

    } else if (currentTheme === 'theme-space') {
      // Ventana a nebulosa espacial con estrellas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Estrellas parpadeantes
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 12; s++) {
        const sx = boxX + 20 + ((s * 47) % (boxW - 40));
        const sy = boxY + 15 + ((s * 33) % 90);
        ctx.fillRect(sx, sy, 2, 2);
      }

    } else if (currentTheme === 'theme-carnival') {
      // Carpa de feria a rayas rojas y blancas
      ctx.fillStyle = '#fef2f2';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = '#ef4444';
      for (let st = 0; st < boxW; st += 40) {
        ctx.fillRect(boxX + st, boxY, 20, boxH);
      }
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 6;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
    }
    ctx.restore();

    // Rampa inferior de cartón donde reposa la catapulta
    ctx.save();
    const rampTopW = boxW;
    const rampBottomW = boxW * 0.65;
    ctx.fillStyle = currentTheme === 'theme-chicken' ? '#d97706' : 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + boxH);
    ctx.lineTo(boxX + rampTopW, boxY + boxH);
    ctx.lineTo(width * 0.5 + rampBottomW * 0.5, height);
    ctx.lineTo(width * 0.5 - rampBottomW * 0.5, height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = currentTheme === 'theme-chicken' ? '#92400e' : '#ffffff22';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  // Dibujar la gallina momia artesanal con vendajes (igual a la foto subida)
  function drawMummyChicken(cx, cy) {
    ctx.save();
    // Cuadro de papel blanco de la gallina
    const paperW = 110;
    const paperH = 100;
    ctx.fillStyle = '#fffdf7';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.fillRect(cx - paperW * 0.5, cy - paperH * 0.5, paperW, paperH);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx - paperW * 0.5, cy - paperH * 0.5, paperW, paperH);

    // Murciélagos decorativos a los lados (como en la foto)
    ctx.fillStyle = '#1e1b4b';
    // Murciélago izquierdo
    drawBat(cx - 36, cy - 25);
    // Murciélago derecho
    drawBat(cx + 36, cy - 20);

    // Estrellas naranjas
    ctx.fillStyle = '#f97316';
    ctx.font = '10px sans-serif';
    ctx.fillText('✨', cx - 40, cy - 35);
    ctx.fillText('✨', cx + 30, cy - 35);

    // Cresta roja de la gallina
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 28, 7, 0, Math.PI * 2);
    ctx.arc(cx + 3, cy - 31, 8, 0, Math.PI * 2);
    ctx.arc(cx + 10, cy - 27, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cabeza y cuerpo momificado con vendajes
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 5, 24, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Líneas de vendas de momia
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 18); ctx.lineTo(cx + 16, cy - 14);
    ctx.moveTo(cx - 22, cy - 8);  ctx.lineTo(cx + 22, cy - 5);
    ctx.moveTo(cx - 20, cy + 3);  ctx.lineTo(cx + 18, cy + 8);
    ctx.moveTo(cx - 16, cy + 14); ctx.lineTo(cx + 15, cy + 17);
    ctx.stroke();

    // Ojos curiosos
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 12, 3, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy - 12, 3, 0, Math.PI * 2);
    ctx.fill();

    // Pico naranja
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 8);
    ctx.lineTo(cx + 10, cy - 4);
    ctx.lineTo(cx - 2, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    ctx.restore();
  }

  function drawBat(bx, by) {
    ctx.beginPath();
    ctx.arc(bx, by, 3, 0, Math.PI * 2);
    ctx.moveTo(bx - 3, by);
    ctx.quadraticCurveTo(bx - 8, by - 6, bx - 10, by);
    ctx.quadraticCurveTo(bx - 5, by + 4, bx - 2, by);
    ctx.moveTo(bx + 3, by);
    ctx.quadraticCurveTo(bx + 8, by - 6, bx + 10, by);
    ctx.quadraticCurveTo(bx + 5, by + 4, bx + 2, by);
    ctx.fill();
  }

  // Dibujar la huevera verde elevada sobre palitos de madera
  function drawEggCarton() {
    ctx.save();

    // 1. Palitos de helado / soportes de madera que la elevan (como en la foto)
    const stickW = 12;
    const stickH = 80;
    const stickLeftX = eggCarton.x + 35;
    const stickRightX = eggCarton.x + eggCarton.w - 35 - stickW;
    const stickY = eggCarton.y + eggCarton.h - 10;

    ctx.fillStyle = '#fde68a'; // Color madera clara de palito
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;

    // Palito izquierdo
    ctx.fillRect(stickLeftX, stickY, stickW, stickH);
    ctx.strokeRect(stickLeftX, stickY, stickW, stickH);
    // Palito derecho
    ctx.fillRect(stickRightX, stickY, stickW, stickH);
    ctx.strokeRect(stickRightX, stickY, stickW, stickH);

    // 2. Sombra proyectada por la huevera sobre el cartón
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(eggCarton.x + eggCarton.w * 0.5, eggCarton.y + eggCarton.h + 20, eggCarton.w * 0.52, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Bandeja de la huevera (Cuerpo de color temático: verde para chicken)
    let trayColor = '#15803d'; // Verde vivo como en la foto
    let trayDark = '#166534';
    if (currentTheme === 'theme-basket') { trayColor = '#ea580c'; trayDark = '#9a3412'; }
    if (currentTheme === 'theme-space') { trayColor = '#7e22ce'; trayDark = '#581c87'; }
    if (currentTheme === 'theme-carnival') { trayColor = '#ef4444'; trayDark = '#991b1b'; }

    ctx.fillStyle = trayColor;
    ctx.strokeStyle = trayDark;
    ctx.lineWidth = 4;

    // Borde ondulado de huevera
    roundRect(ctx, eggCarton.x, eggCarton.y, eggCarton.w, eggCarton.h, 18, true, true);

    // 4. Dibujar los orificios de la huevera con puntuaciones
    eggCarton.slots.forEach(slot => {
      // Cavidad oscura del orificio
      ctx.save();
      ctx.fillStyle = '#0f381d';
      if (currentTheme === 'theme-basket') ctx.fillStyle = '#431407';
      if (currentTheme === 'theme-space') ctx.fillStyle = '#2e1065';
      if (currentTheme === 'theme-carnival') ctx.fillStyle = '#450a0a';

      ctx.beginPath();
      ctx.arc(slot.x, slot.y, slot.radius, 0, Math.PI * 2);
      ctx.fill();

      // Borde del orificio (dorado para casillas de 50 pts, verde claro para el resto)
      ctx.strokeStyle = slot.isSpecial ? '#facc15' : '#4ade80';
      ctx.lineWidth = slot.isSpecial ? 3.5 : 2;
      ctx.stroke();

      // Efecto pulsante si acaba de ser encestada
      if (slot.highlightAnim > 0) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${slot.highlightAnim})`;
        ctx.lineWidth = 5;
        ctx.stroke();
        slot.highlightAnim -= 0.05;
      }

      // Número de puntuación dibujado en el centro del orificio
      ctx.fillStyle = slot.isSpecial ? '#fef08a' : '#ffffff';
      ctx.font = slot.isSpecial ? 'bold 15px Fredoka, sans-serif' : 'bold 12px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slot.points, slot.x, slot.y);

      ctx.restore();
    });

    ctx.restore();
  }

  // Dibujar la catapulta artesanal con su cuchara y base
  function drawCatapult() {
    ctx.save();

    // Base de madera con pin
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;

    // Soporte inferior en la rampa
    roundRect(ctx, catapult.x - 24, catapult.y - 12, 48, 65, 8, true, true);

    // Palito / brazo de la catapulta con animación elástica de retroceso (snap)
    const ballPos = getBallDisplayPos();
    ctx.strokeStyle = '#fde68a'; // Color madera
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';

    // Desplazamiento dinámico si hay retroceso tras el disparo
    const armEndY = catapultArmAnim.recoil > 0 ? (catapult.y - catapultArmAnim.recoil) : ballPos.y;
    const armEndX = ballPos.x;

    ctx.beginPath();
    ctx.moveTo(catapult.x, catapult.y + 45);
    ctx.lineTo(armEndX, armEndY);
    ctx.stroke();

    // Si el jugador está arrastrando la catapulta y la guía está activa -> Dibujar arco parabólico
    if (catapult.isDragging && showTrajectoryGuide) {
      drawTrajectoryGuide();
    }

    // Cuchara / cazoleta donde se aloja la bola
    ctx.fillStyle = catapultArmAnim.flashTimer > 0 ? '#ffedd5' : '#f59e0b';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(armEndX, armEndY, catapult.baseRadius * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Efecto de brillo de energía si hay un poder activo en la catapulta
    if (activePowers.fireMultiplier || activePowers.magnet) {
      ctx.strokeStyle = activePowers.fireMultiplier ? '#f97316' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(armEndX, armEndY, catapult.baseRadius * 0.95, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function getBallDisplayPos() {
    if (ball.state === 'dragging') {
      return {
        x: catapult.x + catapult.dragX,
        y: catapult.y + catapult.dragY
      };
    }
    return {
      x: ball.x,
      y: ball.y
    };
  }

  // Dibujar arco de trayectoria punteada para calibración visomotora
  function drawTrajectoryGuide() {
    ctx.save();
    const dragDist = Math.hypot(catapult.dragX, catapult.dragY);
    const power = dragDist / catapult.maxDrag;
    const angle = Math.atan2(-catapult.dragY, -catapult.dragX);

    const speed = 16 + power * 22;
    let simX = catapult.x;
    let simY = catapult.y;
    let simVx = Math.cos(angle) * speed;
    let simVy = Math.sin(angle) * speed;

    ctx.strokeStyle = activePowers.fireMultiplier ? 'rgba(249, 115, 22, 0.9)' : (activePowers.magnet ? 'rgba(56, 189, 248, 0.9)' : 'rgba(255, 255, 255, 0.75)');
    ctx.lineWidth = 3.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(simX, simY);

    for (let step = 0; step < 26; step++) {
      simX += simVx;
      simY += simVy;
      simVy += 0.46;
      ctx.lineTo(simX, simY);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Dibujar la pelota con escala 3D y sombra
  function drawBall() {
    if (ball.state === 'lost') return;

    ctx.save();
    const pos = getBallDisplayPos();

    // Escala según profundidad Z (al alejarse se reduce de 1.0 a 0.65)
    const scale = 1.0 - ball.z * 0.35;
    const currentRadius = ball.radius * Math.max(0.5, scale);

    // Sombra en el suelo / plataforma
    if (ball.state === 'flying') {
      const shadowY = Math.min(pos.y + 35 * (1 - ball.z) + 15, height * 0.85);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(pos.x, shadowY, currentRadius * 0.9, currentRadius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Color temático o de poder activo
    let ballColor = '#2563eb';
    let ballHighlight = '#60a5fa';
    if (activePowers.fireMultiplier) {
      ballColor = '#dc2626';
      ballHighlight = '#fbbf24';
    } else if (activePowers.magnet) {
      ballColor = '#0284c7';
      ballHighlight = '#e0f2fe';
    } else if (currentTheme === 'theme-basket') {
      ballColor = '#ea580c'; ballHighlight = '#fdba74';
    } else if (currentTheme === 'theme-space') {
      ballColor = '#38bdf8'; ballHighlight = '#e0f2fe';
    } else if (currentTheme === 'theme-carnival') {
      ballColor = '#fbbf24'; ballHighlight = '#fef08a';
    }

    // Aura de fuego o imán
    if (activePowers.fireMultiplier) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
    } else if (activePowers.magnet) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18;
    }

    // Gradiente esférico 3D
    const grad = ctx.createRadialGradient(
      pos.x - currentRadius * 0.35,
      pos.y - currentRadius * 0.35,
      currentRadius * 0.1,
      pos.x,
      pos.y,
      currentRadius
    );
    grad.addColorStop(0, ballHighlight);
    grad.addColorStop(0.7, ballColor);
    grad.addColorStop(1, '#0f172a');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Borde sutil
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawFloatingTexts() {
    ctx.save();
    floatingTexts.forEach(ft => {
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.alpha;
      ctx.font = 'bold 22px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.restore();
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // ========================================================
  // BUCLE DE JUEGO
  // ========================================================

  let lastTime = performance.now();
  function gameLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (isGameRunning) {
      updatePhysics(dt);
    }

    draw();
  }

  // ========================================================
  // CONTROL DEL TEMPORIZADOR Y FLUJO DE TURNOS
  // ========================================================

  function startTimer(duration) {
    clearInterval(timerInterval);
    remainingTime = duration;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      remainingTime--;
      updateTimerDisplay();

      if (remainingTime <= 5 && remainingTime > 0) {
        window.soundEngine.playTick();
        timerBox.classList.add('danger');
      }

      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        onTurnComplete();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(remainingTime / 60);
    const secs = remainingTime % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function onTurnComplete() {
    isGameRunning = false;
    timerBox.classList.remove('danger');
    window.soundEngine.playVictory();

    // Guardar estadísticas del jugador en curso
    const report = window.motorEvaluationEngine.generateReport();

    if (gameMode === 'single') {
      showSinglePlayerResults(report);
    } else {
      // Guardar en la lista multijugador
      playersList[currentPlayerIndex].score = currentScore;
      playersList[currentPlayerIndex].report = report;

      // Comprobar si faltan jugadores por jugar
      if (currentPlayerIndex < playersList.length - 1) {
        showTurnTransitionModal();
      } else {
        showMultiPlayerResults();
      }
    }
  }

  function showSinglePlayerResults(report) {
    hud.classList.add('hidden');
    screenResults.classList.remove('hidden');
    document.getElementById('single-player-results').classList.remove('hidden');
    document.getElementById('multi-player-results').classList.add('hidden');

    document.getElementById('results-title').textContent = 'Evaluación Psicomotriz';
    document.getElementById('results-subtitle').textContent = 'Análisis de precisión óculo-manual y estabilidad de atención';

    document.getElementById('res-score').textContent = report.score;
    document.getElementById('res-accuracy').textContent = `${report.accuracy}%`;
    document.getElementById('res-max-streak').textContent = report.maxStreak;
    document.getElementById('res-avg-time').textContent = `${report.avgReactionTime}s`;

    document.getElementById('diag-icon').textContent = report.gradeIcon;
    document.getElementById('diag-grade').textContent = `Nivel: ${report.level}`;
    document.getElementById('diag-percent-index').textContent = `Índice Óculo-Manual: ${report.oculomanualIndex} / 100`;
    document.getElementById('diag-meter-fill').style.width = `${report.oculomanualIndex}%`;
    document.getElementById('diag-text').textContent = report.description;
    document.getElementById('diag-tips').innerHTML = `💡 <strong>Recomendación psicomotriz:</strong> ${report.recommendation}`;
  }

  function showTurnTransitionModal() {
    hud.classList.add('hidden');
    screenTurnTransition.classList.remove('hidden');

    const currPlayer = playersList[currentPlayerIndex];
    const nextPlayer = playersList[currentPlayerIndex + 1];

    document.getElementById('turn-player-summary').innerHTML = `<strong>${currPlayer.name}</strong> finalizó su turno con <strong>${currentScore} puntos</strong> (Precisión: ${currPlayer.report.accuracy}%).`;
    document.getElementById('next-player-name-banner').textContent = nextPlayer.name;
    document.getElementById('next-player-name-banner').style.color = nextPlayer.color;
  }

  function proceedToNextTurn() {
    screenTurnTransition.classList.add('hidden');
    currentPlayerIndex++;
    startCurrentPlayerTurn();
  }

  function startCurrentPlayerTurn() {
    const player = playersList[currentPlayerIndex];
    currentScore = 0;
    currentStreak = 0;
    ballStock = maxBallStock;
    powerInventory.magnet = 2;
    powerInventory.fire = 2;
    activePowers.magnet = false;
    activePowers.fireMultiplier = false;
    if (btnPowerMagnet) btnPowerMagnet.classList.remove('active');
    if (btnPowerFire) btnPowerFire.classList.remove('active');

    window.motorEvaluationEngine.reset();
    resetBallToCatapult();

    // Actualizar HUD
    currentPlayerName.textContent = player.name;
    currentPlayerColor.style.backgroundColor = player.color;
    updateHUD();

    hud.classList.remove('hidden');
    isGameRunning = true;

    startTimer(gameMode === 'single' ? singlePlayerTime : multiPlayerTime);
  }

  function showMultiPlayerResults() {
    hud.classList.add('hidden');
    screenResults.classList.remove('hidden');
    document.getElementById('single-player-results').classList.add('hidden');
    document.getElementById('multi-player-results').classList.remove('hidden');

    document.getElementById('results-title').textContent = '🏆 Torneo Finalizado';
    document.getElementById('results-subtitle').textContent = 'Clasificación de Puntos y Coordinación Óculo-Manual';

    // Ordenar de mayor a menor puntuación
    const sorted = [...playersList].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    document.getElementById('winner-banner').textContent = `¡Ganador: ${winner.name}! (${winner.score} pts)`;
    document.getElementById('winner-banner').style.color = winner.color;

    const tbody = document.getElementById('multi-leaderboard-body');
    tbody.innerHTML = '';

    sorted.forEach((p, idx) => {
      const tr = document.createElement('tr');
      if (idx === 0) tr.classList.add('winner-row');
      tr.innerHTML = `
        <td>${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
        <td style="color: ${p.color}; font-weight: bold;">${p.name}</td>
        <td><strong>${p.score}</strong></td>
        <td>${p.report.accuracy}%</td>
        <td>${p.report.oculomanualIndex} / 100 (${p.report.level.split('-')[0]})</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ========================================================
  // INICIALIZACIÓN DE MODOS Y GESTIÓN DE MENÚS
  // ========================================================

  function startSinglePlayer() {
    gameMode = 'single';
    playersList = [{ name: 'Jugador 1', color: '#38bdf8', score: 0, report: null }];
    currentPlayerIndex = 0;
    screenMainMenu.classList.add('hidden');
    playerTurnBadge.classList.add('hidden');
    startCurrentPlayerTurn();
  }

  function openMultiplayerConfig() {
    modalMultiplayer.classList.remove('hidden');
    updatePlayerInputRows(2);
  }

  function updatePlayerInputRows(count) {
    const container = document.getElementById('player-names-container');
    container.innerHTML = '<label>Nombres de los Jugadores:</label>';
    for (let i = 0; i < count; i++) {
      const div = document.createElement('div');
      div.className = 'player-input-row';
      div.innerHTML = `
        <span class="color-dot" style="background-color: ${playerPalette[i]}"></span>
        <input type="text" value="Jugador ${i + 1}" data-player-idx="${i}" maxlength="15" />
      `;
      container.appendChild(div);
    }
  }

  function startMultiplayerTournament() {
    const inputs = document.querySelectorAll('#player-names-container input');
    playersList = [];
    inputs.forEach((inp, idx) => {
      playersList.push({
        name: inp.value.trim() || `Jugador ${idx + 1}`,
        color: playerPalette[idx],
        score: 0,
        report: null
      });
    });

    currentPlayerIndex = 0;
    gameMode = 'multi';
    modalMultiplayer.classList.add('hidden');
    screenMainMenu.classList.add('hidden');
    playerTurnBadge.classList.remove('hidden');

    startCurrentPlayerTurn();
  }

  // ========================================================
  // CONTROLADOR DE TOQUES Y EVENTOS DE INTERFAZ
  // ========================================================

  /**
   * Vincula un botón garantizando respuesta táctil instantánea tanto en móvil como en escritorio,
   * sin retardos de 300ms, sin dobles disparos, con feedback táctil visual y acústico.
   */
  function bindTouchButton(buttonEl, handler) {
    if (!buttonEl) return;

    let lastExecution = 0;
    const execute = (e) => {
      const now = performance.now();
      if (now - lastExecution < 200) {
        // Evitar dobles clics accidentales o eventos sintéticos duplicados
        return;
      }
      lastExecution = now;

      // Iniciar contexto de audio al primer toque
      window.soundEngine.init();
      if (soundFxEnabled) {
        window.soundEngine.playButtonTick();
      }

      // Feedback visual momentáneo
      buttonEl.classList.add('btn-pressed');
      setTimeout(() => buttonEl.classList.remove('btn-pressed'), 120);

      handler(e);
    };

    // Prevenir que los toques en botones se propaguen al canvas y muevan la catapulta
    buttonEl.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      buttonEl.classList.add('btn-pressed');
    }, { passive: true });

    buttonEl.addEventListener('touchend', (e) => {
      e.stopPropagation();
      e.preventDefault(); // Evita el click sintético fantasma posterior
      buttonEl.classList.remove('btn-pressed');
      execute(e);
    }, { passive: false });

    buttonEl.addEventListener('touchcancel', (e) => {
      e.stopPropagation();
      buttonEl.classList.remove('btn-pressed');
    });

    buttonEl.addEventListener('click', (e) => {
      e.stopPropagation();
      execute(e);
    });

    buttonEl.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
  }

  // Modos de Juego
  bindTouchButton(btnModeSingle, () => {
    startSinglePlayer();
  });

  bindTouchButton(btnModeMulti, () => {
    openMultiplayerConfig();
  });

  bindTouchButton(btnStartMulti, startMultiplayerTournament);
  bindTouchButton(btnCancelMulti, () => modalMultiplayer.classList.add('hidden'));

  // Cantidad de jugadores en modal multi
  document.querySelectorAll('.player-count-selector .btn-choice').forEach(btn => {
    bindTouchButton(btn, () => {
      document.querySelectorAll('.player-count-selector .btn-choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const count = parseInt(btn.dataset.players);
      updatePlayerInputRows(count);
    });
  });

  // Selector de tiempo multi
  document.querySelectorAll('#multi-time-selector .btn-choice').forEach(btn => {
    bindTouchButton(btn, () => {
      document.querySelectorAll('#multi-time-selector .btn-choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      multiPlayerTime = parseInt(btn.dataset.time);
    });
  });

  // Selector de tiempo individual
  document.querySelectorAll('#single-time-selector .btn-choice').forEach(btn => {
    bindTouchButton(btn, () => {
      document.querySelectorAll('#single-time-selector .btn-choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      singlePlayerTime = parseInt(btn.dataset.time);
    });
  });

  // Temas visuales
  document.querySelectorAll('.theme-option').forEach(card => {
    bindTouchButton(card, () => {
      document.querySelectorAll('.theme-option').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentTheme = card.dataset.theme;
      document.body.className = currentTheme;
    });
  });

  // Modales
  bindTouchButton(btnOpenSettings, () => modalSettings.classList.remove('hidden'));
  if (btnHudSettings) {
    bindTouchButton(btnHudSettings, () => modalSettings.classList.remove('hidden'));
  }
  bindTouchButton(btnCloseSettings, () => modalSettings.classList.add('hidden'));

  bindTouchButton(btnOpenInstructions, () => modalInstructions.classList.remove('hidden'));
  bindTouchButton(btnCloseInstructions, () => modalInstructions.classList.add('hidden'));

  // Slider de Sensibilidad del Control
  if (sliderSensitivity && sensitivityValueLabel) {
    sliderSensitivity.addEventListener('input', (e) => {
      controlSensitivity = parseFloat(e.target.value);
      sensitivityValueLabel.textContent = `${controlSensitivity.toFixed(1)}x`;
    });
    // Evitar que arrastrar el slider en móvil mueva cosas externas
    sliderSensitivity.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    sliderSensitivity.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
  }

  // Selector de Modo de Control (Slingshot o Tap Directo)
  document.querySelectorAll('#control-selector .btn-choice').forEach(btn => {
    bindTouchButton(btn, () => {
      document.querySelectorAll('#control-selector .btn-choice').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      controlMode = btn.dataset.control || 'slingshot';
      if (hintTextContent) {
        if (controlMode === 'tap') {
          hintTextContent.textContent = '🎯 Toca directamente cualquier casilla para disparar';
        } else {
          hintTextContent.textContent = '🏹 Arrastra hacia atrás o pulsa "¡LANZAR!"';
        }
      }
    });
  });

  // Checkbox de Asistencia de Trayectoria
  if (chkGuide) {
    chkGuide.addEventListener('change', (e) => {
      showTrajectoryGuide = e.target.checked;
    });
  }

  // Checkbox de Recarga Ultra-Rápida
  if (chkFastReload) {
    chkFastReload.addEventListener('change', (e) => {
      fastReloadEnabled = e.target.checked;
    });
  }

  // Checkbox de Efectos de Sonido
  if (chkSoundFx) {
    chkSoundFx.addEventListener('change', (e) => {
      soundFxEnabled = e.target.checked;
      if (!soundFxEnabled) {
        window.soundEngine.muted = true;
        soundIcon.textContent = '🔇';
      } else {
        window.soundEngine.muted = false;
        soundIcon.textContent = '🔊';
      }
    });
  }

  bindTouchButton(btnStartNextTurn, proceedToNextTurn);

  bindTouchButton(btnRestartGame, () => {
    screenResults.classList.add('hidden');
    if (gameMode === 'single') {
      startSinglePlayer();
    } else {
      currentPlayerIndex = 0;
      startCurrentPlayerTurn();
    }
  });

  bindTouchButton(btnBackMenuResults, () => {
    screenResults.classList.add('hidden');
    screenMainMenu.classList.remove('hidden');
  });

  bindTouchButton(btnMenuBack, () => {
    clearInterval(timerInterval);
    isGameRunning = false;
    hud.classList.add('hidden');
    screenMainMenu.classList.remove('hidden');
  });

  bindTouchButton(btnToggleSound, () => {
    const muted = window.soundEngine.toggleMute();
    soundIcon.textContent = muted ? '🔇' : '🔊';
    if (chkSoundFx) chkSoundFx.checked = !muted;
    soundFxEnabled = !muted;
  });

  // Botón fácil de lanzamiento rápido en pantalla
  if (btnQuickLaunch) {
    bindTouchButton(btnQuickLaunch, () => {
      triggerEasyLaunch();
    });
  }

  // Botón Recargar Bolas
  if (btnReloadBalls) {
    bindTouchButton(btnReloadBalls, () => {
      ballStock = maxBallStock;
      updateHUD();
      if (soundFxEnabled) {
        window.soundEngine.playReload();
      }
      showFeedback('¡Bolas Recargadas! 🔵x12', '#38bdf8');
      if (ball.state !== 'flying') {
        resetBallToCatapult();
      }
    });
  }

  // Poder 1: Imán Magnético (Atrae bolas a los orificios)
  if (btnPowerMagnet) {
    bindTouchButton(btnPowerMagnet, () => {
      if (powerInventory.magnet <= 0 && !activePowers.magnet) {
        showFeedback('¡Sin energía de Imán!', '#ef476f');
        return;
      }

      if (activePowers.magnet) {
        activePowers.magnet = false;
        btnPowerMagnet.classList.remove('active');
        showFeedback('Imán Desactivado', '#cbd5e1');
      } else {
        activePowers.magnet = true;
        powerInventory.magnet--;
        btnPowerMagnet.classList.add('active');
        if (soundFxEnabled) window.soundEngine.playPowerUp();
        showFeedback('🧲 ¡IMÁN ACTIVO! Atracción Máxima', '#38bdf8');
        updateHUD();
      }
    });
  }

  // Poder 2: Fuego Multiplicador x2
  if (btnPowerFire) {
    bindTouchButton(btnPowerFire, () => {
      if (powerInventory.fire <= 0 && !activePowers.fireMultiplier) {
        showFeedback('¡Sin energía de Fuego!', '#ef476f');
        return;
      }

      if (activePowers.fireMultiplier) {
        activePowers.fireMultiplier = false;
        btnPowerFire.classList.remove('active');
        showFeedback('Puntos x2 Desactivado', '#cbd5e1');
      } else {
        activePowers.fireMultiplier = true;
        powerInventory.fire--;
        btnPowerFire.classList.add('active');
        if (soundFxEnabled) window.soundEngine.playPowerUp();
        showFeedback('⚡ ¡FUEGO ACTIVO! Puntos Dobles x2', '#f97316');
        updateHUD();
      }
    });
  }

  // Control con teclado: Barra espaciadora como alternativa
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isGameRunning) {
      e.preventDefault();
      triggerEasyLaunch();
    }
  });

  // Inicialización
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  requestAnimationFrame(gameLoop);

})();
