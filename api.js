/*
 * 이어봄 AI 기능 통합 인터페이스
 *
 * 팀원 B는 이 파일에서 제공하는 네 함수만 사용한다.
 *
 * 1. analyzeConcern()
 *    자유로운 고민의 범위·모호성·감정·상황·필요 분석
 *
 * 2. matchExperience()
 *    AI가 경험 아카이브를 비교하고 최종 경험을 선정
 *
 * 3. processMentorAnswer()
 *    어르신 답변을 경험 카드와 편지로 정리
 *
 * 4. createImpactFeedback()
 *    임산부의 반응을 어르신용 영향 메시지로 변환
 *
 * 현재는 Mock 모드로 동작한다.
 * 이후 api/solar.js가 완성되면 Solar 모드로 전환한다.
 */

import {
  SOURCE_TYPES,
  ROUTE_TYPES,
  normalizeConcernRoute,
  normalizeAiMatchResult,
  normalizeMentorExperienceResult,
  normalizeImpactFeedback,
  createSuccessResponse,
  createErrorResponse,
} from "./agents.js";

import {
  loadMentorArchive,
  prepareExperienceArchiveForAi,
  validateAiMatchResult,
  createFallbackMatchResult,
} from "./matching.js";

/*
 * AI 실행 모드
 */
export const AI_MODES = Object.freeze({
  MOCK: "mock",
  SOLAR: "solar",
});

/*
 * 현재는 Mock 모드로 실행한다.
 *
 * 실제 Solar 연결 단계에서 다음처럼 변경한다.
 *
 * export const AI_MODE = AI_MODES.SOLAR;
 */
export const AI_MODE = AI_MODES.MOCK;

/*
 * 서버에 전달할 AI 작업 이름이다.
 */
export const API_ACTIONS = Object.freeze({
  ANALYZE_CONCERN: "analyze-concern",
  MATCH_EXPERIENCE: "match-experience",
  PROCESS_MENTOR_ANSWER: "process-mentor-answer",
  CREATE_IMPACT_FEEDBACK: "create-impact-feedback",
});

/*
 * 멘토 데이터는 매칭할 때마다 다시 요청하지 않고
 * 한 번 불러온 결과를 재사용한다.
 */
let mentorArchivePromise = null;

/*
 * dummy_mentors.json을 불러온다.
 *
 * 첫 요청이 성공하면 같은 데이터를 계속 재사용한다.
 * 실패하면 저장값을 초기화해서 다음 요청에서 다시 시도한다.
 */
async function getMentorArchive() {
  if (!mentorArchivePromise) {
    mentorArchivePromise =
      loadMentorArchive().catch((error) => {
        mentorArchivePromise = null;
        throw error;
      });
  }

  return mentorArchivePromise;
}

/*
 * Mock 결과가 바로 나타나면
 * AI가 작동한 것처럼 보이지 않기 때문에
 * 짧은 대기 시간을 둔다.
 */
const MOCK_DELAYS = Object.freeze({
  ANALYZE_CONCERN: 700,
  MATCH_EXPERIENCE: 900,
  PROCESS_MENTOR_ANSWER: 800,
  CREATE_IMPACT_FEEDBACK: 500,
});

/*
 * 지정한 시간만큼 기다린다.
 */
function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/*
 * 문자열을 안전하게 가져온다.
 *
 * 다음 두 방식 모두 지원한다.
 *
 * analyzeConcern("고민 내용")
 *
 * analyzeConcern({
 *   text: "고민 내용"
 * })
 */
function getTextFromPayload(
  payload,
  fieldName
) {
  if (typeof payload === "string") {
    return payload.trim();
  }

  if (
    !payload ||
    typeof payload !== "object"
  ) {
    return "";
  }

  const value = payload[fieldName];

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

/*
 * 문자열 배열에서 중복을 제거한다.
 */
function uniqueStrings(values) {
  return [
    ...new Set(
      values.filter(
        (value) =>
          typeof value === "string" &&
          value.trim().length > 0
      )
    ),
  ];
}

/*
 * 문장에 특정 표현 중 하나가 들어 있는지 확인한다.
 */
function includesAny(text, keywords) {
  return keywords.some((keyword) =>
    text.includes(keyword)
  );
}

/*
 * 추가 질문 기록을 안전하게 정리한다.
 */
function getClarificationHistory(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.history)
  ) {
    return [];
  }

  return payload.history
    .map((item) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return null;
      }

      const question =
        typeof item.question === "string"
          ? item.question.trim()
          : "";

      const answer =
        typeof item.answer === "string"
          ? item.answer.trim()
          : "";

      if (!question && !answer) {
        return null;
      }

      return {
        question,
        answer,
      };
    })
    .filter((item) => item !== null)
    .slice(0, 5);
}

/*
 * Solar 서버 엔드포인트를 호출한다.
 *
 * 현재 AI_MODE가 mock이므로 아직 실행되지 않는다.
 * 이후 api/solar.js를 구현하면 그대로 사용할 수 있다.
 */
