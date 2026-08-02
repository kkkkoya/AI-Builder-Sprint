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
  mentorDraftResult: null,
  temporaryMentorTranscript: "",
  mentorProcessingNotice: "",
  feedback: null,
  audioUrl: "", // 녹음된 음성 파일 URL
  activeConcernId: "",
  concernHistory: [],
  mentorAnswerHistory: [],
  currentStep: "INPUT",
  clarifyingQuestion: "",
  updatedAt: ""
};

const MAX_HISTORY_ITEMS = 30;

function createRecordId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function migrateLegacyHistory(session) {
  const hadStructuredHistory = Boolean(
    session.activeConcernId ||
    (Array.isArray(session.concernHistory) && session.concernHistory.length > 0) ||
    (Array.isArray(session.mentorAnswerHistory) && session.mentorAnswerHistory.length > 0)
  );
  const concernHistory = Array.isArray(session.concernHistory)
    ? [...session.concernHistory]
    : [];
  const mentorAnswerHistory = Array.isArray(session.mentorAnswerHistory)
    ? [...session.mentorAnswerHistory]
    : [];
  let activeConcernId = session.activeConcernId || "";

  if (concernHistory.length === 0 && session.concernText) {
    activeConcernId = activeConcernId || createRecordId("concern");
    concernHistory.push({
      id: activeConcernId,
      authorName: localStorage.getItem("userName") || "",
      concernText: session.concernText,
      analysisSummary: session.analysis?.summary || "",
      mentorQuestion: session.mentorQuestion || session.match?.mentorQuestion || "",
      selectedMatch: session.match?.selected || null,
      createdAt: session.updatedAt || new Date().toISOString(),
      updatedAt: session.updatedAt || new Date().toISOString(),
    });
  }

  if (
    !hadStructuredHistory &&
    mentorAnswerHistory.length === 0 &&
    session.mentorResult
  ) {
    mentorAnswerHistory.push({
      id: createRecordId("answer"),
      mentorName: localStorage.getItem("seniorName") || "",
      concernId: activeConcernId,
      question: session.mentorQuestion || session.match?.mentorQuestion || "",
      selectedMatch: session.match?.selected || null,
      transcript: session.transcript || "",
      mentorResult: session.mentorResult || null,
      audioUrl: session.audioUrl || "",
      feedback: session.feedback || null,
      createdAt: session.updatedAt || new Date().toISOString(),
    });
  }

  return {
    ...session,
    activeConcernId,
    concernHistory,
    mentorAnswerHistory,
  };
}

function persistSession(session, logLabel) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    const compactSession = {
      ...session,
      audioUrl: "",
      mentorAnswerHistory: (session.mentorAnswerHistory || []).map(record => ({
        ...record,
        audioUrl: "",
      })),
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(compactSession));
      console.warn(`[Storage] ${logLabel}: 저장 공간이 부족해 과거 음성 파일을 제외했습니다.`);
      return compactSession;
    } catch (compactError) {
      console.error(`[Storage] ${logLabel}:`, compactError);
      return session;
    }
  }
}

/**
 * LocalStorage에서 현재 세션 데이터를 로드합니다.
 */
export function loadSession() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    const parsed = data ? JSON.parse(data) : {};
    return migrateLegacyHistory({ ...DEFAULT_SESSION, ...parsed });
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
    return persistSession(updatedSession, "세션 저장 실패");
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
  return persistSession(updated, "세션 업데이트 실패");
}

export function startConcernRecord(concernText) {
  const session = loadSession();
  const now = new Date().toISOString();
  const id = createRecordId("concern");
  const record = {
    id,
    authorName: localStorage.getItem("userName") || "",
    concernText: String(concernText || "").trim(),
    analysisSummary: "",
    mentorQuestion: "",
    selectedMatch: null,
    createdAt: now,
    updatedAt: now,
  };

  return updateSession({
    activeConcernId: id,
    concernHistory: [...session.concernHistory, record].slice(-MAX_HISTORY_ITEMS),
  });
}

export function updateActiveConcernRecord(partialData = {}) {
  const session = loadSession();
  const id = session.activeConcernId;
  if (!id) return session;

  const now = new Date().toISOString();
  const concernHistory = session.concernHistory.map(record =>
    record.id === id
      ? { ...record, ...partialData, id, updatedAt: now }
      : record
  );
  return updateSession({ concernHistory });
}

export function appendMentorAnswerRecord(partialData = {}) {
  const session = loadSession();
  const record = {
    id: createRecordId("answer"),
    mentorName: localStorage.getItem("seniorName") || "",
    concernId: session.activeConcernId || "",
    question: session.mentorQuestion || session.match?.mentorQuestion || "",
    selectedMatch: session.match?.selected || null,
    transcript: session.transcript || "",
    mentorResult: session.mentorResult || null,
    audioUrl: session.audioUrl || "",
    feedback: null,
    createdAt: new Date().toISOString(),
    ...partialData,
  };

  return updateSession({
    mentorAnswerHistory: [...session.mentorAnswerHistory, record].slice(-MAX_HISTORY_ITEMS),
  });
}

export function updateLatestAnswerForConcern(concernId, partialData = {}) {
  const session = loadSession();
  const index = [...session.mentorAnswerHistory]
    .map(record => record.concernId)
    .lastIndexOf(concernId || session.activeConcernId);
  if (index < 0) return session;

  const mentorAnswerHistory = [...session.mentorAnswerHistory];
  mentorAnswerHistory[index] = {
    ...mentorAnswerHistory[index],
    ...partialData,
  };
  return updateSession({ mentorAnswerHistory });
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
