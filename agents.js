/*
 * 이어봄 AI Agent 공통 응답 구조
 *
 * Solar가 반환한 데이터를 검사하고 정리하여
 * UI에는 항상 일정한 형태의 결과를 전달한다.
 *
 * AI가 담당하는 핵심 기능:
 * 1. 자유로운 고민의 범위와 모호성 판단
 * 2. 복합 고민·감정·상황·필요 분석
 * 3. 경험 카드별 의미 기반 평가
 * 4. 어르신 답변의 경험 카드·편지 변환
 * 5. 안전성과 원문 충실도 검사
 * 6. 경험의 영향을 담은 감사 메시지 생성
 */

import { normalizeTags } from "./tags.js";

/*
 * 결과가 어디에서 생성되었는지 표시한다.
 */
export const SOURCE_TYPES = Object.freeze({
  SOLAR: "solar",
  MOCK: "mock",
  RULE: "rule",
  FALLBACK: "fallback",
});

/*
 * 사용자의 입력을 어떤 흐름으로 처리할지 나타낸다.
 */
export const ROUTE_TYPES = Object.freeze({
  IN_SCOPE: "IN_SCOPE",
  CLARIFICATION: "CLARIFICATION",
  NO_MATCH: "NO_MATCH",
  SAFETY: "SAFETY",
});

/*
 * 사용자의 고민이 어느 정도 우선적인 확인이 필요한지 나타낸다.
 */
export const URGENCY_LEVELS = Object.freeze({
  NORMAL: "normal",
  CAUTION: "caution",
  URGENT: "urgent",
});

/*
 * 어르신 경험 안에 포함된 안전 관련 수준이다.
 */
export const SAFETY_LEVELS = Object.freeze({
  SAFE: "safe",
  CAUTION: "caution",
  DANGER: "danger",
});

/*
 * AI 매칭 점수의 최대값이다.
 *
 * 총합:
 * 30 + 20 + 20 + 15 + 10 + 5 = 100점
 */
export const MATCH_SCORE_LIMITS = Object.freeze({
  SITUATION_SIMILARITY: 30,
  EMOTIONAL_SIMILARITY: 20,
  LIVED_EXPERIENCE_SIMILARITY: 20,
  NEED_SIMILARITY: 15,
  TRANSFERABILITY: 10,
  SAFETY: 5,
});

/*
 * 문자열을 안전하게 정리한다.
 */
function cleanString(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleanedValue = value.trim();

  return cleanedValue || fallback;
}

/*
 * 배열 안의 문자열을 정리하고 중복을 제거한다.
 */
function cleanStringArray(value, maxLength = 10) {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleanedItems = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return [...new Set(cleanedItems)].slice(0, maxLength);
}

/*
 * true 또는 false 값을 안전하게 정리한다.
 */
function cleanBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

/*
 * 숫자를 지정된 범위 안으로 제한한다.
 */
function cleanBoundedNumber(
  value,
  minimum = 0,
  maximum = 100,
  fallback = 0
) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(
    minimum,
    Math.min(maximum, Math.round(numberValue))
  );
}

/*
 * 감정 강도를 0~100 사이의 숫자로 정리한다.
 *
 * Solar가 0.8처럼 0~1 사이로 반환하면
 * 화면에서 사용하기 쉽도록 80으로 변환한다.
 */
function cleanIntensity(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  if (numberValue >= 0 && numberValue <= 1) {
    return Math.round(numberValue * 100);
  }

  return cleanBoundedNumber(numberValue, 0, 100);
}

/*
 * 고민 항목 하나를 정리한다.
 */
function normalizeConcernItem(rawConcern, index) {
  if (typeof rawConcern === "string") {
    return {
      type: "기타 고민",
      description: cleanString(rawConcern),
      priority: index + 1,
    };
  }

  if (
    !rawConcern ||
    typeof rawConcern !== "object"
  ) {
    return null;
  }

  const description = cleanString(
    rawConcern.description
  );

  if (!description) {
    return null;
  }

  return {
    type: cleanString(
      rawConcern.type,
      "기타 고민"
    ),
    description,
    priority: cleanBoundedNumber(
      rawConcern.priority,
      1,
      5,
      Math.min(index + 1, 5)
    ),
  };
}