async function callSolarAction(
  action,
  payload
) {
  const response = await fetch(
    "/api/solar",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        action,
        payload,
      }),
    }
  );

  let responseBody;

  try {
    responseBody =
      await response.json();
  } catch {
    throw new Error(
      "Solar 서버 응답을 해석할 수 없습니다."
    );
  }

  if (
    !response.ok ||
    responseBody?.ok === false
  ) {
    const message =
      responseBody?.error?.message ??
      responseBody?.message ??
      "Solar 요청에 실패했습니다.";

    throw new Error(message);
  }

  /*
   * 서버가 공통 응답 구조로 반환하면 data를 사용하고,
   * 원본 JSON만 반환하면 그대로 사용한다.
   */
  return responseBody?.data ??
    responseBody;
}

/*
 * ==================================================
 * Mock Concern Router + Deep Analysis
 * ==================================================
 */

/*
 * Mock 분석 결과를 만든다.
 *
 * 실제 서비스에서는 Solar가 자유로운 문맥을 이해한다.
 * 이 코드는 UI 연결과 API 실패 대비를 위한 시연용 결과다.
 */
function createMockConcernAnalysis(
  text,
  history
) {
  const historyAnswers = history
    .map((item) => item.answer)
    .filter(Boolean);

  const combinedText = [
    text,
    ...historyAnswers,
  ].join(" ");

  /*
   * 현재 서비스 범위와 관련 없는 입력
   */
  const unrelatedKeywords = [
    "날씨",
    "주식",
    "비트코인",
    "축구",
    "맛집",
    "코딩 문제",
  ];

  if (
    includesAny(
      combinedText,
      unrelatedKeywords
    )
  ) {
    return {
      route: ROUTE_TYPES.NO_MATCH,
      needsClarification: false,
      clarifyingQuestion: "",

      response:
        "이어봄은 임신·출산·육아·가족 관계·경력 변화에 관한 경험을 연결하는 서비스입니다.",

      analysis: {
        summary:
          "현재 입력은 이어봄의 경험 연결 범위와 직접적인 관련이 없습니다.",

        concerns: [],
        emotions: [],
        situation: "",
        needs: [],
        standardTags: [],
        urgency: "normal",
      },
    };
  }

  /*
   * 안전 안내가 먼저 필요한 입력
   *
   * 실제 Solar 단계에서는 단어만 보지 않고
   * 문맥 전체를 기준으로 판단한다.
   */
  const safetyKeywords = [
    "폭력",
    "안전이 위협",
    "응급 상황",
  ];

  if (
    includesAny(
      combinedText,
      safetyKeywords
    )
  ) {
    return {
      route: ROUTE_TYPES.SAFETY,
      needsClarification: false,
      clarifyingQuestion: "",

      response:
        "현재 상황은 개인의 경험 추천보다 주변의 신뢰할 수 있는 사람이나 전문기관의 확인이 먼저 필요할 수 있습니다.",

      analysis: {
        summary:
          "안전과 관련된 우선 확인이 필요한 상황으로 분석되었습니다.",

        concerns: [
          {
            type: "안전 문제",
            description:
              "사용자가 안전과 관련된 어려움을 언급했습니다.",
            priority: 1,
          },
        ],

        emotions: [
          {
            name: "두려움",
            intensity: 90,
            evidence:
              "안전과 관련된 표현이 포함되어 있습니다.",
          },
        ],

        situation:
          "경험 연결보다 안전 확인이 우선되어야 할 가능성이 있습니다.",

        needs: [
          "신뢰할 수 있는 주변 사람의 도움",
          "전문적인 상황 확인",
        ],

        standardTags: [],
        urgency: "urgent",
      },
    };
  }

  /*
   * 너무 짧거나 구체적인 내용이 없는 경우
   */
  const vagueExpressions = [
    "힘들어요",
    "너무 힘들어요",
    "그냥 힘들어",
    "모르겠어요",
    "답답해요",
  ];

  const hasHistoryAnswer =
    historyAnswers.length > 0;

  const isVeryShort =
    combinedText.replace(/\s/g, "")
      .length < 10;

  const isVague =
    vagueExpressions.some(
      (expression) =>
        combinedText.trim() ===
        expression
    );

  if (
    !hasHistoryAnswer &&
    (isVeryShort || isVague)
  ) {
    return {
      route:
        ROUTE_TYPES.CLARIFICATION,

      needsClarification: true,

      clarifyingQuestion:
        "가장 크게 힘든 부분은 출산에 대한 걱정, 육아와 가족 관계, 일과 경력, 또는 내 마음과 정체성 중 어느 쪽에 가까운가요?",

      response: "",

      analysis: {
        summary:
          "현재 고민을 정확히 이해하기 위해 추가 설명이 필요합니다.",

        concerns: [],
        emotions: [],
        situation:
          "사용자의 구체적인 상황을 확인하고 있습니다.",

        needs: [
          "고민 상황에 대한 추가 설명",
        ],

        standardTags: [],
        urgency: "normal",
      },
    };
  }

  const concerns = [];
  const emotions = [];
  const needs = [];
  const standardTags = [];

  /*
   * 출산 관련 고민
   */
  if (
    includesAny(combinedText, [
      "출산",
      "낳",
      "초산",
      "첫아이",
      "임신",
    ])
  ) {
    concerns.push({
      type: "출산과 부모 역할",
      description:
        "출산과 부모가 되는 과정에 대한 걱정을 느끼고 있습니다.",
      priority: 1,
    });

    emotions.push({
      name: "두려움",
      intensity: 80,
      evidence:
        "출산 또는 부모가 되는 과정에 대한 걱정이 나타납니다.",
    });

    needs.push(
      "비슷한 출산 경험",
      "정서적 지지"
    );

    standardTags.push(
      "첫 출산",
      "출산 불안",
      "부모 역할 불안"
    );
  }

  /*
   * 경력 관련 고민
   */
  if (
    includesAny(combinedText, [
      "회사",
      "직장",
      "일을",
      "일이",
      "경력",
      "취업",
      "그만두",
    ])
  ) {
    concerns.push({
      type: "경력 변화",
      description:
        "출산과 육아 이후 일을 계속할 수 있을지 걱정하고 있습니다.",
      priority:
        concerns.length + 1,
    });

    emotions.push({
      name: "막막함",
      intensity: 85,
      evidence:
        "일과 경력의 지속 가능성에 대한 걱정이 나타납니다.",
    });

    needs.push(
      "경력 회복 경험",
      "현실적인 경험"
    );

    standardTags.push(
      "경력 단절",
      "재취업",
      "일과 육아 병행"
    );
  }

  /*
   * 배우자와 가족 관계
   */
  if (
    includesAny(combinedText, [
      "남편",
      "배우자",
      "싸워",
      "싸우",
      "갈등",
      "대화가 안",
    ])
  ) {
    concerns.push({
      type: "배우자 관계",
      description:
        "배우자가 자신의 어려움을 충분히 이해하지 못한다고 느끼고 있습니다.",
      priority:
        concerns.length + 1,
    });

    emotions.push({
      name: "외로움",
      intensity: 70,
      evidence:
        "배우자와 충분히 이해받지 못한다는 내용이 나타납니다.",
    });

    needs.push(
      "관계 회복 경험",
      "배우자와 역할을 조정한 경험"
    );

    standardTags.push(
      "부부 갈등",
      "배우자와의 소통"
    );
  }

  /*
   * 자아 상실과 정체성 고민
   */
  if (
    includesAny(combinedText, [
      "제 인생",
      "내 인생",
      "나를 잃",
      "엄마로만",
      "제 삶",
      "내 삶",
      "없어질",
    ])
  ) {
    concerns.push({
      type: "정체성 변화",
      description:
        "엄마 역할에 집중하면서 자신의 삶과 정체성을 잃을까 걱정하고 있습니다.",
      priority:
        concerns.length + 1,
    });

    emotions.push({
      name: "혼란",
      intensity: 85,
      evidence:
        "자신의 삶이 사라질 것 같다는 걱정이 나타납니다.",
    });

    needs.push(
      "정체성 회복 경험",
      "정서적 지지"
    );

    standardTags.push(
      "자아 상실",
      "부모 역할 불안",
      "정서적 지지 필요"
    );
  }

  /*
   * 육아 부담
   */
  if (
    includesAny(combinedText, [
      "육아",
      "아이를 키",
      "혼자 돌",
      "독박",
    ])
  ) {
    concerns.push({
      type: "육아 부담",
      description:
        "육아를 감당해야 한다는 부담을 느끼고 있습니다.",
      priority:
        concerns.length + 1,
    });

    emotions.push({
      name: "부담감",
      intensity: 75,
      evidence:
        "육아를 혼자 또는 크게 감당해야 한다는 걱정이 나타납니다.",
    });

    needs.push(
      "육아 적응 경험",
      "실제 경험"
    );

    standardTags.push(
      "육아 부담",
      "육아 적응"
    );
  }

  /*
   * 경제 문제
   */
  if (
    includesAny(combinedText, [
      "돈",
      "생활비",
      "경제",
      "비용",
    ])
  ) {
    concerns.push({
      type: "경제적 부담",
      description:
        "출산과 육아에 필요한 비용을 걱정하고 있습니다.",
      priority:
        concerns.length + 1,
    });

    emotions.push({
      name: "부담감",
      intensity: 80,
      evidence:
        "생활비나 육아 비용에 대한 걱정이 나타납니다.",
    });

    needs.push(
      "비슷한 생활 경험",
      "현실적인 경험"
    );

    standardTags.push(
      "경제적 어려움",
      "가족 부양 부담"
    );
  }

  /*
   * 특정 규칙에 잡히지 않은 자유 입력도
   * 이어봄 범위의 고민으로 받아들인다.
   *
   * 실제 Solar는 자유로운 문맥을 더 세밀하게 분석한다.
   */
  if (concerns.length === 0) {
    concerns.push({
      type: "복합적인 생활 고민",
      description:
        "임신과 출산 이후의 삶에 대한 복합적인 어려움을 느끼고 있습니다.",
      priority: 1,
    });

    emotions.push({
      name: "막막함",
      intensity: 65,
      evidence:
        "현재 상황을 어렵게 느끼고 있다는 표현이 나타납니다.",
    });

    needs.push(
      "공감",
      "비슷한 삶의 경험"
    );

    standardTags.push(
      "정서적 지지 필요"
    );
  }

  return {
    route: ROUTE_TYPES.IN_SCOPE,
    needsClarification: false,
    clarifyingQuestion: "",
    response: "",

    analysis: {
      summary:
        concerns
          .map((concern) => concern.type)
          .join(", ") +
        "에 관한 복합적인 고민으로 분석되었습니다.",

      concerns,

      emotions,

      situation:
        "임신과 출산 이후의 생활 변화 속에서 여러 걱정을 함께 느끼고 있습니다.",

      needs: uniqueStrings(needs),

      standardTags:
        uniqueStrings(standardTags),

      urgency: "normal",
    },
  };
}

