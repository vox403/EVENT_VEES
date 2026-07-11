(() => {
  const scope = window.VCAM || (window.VCAM = {});
  const { createGameFrame, formatTime, runCountdown, shuffle } = scope.shared;
function mountVelGame(host, onComplete) {
  const frame = createGameFrame("VEL PUZZLE", [
    { key: "time", label: "TIME", value: "00:00.00" },
    { key: "moves", label: "MOVES", value: "0" }
  ]);

  frame.center.innerHTML = `
    <div class="puzzle-layout">
      <div class="puzzle-board" aria-label="50피스 퍼즐 보드"></div>
      <div class="puzzle-preview">
        <img src="assets/3.png" alt="퍼즐 원본 미리보기">
      </div>
    </div>
  `;
  host.replaceChildren(frame.view);

  const board = frame.center.querySelector(".puzzle-board");
  const timeValue = frame.stat("time");
  const moveValue = frame.stat("moves");
  const tileCount = 50;
  const state = {
    order: shuffle(Array.from({ length: tileCount }, (_, index) => index)),
    selected: null,
    dragged: null,
    suppressClick: false,
    moves: 0,
    startedAt: 0,
    elapsed: 0,
    frameId: 0,
    running: false,
    stopped: false,
    finished: false
  };

  if (state.order.every((piece, position) => piece === position)) {
    state.order.push(state.order.shift());
  }

  const getBackgroundPosition = piece => {
    const column = piece % 10;
    const row = Math.floor(piece / 10);
    return {
      x: column / 9 * 100,
      y: row / 4 * 100
    };
  };

  const renderTile = (button, position) => {
    const piece = state.order[position];
    const background = getBackgroundPosition(piece);
    button.dataset.position = String(position);
    button.dataset.piece = String(piece);
    button.style.backgroundSize = "1000% 500%";
    button.style.backgroundPosition = `${background.x}% ${background.y}%`;
    button.setAttribute("aria-label", `${position + 1}번 위치의 퍼즐 조각`);
    button.classList.toggle("is-selected", state.selected === position);
  };

  const renderBoard = () => {
    const fragment = document.createDocumentFragment();
    for (let position = 0; position < tileCount; position += 1) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "puzzle-tile";
      tile.draggable = true;
      renderTile(tile, position);
      fragment.appendChild(tile);
    }
    board.replaceChildren(fragment);
  };

  const solved = () => state.order.every((piece, position) => piece === position);

  const updateTimer = now => {
    if (!state.running || state.stopped || state.finished) return;
    state.elapsed = now - state.startedAt;
    timeValue.textContent = formatTime(state.elapsed);
    state.frameId = requestAnimationFrame(updateTimer);
  };

  const finish = () => {
    if (state.finished || state.stopped) return;
    state.finished = true;
    state.running = false;
    state.elapsed = performance.now() - state.startedAt;
    cancelAnimationFrame(state.frameId);
    timeValue.textContent = formatTime(state.elapsed);
    board.innerHTML = `<img class="puzzle-finish-image" src="assets/3.png" alt="완성된 퍼즐">`;
    window.setTimeout(() => {
      if (state.stopped) return;
      onComplete({
        game: "vel",
        score: 0,
        clear_time_ms: Math.round(state.elapsed),
        gameLabel: "VEL PUZZLE / CLEAR",
        summary: `클리어 타임 ${formatTime(state.elapsed)} · 이동 ${state.moves.toLocaleString()}회`
      });
    }, 500);
  };

  const swap = (first, second) => {
    if (!state.running || state.finished || first === second) return;
    [state.order[first], state.order[second]] = [state.order[second], state.order[first]];
    state.moves += 1;
    state.selected = null;
    moveValue.textContent = state.moves.toLocaleString();

    const tiles = board.querySelectorAll(".puzzle-tile");
    renderTile(tiles[first], first);
    renderTile(tiles[second], second);
    tiles.forEach(tile => tile.classList.remove("is-selected"));
    if (solved()) finish();
  };

  const handleClick = event => {
    const tile = event.target.closest(".puzzle-tile");
    if (!tile || !state.running || state.finished || state.suppressClick) return;
    const position = Number(tile.dataset.position);

    if (state.selected === null) {
      state.selected = position;
      tile.classList.add("is-selected");
      return;
    }

    if (state.selected === position) {
      state.selected = null;
      tile.classList.remove("is-selected");
      return;
    }

    swap(state.selected, position);
  };

  const handleDragStart = event => {
    const tile = event.target.closest(".puzzle-tile");
    if (!tile || !state.running || state.finished) {
      event.preventDefault();
      return;
    }
    state.dragged = Number(tile.dataset.position);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(state.dragged));
  };

  const handleDragOver = event => {
    if (!event.target.closest(".puzzle-tile") || !state.running || state.finished) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = event => {
    const tile = event.target.closest(".puzzle-tile");
    if (!tile || state.dragged === null || !state.running || state.finished) return;
    event.preventDefault();
    state.suppressClick = true;
    swap(state.dragged, Number(tile.dataset.position));
    state.dragged = null;
    window.setTimeout(() => {
      state.suppressClick = false;
    }, 80);
  };

  const clearDrag = () => {
    state.dragged = null;
  };

  renderBoard();
  board.addEventListener("click", handleClick);
  board.addEventListener("dragstart", handleDragStart);
  board.addEventListener("dragover", handleDragOver);
  board.addEventListener("drop", handleDrop);
  board.addEventListener("dragend", clearDrag);

  runCountdown(frame.view, () => state.stopped).then(allowed => {
    if (!allowed) return;
    state.running = true;
    state.startedAt = performance.now();
    state.frameId = requestAnimationFrame(updateTimer);
  });

  return {
    destroy() {
      state.stopped = true;
      state.running = false;
      cancelAnimationFrame(state.frameId);
      board.removeEventListener("click", handleClick);
      board.removeEventListener("dragstart", handleDragStart);
      board.removeEventListener("dragover", handleDragOver);
      board.removeEventListener("drop", handleDrop);
      board.removeEventListener("dragend", clearDrag);
    }
  };
}

  scope.games = scope.games || {};
  scope.games.vel = mountVelGame;
})();