/*
 * 복합 고민 배열을 정리한다.
 */
function normalizeConcernItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) =>
      normalizeConcernItem(item, index)
    )
    .filter((item) => item !== null)
    .slice(0, 5);
}

/*
 * 감정 항목 하나를 정리한다.
 */
function normalizeEmotionItem(rawEmotion) {
  if (typeof rawEmotion === "string") {
    return {
      name: cleanString(rawEmotion),
      intensity: 50,
      evidence: "",
    };
  }

  if (
    !rawEmotion ||
    typeof rawEmotion !== "object"
  ) {
    return null;
  }

  const name = cleanString(rawEmotion.name);

  if (!name) {
    return null;
  }

  return {
    name,
    intensity: cleanIntensity(
      rawEmotion.intensity
    ),
    evidence: cleanString(
      rawEmotion.evidence
    ),
  };
}

/*
 * 감정 배열을 정리한다.
 */
function normalizeEmotionItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeEmotionItem(item))
    .filter((item) => item !== null)
    .slice(0, 8);
}

/*
 * 긴급도 값을 정리한다.
 */
function normalizeUrgency(value) {
  const allowedLevels =
    Object.values(URGENCY_LEVELS);

  return allowedLevels.includes(value)
    ? value
    : URGENCY_LEVELS.NORMAL;
}

/*
 * 안전성 검사 결과를 정리한다.
 */
function normalizeSafety(rawSafety = {}) {
  const allowedSafetyLevels =
    Object.values(SAFETY_LEVELS);

  const riskLevel =
    allowedSafetyLevels.includes(
      rawSafety.riskLevel
    )
      ? rawSafety.riskLevel
      : SAFETY_LEVELS.SAFE;

  return {
    riskLevel,
    flags: cleanStringArray(
      rawSafety.flags,
      10
    ),
    guidance: cleanString(
      rawSafety.guidance
    ),
  };
}

/*
 * Deep Concern Analysis Agent의 결과를 정리한다.
 */
export function normalizeDeepConcernAnalysis(
  rawResult = {}
) {
  return {
    summary: cleanString(
      rawResult.summary,
      "사용자의 고민을 분석했습니다."
    ),

    concerns: normalizeConcernItems(
      rawResult.concerns
    ),

    emotions: normalizeEmotionItems(
      rawResult.emotions
    ),

    situation: cleanString(
      rawResult.situation,
      "구체적인 상황을 확인하고 있습니다."
    ),

    needs: cleanStringArray(
      rawResult.needs,
      8
    ),

    /*
     * AI가 자유롭게 분석하되,
     * UI와 fallback에서는 표준 태그로 정리한다.
     */
    standardTags: normalizeTags(
      rawResult.standardTags ??
        rawResult.experienceTags ??
        []
    ),

    urgency: normalizeUrgency(
      rawResult.urgency
    ),
  };
}

/*
 * Concern Router Agent와
 * Deep Concern Analysis Agent의 통합 결과를 정리한다.
 */
export function normalizeConcernRoute(
  rawResult = {}
) {
  const allowedRoutes =
    Object.values(ROUTE_TYPES);

  const route = allowedRoutes.includes(
    rawResult.route
  )
    ? rawResult.route
    : ROUTE_TYPES.IN_SCOPE;

  const needsClarification =
    route === ROUTE_TYPES.CLARIFICATION ||
    rawResult.needsClarification === true;

  /*
   * 새로운 응답은 rawResult.analysis 안에
   * 분석 결과가 들어간다.
   *
   * 기존 Mock 응답과의 호환을 위해
   * analysis가 없으면 rawResult 자체를 사용한다.
   */
  const rawAnalysis =
    rawResult.analysis &&
    typeof rawResult.analysis === "object"
      ? rawResult.analysis
      : rawResult;

  return {
    route,
    needsClarification,

    clarifyingQuestion: cleanString(
      rawResult.clarifyingQuestion
    ),

    /*
     * NO_MATCH 또는 SAFETY 상황에서
     * 화면에 표시할 AI 안내 문장이다.
     */
    response: cleanString(
      rawResult.response
    ),

    analysis:
      normalizeDeepConcernAnalysis(
        rawAnalysis
      ),
  };
}

