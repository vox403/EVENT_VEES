(() => {
  const scope = window.VCAM || (window.VCAM = {});
const APP_CONFIG = Object.freeze({
  supabaseUrl: "https://rsmimlhhvxnasnkfseqd.supabase.co",
  supabaseKey: "sb_publishable_8iMjGI0zGPtZWak_0TrSUQ_fldlN7UC",
  scoreTable: "vcam_game_scores",
  maxNameLength: 12
});

const CHARACTERS = Object.freeze({
  vel: {
    theme: "vel",
    rankingTitle: "VEL / TIME",
    cameraCode: "CAM_VEL / LIVE",
    cameraMode: "PUZZLE TRACKING"
  },
  vox: {
    theme: "vox",
    rankingTitle: "VOX / SCORE",
    cameraCode: "CAM_VOX / LIVE",
    cameraMode: "RHYTHM SYNC"
  },
  val: {
    theme: "val",
    rankingTitle: "VAL / SCORE",
    cameraCode: "CAM_VAL / LIVE",
    cameraMode: "TARGET LOCK"
  }
});

  scope.config = APP_CONFIG;
  scope.characters = CHARACTERS;
})();
