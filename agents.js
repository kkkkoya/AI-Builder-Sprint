/*
 * 이어봄 AI Agent 공통 데이터 구조
 *
 * Solar LLM과 Mock AI가 서로 다른 결과를 반환하더라도
 * 화면에는 항상 동일한 형태의 데이터를 전달하기 위한 파일이다.
 */

/* 결과를 생성한 기술 또는 처리 방식 */
export const SOURCE_TYPES = Object.freeze({
  SOLAR: "solar",
  MOCK: "mock",
  RULE: "rule",
  FALLBACK: "fallback",
});

/* 고민의 긴급도 */
export const URGENCY_LEVELS = Object.freeze({
  NORMAL: "normal",
  CAUTION: "caution",
  URGENT: "urgent",
});

/* 안전 검토 결과 */
export const SAFETY_LEVELS = Object.freeze({
  SAFE: "safe",
  CAUTION: "caution",
  DANGER: "danger",
});

/**
 * 값을 안전한 문자열로 변환한다.
 *
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
function cleanString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleanedValue = value.trim();

  return cleanedValue || fallback;
}

/**
 * 값을 중복되지 않는 문자열 배열로 변환한다.
 *
 * @param {*} value
 * @param {number} maxLength
 * @returns {string[]}
 */
function cleanStringArray(value, maxLength = 10) {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleanedItems = value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);

  return [...new Set(cleanedItems)].slice(0, maxLength);
}

/**
 * 추천 점수를 0~100 범위로 제한한다.
 *
 * @param {*} value
 * @returns {number}
 */
function cleanScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 임산부 고민 분석 결과를 정리한다.
 *
 * Solar 호출 1의 최종 데이터 구조다.
 *
 * @param {Object} rawResult
 * @returns {Object}
 */
export function normalizeConcernAnalysis(rawResult = {}) {
  const allowedUrgencyLevels = Object.values(URGENCY_LEVELS);

  const urgency = allowedUrgencyLevels.includes(rawResult.urgency)
    ? rawResult.urgency
    : URGENCY_LEVELS.NORMAL;

  return {
    summary: cleanString(
      rawResult.summary,
      "사용자의 고민을 분석했습니다."
    ),

    emotions: cleanStringArray(rawResult.emotions, 5),

    situation: cleanString(
      rawResult.situation,
      "구체적인 상황을 확인하고 있습니다."
    ),

    topic: cleanString(rawResult.topic, "기타"),

    needs: cleanStringArray(rawResult.needs, 5),

    experienceTags: cleanStringArray(
      rawResult.experienceTags,
      8
    ),

    urgency,

    mentorQuestion: cleanString(
      rawResult.mentorQuestion,
      "비슷한 경험이 있다면 들려주세요."
    ),
  };
}

/**
 * 멘토 또는 경험 카드 추천 결과를 정리한다.
 *
 * Matching Agent는 Solar가 아니라
 * matching.js의 JavaScript 알고리즘으로 계산한다.
 *
 * @param {Object} rawResult
 * @returns {Object}
 */
export function normalizeMatchingResult(rawResult = {}) {
  return {
    mentorId: cleanString(rawResult.mentorId),

    experienceId: cleanString(rawResult.experienceId),

    score: cleanScore(rawResult.score),

    matchedTags: cleanStringArray(
      rawResult.matchedTags,
      8
    ),

    reason: cleanString(
      rawResult.reason,
      "현재 고민과 관련된 경험을 가지고 있습니다."
    ),
  };
}

/**
 * 노인의 음성 답변을 편지로 정리하고
 * 안전성을 검토한 결과를 정리한다.
 *
 * Solar 호출 2의 최종 데이터 구조다.
 *
 * @param {Object} rawResult
 * @returns {Object}
 */
export function normalizeMentorAnswer(rawResult = {}) {
  const rawSafety = rawResult.safety ?? {};

  const allowedSafetyLevels = Object.values(SAFETY_LEVELS);

  const riskLevel = allowedSafetyLevels.includes(
    rawSafety.riskLevel
  )
    ? rawSafety.riskLevel
    : SAFETY_LEVELS.SAFE;

  return {
    letter: cleanString(
      rawResult.letter,
      "멘토의 경험을 정리하고 있습니다."
    ),

    edits: cleanStringArray(rawResult.edits, 8),

    experienceTags: cleanStringArray(
      rawResult.experienceTags,
      8
    ),

    safety: {
      riskLevel,

      flags: cleanStringArray(rawSafety.flags, 8),

      guidance: cleanString(rawSafety.guidance),
    },
  };
}

/**
 * 감사 메시지 결과를 정리한다.
 *
 * Solar 호출 3의 최종 데이터 구조다.
 *
 * @param {Object} rawResult
 * @returns {Object}
 */
export function normalizeFeedbackResult(rawResult = {}) {
  return {
    message: cleanString(
      rawResult.message,
      "당신의 경험이 한 사람에게 따뜻한 힘이 되었습니다."
    ),
  };
}

/**
 * 정상적으로 작업이 끝났을 때 사용하는 공통 응답이다.
 *
 * @param {*} data
 * @param {string} source
 * @param {boolean} usedFallback
 * @returns {Object}
 */
export function createSuccessResponse(
  data,
  source = SOURCE_TYPES.MOCK,
  usedFallback = false
) {
  return {
    ok: true,

    data,

    error: null,

    meta: {
      source,
      usedFallback,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * 입력 오류 또는 처리 실패 시 사용하는 공통 응답이다.
 *
 * @param {string} code
 * @param {string} message
 * @returns {Object}
 */
export function createErrorResponse(code, message) {
  return {
    ok: false,

    data: null,

    error: {
      code: cleanString(code, "UNKNOWN_ERROR"),
      message: cleanString(
        message,
        "처리 중 오류가 발생했습니다."
      ),
    },

    meta: {
      source: null,
      usedFallback: false,
      createdAt: new Date().toISOString(),
    },
  };
}