(() => {
  const scope = window.VCAM || (window.VCAM = {});
  const { createGameFrame, random, runCountdown } = scope.shared;

  function mountValGame(host, onComplete) {
    const frame = createGameFrame("VAL SHOOTING", [
      { key: "score", label: "SCORE", value: "0" },
      { key: "target", label: "TARGET", value: "0" },
      { key: "miss", label: "MISS", value: "0 / 3" }
    ]);

    frame.center.innerHTML = `
      <div class="shooter-area" aria-label="사격 게임 영역">
        <div class="shooter-crosshair"></div>
      </div>
    `;
    host.replaceChildren(frame.view);

    const area = frame.center.querySelector(".shooter-area");
    const scoreValue = frame.stat("score");
    const targetValue = frame.stat("target");
    const missValue = frame.stat("miss");
    const state = {
      score: 0,
      appeared: 0,
      missed: 0,
      target: null,
      targetTimer: 0,
      nextTimer: 0,
      running: false,
      stopped: false,
      finished: false
    };

    const updateHud = () => {
      scoreValue.textContent = state.score.toLocaleString();
      targetValue.textContent = state.appeared.toLocaleString();
      missValue.textContent = `${state.missed} / 3`;
    };

    const finish = () => {
      if (state.finished || state.stopped) return;
      state.finished = true;
      state.running = false;
      window.clearTimeout(state.targetTimer);
      window.clearTimeout(state.nextTimer);
      state.target?.remove();
      state.target = null;
      onComplete({
        game: "val",
        score: state.score,
        clear_time_ms: null,
        gameLabel: "VAL SHOOTING / GAME OVER",
        summary: `최종 점수 ${state.score.toLocaleString()}점 · 명중 ${state.score / 10}회`
      });
    };

    const resolveTarget = hit => {
      if (!state.target || state.stopped || state.finished) return;
      window.clearTimeout(state.targetTimer);
      const target = state.target;
      state.target = null;

      if (hit) {
        state.score += 10;
        target.disabled = true;
        target.classList.add("is-hit");
        target.querySelector("img").src = "assets/hart4.png?v=6";
      } else {
        state.missed += 1;
      }

      updateHud();
      const removeDelay = hit ? 120 : 60;
      const nextDelay = hit ? 135 : 85;

      if (state.missed >= 3) {
        state.nextTimer = window.setTimeout(() => {
          target.remove();
          finish();
        }, removeDelay + 120);
        return;
      }

      state.nextTimer = window.setTimeout(() => {
        target.remove();
        spawnTarget();
      }, nextDelay);
    };

    function spawnTarget() {
      if (!state.running || state.stopped || state.finished) return;
      state.appeared += 1;
      updateHud();

      const target = document.createElement("button");
      target.type = "button";
      target.className = "target-heart";
      target.setAttribute("aria-label", `${state.appeared}번째 하트 표적`);
      target.style.left = `${random(20, 80)}%`;
      target.style.top = `${random(20, 80)}%`;
      target.innerHTML = `<img src="assets/hart1.png?v=6" alt="하트 표적">`;
      target.addEventListener("pointerdown", event => {
        event.preventDefault();
        resolveTarget(true);
      }, { once: true });

      state.target = target;
      area.appendChild(target);
      state.targetTimer = window.setTimeout(() => resolveTarget(false), 720);
    }

    runCountdown(frame.view, () => state.stopped).then(allowed => {
      if (!allowed) return;
      state.running = true;
      spawnTarget();
    });

    return {
      destroy() {
        state.stopped = true;
        state.running = false;
        window.clearTimeout(state.targetTimer);
        window.clearTimeout(state.nextTimer);
        state.target?.remove();
        state.target = null;
      }
    };
  }

  scope.games = scope.games || {};
  scope.games.val = mountValGame;
})();
