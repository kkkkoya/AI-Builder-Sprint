import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  evaluateMentorAnswer,
  processMentorAnswer,
} from "../api.js";

test("서비스 이용 질문은 OFF_TOPIC이며 편지를 생성하지 않는다", async () => {
  const transcript = "응 근데 도착한 질문을 받을 방법은";
  assert.equal(evaluateMentorAnswer({ transcript }).status, "OFF_TOPIC");

  const result = await processMentorAnswer({ transcript });
  assert.equal(result.ok, true);
  assert.equal(result.data.answerCheck.status, "OFF_TOPIC");
  assert.equal(result.data.experienceCard, null);
  assert.equal(result.data.letter, "");
  assert.match(result.data.answerCheck.followUpQuestion, /실제 경험/);
});

test("너무 짧고 불분명한 답변은 경험 편지를 생성하지 않는다", async () => {
  const result = await processMentorAnswer({ transcript: "잘 모르겠어요" });
  assert.ok(["TOO_SHORT", "UNCLEAR"].includes(result.data.answerCheck.status));
  assert.equal(result.data.experienceCard, null);
  assert.equal(result.data.letter, "");
});

test("실제 출산·육아 경험은 VALID 결과와 편지를 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      data: {
        answerCheck: { status: "VALID", reason: "실제 경험", followUpQuestion: "" },
        processingStatus: "COMPLETED",
        experienceCard: {
          title: "출산 뒤 일을 쉬었던 경험",
          summary: "아이를 낳고 일을 쉬며 가족과 역할 문제로 갈등한 경험이다.",
          timeline: ["아이를 낳고 일을 쉼"],
          emotions: ["막막함"],
          helpTypes: ["실제 경험"],
          standardTags: ["경력 단절", "부부 갈등"],
        },
        letter: "저도 아이를 낳고 일을 쉬었습니다.",
        edits: ["문장 부호를 정리했습니다."],
        fidelity: { preservedMeaning: true, addedFacts: [], warnings: [] },
        safety: { riskLevel: "safe", flags: [], guidance: "개인의 경험입니다." },
      },
    }),
  });

  try {
    const result = await processMentorAnswer({
      question: "출산 뒤 일을 쉬었던 경험을 들려주세요.",
      transcript: "저도 아이를 낳고 일을 쉬었어요. 다시 일할 때 남편과 집안일 문제로 많이 다퉜어요.",
      selectedMatch: { mentorId: "mentor-003", experienceId: "experience-006" },
    });
    assert.equal(result.data.answerCheck.status, "VALID");
    assert.equal(result.data.processingStatus, "COMPLETED");
    assert.ok(result.data.experienceCard);
    assert.ok(result.data.letter);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("선택된 경험 연결 정보가 없어도 답변 정리를 요청할 수 있다", async () => {
  const originalFetch = globalThis.fetch;
  let sentPayload;
  globalThis.fetch = async (_url, options) => {
    sentPayload = JSON.parse(options.body).payload;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          answerCheck: { status: "VALID", reason: "실제 경험", followUpQuestion: "" },
          processingStatus: "COMPLETED",
          experienceCard: {
            title: "육아로 힘들었던 경험",
            summary: "아이를 돌보며 잠이 부족해 힘들었던 경험이다.",
            timeline: ["아이를 돌봄"],
            emotions: ["힘듦"],
            helpTypes: ["실제 경험"],
            standardTags: ["수면 부족"],
          },
          letter: "저도 아이를 돌보며 잠이 부족해 힘들었어요.",
          edits: [],
          fidelity: { preservedMeaning: true, addedFacts: [], warnings: [] },
          safety: { riskLevel: "safe", flags: [], guidance: "" },
        },
      }),
    };
  };

  try {
    const result = await processMentorAnswer({
      question: "육아 경험을 들려주세요.",
      transcript: "저도 아이를 돌보며 잠을 못 자서 많이 힘들었어요.",
    });
    assert.equal(sentPayload.selectedMatch, null);
    assert.equal(result.data.processingStatus, "COMPLETED");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Solar 시간 초과는 원문만 임시 저장하고 완료 결과를 만들지 않는다", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  globalThis.fetch = async () => ({
    ok: false,
    status: 504,
    json: async () => ({ ok: false, error: { code: "SOLAR_TIMEOUT", message: "시간 초과" } }),
  });
  console.warn = () => {};

  try {
    const result = await processMentorAnswer({
      transcript: "저도 아이를 낳고 육아를 하며 잠을 못 자서 많이 힘들었어요.",
      selectedMatch: { mentorId: "mentor-001", experienceId: "experience-001" },
    });
    assert.equal(result.data.processingStatus, "TEMPORARY_SAVED");
    assert.equal(result.data.experienceCard, null);
    assert.equal(result.data.letter, "");
    assert.match(result.data.userMessage, /잘 담아두었어요/);
    assert.doesNotMatch(result.data.userMessage, /AI가 정리하지 못/);
    assert.doesNotMatch(JSON.stringify(result.data), /mock|fallback/i);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});

test("어르신 화면은 재답변 안내와 임시 저장 재시도 동선을 제공한다", async () => {
  const [html, ui] = await Promise.all([
    readFile(new URL("../senior.html", import.meta.url), "utf8"),
    readFile(new URL("../ui.js", import.meta.url), "utf8"),
  ]);

  assert.match(html, /도착한 고민과 관련된 실제 경험으로 확인하기 어려워요/);
  assert.match(html, /비슷한 일을 겪었던 상황과 당시의 마음을 조금 더 들려주세요/);
  assert.match(html, /id="retry-mentor-processing-btn"/);
  assert.match(html, /AI가 정리한 부분 보기/);
  assert.match(html, /내용 수정하기/);
  assert.match(html, /최종 전달하기/);
  assert.match(ui, /processingStatus === 'TEMPORARY_SAVED'/);
  assert.match(ui, /currentStep: 'MENTOR_REVIEW'/);
  assert.doesNotMatch(html + ui, /Mock 결과에서는|fallback 결과/i);
});