/*
 * AI가 반환한 경험 매칭 세부 점수를 정리한다.
 */
export function normalizeMatchScores(
  rawScores = {}
) {
  return {
    situationSimilarity:
      cleanBoundedNumber(
        rawScores.situationSimilarity,
        0,
        MATCH_SCORE_LIMITS
          .SITUATION_SIMILARITY
      ),

    emotionalSimilarity:
      cleanBoundedNumber(
        rawScores.emotionalSimilarity,
        0,
        MATCH_SCORE_LIMITS
          .EMOTIONAL_SIMILARITY
      ),

    livedExperienceSimilarity:
      cleanBoundedNumber(
        rawScores.livedExperienceSimilarity,
        0,
        MATCH_SCORE_LIMITS
          .LIVED_EXPERIENCE_SIMILARITY
      ),

    needSimilarity:
      cleanBoundedNumber(
        rawScores.needSimilarity,
        0,
        MATCH_SCORE_LIMITS
          .NEED_SIMILARITY
      ),

    transferability:
      cleanBoundedNumber(
        rawScores.transferability,
        0,
        MATCH_SCORE_LIMITS
          .TRANSFERABILITY
      ),

    safety:
      cleanBoundedNumber(
        rawScores.safety,
        0,
        MATCH_SCORE_LIMITS.SAFETY
      ),
  };
}

/*
 * 매칭 세부 점수의 총합을 계산한다.
 *
 * Solar가 반환한 totalScore를 그대로 믿지 않고
 * JavaScript가 세부 점수의 합을 다시 계산한다.
 */
export function calculateMatchTotalScore(
  scores
) {
  return Object.values(scores).reduce(
    (total, score) => total + score,
    0
  );
}

/*
 * AI가 평가한 경험 후보 하나를 정리한다.
 */
export function normalizeMatchCandidate(
  rawCandidate = {}
) {
  if (
    !rawCandidate ||
    typeof rawCandidate !== "object"
  ) {
    return null;
  }

  const mentorId = cleanString(
    rawCandidate.mentorId
  );

  const experienceId = cleanString(
    rawCandidate.experienceId
  );

  if (!mentorId || !experienceId) {
    return null;
  }

  const scores = normalizeMatchScores(
    rawCandidate.scores
  );

  const calculatedTotalScore =
    calculateMatchTotalScore(scores);

  /*
   * 세부 점수가 모두 0이고 totalScore만 있다면
   * 이전 Mock 결과와의 호환을 위해 totalScore를 사용한다.
   */
  const hasDetailedScores =
    Object.values(scores).some(
      (score) => score > 0
    );

  const totalScore = hasDetailedScores
    ? calculatedTotalScore
    : cleanBoundedNumber(
        rawCandidate.totalScore ??
          rawCandidate.score,
        0,
        100
      );

  return {
    mentorId,
    experienceId,

    mentorName: cleanString(
      rawCandidate.mentorName
    ),

    experienceTitle: cleanString(
      rawCandidate.experienceTitle
    ),

    scores,
    totalScore,

    matchedConcerns: cleanStringArray(
      rawCandidate.matchedConcerns ??
        rawCandidate.matchedTags,
      10
    ),

    reason: cleanString(
      rawCandidate.reason,
      "현재 고민과 관련된 경험입니다."
    ),

    evidence: cleanStringArray(
      rawCandidate.evidence,
      10
    ),

    limitations: cleanString(
      rawCandidate.limitations
    ),
  };
}

