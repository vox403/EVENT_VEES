(() => {
  const scope = window.VCAM || (window.VCAM = {});
  const { clamp, createGameFrame, random, runCountdown } = scope.shared;
function mountVoxGame(host, onComplete) {
  const frame = createGameFrame("VOX RHYTHM", [
    { key: "score", label: "SCORE", value: "0" },
    { key: "combo", label: "COMBO", value: "0" },
    { key: "miss", label: "MISS", value: "0 / 3" }
  ]);

  frame.center.innerHTML = `
    <div class="rhythm-stage" aria-label="리듬 게임 영역">
      <span class="rhythm-note">
        <span class="rhythm-ring"></span>
        <button class="rhythm-target" type="button" aria-label="리듬 판정 원"></button>
        <span class="judgement"></span>
      </span>
    </div>
  `;
  host.replaceChildren(frame.view);

  const stage = frame.center.querySelector(".rhythm-stage");
  const note = frame.center.querySelector(".rhythm-note");
  const ring = frame.center.querySelector(".rhythm-ring");
  const target = frame.center.querySelector(".rhythm-target");
  const judgement = frame.center.querySelector(".judgement");
  const scoreValue = frame.stat("score");
  const comboValue = frame.stat("combo");
  const missValue = frame.stat("miss");
  const state = {
    stopped: false,
    running: false,
    noteActive: false,
    noteStartedAt: 0,
    noteDuration: 1450,
    noteSize: 220,
    frameId: 0,
    nextTimer: 0,
    judgementTimer: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    misses: 0,
    resolved: 0
  };

  const updateHud = () => {
    scoreValue.textContent = state.score.toLocaleString();
    comboValue.textContent = String(state.combo);
    missValue.textContent = `${state.misses} / 3`;
  };

  const showJudgement = (label, missed = false) => {
    window.clearTimeout(state.judgementTimer);
    judgement.textContent = label;
    judgement.className = `judgement is-visible${missed ? " is-miss" : ""}`;
    state.judgementTimer = window.setTimeout(() => {
      if (!state.stopped) judgement.className = "judgement";
    }, 430);
  };

  const placeNote = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const horizontalMargin = Math.min(120, width * .3);
    const verticalMargin = Math.min(120, height * .3);
    note.style.left = `${random(horizontalMargin, Math.max(horizontalMargin + 1, width - horizontalMargin))}px`;
    note.style.top = `${random(verticalMargin, Math.max(verticalMargin + 1, height - verticalMargin))}px`;
  };

  const finish = () => {
    state.running = false;
    state.noteActive = false;
    cancelAnimationFrame(state.frameId);
    window.clearTimeout(state.nextTimer);
    onComplete({
      game: "vox",
      score: state.score,
      clear_time_ms: null,
      gameLabel: "VOX RHYTHM / GAME OVER",
      summary: `최종 점수 ${state.score.toLocaleString()}점 · 최고 콤보 ${state.maxCombo.toLocaleString()}`
    });
  };

  const scheduleNext = () => {
    if (state.stopped || !state.running) return;
    const delay = Math.max(120, 360 - state.resolved * 8);
    state.nextTimer = window.setTimeout(beginNote, delay);
  };

  const resolveNote = (label, points) => {
    if (!state.noteActive || state.stopped || !state.running) return;
    state.noteActive = false;
    cancelAnimationFrame(state.frameId);
    state.resolved += 1;

    if (points > 0) {
      state.score += points;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      showJudgement(`${label} +${points}`);
    } else {
      state.combo = 0;
      state.misses += 1;
      showJudgement("MISS", true);
    }

    updateHud();
    if (state.misses >= 3) {
      state.nextTimer = window.setTimeout(finish, 520);
    } else {
      scheduleNext();
    }
  };

  const animateNote = now => {
    if (!state.noteActive || state.stopped || !state.running) return;
    const progress = clamp((now - state.noteStartedAt) / state.noteDuration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 1.26);
    const size = state.noteSize + (12 - state.noteSize) * eased;
    ring.style.setProperty("--ring-size", `${size}px`);

    if (progress === 1) {
      resolveNote("MISS", 0);
      return;
    }
    state.frameId = requestAnimationFrame(animateNote);
  };

  function beginNote() {
    if (state.stopped || !state.running) return;
    placeNote();
    state.noteDuration = Math.max(560, 1450 - state.resolved * 32);
    state.noteSize = random(170, 205);
    state.noteActive = true;
    state.noteStartedAt = performance.now();
    ring.style.setProperty("--ring-size", `${state.noteSize}px`);
    state.frameId = requestAnimationFrame(animateNote);
  }

  const judge = () => {
    if (!state.noteActive || state.stopped || !state.running) return;
    const ringSize = parseFloat(getComputedStyle(ring).getPropertyValue("--ring-size")) || state.noteSize;
    const targetSize = target.getBoundingClientRect().width;
    const difference = Math.abs(ringSize - targetSize) / 2;

    if (difference <= 2.5) resolveNote("PERFECT", 100);
    else if (difference <= 7) resolveNote("GREAT", 50);
    else if (difference <= 13) resolveNote("GOOD", 10);
    else resolveNote("MISS", 0);
  };

  target.addEventListener("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();
    judge();
  });

  runCountdown(frame.view, () => state.stopped).then(allowed => {
    if (!allowed) return;
    state.running = true;
    beginNote();
  });

  return {
    destroy() {
      state.stopped = true;
      state.running = false;
      state.noteActive = false;
      cancelAnimationFrame(state.frameId);
      window.clearTimeout(state.nextTimer);
      window.clearTimeout(state.judgementTimer);
    }
  };
}

  scope.games = scope.games || {};
  scope.games.vox = mountVoxGame;
})();
