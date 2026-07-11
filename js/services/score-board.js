(() => {
  const scope = window.VCAM || (window.VCAM = {});
  const APP_CONFIG = scope.config;
const STORAGE_KEY = "vcam_arcade_scores_v1";

class ScoreBoard {
  constructor() {
    this.client = null;
    this.clientPromise = this.createClient();
  }

  loadLibrary() {
    if (window.supabase) return Promise.resolve(window.supabase);

    return new Promise(resolve => {
      const existing = document.querySelector('script[data-supabase-client]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.supabase || null), { once: true });
        existing.addEventListener("error", () => resolve(null), { once: true });
        return;
      }

      const script = document.createElement("script");
      const timer = window.setTimeout(() => resolve(null), 5000);
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.dataset.supabaseClient = "";
      script.addEventListener("load", () => {
        window.clearTimeout(timer);
        resolve(window.supabase || null);
      }, { once: true });
      script.addEventListener("error", () => {
        window.clearTimeout(timer);
        resolve(null);
      }, { once: true });
      document.head.appendChild(script);
    });
  }

  async createClient() {
    try {
      if (!APP_CONFIG.supabaseUrl || !APP_CONFIG.supabaseKey) return null;
      const library = await this.loadLibrary();
      if (!library) return null;
      return library.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
    } catch {
      return null;
    }
  }

  async getClient() {
    if (this.client) return this.client;
    this.client = await this.clientPromise;
    return this.client;
  }

  cleanName(value) {
    return String(value || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, APP_CONFIG.maxNameLength);
  }

  readLocal() {
    try {
      const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  writeLocal(rows) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(-150)));
      return true;
    } catch {
      return false;
    }
  }

  sortRows(game, rows) {
    const sorted = [...rows].sort((left, right) => {
      const createdOrder = new Date(left.created_at) - new Date(right.created_at);
      if (game === "vel") {
        const leftTime = Number(left.clear_time_ms) || Number.MAX_SAFE_INTEGER;
        const rightTime = Number(right.clear_time_ms) || Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime || createdOrder;
      }
      return Number(right.score) - Number(left.score) || createdOrder;
    });
    return sorted.slice(0, 10);
  }

  getLocalTop(game) {
    return this.sortRows(game, this.readLocal().filter(row => row.game === game));
  }

  saveLocal(record) {
    const rows = this.readLocal();
    rows.push({
      id: `local-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      ...record,
      created_at: new Date().toISOString()
    });
    this.writeLocal(rows);
  }

  async fetchTop(game) {
    const client = await this.getClient();
    if (!client) {
      return { rows: this.getLocalTop(game), source: "local", error: null };
    }

    try {
      let request = client
        .from(APP_CONFIG.scoreTable)
        .select("id, game, player_name, score, clear_time_ms, created_at")
        .eq("game", game);

      request = game === "vel"
        ? request.order("clear_time_ms", { ascending: true, nullsFirst: false })
        : request.order("score", { ascending: false });

      const { data, error } = await request.order("created_at", { ascending: true }).limit(10);
      if (error) throw error;
      return { rows: Array.isArray(data) ? data : [], source: "supabase", error: null };
    } catch (error) {
      return { rows: this.getLocalTop(game), source: "local", error };
    }
  }

  async submit(result, playerName) {
    const cleanName = this.cleanName(playerName);
    if (!cleanName) throw new Error("이름을 입력해 주세요.");

    const payload = {
      game: result.game,
      player_name: cleanName,
      score: Math.max(0, Math.floor(Number(result.score) || 0)),
      clear_time_ms: result.game === "vel"
        ? Math.max(1, Math.floor(Number(result.clear_time_ms) || 0))
        : null
    };

    const client = await this.getClient();
    if (!client) {
      this.saveLocal(payload);
      return { source: "local", error: null };
    }

    try {
      const { error } = await client
        .from(APP_CONFIG.scoreTable)
        .insert(payload);
      if (error) throw error;
      return { source: "supabase", error: null };
    } catch (error) {
      this.saveLocal(payload);
      return { source: "local", error };
    }
  }
}
  scope.ScoreBoard = ScoreBoard;
})();
