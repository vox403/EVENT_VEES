(() => {
  const { characters: CHARACTERS, games, ScoreBoard, startLoading, shared } = window.VCAM;
  const { formatTime } = shared;
  const GAMES = Object.freeze({ ...games });

  class ArcadeController {
    constructor() {
      this.scoreBoard = new ScoreBoard();
      this.selectedCharacter = null;
      this.game = null;
      this.pendingResult = null;
      this.rankingRequest = 0;
      this.toastTimer = 0;
      this.clockTimer = 0;
      this.entryTransitionTimer = 0;
      this.touchEntryMode = window.matchMedia("(hover: none), (pointer: coarse)").matches;
      this.nodes = {
        selectionScreen: document.getElementById("selectionScreen"),
        mainScreen: document.getElementById("mainScreen"),
        siteCredit: document.getElementById("siteCredit"),
        idleFeed: document.getElementById("idleFeed"),
        gameHost: document.getElementById("gameHost"),
        cameraCode: document.getElementById("cameraCode"),
        cameraMode: document.getElementById("cameraMode"),
        cameraClock: document.getElementById("cameraClock"),
        restartButton: document.getElementById("restartGameButton"),
        closeButton: document.getElementById("closeGameButton"),
        refreshButton: document.getElementById("refreshRankingButton"),
        rankingTitle: document.getElementById("rankingTitle"),
        rankingList: document.getElementById("rankingList"),
        entryCards: [...document.querySelectorAll(".entry-card")],
        characterCards: [...document.querySelectorAll(".character-card")],
        resultModal: document.getElementById("resultModal"),
        resultGameLabel: document.getElementById("resultGameLabel"),
        resultSummary: document.getElementById("resultSummary"),
        scoreForm: document.getElementById("scoreForm"),
        playerName: document.getElementById("playerName"),
        formMessage: document.getElementById("formMessage"),
        skipButton: document.getElementById("skipScoreButton"),
        submitButton: document.getElementById("submitScoreButton"),
        toast: document.getElementById("toast")
      };

      this.bindEvents();
      this.updateClock();
      this.clockTimer = window.setInterval(() => this.updateClock(), 1000);
    }

    bindEvents() {
      this.nodes.entryCards.forEach(card => {
        card.addEventListener("pointerenter", () => {
          if (!this.touchEntryMode) this.syncEntryPortrait(card, true);
        });
        card.addEventListener("pointerleave", () => {
          if (!this.touchEntryMode) this.syncEntryPortrait(card);
        });
        card.addEventListener("focus", () => {
          if (!this.touchEntryMode) this.syncEntryPortrait(card, true);
        });
        card.addEventListener("blur", () => {
          if (!this.touchEntryMode) this.syncEntryPortrait(card);
        });
        card.addEventListener("click", () => this.handleEntrySelection(card));
      });

      this.nodes.characterCards.forEach(card => {
        card.addEventListener("pointerenter", () => this.syncPortrait(card, true));
        card.addEventListener("pointerleave", () => this.syncPortrait(card));
        card.addEventListener("click", () => this.selectCharacter(card.dataset.character));
      });

      this.nodes.restartButton.addEventListener("click", () => {
        if (!this.selectedCharacter) return;
        this.closeResultModal();
        this.startGame(this.selectedCharacter);
      });

      this.nodes.closeButton.addEventListener("click", () => this.disconnect());
      this.nodes.refreshButton.addEventListener("click", () => {
        if (!this.selectedCharacter) return;
        this.loadRanking(this.selectedCharacter);
      });

      this.nodes.skipButton.addEventListener("click", () => this.closeResultModal());
      this.nodes.resultModal.addEventListener("pointerdown", event => {
        if (event.target === this.nodes.resultModal) this.closeResultModal();
      });
      this.nodes.scoreForm.addEventListener("submit", event => this.submitScore(event));
      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && this.nodes.resultModal.classList.contains("is-active")) {
          this.closeResultModal();
        }
      });
    }

    revealSelection() {
      window.clearTimeout(this.entryTransitionTimer);
      this.nodes.siteCredit.classList.add("is-visible");
      this.nodes.siteCredit.setAttribute("aria-hidden", "false");
      this.nodes.mainScreen.classList.remove("is-active");
      this.nodes.mainScreen.setAttribute("aria-hidden", "true");
      this.nodes.selectionScreen.classList.add("is-active");
      this.nodes.selectionScreen.setAttribute("aria-hidden", "false");
      this.resetEntryPreview();
    }

    resetEntryPreview(activeCard = null) {
      this.nodes.entryCards.forEach(card => {
        const active = card === activeCard;
        card.classList.toggle("is-previewing", active);
        card.setAttribute("aria-expanded", String(active));
        this.syncEntryPortrait(card, active);
      });
    }

    handleEntrySelection(card) {
      if (!this.touchEntryMode) {
        this.openArcade(card.dataset.character);
        return;
      }

      window.clearTimeout(this.entryTransitionTimer);
      this.resetEntryPreview(card);
      this.entryTransitionTimer = window.setTimeout(() => {
        this.openArcade(card.dataset.character);
      }, 900);
    }

    openArcade(character) {
      if (!CHARACTERS[character]) return;
      window.clearTimeout(this.entryTransitionTimer);
      this.resetEntryPreview();
      this.nodes.selectionScreen.classList.remove("is-active");
      this.nodes.selectionScreen.setAttribute("aria-hidden", "true");
      this.nodes.mainScreen.classList.add("is-active");
      this.nodes.mainScreen.setAttribute("aria-hidden", "false");
      this.selectCharacter(character);
    }

    updateClock() {
      const now = new Date();
      this.nodes.cameraClock.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
    }

    showToast(message) {
      window.clearTimeout(this.toastTimer);
      this.nodes.toast.textContent = message;
      this.nodes.toast.classList.add("is-visible");
      this.toastTimer = window.setTimeout(() => {
        this.nodes.toast.classList.remove("is-visible");
      }, 2800);
    }

    syncEntryPortrait(card, active = false) {
      const image = card.querySelector("img");
      image.src = active ? image.dataset.hover : image.dataset.default;
    }

    syncPortrait(card, hovered = false) {
      const image = card.querySelector("img");
      image.src = hovered || card.classList.contains("is-active")
        ? image.dataset.hover
        : image.dataset.default;
    }

    selectCharacter(character) {
      const settings = CHARACTERS[character];
      if (!settings) return;

      this.closeResultModal();
      this.selectedCharacter = character;
      document.body.dataset.theme = settings.theme;

      this.nodes.characterCards.forEach(card => {
        card.classList.toggle("is-active", card.dataset.character === character);
        this.syncPortrait(card);
      });

      this.nodes.rankingTitle.textContent = settings.rankingTitle;
      this.startGame(character);
      this.loadRanking(character);
    }

    startGame(character) {
      this.destroyGame();
      const settings = CHARACTERS[character];
      this.nodes.idleFeed.hidden = true;
      this.nodes.cameraCode.textContent = settings.cameraCode;
      this.nodes.cameraMode.textContent = settings.cameraMode;
      this.nodes.restartButton.disabled = false;
      this.nodes.closeButton.disabled = false;
      this.game = GAMES[character](this.nodes.gameHost, result => this.openResultModal(result));
    }

    destroyGame() {
      this.game?.destroy?.();
      this.game = null;
      this.nodes.gameHost.replaceChildren();
    }

    resetArcade() {
      this.closeResultModal();
      this.destroyGame();
      this.selectedCharacter = null;
      this.rankingRequest += 1;
      delete document.body.dataset.theme;

      this.nodes.characterCards.forEach(card => {
        card.classList.remove("is-active");
        this.syncPortrait(card);
      });

      this.nodes.idleFeed.hidden = false;
      this.nodes.cameraCode.textContent = "CAM_00 / STANDBY";
      this.nodes.cameraMode.textContent = "AUTO FOCUS";
      this.nodes.rankingTitle.textContent = "RANKING";
      this.nodes.rankingList.innerHTML = `<li class="ranking-empty">인물을 선택해 주세요.</li>`;
      this.nodes.restartButton.disabled = true;
      this.nodes.closeButton.disabled = true;
    }

    disconnect() {
      this.resetArcade();
      this.revealSelection();
    }

    formatScore(game, row) {
      return game === "vel"
        ? formatTime(row.clear_time_ms)
        : `${Number(row.score || 0).toLocaleString()} P`;
    }

    renderRanking(game, rows) {
      if (!rows.length) {
        this.nodes.rankingList.innerHTML = `<li class="ranking-empty">아직 등록된 기록이 없습니다.</li>`;
        return;
      }

      const fragment = document.createDocumentFragment();
      rows.slice(0, 10).forEach((row, index) => {
        const item = document.createElement("li");
        const rank = document.createElement("span");
        const name = document.createElement("span");
        const score = document.createElement("span");
        rank.className = "rank-number";
        name.className = "rank-name";
        score.className = "rank-score";
        rank.textContent = String(index + 1).padStart(2, "0");
        name.textContent = row.player_name;
        score.textContent = this.formatScore(game, row);
        item.append(rank, name, score);
        fragment.appendChild(item);
      });
      this.nodes.rankingList.replaceChildren(fragment);
    }

    async loadRanking(game = this.selectedCharacter) {
      if (!game) return;
      const requestId = ++this.rankingRequest;
      this.nodes.rankingList.innerHTML = `<li class="ranking-empty">랭킹 불러오는 중...</li>`;
      const result = await this.scoreBoard.fetchTop(game);
      if (requestId !== this.rankingRequest || this.selectedCharacter !== game) return;
      this.renderRanking(game, result.rows);
      if (result.source === "local" && result.error) {
        this.showToast("Supabase 연결 실패로 이 기기의 임시 랭킹을 표시합니다.");
      }
    }

    openResultModal(result) {
      this.pendingResult = result;
      this.nodes.resultGameLabel.textContent = result.gameLabel;
      this.nodes.resultSummary.textContent = result.summary;
      this.nodes.formMessage.textContent = "";
      this.nodes.resultModal.classList.add("is-active");
      this.nodes.resultModal.setAttribute("aria-hidden", "false");
      window.setTimeout(() => this.nodes.playerName.focus(), 50);
    }

    closeResultModal() {
      this.nodes.resultModal.classList.remove("is-active");
      this.nodes.resultModal.setAttribute("aria-hidden", "true");
      this.nodes.formMessage.textContent = "";
      this.nodes.scoreForm.reset();
      this.pendingResult = null;
    }

    async submitScore(event) {
      event.preventDefault();
      if (!this.pendingResult) return;

      const playerName = this.scoreBoard.cleanName(this.nodes.playerName.value);
      if (!playerName) {
        this.nodes.formMessage.textContent = "이름을 입력해 주세요.";
        this.nodes.playerName.focus();
        return;
      }

      const result = this.pendingResult;
      this.nodes.submitButton.disabled = true;
      this.nodes.skipButton.disabled = true;
      this.nodes.formMessage.textContent = "기록을 등록하는 중입니다.";

      try {
        const response = await this.scoreBoard.submit(result, playerName);
        this.closeResultModal();
        await this.loadRanking(result.game);
        this.showToast(response.source === "supabase"
          ? "랭킹에 기록을 등록했습니다."
          : "기록을 이 기기에 임시 저장했습니다.");
      } catch (error) {
        this.nodes.formMessage.textContent = error.message || "기록 등록에 실패했습니다.";
      } finally {
        this.nodes.submitButton.disabled = false;
        this.nodes.skipButton.disabled = false;
      }
    }
  }

  const arcade = new ArcadeController();
  startLoading(() => arcade.revealSelection());
})();
