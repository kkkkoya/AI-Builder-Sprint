import assert from "node:assert/strict";
import test from "node:test";

import {
  appendMentorAnswerRecord,
  loadSession,
  startConcernRecord,
  updateActiveConcernRecord,
  updateLatestAnswerForConcern,
  updateSession,
} from "../storage.js";

function installLocalStorage() {
  const values = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
  return {
    values,
    restore: () => {
      globalThis.localStorage = original;
    },
  };
}

test("새 고민을 시작해도 이전 고민 기록을 누적한다", () => {
  const storage = installLocalStorage();
  try {
    globalThis.localStorage.setItem("userName", "봄이");
    const first = startConcernRecord("첫 번째 고민");
    const second = startConcernRecord("두 번째 고민");

    assert.equal(first.concernHistory.length, 1);
    assert.equal(second.concernHistory.length, 2);
    assert.deepEqual(
      second.concernHistory.map(record => record.concernText),
      ["첫 번째 고민", "두 번째 고민"]
    );
    assert.notEqual(second.concernHistory[0].id, second.concernHistory[1].id);
  } finally {
    storage.restore();
  }
});

test("하나의 고민에 여러 어르신 답변을 각각 보존한다", () => {
  const storage = installLocalStorage();
  try {
    globalThis.localStorage.setItem("seniorName", "김봄");
    const started = startConcernRecord("육아가 걱정돼요");
    updateSession({ mentorQuestion: "육아 경험을 들려주세요." });
    updateActiveConcernRecord({ mentorQuestion: "육아 경험을 들려주세요." });

    appendMentorAnswerRecord({ transcript: "첫 번째 경험", mentorResult: { letter: "첫 번째 편지" } });
    appendMentorAnswerRecord({ transcript: "두 번째 경험", mentorResult: { letter: "두 번째 편지" } });
    updateLatestAnswerForConcern(started.activeConcernId, { feedback: { message: "고마워요" } });

    const session = loadSession();
    assert.equal(session.mentorAnswerHistory.length, 2);
    assert.deepEqual(
      session.mentorAnswerHistory.map(record => record.transcript),
      ["첫 번째 경험", "두 번째 경험"]
    );
    assert.equal(session.mentorAnswerHistory[1].feedback.message, "고마워요");
  } finally {
    storage.restore();
  }
});

test("현재 결과를 확정한 뒤 이력에 추가할 때 답변이 중복되지 않는다", () => {
  const storage = installLocalStorage();
  try {
    startConcernRecord("중복 없이 남길 고민");
    updateSession({
      transcript: "확정할 답변",
      mentorResult: { letter: "확정할 편지" },
    });
    appendMentorAnswerRecord();

    const session = loadSession();
    assert.equal(session.mentorAnswerHistory.length, 1);
    assert.equal(session.mentorAnswerHistory[0].mentorResult.letter, "확정할 편지");
  } finally {
    storage.restore();
  }
});

test("현재 화면을 초기화해도 누적 기록은 삭제하지 않는다", () => {
  const storage = installLocalStorage();
  try {
    startConcernRecord("남겨 둘 고민");
    appendMentorAnswerRecord({ transcript: "남겨 둘 답변" });
    updateSession({
      concernText: "",
      transcript: "",
      mentorResult: null,
      activeConcernId: "",
    });

    const session = loadSession();
    assert.equal(session.concernHistory.length, 1);
    assert.equal(session.mentorAnswerHistory.length, 1);
  } finally {
    storage.restore();
  }
});

test("기존 단일 세션 기록도 첫 로드에서 이력으로 호환한다", () => {
  const storage = installLocalStorage();
  try {
    globalThis.localStorage.setItem("eobom_session_v1", JSON.stringify({
      concernText: "기존 고민",
      mentorQuestion: "기존 질문",
      transcript: "기존 답변",
      mentorResult: { letter: "기존 편지" },
      updatedAt: "2026-08-02T00:00:00.000Z",
    }));

    const session = loadSession();
    assert.equal(session.concernHistory[0].concernText, "기존 고민");
    assert.equal(session.mentorAnswerHistory[0].transcript, "기존 답변");
    assert.equal(session.mentorAnswerHistory[0].concernId, session.concernHistory[0].id);
  } finally {
    storage.restore();
  }
});

test("저장 공간이 부족하면 음성만 제외하고 답변 텍스트 기록은 보존한다", () => {
  const values = new Map();
  const original = globalThis.localStorage;
  const originalWarn = console.warn;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => {
      if (String(value).includes("data:audio")) {
        throw new Error("QuotaExceededError");
      }
      values.set(key, String(value));
    },
    removeItem: key => values.delete(key),
  };
  console.warn = () => {};

  try {
    startConcernRecord("용량 보호 고민");
    appendMentorAnswerRecord({
      transcript: "텍스트는 남아야 합니다",
      mentorResult: { letter: "편지도 남아야 합니다" },
      audioUrl: "data:audio/webm;base64,large",
    });

    const session = loadSession();
    assert.equal(session.mentorAnswerHistory[0].audioUrl, "");
    assert.equal(session.mentorAnswerHistory[0].transcript, "텍스트는 남아야 합니다");
    assert.equal(session.mentorAnswerHistory[0].mentorResult.letter, "편지도 남아야 합니다");
  } finally {
    globalThis.localStorage = original;
    console.warn = originalWarn;
  }
});
