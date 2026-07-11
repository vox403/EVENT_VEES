(() => {
  const scope = window.VCAM || (window.VCAM = {});
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function shuffle(values) {
  const items = [...values];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

function formatTime(milliseconds) {
  const safeValue = Math.max(0, Number(milliseconds) || 0);
  const hundredths = Math.floor(safeValue / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor((hundredths % 6000) / 100);
  const remainder = hundredths % 100;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(remainder).padStart(2, "0")}`;
}

function createGameFrame(title, stats) {
  const view = document.createElement("div");
  view.className = "game-view";
  view.innerHTML = `
    <div class="game-hud">
      <h3>${title}</h3>
      <div class="stat-row">
        ${stats.map(({ key, label, value }) => `
          <div class="stat-chip">
            <span>${label}</span>
            <strong data-stat="${key}">${value}</strong>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="game-center"></div>
  `;

  return {
    view,
    center: view.querySelector(".game-center"),
    stat(key) {
      return view.querySelector(`[data-stat="${key}"]`);
    }
  };
}

function runCountdown(container, isStopped) {
  return new Promise(resolve => {
    const layer = document.createElement("div");
    const sequence = ["3", "2", "1", "GO"];
    let position = 0;

    layer.className = "countdown-layer";
    container.appendChild(layer);

    const tick = () => {
      if (isStopped()) {
        layer.remove();
        resolve(false);
        return;
      }

      layer.innerHTML = `<strong>${sequence[position]}</strong>`;
      position += 1;

      if (position === sequence.length) {
        window.setTimeout(() => {
          layer.remove();
          resolve(!isStopped());
        }, 420);
        return;
      }

      window.setTimeout(tick, 600);
    };

    tick();
  });
}

  scope.shared = { clamp, random, shuffle, formatTime, createGameFrame, runCountdown };
})();