/*
 * ==================================================
 * Mock Experience Match Judge
 * ==================================================
 */

/*
 * Mock에서 사용할 대표 경험 카드다.
 *
 * 실제 Solar 단계에서는 dummy_mentors.json의
 * 12개 경험을 모두 읽고 직접 평가한다.
 */
const MOCK_MATCH_LIBRARY = Object.freeze({
  FIRST_BIRTH: {
    mentorId: "mentor-001",
    experienceId: "experience-001",
    mentorName: "김정희",
    experienceTitle:
      "처음 엄마가 되었을 때의 두려움",

    scores: {
      situationSimilarity: 28,
      emotionalSimilarity: 18,
      livedExperienceSimilarity: 19,
      needSimilarity: 14,
      transferability: 9,
      safety: 5,
    },

    matchedConcerns: [
      "첫 출산",
      "출산 불안",
      "부모 역할 불안",
    ],

    reason:
      "첫아이 출산 전 엄마가 될 자신이 없었던 경험이 현재 고민과 직접적으로 관련되어 있습니다.",

    evidence: [
      "첫아이 출산 전 부모 역할에 대한 두려움을 느낀 경험",
      "혼자 육아하면서 적응해 간 경험",
    ],

    limitations:
      "경력 변화나 경제적인 문제를 직접 다루는 경험은 아닙니다.",
  },

  LATE_BIRTH: {
    mentorId: "mentor-003",
    experienceId: "experience-005",
    mentorName: "이순자",
    experienceTitle:
      "늦은 출산을 앞두고 느꼈던 불안",

    scores: {
      situationSimilarity: 27,
      emotionalSimilarity: 18,
      livedExperienceSimilarity: 18,
      needSimilarity: 13,
      transferability: 9,
      safety: 5,
    },

    matchedConcerns: [
      "늦은 출산",
      "출산 불안",
      "부모 역할 불안",
      "배우자와의 소통",
    ],

    reason:
      "부모가 될 수 있을지 걱정했던 경험과 배우자에게 두려움을 이야기한 과정이 현재 고민과 관련되어 있습니다.",

    evidence: [
      "좋은 엄마가 될 수 있을지 걱정한 경험",
      "배우자와 출산에 대한 두려움을 나눈 경험",
    ],

    limitations:
      "맞벌이나 재취업 문제를 직접 다루는 경험은 아닙니다.",
  },

  CAREER: {
    mentorId: "mentor-003",
    experienceId: "experience-006",
    mentorName: "이순자",
    experienceTitle:
      "아이들이 성장한 뒤 다시 일을 시작한 경험",

    scores: {
      situationSimilarity: 29,
      emotionalSimilarity: 17,
      livedExperienceSimilarity: 20,
      needSimilarity: 14,
      transferability: 9,
      safety: 5,
    },

    matchedConcerns: [
      "경력 단절",
      "재취업",
      "일과 육아 병행",
      "부부 갈등",
    ],

    reason:
      "육아로 일을 쉬었다가 다시 시작하고, 배우자와 가사 및 돌봄 역할을 조정했던 경험이 현재 고민과 가깝습니다.",

    evidence: [
      "육아로 일을 오랫동안 쉰 경험",
      "배우자와 역할 문제로 갈등한 경험",
      "역할을 나눈 뒤 다시 일을 시작한 경험",
    ],

    limitations:
      "출산 과정 자체에 대한 두려움은 직접 다루지 않습니다.",
  },

  POSTPARTUM: {
    mentorId: "mentor-004",
    experienceId: "experience-007",
    mentorName: "최명숙",
    experienceTitle:
      "출산 후 몸과 마음이 지쳤던 시간",

    scores: {
      situationSimilarity: 28,
      emotionalSimilarity: 20,
      livedExperienceSimilarity: 19,
      needSimilarity: 15,
      transferability: 8,
      safety: 4,
    },

    matchedConcerns: [
      "산후 회복",
      "산후우울 경험",
      "출산 후 외로움",
      "도움 요청 어려움",
    ],

    reason:
      "출산 후 몸과 마음이 지쳤고 주변에 어려움을 말하기 어려웠던 경험이 현재 고민과 관련되어 있습니다.",

    evidence: [
      "출산 후 회복이 더뎠던 경험",
      "외로움과 죄책감을 느낀 경험",
      "가족에게 도움을 요청한 경험",
    ],

    limitations:
      "이 경험은 개인의 경험이며 전문적인 의료 판단을 대신하지 않습니다.",
  },

  PARTNERSHIP: {
    mentorId: "mentor-005",
    experienceId: "experience-009",
    mentorName: "한미자",
    experienceTitle:
      "맞벌이하며 일과 육아를 함께 감당한 경험",

    scores: {
      situationSimilarity: 28,
      emotionalSimilarity: 17,
      livedExperienceSimilarity: 19,
      needSimilarity: 14,
      transferability: 10,
      safety: 5,
    },

    matchedConcerns: [
      "맞벌이 육아",
      "일과 육아 병행",
      "육아 부담",
      "배우자와의 소통",
    ],

    reason:
      "일과 육아의 부담이 한쪽에 집중되면서 갈등을 겪고 역할을 다시 나눈 경험이 현재 상황과 관련되어 있습니다.",

    evidence: [
      "퇴근 후 육아와 집안일 부담을 함께 감당한 경험",
      "배우자와 역할을 구체적으로 나눈 경험",
    ],

    limitations:
      "경력 단절 후 재취업 과정을 직접 다루는 경험은 아닙니다.",
  },

  IDENTITY: {
    mentorId: "mentor-006",
    experienceId: "experience-011",
    mentorName: "오순희",
    experienceTitle:
      "엄마가 된 뒤 나를 잃은 것 같았던 경험",

    scores: {
      situationSimilarity: 30,
      emotionalSimilarity: 19,
      livedExperienceSimilarity: 20,
      needSimilarity: 15,
      transferability: 9,
      safety: 4,
    },

    matchedConcerns: [
      "자아 상실",
      "부모 역할 불안",
      "출산 후 외로움",
      "정서적 지지 필요",
    ],

    reason:
      "누군가의 엄마로만 살아가는 것처럼 느끼며 자신의 삶을 잃었다고 생각했던 경험이 현재 고민과 매우 가깝습니다.",

    evidence: [
      "엄마 역할로만 살아가는 것 같았던 경험",
      "자신이 무엇을 좋아하는지 잊었다고 느낀 경험",
      "혼자 쉬고 싶다는 생각에 죄책감을 느낀 경험",
    ],

    limitations:
      "구체적인 취업이나 경제 문제를 해결한 경험은 아닙니다.",
  },

  FAMILY_CONFLICT: {
    mentorId: "mentor-002",
    experienceId: "experience-004",
    mentorName: "박영자",
    experienceTitle:
      "시부모와의 갈등 이후 관계를 다시 만든 경험",

    scores: {
      situationSimilarity: 27,
      emotionalSimilarity: 17,
      livedExperienceSimilarity: 19,
      needSimilarity: 14,
      transferability: 9,
      safety: 5,
    },

    matchedConcerns: [
      "시부모 갈등",
      "부부 갈등",
      "배우자와의 소통",
      "가족 관계 회복",
    ],

    reason:
      "육아 방식을 둘러싼 가족 갈등과 배우자에게 자신의 어려움을 설명했던 과정이 현재 고민과 관련되어 있습니다.",

    evidence: [
      "육아 방식으로 시부모와 갈등한 경험",
      "배우자에게 자신의 입장을 설명한 경험",
    ],

    limitations:
      "경력이나 자아 상실 문제를 직접 다루는 경험은 아닙니다.",
  },
});

