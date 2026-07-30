// storage.js

const SESSION_KEY = "eobom_session_v1";

const DEFAULT_SESSION = {
  concernText: "",
  clarificationHistory: [],
  analysis: null,
  match: null,
  mentorQuestion: "",
  transcript: "",
  mentorResult: null,
  feedback: null,
  updatedAt: ""
};

/**
 * LocalStorage에서 현재 세션 데이터를 로드합니다.
 */
export function loadSession() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? { ...DEFAULT_SESSION, ...JSON.parse(data) } : { ...DEFAULT_SESSION };
  } catch (error) {
    console.error("[Storage] 세션 로드 실패:", error);
    return { ...DEFAULT_SESSION };
  }
}

/**
 * 전달받은 전체 세션 객체로 저장합니다.
 */
export function saveSession(session) {
  try {
    const updatedSession = {
      ...session,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    return updatedSession;
  } catch (error) {
    console.error("[Storage] 세션 저장 실패:", error);
  }
}

/**
 * 기존 데이터를 유지하면서 일부 데이터만 병합(Update)합니다.
 */
export function updateSession(partialData) {
  const current = loadSession();
  const updated = {
    ...current,
    ...partialData,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[Storage] 세션 업데이트 실패:", error);
  }
  return updated;
}

/**
 * 세션 데이터를 초기화합니다.
 */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("[Storage] 세션 삭제 실패:", error);
  }
}