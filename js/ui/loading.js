(() => {
  const scope = window.VCAM || (window.VCAM = {});
  const stages = [
    { at: 0, image: "assets/2.png", status: "CAMERA SIGNAL SEARCHING" },
    { at: 30, image: "assets/2-1.png", status: "SUBJECT DATA SYNCHRONIZING" },
    { at: 60, image: "assets/2-2.png", status: "INTERACTIVE FEED CONNECTING" },
    { at: 99, image: "assets/2-3.png", status: "CONNECTION ESTABLISHED" }
  ];
  const flickerFrames = [
    "assets/2.png",
    "assets/2-3.png",
    "assets/2.png",
    "assets/2-3.png"
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
    const flickerStart = 94;
    const flickerEnd = 99;
    let currentImage = art.getAttribute("src");
    let finished = false;

    const getStage = progress => {
      for (let index = stages.length - 1; index >= 0; index -= 1) {
        if (progress >= stages[index].at) return stages[index];
      }
      return stages[0];
    };

    const getFlickerImage = progress => {
      const ratio = Math.min(0.9999, Math.max(0, (progress - flickerStart) / (flickerEnd - flickerStart)));
      return flickerFrames[Math.floor(ratio * flickerFrames.length)];
    };

    const render = progress => {
      const exactValue = Math.min(100, progress);
      const value = Math.floor(exactValue);
      const flickering = exactValue >= flickerStart && exactValue < flickerEnd;
      const stage = getStage(exactValue);
      const nextImage = flickering ? getFlickerImage(exactValue) : stage.image;

      percent.textContent = `${value}%`;
      fill.style.width = `${exactValue}%`;
      bar.setAttribute("aria-valuenow", String(value));
      status.textContent = flickering ? "SIGNAL STABILIZING" : stage.status;
      artWrap.classList.remove("is-flickering");

      if (currentImage !== nextImage) {
        currentImage = nextImage;
        art.src = nextImage;
      }
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      render(100);
      window.setTimeout(() => {
        screen.classList.remove("is-active");
        screen.setAttribute("aria-hidden", "true");
        onComplete();
      }, 120);
    };

    const startedAt = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 2.15);
      render(eased * 100);
      if (progress === 1) finish();
      else requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  scope.startLoading = startLoading;
})();