/*
 * 분석 결과에 특정 태그가 포함되는지 확인한다.
 */
function analysisHasTag(
  analysis,
  tag
) {
  return Array.isArray(
    analysis?.standardTags
  )
    ? analysis.standardTags.includes(tag)
    : false;
}

/*
 * Mock에서 가장 적절한 경험을 선택한다.
 *
 * 실제 Solar 모드에서는 이 함수가 아니라
 * AI가 12개 경험 전체를 직접 평가한다.
 */
function selectMockMatchKey(analysis) {
  if (
    analysisHasTag(
      analysis,
      "자아 상실"
    )
  ) {
    return "IDENTITY";
  }

  if (
    analysisHasTag(
      analysis,
      "경력 단절"
    ) ||
    analysisHasTag(
      analysis,
      "재취업"
    )
  ) {
    return "CAREER";
  }

  if (
    analysisHasTag(
      analysis,
      "맞벌이 육아"
    ) ||
    analysisHasTag(
      analysis,
      "일과 육아 병행"
    )
  ) {
    return "PARTNERSHIP";
  }

  if (
    analysisHasTag(
      analysis,
      "산후 회복"
    ) ||
    analysisHasTag(
      analysis,
      "산후우울 경험"
    )
  ) {
    return "POSTPARTUM";
  }

  if (
    analysisHasTag(
      analysis,
      "시부모 갈등"
    )
  ) {
    return "FAMILY_CONFLICT";
  }

  if (
    analysisHasTag(
      analysis,
      "늦은 출산"
    )
  ) {
    return "LATE_BIRTH";
  }

  return "FIRST_BIRTH";
}

