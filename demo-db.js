const USERS_KEY = "eobom_demo_users_v1";
const MESSAGES_KEY = "eobom_demo_messages_v1";
const NOTIFICATIONS_KEY = "eobom_demo_notifications_v1";

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArray(key, value) {
  localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizedName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function now() {
  return new Date().toISOString();
}

export function initializeDemoDatabase(archive = {}) {
  const mentors = Array.isArray(archive) ? archive : archive?.mentors;
  if (!Array.isArray(mentors)) return [];

  const users = readArray(USERS_KEY);
  const pregnantUsers = users.filter(user => user?.role === "pregnant");
  const mentorUsers = mentors
    .filter(mentor => mentor && mentor.available !== false && mentor.id)
    .map(mentor => ({
      userId: mentor.id,
      role: "senior",
      mentorId: mentor.id,
      name: normalizedName(mentor.name),
      age: Number(mentor.age),
      region: mentor.region || "",
      createdAt: mentor.createdAt || now(),
      source: "dummy_mentors.json",
    }));

  writeArray(USERS_KEY, [...pregnantUsers, ...mentorUsers]);
  if (localStorage.getItem(MESSAGES_KEY) === null) writeArray(MESSAGES_KEY, []);
  if (localStorage.getItem(NOTIFICATIONS_KEY) === null) writeArray(NOTIFICATIONS_KEY, []);
  return mentorUsers;
}

export function findMentorAccount(name, age) {
  const targetName = normalizedName(name);
  const targetAge = Number(age);
  return readArray(USERS_KEY).find(user =>
    user?.role === "senior" &&
    user.name === targetName &&
    Number(user.age) === targetAge
  ) || null;
}

export function getOrCreatePregnantUser(name, status) {
  const userName = normalizedName(name);
  const userStatus = String(status || "").trim();
  const users = readArray(USERS_KEY);
  const existing = users.find(user =>
    user?.role === "pregnant" &&
    user.name === userName &&
    user.status === userStatus
  );
  if (existing) return existing;

  const user = {
    userId: createId("pregnant"),
    role: "pregnant",
    name: userName,
    status: userStatus,
    createdAt: now(),
  };
  users.push(user);
  writeArray(USERS_KEY, users);
  return user;
}

function addNotification(notification) {
  const notifications = readArray(NOTIFICATIONS_KEY);
  notifications.push({
    notificationId: createId("notification"),
    read: false,
    createdAt: now(),
    ...notification,
  });
  writeArray(NOTIFICATIONS_KEY, notifications);
}

export function createDemoQuestion(data = {}) {
  if (!data.pregnantUserId || !data.mentorId || !data.experienceId || !data.mentorQuestion) {
    throw new Error("질문을 저장하는 데 필요한 연결 정보가 없습니다.");
  }
  const messages = readArray(MESSAGES_KEY);
  const question = {
    questionId: createId("question"),
    pregnantUserId: data.pregnantUserId,
    pregnantName: normalizedName(data.pregnantName),
    originalConcern: String(data.originalConcern || "").trim(),
    analysis: data.analysis || null,
    mentorQuestion: String(data.mentorQuestion || "").trim(),
    mentorId: data.mentorId,
    mentorName: normalizedName(data.mentorName),
    mentorAge: data.mentorAge ?? null,
    experienceId: data.experienceId,
    matchedTags: Array.isArray(data.matchedTags) ? [...data.matchedTags] : [],
    selectedMatch: data.selectedMatch || null,
    createdAt: now(),
    status: "pending",
    mentorRead: false,
    pregnantAnswerRead: false,
    transcript: "",
    audioUrl: "",
    mentorResult: null,
    answeredAt: "",
    feedback: null,
    feedbackReaction: "",
    feedbackCreatedAt: "",
    mentorFeedbackRead: false,
  };
  messages.push(question);
  writeArray(MESSAGES_KEY, messages);
  addNotification({ type: "question", questionId: question.questionId, recipientRole: "senior", mentorId: question.mentorId });
  return question;
}

export function getQuestionById(questionId) {
  return readArray(MESSAGES_KEY).find(item => item?.questionId === questionId) || null;
}

export function getQuestionsForPregnant(pregnantUserId) {
  return readArray(MESSAGES_KEY)
    .filter(item => item?.pregnantUserId === pregnantUserId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function getPendingQuestionsForMentor(mentorId) {
  return readArray(MESSAGES_KEY)
    .filter(item => item?.mentorId === mentorId && item.status === "pending")
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function getAnsweredQuestionsForMentor(mentorId) {
  return readArray(MESSAGES_KEY)
    .filter(item => item?.mentorId === mentorId && item.status === "answered")
    .sort((a, b) => String(b.answeredAt || b.createdAt).localeCompare(String(a.answeredAt || a.createdAt)));
}

function updateQuestion(questionId, updater) {
  const messages = readArray(MESSAGES_KEY);
  const index = messages.findIndex(item => item?.questionId === questionId);
  if (index < 0) return null;
  const next = updater({ ...messages[index] });
  messages[index] = next;
  writeArray(MESSAGES_KEY, messages);
  return next;
}

function markNotifications(predicate) {
  const notifications = readArray(NOTIFICATIONS_KEY);
  let changed = false;
  notifications.forEach(notification => {
    if (!notification.read && predicate(notification)) {
      notification.read = true;
      notification.readAt = now();
      changed = true;
    }
  });
  if (changed) writeArray(NOTIFICATIONS_KEY, notifications);
}

export function markQuestionRead(questionId, mentorId) {
  const question = getQuestionById(questionId);
  if (!question || question.mentorId !== mentorId) return null;
  const updated = updateQuestion(questionId, item => ({ ...item, mentorRead: true }));
  markNotifications(item => item.type === "question" && item.questionId === questionId && item.mentorId === mentorId);
  return updated;
}

export function saveDemoAnswer(questionId, mentorId, data = {}) {
  const question = getQuestionById(questionId);
  if (!question || question.mentorId !== mentorId || question.status !== "pending") return null;
  const updated = updateQuestion(questionId, item => ({
    ...item,
    transcript: String(data.transcript || "").trim(),
    audioUrl: data.audioUrl || "",
    mentorResult: data.mentorResult || null,
    status: "answered",
    answeredAt: now(),
    mentorRead: true,
    pregnantAnswerRead: false,
  }));
  addNotification({
    type: "answer",
    questionId,
    recipientRole: "pregnant",
    pregnantUserId: question.pregnantUserId,
  });
  return updated;
}

export function markPregnantAnswerRead(questionId, pregnantUserId) {
  const question = getQuestionById(questionId);
  if (!question || question.pregnantUserId !== pregnantUserId || question.status !== "answered") return null;
  const updated = updateQuestion(questionId, item => ({ ...item, pregnantAnswerRead: true }));
  markNotifications(item => item.type === "answer" && item.questionId === questionId && item.pregnantUserId === pregnantUserId);
  return updated;
}

export function saveDemoFeedback(questionId, pregnantUserId, feedback, reaction = "") {
  const question = getQuestionById(questionId);
  if (!question || question.pregnantUserId !== pregnantUserId || question.status !== "answered") return null;
  const updated = updateQuestion(questionId, item => ({
    ...item,
    feedback: feedback || null,
    feedbackReaction: String(reaction || "").trim(),
    feedbackCreatedAt: now(),
    mentorFeedbackRead: false,
  }));
  addNotification({ type: "feedback", questionId, recipientRole: "senior", mentorId: question.mentorId });
  return updated;
}

export function markMentorFeedbackRead(questionId, mentorId) {
  const question = getQuestionById(questionId);
  if (!question || question.mentorId !== mentorId || !question.feedback) return null;
  const updated = updateQuestion(questionId, item => ({ ...item, mentorFeedbackRead: true }));
  markNotifications(item => item.type === "feedback" && item.questionId === questionId && item.mentorId === mentorId);
  return updated;
}

export function getUnreadNotificationCount({ role, pregnantUserId = "", mentorId = "" } = {}) {
  return readArray(NOTIFICATIONS_KEY).filter(item => {
    if (item?.read || item.recipientRole !== role) return false;
    if (role === "pregnant") return item.type === "answer" && item.pregnantUserId === pregnantUserId;
    if (role === "senior") return (item.type === "question" || item.type === "feedback") && item.mentorId === mentorId;
    return false;
  }).length;
}

export const DEMO_DB_KEYS = Object.freeze({
  users: USERS_KEY,
  messages: MESSAGES_KEY,
  notifications: NOTIFICATIONS_KEY,
});
