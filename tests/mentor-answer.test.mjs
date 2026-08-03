import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  evaluateMentorAnswer,
  processMentorAnswer,
} from "../api.js";
import { normalizeMentorExperienceResult } from "../agents.js";

test("AI 수정 내역과 안전 안내를 자연스러운 한국어 문장으로 통일한다", () => {
  const result = normalizeMentorExperienceResult({
    answerCheck: { status: "VALID" },
    processingStatus: "COMPLETED",
    experienceCard: { title: "경험", summary: "요약" },
    letter: "저도 많이 걱정했어요.",
    edits: [
      "문장 부호 정리 및 반복 표현 제거",
      "불분명한 표현을 명확화",
    ],
    fidelity: { preservedMeaning: true, warnings: [] },
    safety: {
      riskLevel: "safe",
      guidance: "emotional tone만 추출했으며, 해결 방법은 포함되지 않음",
    },
  });

  assert.deepEqual(result.edits, [
    "문장 부호를 정리하고 반복되는 표현을 덜어냈습니다.",
    "불분명한 표현을 명확하게 다듬었습니다.",
  ]);
  assert.equal(
    result.safety.guidance,
    "감정의 흐름만 추출했으며, 해결 방법은 포함하지 않았습니다."
  );
});

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

test("첫 편지가 원문을 거의 복사하면 Solar에 한 번 더 재정리를 요청한다", async () => {
  const originalFetch = globalThis.fetch;
  const transcript = "저도 임신했을 때 지원 제도를 몰라서 걱정이 많았어요. 나중에 주민센터에서 정보를 확인했고 가족과 함께 필요한 지원을 신청했어요. 그 뒤에는 일을 계속할 방법을 차근차근 준비할 수 있었어요.";
  const responses = [
    transcript,
    "저도 임신했을 때 지원 제도를 알지 못해 걱정이 많았습니다. 그러다 주민센터에서 필요한 정보를 확인하고 가족과 함께 지원을 신청했습니다. 덕분에 일을 이어갈 방법도 차근차근 준비할 수 있었습니다.",
  ];
  const sentPayloads = [];
  globalThis.fetch = async (_url, options) => {
    sentPayloads.push(JSON.parse(options.body).payload);
    const letter = responses[Math.min(sentPayloads.length - 1, responses.length - 1)];
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          answerCheck: { status: "VALID", reason: "실제 경험", followUpQuestion: "" },
          processingStatus: "COMPLETED",
          experienceCard: {
            title: "지원 제도를 찾아 일을 이어간 경험",
            summary: "임신 중 지원 정보를 찾아 신청하고 일을 이어갈 준비를 한 경험입니다.",
            timeline: ["지원 정보를 확인함", "가족과 지원을 신청함"],
            emotions: ["걱정"],
            helpTypes: ["실제 경험"],
            standardTags: ["경력 유지"],
          },
          letter,
          edits: ["경험의 흐름에 따라 문단을 정리했습니다."],
          fidelity: { preservedMeaning: true, addedFacts: [], warnings: [] },
          safety: { riskLevel: "safe", flags: [], guidance: "개인의 경험입니다." },
        },
      }),
    };
  };

  try {
    const result = await processMentorAnswer({
      question: "임신 중 일을 이어가기 위해 어떤 도움을 받으셨나요?",
      transcript,
    });
    assert.equal(sentPayloads.length, 2);
    assert.equal(sentPayloads[1].refinementRequired, true);
    assert.equal(result.data.letter, responses[1]);
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
  assert.ok(html.indexOf('id="finalize-mentor-result-btn"') < html.indexOf('<details>'));
  assert.match(ui, /formatAiExplanation/);
  assert.match(ui, /processingStatus === 'TEMPORARY_SAVED'/);
  assert.match(ui, /currentStep: 'MENTOR_REVIEW'/);
  assert.doesNotMatch(html + ui, /Mock 결과에서는|fallback 결과/i);
});