/*
 * 선택된 경험에 맞는 어르신용 질문을 만든다.
 */
function createMockMentorQuestion(
  matchKey
) {
  const questions = {
    FIRST_BIRTH:
      "처음 부모가 되었을 때 잘 해낼 수 있을지 걱정했던 경험이 있으신가요? 그 시기를 어떻게 지나오셨는지 들려주세요.",

    LATE_BIRTH:
      "출산을 앞두고 좋은 부모가 될 수 있을지 걱정했던 경험이 있으신가요? 마음을 어떻게 다독이셨는지 들려주세요.",

    CAREER:
      "아이를 키우며 일을 쉬었다가 다시 시작하고 싶었던 경험이 있으신가요? 가족과 역할을 어떻게 조정하셨는지 들려주세요.",

    POSTPARTUM:
      "출산 후 몸과 마음이 예상보다 많이 지쳤던 경험이 있으신가요? 주변에 어려움을 어떻게 이야기하셨는지 들려주세요.",

    PARTNERSHIP:
      "일과 육아를 함께 감당하면서 배우자와 역할 문제로 힘들었던 경험이 있으신가요? 역할을 어떻게 나누셨는지 들려주세요.",

    IDENTITY:
      "아이와 가족을 돌보다가 자신을 잃은 것처럼 느낀 경험이 있으신가요? 자신의 시간을 어떻게 다시 찾으셨는지 들려주세요.",

    FAMILY_CONFLICT:
      "육아 방식 때문에 가족과 갈등했던 경험이 있으신가요? 배우자와 어떻게 대화하며 관계를 다시 만들어 가셨는지 들려주세요.",
  };

  return (
    questions[matchKey] ??
    "비슷한 경험이 있으시다면 들려주세요."
  );
}