/*
 * 동일한 경험 ID가 여러 번 들어오는 것을 막는다.
 */
function removeDuplicateCandidates(
  candidates
) {
  const seenExperienceIds = new Set();

  return candidates.filter((candidate) => {
    if (
      seenExperienceIds.has(
        candidate.experienceId
      )
    ) {
      return false;
    }

    seenExperienceIds.add(
      candidate.experienceId
    );

    return true;
  });
}

/*
 * Experience Match Judge Agent와
 * Adaptive Question Agent의 결과를 정리한다.
 *
 * 두 형태를 모두 지원한다.
 *
 * 형태 1:
 * {
 *   selected: {},
 *   alternatives: []
 * }
 *
 * 형태 2:
 * {
 *   rankings: [{}, {}, {}]
 * }
 */
export function normalizeAiMatchResult(
  rawResult = {}
) {
  let selected = null;
  let alternatives = [];

  if (
    rawResult.selected &&
    typeof rawResult.selected === "object"
  ) {
    selected = normalizeMatchCandidate(
      rawResult.selected
    );

    alternatives = Array.isArray(
      rawResult.alternatives
    )
      ? rawResult.alternatives
          .map((candidate) =>
            normalizeMatchCandidate(candidate)
          )
          .filter(
            (candidate) =>
              candidate !== null
          )
      : [];
  } else if (
    Array.isArray(rawResult.rankings)
  ) {
    const rankings = rawResult.rankings
      .map((candidate) =>
        normalizeMatchCandidate(candidate)
      )
      .filter(
        (candidate) => candidate !== null
      );

    selected = rankings[0] ?? null;
    alternatives = rankings.slice(1);
  }

  /*
   * 대안 경험은 최대 두 개만 사용한다.
   */
  alternatives = removeDuplicateCandidates(
    alternatives
  )
    .filter(
      (candidate) =>
        candidate.experienceId !==
        selected?.experienceId
    )
    .sort(
      (first, second) =>
        second.totalScore -
        first.totalScore
    )
    .slice(0, 2);

  return {
    selected,
    alternatives,

    mentorQuestion: cleanString(
      rawResult.mentorQuestion,
      "비슷한 경험이 있으시다면 들려주세요."
    ),
  };
}

/*
 * Experience Archive Agent가 만든
 * 경험 카드 구조를 정리한다.
 */
function normalizeExperienceCard(
  rawCard = {}
) {
  return {
    title: cleanString(
      rawCard.title,
      "새로운 삶의 경험"
    ),

    summary: cleanString(
      rawCard.summary,
      "어르신의 경험을 정리했습니다."
    ),

    timeline: cleanStringArray(
      rawCard.timeline,
      10
    ),

    emotions: cleanStringArray(
      rawCard.emotions,
      8
    ),

    helpTypes: cleanStringArray(
      rawCard.helpTypes,
      8
    ),

    standardTags: normalizeTags(
      rawCard.standardTags ??
        rawCard.tags ??
        []
    ),
  };
}

/*
 * Safety & Fidelity Agent가 만든
 * 원문 충실도 검사 결과를 정리한다.
 */
function normalizeFidelity(
  rawFidelity = {}
) {
  return {
    preservedMeaning: cleanBoolean(
      rawFidelity.preservedMeaning,
      false
    ),

    addedFacts: cleanStringArray(
      rawFidelity.addedFacts,
      10
    ),

    warnings: cleanStringArray(
      rawFidelity.warnings,
      10
    ),
  };
}

/*
 * Experience Archive Agent,
 * Human Voice Agent,
 * Safety & Fidelity Agent의 통합 결과를 정리한다.
 */
