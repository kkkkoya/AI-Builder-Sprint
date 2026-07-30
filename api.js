import {
  SOURCE_TYPES,
  normalizeConcernAnalysis,
  normalizeMentorAnswer,
  normalizeFeedbackResult,
  createSuccessResponse,
  createErrorResponse,
} from "./agents.js";

/*
 * mock: 미리 만든 응답을 사용한다.
 * solar: 실제 Upstage Solar API를 호출한다.
 *
 * 현재 단계에서는 반드시 mock으로 둔다.
 */
export const AI_MODE = "mock";

/**
 * 실제 API 호출처럼 잠시 기다리게 하는 함수다.
 * 로딩 화면 테스트에도 사용한다.
 *
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * 임산부의 고민을 분석한다.
 *
 * @param {string} concernText
 * @returns {Promise<Object>}
 */
export async function analyzeConcern(concernText) {
  const text = String(concernText ?? "").trim();

  if (!text) {
    return createErrorResponse(
      "EMPTY_CONCERN",
      "고민 내용을 입력해 주세요."
    );
  }

  await wait(700);

  const mockResult = {
    summary:
      "첫 출산과 육아 책임에 대한 두려움과 부담감을 느끼고 있습니다.",

    emotions: ["두려움", "부담감"],

    situation: "첫 출산을 앞두고 부모 역할을 걱정하는 상황",

    topic: "첫 출산",

    needs: ["공감", "실제 경험", "정서적 지지"],

    experienceTags: [
      "첫 출산",
      "육아 부담",
      "부모 역할 불안",
    ],

    urgency: "normal",

    mentorQuestion:
      "처음 엄마가 되었을 때 혼자 모든 것을 감당해야 할 것 같아 두려웠던 경험이 있다면 들려주세요.",
  };

  const normalizedData =
    normalizeConcernAnalysis(mockResult);

  return createSuccessResponse(
    normalizedData,
    SOURCE_TYPES.MOCK
  );
}

/**
 * 노인의 STT 답변을 편지 형태로 정리하고
 * 안전성을 검토한다.
 *
 * @param {string} transcript
 * @returns {Promise<Object>}
 */
export async function processMentorAnswer(transcript) {
  const text = String(transcript ?? "").trim();

  if (!text) {
    return createErrorResponse(
      "EMPTY_TRANSCRIPT",
      "멘토의 답변 내용이 없습니다."
    );
  }

  await wait(700);

  const mockResult = {
    letter:
      "저도 처음 엄마가 되었을 때 많이 두려웠어요. 아이가 울면 제가 무언가를 잘못하고 있는 것 같았고, 혼자 울었던 날도 있었습니다. 하지만 처음부터 모든 것을 잘하는 부모는 없다는 것을 시간이 지나며 알게 되었습니다.",

    edits: [
      "반복된 표현을 한 문장으로 정리했습니다.",
      "경험의 순서를 시간 순서대로 배치했습니다.",
      "원래 답변에 없던 새로운 경험은 추가하지 않았습니다.",
    ],

    experienceTags: [
      "첫 출산",
      "출산 불안",
      "육아 적응",
    ],

    safety: {
      riskLevel: "safe",
      flags: [],
      guidance:
        "이 답변은 개인의 경험을 전달하는 내용입니다.",
    },
  };

  const normalizedData =
    normalizeMentorAnswer(mockResult);

  return createSuccessResponse(
    normalizedData,
    SOURCE_TYPES.MOCK
  );
}

/**
 * 임산부가 선택한 반응을
 * 노인에게 전달할 감사 메시지로 변환한다.
 *
 * @param {string} reaction
 * @returns {Promise<Object>}
 */
export async function createFeedbackMessage(reaction) {
  const text = String(reaction ?? "").trim();

  if (!text) {
    return createErrorResponse(
      "EMPTY_REACTION",
      "감사 반응을 선택해 주세요."
    );
  }

  await wait(500);

  const mockResult = {
    message:
      "당신의 경험 덕분에 처음 엄마가 되는 한 사람이 두려움을 덜고 큰 용기를 얻었습니다.",
  };

  const normalizedData =
    normalizeFeedbackResult(mockResult);

  return createSuccessResponse(
    normalizedData,
    SOURCE_TYPES.MOCK
  );
}