/*
 * Mock 매칭 결과를 생성한다.
 */
function createMockMatchResult(analysis) {
  const selectedKey =
    selectMockMatchKey(analysis);

  const alternativeKeys =
    Object.keys(MOCK_MATCH_LIBRARY)
      .filter(
        (key) => key !== selectedKey
      )
      .slice(0, 2);

  return {
    selected:
      MOCK_MATCH_LIBRARY[selectedKey],

    alternatives:
      alternativeKeys.map(
        (key) =>
          MOCK_MATCH_LIBRARY[key]
      ),

    mentorQuestion:
      createMockMentorQuestion(
        selectedKey
      ),
  };
}

/*
 * ==================================================
 * Mock Mentor Experience Processing
 * ==================================================
 */

/*
 * 어르신 답변을 Mock 경험 카드와 편지로 만든다.
 */
function createMockMentorResult(
  transcript
) {
  return {
    experienceCard: {
      title:
        "두려움 속에서도 조금씩 부모가 되어간 경험",

      summary:
        "처음 부모가 되었을 때 느꼈던 불안과 혼자 감당하려 했던 시간을 지나, 모든 것을 처음부터 잘할 필요는 없다는 것을 알게 된 경험입니다.",

      timeline: [
        "부모가 될 자신이 없다고 느낌",
        "혼자 감당하려고 함",
        "주변에 어려움을 이야기함",
        "조금씩 자신의 방식으로 적응함",
      ],

      emotions: [
        "두려움",
        "부담감",
        "외로움",
        "안도",
      ],

      helpTypes: [
        "공감",
        "실제 경험",
        "정서적 지지",
      ],

      standardTags: [
        "첫 출산",
        "출산 불안",
        "육아 적응",
        "도움 요청 어려움",
      ],
    },

    /*
     * Mock에서는 입력한 원문을 최대한 유지한다.
     * 실제 Solar는 말투와 의미를 보존하며 문장을 정리한다.
     */
    letter:
      `선생님께서 들려주신 경험입니다. ${transcript}`,

    edits: [
      "말의 핵심 순서가 드러나도록 문장을 정리했습니다.",
      "반복되는 표현을 줄였습니다.",
      "원래 답변에 없던 사건이나 조언은 추가하지 않았습니다.",
    ],

    fidelity: {
      preservedMeaning: true,
      addedFacts: [],
      warnings: [],
    },

    safety: {
      riskLevel: "safe",
      flags: [],
      guidance:
        "이 내용은 한 사람의 개인적인 경험이며, 모든 사람에게 동일하게 적용되는 정답은 아닙니다.",
    },
  };
}

/*
 * ==================================================
 * Mock Impact Feedback
 * ==================================================
 */

/*
 * 임산부의 반응을 어르신용 메시지로 만든다.
 */
function createMockImpactResult(
  reaction,
  payload
) {
  const concernSummary =
    typeof payload?.concernSummary ===
    "string"
      ? payload.concernSummary.trim()
      : "";

  const experienceTitle =
    typeof payload?.selectedMatch
      ?.experienceTitle === "string"
      ? payload.selectedMatch
          .experienceTitle.trim()
      : "";

  return {
    message:
      `이용자가 “${reaction}”라고 마음을 전했습니다. 선생님의 경험이 혼자가 아니라는 안도감과 다시 한 걸음 나아갈 용기를 주었습니다.`,

    impactSummary:
      concernSummary ||
      "비슷한 어려움을 겪고 있는 이용자에게 정서적인 힘을 전했습니다.",

    highlightedExperience:
      experienceTitle ||
      "선생님이 직접 살아온 경험",
  };
}