export function normalizeMentorExperienceResult(
  rawResult = {}
) {
  const rawExperienceCard =
    rawResult.experienceCard ??
    rawResult.experience ??
    {};

  return {
    experienceCard:
      normalizeExperienceCard(
        rawExperienceCard
      ),

    letter: cleanString(
      rawResult.letter,
      "어르신의 경험을 정리하고 있습니다."
    ),

    edits: cleanStringArray(
      rawResult.edits,
      10
    ),

    fidelity: normalizeFidelity(
      rawResult.fidelity
    ),

    safety: normalizeSafety(
      rawResult.safety
    ),
  };
}

/*
 * Impact Feedback Agent의 결과를 정리한다.
 */
export function normalizeImpactFeedback(
  rawResult = {}
) {
  return {
    message: cleanString(
      rawResult.message,
      "당신의 경험이 한 사람에게 따뜻한 힘이 되었습니다."
    ),

    impactSummary: cleanString(
      rawResult.impactSummary
    ),

    highlightedExperience: cleanString(
      rawResult.highlightedExperience
    ),
  };
}

/*
 * 정상 처리 결과의 공통 응답 구조다.
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

/*
 * 오류 발생 시 사용하는 공통 응답 구조다.
 */
export function createErrorResponse(
  code,
  message
) {
  return {
    ok: false,
    data: null,

    error: {
      code: cleanString(
        code,
        "UNKNOWN_ERROR"
      ),

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

/*
 * ==================================================
 * 기존 api.js와의 임시 호환 함수
 * ==================================================
 *
 * 다음 단계에서 api.js를 새 구조로 수정하기 전까지
 * 기존 import 오류가 발생하지 않도록 남겨둔다.
 *
 * api.js 수정이 끝난 뒤에도 fallback 용도로 사용할 수 있다.
 */

/*
 * 기존 고민 분석 결과 호환 함수
 */
export function normalizeConcernAnalysis(
  rawResult = {}
) {
  return {
    summary: cleanString(
      rawResult.summary,
      "사용자의 고민을 분석했습니다."
    ),

    emotions: cleanStringArray(
      rawResult.emotions,
      5
    ),

    situation: cleanString(
      rawResult.situation,
      "구체적인 상황을 확인하고 있습니다."
    ),

    topic: cleanString(
      rawResult.topic,
      "기타"
    ),

    needs: cleanStringArray(
      rawResult.needs,
      5
    ),

    experienceTags: normalizeTags(
      rawResult.experienceTags ??
        rawResult.standardTags ??
        []
    ),

    urgency: normalizeUrgency(
      rawResult.urgency
    ),

    mentorQuestion: cleanString(
      rawResult.mentorQuestion,
      "비슷한 경험이 있다면 들려주세요."
    ),
  };
}

/*
 * 기존 매칭 결과 호환 함수
 */
export function normalizeMatchingResult(
  rawResult = {}
) {
  const candidate =
    normalizeMatchCandidate(rawResult);

  if (candidate) {
    return {
      mentorId: candidate.mentorId,
      experienceId:
        candidate.experienceId,
      score: candidate.totalScore,
      matchedTags:
        candidate.matchedConcerns,
      reason: candidate.reason,
    };
  }

  return {
    mentorId: "",
    experienceId: "",
    score: 0,
    matchedTags: [],
    reason:
      "현재 고민과 관련된 경험을 확인하고 있습니다.",
  };
}

/*
 * 기존 어르신 답변 결과 호환 함수
 */
export function normalizeMentorAnswer(
  rawResult = {}
) {
  return {
    letter: cleanString(
      rawResult.letter,
      "멘토의 경험을 정리하고 있습니다."
    ),

    edits: cleanStringArray(
      rawResult.edits,
      8
    ),

    experienceTags: normalizeTags(
      rawResult.experienceTags ??
        rawResult.standardTags ??
        []
    ),

    safety: normalizeSafety(
      rawResult.safety
    ),
  };
}

/*
 * 기존 감사 메시지 결과 호환 함수
 */
export function normalizeFeedbackResult(
  rawResult = {}
) {
  return {
    message: cleanString(
      rawResult.message,
      "당신의 경험이 한 사람에게 따뜻한 힘이 되었습니다."
    ),
  };
}