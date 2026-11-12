export interface QuizPlayer {
  username: string;
  email: string;
}

// Active session (cleared when the tab closes)
const SESSION_KEY = "quickzy-player";
// Remembered for pre-filling the form next time
const PROFILE_KEY = "quickzy-profile";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function read(storage: Storage | undefined, key: string): QuizPlayer | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<QuizPlayer>;
    if (typeof p.username === "string" && typeof p.email === "string") {
      return { username: p.username, email: p.email };
    }
  } catch {
    /* storage blocked or corrupt */
  }
  return null;
}

export function loadPlayer(): QuizPlayer | null {
  if (typeof window === "undefined") return null;
  return read(window.sessionStorage, SESSION_KEY);
}

export function loadProfile(): QuizPlayer | null {
  if (typeof window === "undefined") return null;
  return read(window.localStorage, PROFILE_KEY);
}

export function savePlayer(player: QuizPlayer) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(player));
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(player));
  } catch {
    /* ignore */
  }
}

export function clearPlayer() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}