/*
 * ==================================================
 * 공개 함수 1: 고민 분석
 * ==================================================
 */

/*
 * 사용 예시:
 *
 * analyzeConcern({
 *   text: "출산 후 일을 그만두게 될까 봐 걱정돼요.",
 *   history: []
 * })
 */
export async function analyzeConcern(
  payload
) {
  const text = getTextFromPayload(
    payload,
    "text"
  );

  if (!text) {
    return createErrorResponse(
      "EMPTY_CONCERN",
      "고민 내용을 입력해 주세요."
    );
  }

  const history =
    getClarificationHistory(payload);

  if (AI_MODE === AI_MODES.SOLAR) {
    try {
      const solarResult =
        await callSolarAction(
          API_ACTIONS.ANALYZE_CONCERN,
          {
            text,
            history,
          }
        );

      return createSuccessResponse(
        normalizeConcernRoute(
          solarResult
        ),
        SOURCE_TYPES.SOLAR,
        false
      );
    } catch (error) {
      const fallbackResult =
        createMockConcernAnalysis(
          text,
          history
        );

      return createSuccessResponse(
        normalizeConcernRoute(
          fallbackResult
        ),
        SOURCE_TYPES.FALLBACK,
        true
      );
    }
  }

  await wait(
    MOCK_DELAYS.ANALYZE_CONCERN
  );

  const mockResult =
    createMockConcernAnalysis(
      text,
      history
    );

  return createSuccessResponse(
    normalizeConcernRoute(mockResult),
    SOURCE_TYPES.MOCK,
    false
  );
}

/*
 * ==================================================
 * 공개 함수 2: 경험 매칭
 * ==================================================
 */

/*
 * 사용 예시:
 *
 * matchExperience({
 *   analysis: concernResult.data.analysis
 * })
 */
export async function matchExperience(
  payload
) {
  const analysis = payload?.analysis;

  if (
    !analysis ||
    typeof analysis !== "object"
  ) {
    return createErrorResponse(
      "EMPTY_ANALYSIS",
      "경험을 연결하려면 먼저 고민 분석이 필요합니다."
    );
  }

  /*
   * 실제 경험 데이터가 없으면
   * AI도 올바른 경험을 선택할 수 없다.
   */
  let archive;

  try {
    archive =
      await getMentorArchive();
  } catch (error) {
    return createErrorResponse(
      "ARCHIVE_LOAD_FAILED",
      error instanceof Error
        ? error.message
        : "멘토 경험 데이터를 불러오지 못했습니다."
    );
  }

  /*
   * 실제 Solar 모드
   */
  if (AI_MODE === AI_MODES.SOLAR) {
    try {
      /*
       * 12개 경험 카드에서 AI 평가에 필요한
       * 정보만 정리한다.
       */
      const experiences =
        prepareExperienceArchiveForAi(
          archive
        );

      if (experiences.length === 0) {
        throw new Error(
          "AI가 평가할 경험 카드가 없습니다."
        );
      }

      /*
       * 고민 분석 결과와 12개 경험을
       * Solar에 함께 전달한다.
       */
      const solarResult =
        await callSolarAction(
          API_ACTIONS.MATCH_EXPERIENCE,
          {
            analysis,
            experiences,
          }
        );

      /*
       * 먼저 AI 응답 형식을 정리한다.
       */
      const normalizedResult =
        normalizeAiMatchResult(
          solarResult
        );

      /*
       * AI가 반환한 ID가 실제 데이터에 있는지
       * 다시 검사한다.
       */
      const validatedResult =
        validateAiMatchResult(
          normalizedResult,
          archive
        );

      if (!validatedResult.selected) {
        throw new Error(
          "AI가 유효한 경험을 선택하지 못했습니다."
        );
      }

      return createSuccessResponse(
        validatedResult,
        SOURCE_TYPES.SOLAR,
        false
      );
    } catch (error) {
      /*
       * Solar가 실패하면 matching.js의
       * 규칙 기반 비상 추천을 사용한다.
       */
      const fallbackResult =
        createFallbackMatchResult(
          analysis,
          archive
        );

      const validatedFallback =
        validateAiMatchResult(
          fallbackResult,
          archive
        );

      if (!validatedFallback.selected) {
        return createErrorResponse(
          "NO_MATCH",
          "현재 고민과 연결할 수 있는 경험을 찾지 못했습니다."
        );
      }

      return createSuccessResponse(
        validatedFallback,
        SOURCE_TYPES.FALLBACK,
        true
      );
    }
  }

  /*
   * 현재 사용하는 Mock 모드
   */
  await wait(
    MOCK_DELAYS.MATCH_EXPERIENCE
  );

  /*
   * Mock 결과도 실제 데이터와 대조한다.
   * Mock이라고 해서 존재하지 않는 ID를 허용하지 않는다.
   */
  const mockResult =
    normalizeAiMatchResult(
      createMockMatchResult(analysis)
    );

  const validatedMock =
    validateAiMatchResult(
      mockResult,
      archive
    );

  if (validatedMock.selected) {
    return createSuccessResponse(
      validatedMock,
      SOURCE_TYPES.MOCK,
      false
    );
  }

  /*
   * Mock 데이터의 ID가 잘못된 경우에도
   * 규칙 기반 추천을 한 번 더 시도한다.
   */
  const ruleResult =
    createFallbackMatchResult(
      analysis,
      archive
    );

  const validatedRuleResult =
    validateAiMatchResult(
      ruleResult,
      archive
    );

  if (!validatedRuleResult.selected) {
    return createErrorResponse(
      "NO_MATCH",
      "현재 고민과 연결할 수 있는 경험을 찾지 못했습니다."
    );
  }

  return createSuccessResponse(
    validatedRuleResult,
    SOURCE_TYPES.RULE,
    true
  );
}
/*
 * ==================================================
 * 공개 함수 3: 어르신 답변 처리
 * ==================================================
 */

