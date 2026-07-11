(() => {
  const scope = window.VCAM || (window.VCAM = {});
const STAGES = [
  { time: 0, image: "assets/2.png", status: "CAMERA SIGNAL SEARCHING" },
  { time: 620, image: "assets/2-1.png", status: "SUBJECT DATA SYNCHRONIZING" },
  { time: 1420, image: "assets/2-2.png", status: "INTERACTIVE FEED CONNECTING" },
  { time: 2480, image: "assets/2-3.png", status: "CONNECTION ESTABLISHED" }
];

function startLoading(onComplete) {
  const screen = document.getElementById("loadingScreen");
  const artWrap = document.getElementById("loadingArtWrap");
  const art = document.getElementById("loadingArt");
  const percent = document.getElementById("loadingPercent");
  const bar = document.getElementById("loadingBar");
  const fill = document.getElementById("loadingBarFill");
  const status = document.getElementById("loadingStatus");
  const duration = 3800;
  let currentImage = art.getAttribute("src");
  let finished = false;

  const getStage = elapsed => {
    for (let index = STAGES.length - 1; index >= 0; index -= 1) {
      if (elapsed >= STAGES[index].time) return STAGES[index];
    }
    return STAGES[0];
  };

  const render = (elapsed, progress) => {
    const value = Math.min(100, Math.floor(progress));
    const stage = getStage(elapsed);
    percent.textContent = `${value}%`;
    fill.style.width = `${value}%`;
    bar.setAttribute("aria-valuenow", String(value));
    status.textContent = stage.status;

    if (currentImage !== stage.image) {
      currentImage = stage.image;
      art.src = stage.image;
    }
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    render(duration, 100);
    artWrap.classList.add("is-flickering");
    window.setTimeout(() => {
      screen.classList.remove("is-active");
      screen.setAttribute("aria-hidden", "true");
      onComplete();
    }, 760);
  };

  const startedAt = performance.now();
  const step = now => {
    const elapsed = Math.min(duration, now - startedAt);
    const progress = elapsed / duration;
    const eased = 1 - Math.pow(1 - progress, 2.15);
    render(elapsed, eased * 100);
    if (progress === 1) finish();
    else requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

  scope.startLoading = startLoading;
})();