/*
 * 사용 예시:
 *
 * processMentorAnswer({
 *   question: "비슷한 경험이 있으신가요?",
 *   transcript: "저도 처음에는 많이 무서웠어요.",
 *   selectedMatch: {}
 * })
 */
export async function processMentorAnswer(
  payload
) {
  const transcript =
    getTextFromPayload(
      payload,
      "transcript"
    );

  if (!transcript) {
    return createErrorResponse(
      "EMPTY_TRANSCRIPT",
      "어르신의 답변을 입력해 주세요."
    );
  }

  const question =
    typeof payload?.question ===
    "string"
      ? payload.question.trim()
      : "";

  const selectedMatch =
    payload?.selectedMatch &&
    typeof payload.selectedMatch ===
      "object"
      ? payload.selectedMatch
      : null;

  if (AI_MODE === AI_MODES.SOLAR) {
    try {
      const solarResult =
        await callSolarAction(
          API_ACTIONS
            .PROCESS_MENTOR_ANSWER,
          {
            question,
            transcript,
            selectedMatch,
          }
        );

      return createSuccessResponse(
        normalizeMentorExperienceResult(
          solarResult
        ),
        SOURCE_TYPES.SOLAR,
        false
      );
    } catch (error) {
      const fallbackResult =
        createMockMentorResult(
          transcript
        );

      return createSuccessResponse(
        normalizeMentorExperienceResult(
          fallbackResult
        ),
        SOURCE_TYPES.FALLBACK,
        true
      );
    }
  }

  await wait(
    MOCK_DELAYS
      .PROCESS_MENTOR_ANSWER
  );

  const mockResult =
    createMockMentorResult(
      transcript
    );

  return createSuccessResponse(
    normalizeMentorExperienceResult(
      mockResult
    ),
    SOURCE_TYPES.MOCK,
    false
  );
}

/*
 * ==================================================
 * 공개 함수 4: 감사 영향 메시지 생성
 * ==================================================
 */

/*
 * 사용 예시:
 *
 * createImpactFeedback({
 *   reaction: "혼자가 아닌 것 같아요",
 *   concernSummary: "...",
 *   selectedMatch: {}
 * })
 */
export async function createImpactFeedback(
  payload
) {
  const reaction =
    getTextFromPayload(
      payload,
      "reaction"
    );

  if (!reaction) {
    return createErrorResponse(
      "EMPTY_REACTION",
      "감사 반응을 선택해 주세요."
    );
  }

  if (AI_MODE === AI_MODES.SOLAR) {
    try {
      const solarResult =
        await callSolarAction(
          API_ACTIONS
            .CREATE_IMPACT_FEEDBACK,
          {
            reaction,

            concernSummary:
              payload?.concernSummary ??
              "",

            selectedMatch:
              payload?.selectedMatch ??
              null,
          }
        );

      return createSuccessResponse(
        normalizeImpactFeedback(
          solarResult
        ),
        SOURCE_TYPES.SOLAR,
        false
      );
    } catch (error) {
      const fallbackResult =
        createMockImpactResult(
          reaction,
          payload
        );

      return createSuccessResponse(
        normalizeImpactFeedback(
          fallbackResult
        ),
        SOURCE_TYPES.FALLBACK,
        true
      );
    }
  }

  await wait(
    MOCK_DELAYS
      .CREATE_IMPACT_FEEDBACK
  );

  const mockResult =
    createMockImpactResult(
      reaction,
      payload
    );

  return createSuccessResponse(
    normalizeImpactFeedback(
      mockResult
    ),
    SOURCE_TYPES.MOCK,
    false
  );
}

/*
 * ==================================================
 * 기존 함수 이름과의 임시 호환
 * ==================================================
 *
 * 기존 B 코드나 테스트 코드가
 * createFeedbackMessage()를 사용하고 있어도
 * 바로 오류가 나지 않도록 남겨둔다.
 */
export async function createFeedbackMessage(
  payload
) {
  return createImpactFeedback(payload);
}