/*
 * 이어봄 AI 기능 통합 인터페이스
 *
 * 팀원 B는 이 파일의 네 공개 함수만 사용한다.
 *
 * 1. analyzeConcern()
 * 2. matchExperience()
 * 3. processMentorAnswer()
 * 4. createImpactFeedback()
 *
 * 현재 기본 실행 모드는 Solar다.
 * Solar 요청이 실패하면 각 공개 함수가 안전한 fallback을 반환한다.
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

export const AI_MODES = Object.freeze({
  MOCK: "mock",
  SOLAR: "solar",
});

/* 실제 배포와 통합 시험에서 사용하는 기본 모드다. */
export const AI_MODE = AI_MODES.SOLAR;

export const API_ACTIONS = Object.freeze({
  ANALYZE_CONCERN: "analyze-concern",
  MATCH_EXPERIENCE: "match-experience",
  PROCESS_MENTOR_ANSWER:
    "process-mentor-answer",
  CREATE_IMPACT_FEEDBACK:
    "create-impact-feedback",
});

const MOCK_DELAYS = Object.freeze({
  ANALYZE_CONCERN: 700,
  MATCH_EXPERIENCE: 900,
  PROCESS_MENTOR_ANSWER: 800,
  CREATE_IMPACT_FEEDBACK: 500,
});

let mentorArchivePromise = null;

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

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function cleanText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();

  return cleaned || fallback;
}

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

  return cleanText(payload[fieldName]);
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .filter(
          (value) =>
            typeof value === "string"
        )
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];
}

function includesAny(text, keywords) {
  return keywords.some((keyword) =>
    text.includes(keyword)
  );
}

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

      const question = cleanText(
        item.question
      );

      const answer = cleanText(
        item.answer
      );

      if (!question && !answer) {
        return null;
      }

      return {
        question,
        answer,
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

async function callSolarAction(
  action,
  payload
) {
  const response = await fetch(
    "/api/solar",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
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

    const error = new Error(message);

    error.code =
      responseBody?.error?.code ??
      "SOLAR_REQUEST_FAILED";

    error.status = response.status;

    throw error;
  }

  return (
    responseBody?.data ??
    responseBody
  );
}

function logSolarFallback(
  action,
  error
) {
  console.warn(
    `[이어봄 AI fallback] ${action}`,
    {
      code:
        error?.code ??
        "SOLAR_REQUEST_FAILED",
      status:
        error?.status ??
        null,
      message:
        error instanceof Error
          ? error.message
          : "알 수 없는 Solar 오류",
    }
  );
}

/*
 * ==================================================
 * Mock 고민 분석
 * ==================================================
 *
 * Solar 실패 또는 Mock 모드에서 사용하는 최소 기능이다.
 * 실제 의미 분석을 흉내 내는 것이 아니라
 * UI가 멈추지 않도록 안전한 구조를 반환한다.
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

  if (
    includesAny(combinedText, [
      "날씨",
      "주식",
      "비트코인",
      "축구",
      "맛집",
      "코딩 문제",
    ])
  ) {
    return {
      route:
        ROUTE_TYPES.NO_MATCH,

      needsClarification: false,

      clarifyingQuestion: "",

      response:
        "이어봄은 임신·출산·육아·가족 관계·경력 변화에 관한 경험을 연결하는 서비스입니다.",

      analysis: {
        summary:
          "현재 입력은 이어봄의 경험 연결 범위와 직접 관련이 없습니다.",

        concerns: [],
        emotions: [],
        situation: "",
        needs: [],
        standardTags: [],
        urgency: "normal",
      },
    };
  }

  if (
    includesAny(combinedText, [
      "폭력",
      "안전이 위협",
      "응급 상황",
    ])
  ) {
    return {
      route: ROUTE_TYPES.SAFETY,

      needsClarification: false,

      clarifyingQuestion: "",

      response:
        "현재 상황은 개인 경험 연결보다 주변의 신뢰할 수 있는 사람이나 전문기관의 확인이 먼저 필요할 수 있습니다.",

      analysis: {
        summary:
          "안전과 관련된 우선 확인이 필요한 상황입니다.",

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
          "경험 연결보다 안전 확인이 우선될 가능성이 있습니다.",

        needs: [
          "신뢰할 수 있는 주변 사람의 도움",
          "전문적인 상황 확인",
        ],

        standardTags: [],

        urgency: "urgent",
      },
    };
  }

  const compactLength =
    combinedText.replace(
      /\s/g,
      ""
    ).length;

  const vagueExpressions = [
    "힘들어요",
    "너무 힘들어요",
    "그냥 힘들어",
    "모르겠어요",
    "답답해요",
  ];

  const isVague =
    vagueExpressions.some(
      (expression) =>
        combinedText.trim() ===
        expression
    );

  if (
    historyAnswers.length === 0 &&
    (compactLength < 10 || isVague)
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

  function addConcern({
    type,
    description,
    emotion,
    intensity,
    evidence,
    addedNeeds,
    addedTags,
  }) {
    concerns.push({
      type,
      description,
      priority:
        concerns.length + 1,
    });

    emotions.push({
      name: emotion,
      intensity,
      evidence,
    });

    needs.push(...addedNeeds);

    standardTags.push(
      ...addedTags
    );
  }

  if (
    includesAny(combinedText, [
      "출산",
      "낳",
      "초산",
      "첫아이",
      "임신",
    ])
  ) {
    addConcern({
      type:
        "출산과 부모 역할",

      description:
        "출산과 부모가 되는 과정에 대한 걱정이 있습니다.",

      emotion: "두려움",

      intensity: 80,

      evidence:
        "출산 또는 부모가 되는 과정에 대한 걱정이 나타납니다.",

      addedNeeds: [
        "비슷한 출산 경험",
        "정서적 지지",
      ],

      addedTags: [
        "첫 출산",
        "출산 불안",
        "부모 역할 불안",
      ],
    });
  }

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
    addConcern({
      type: "경력 변화",

      description:
        "출산과 육아 이후 일을 이어갈 수 있을지 걱정하고 있습니다.",

      emotion: "막막함",

      intensity: 85,

      evidence:
        "일과 경력의 지속 가능성에 대한 걱정이 나타납니다.",

      addedNeeds: [
        "경력 회복 경험",
        "일과 육아 병행 경험",
      ],

      addedTags: [
        "경력 단절",
        "재취업",
        "일과 육아 병행",
      ],
    });
  }

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
    addConcern({
      type: "배우자 관계",

      description:
        "배우자와 역할 또는 소통 문제로 어려움을 느끼고 있습니다.",

      emotion: "외로움",

      intensity: 70,

      evidence:
        "배우자와의 갈등 또는 소통 어려움이 나타납니다.",

      addedNeeds: [
        "관계 회복 경험",
        "배우자와 역할을 조정한 경험",
      ],

      addedTags: [
        "부부 갈등",
        "배우자와의 소통",
      ],
    });
  }

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
    addConcern({
      type: "정체성 변화",

      description:
        "부모 역할 속에서 자신의 삶과 정체성을 잃을까 걱정하고 있습니다.",

      emotion: "혼란",

      intensity: 85,

      evidence:
        "자신의 삶이 사라질 것 같다는 걱정이 나타납니다.",

      addedNeeds: [
        "정체성 회복 경험",
        "정서적 지지",
      ],

      addedTags: [
        "자아 상실",
        "부모 역할 불안",
        "정서적 지지 필요",
      ],
    });
  }

  if (
    includesAny(combinedText, [
      "육아",
      "아이를 키",
      "혼자 돌",
      "독박",
    ])
  ) {
    addConcern({
      type: "육아 부담",

      description:
        "육아를 감당해야 한다는 부담을 느끼고 있습니다.",

      emotion: "부담감",

      intensity: 75,

      evidence:
        "육아 부담에 대한 걱정이 나타납니다.",

      addedNeeds: [
        "육아 적응 경험",
        "일상적인 돌봄 경험",
      ],

      addedTags: [
        "육아 부담",
        "육아 적응",
      ],
    });
  }

  if (
    includesAny(combinedText, [
      "돈",
      "생활비",
      "경제",
      "비용",
    ])
  ) {
    addConcern({
      type: "경제적 부담",

      description:
        "출산과 육아에 필요한 비용을 걱정하고 있습니다.",

      emotion: "부담감",

      intensity: 80,

      evidence:
        "생활비나 육아 비용에 대한 걱정이 나타납니다.",

      addedNeeds: [
        "비슷한 생활 경험",
        "경제적 어려움을 지나온 경험",
      ],

      addedTags: [
        "경제적 어려움",
        "가족 부양 부담",
      ],
    });
  }

  if (concerns.length === 0) {
    concerns.push({
      type:
        "복합적인 생활 고민",

      description:
        "현재 생활 변화와 관련된 복합적인 어려움을 느끼고 있습니다.",

      priority: 1,
    });

    emotions.push({
      name: "막막함",

      intensity: 65,

      evidence:
        "현재 상황을 어렵게 느끼고 있다는 표현이 나타납니다.",
    });

    needs.push(
      "비슷한 삶의 경험",
      "정서적 지지"
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
          .map(
            (concern) =>
              concern.type
          )
          .join(", ") +
        "에 관한 고민으로 분석되었습니다.",

      concerns,

      emotions,

      situation:
        "사용자가 임신·출산·육아·가족 또는 경력 변화와 관련된 고민을 표현하고 있습니다.",

      needs:
        uniqueStrings(needs),

      standardTags:
        uniqueStrings(
          standardTags
        ),

      urgency: "normal",
    },
  };
}

/*
 * ==================================================
 * Mock 어르신 답변 처리
 * ==================================================
 *
 * 원문에 없는 사건이나 결과를 만들지 않는다.
 */

function createMockMentorResult(
  transcript,
  selectedMatch
) {
  const experienceTitle =
    cleanText(
      selectedMatch
        ?.experienceTitle,

      "어르신이 들려주신 경험"
    );

  const summary =
    transcript.length > 220
      ? `${transcript.slice(
          0,
          220
        )}…`
      : transcript;

  return {
    experienceCard: {
      title: experienceTitle,

      summary,

      timeline: [transcript],

      emotions: [],

      helpTypes: [
        "실제 경험",
      ],

      standardTags: [],
    },

    letter: transcript,

    edits: [
      "Mock 결과에서는 원문을 그대로 유지했습니다.",
      "원문에 없는 사건이나 조언을 추가하지 않았습니다.",
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
        "이 내용은 한 사람의 개인적인 경험이며 모든 사람에게 동일하게 적용되는 정답은 아닙니다.",
    },
  };
}

/*
 * ==================================================
 * Mock 감사 영향 메시지
 * ==================================================
 */

function createMockImpactResult(
  reaction,
  payload
) {
  const concernSummary =
    cleanText(
      payload?.concernSummary
    );

  const experienceTitle =
    cleanText(
      payload?.selectedMatch
        ?.experienceTitle,

      "선생님이 들려주신 경험"
    );

  return {
    message:
      `이용자가 ${experienceTitle}을 읽고 “${reaction}”라고 마음을 전했습니다.`,

    impactSummary:
      concernSummary ||
      "비슷한 고민을 가진 이용자가 선생님의 경험에 반응을 남겼습니다.",

    highlightedExperience:
      experienceTitle,
  };
}

/*
 * ==================================================
 * 공개 함수 1: 고민 분석
 * ==================================================
 */

export async function analyzeConcern(
  payload
) {
  const text =
    getTextFromPayload(
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
    getClarificationHistory(
      payload
    );

  if (
    AI_MODE ===
    AI_MODES.SOLAR
  ) {
    try {
      const solarResult =
        await callSolarAction(
          API_ACTIONS
            .ANALYZE_CONCERN,

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
      logSolarFallback(
        API_ACTIONS.ANALYZE_CONCERN,
        error
      );

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
    MOCK_DELAYS
      .ANALYZE_CONCERN
  );

  const mockResult =
    createMockConcernAnalysis(
      text,
      history
    );

  return createSuccessResponse(
    normalizeConcernRoute(
      mockResult
    ),

    SOURCE_TYPES.MOCK,

    false
  );
}

/*
 * ==================================================
 * 공개 함수 2: 경험 매칭
 * ==================================================
 *
 * 전체 경험을 바로 Solar에 보내지 않는다.
 * matching.js가 후보 최대 3개를 검색하고,
 * transcript와 letter를 제외한 경량 데이터만 보낸다.
 */

export async function matchExperience(
  payload
) {
  const analysis =
    payload?.analysis;

  if (
    !analysis ||
    typeof analysis !==
      "object"
  ) {
    return createErrorResponse(
      "EMPTY_ANALYSIS",

      "경험을 연결하려면 먼저 고민 분석이 필요합니다."
    );
  }

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

  if (
    AI_MODE ===
    AI_MODES.SOLAR
  ) {
    try {
      /*
       * 전체 경험에서 후보 최대 3개를 검색한다.
       *
       * matching.js가 transcript와 letter를
       * Solar 전달 데이터에서 제외한다.
       */
      const experiences =
        prepareExperienceArchiveForAi(
          analysis,
          archive
        );

      if (
        experiences.length === 0
      ) {
        throw new Error(
          "AI가 비교할 수 있는 경험 후보를 찾지 못했습니다."
        );
      }

      const solarResult =
        await callSolarAction(
          API_ACTIONS
            .MATCH_EXPERIENCE,

          {
            analysis,
            experiences,
          }
        );

      const normalizedResult =
        normalizeAiMatchResult(
          solarResult
        );

      /*
       * 세 번째 인자로 experiences를 전달한다.
       *
       * Solar가 이번 요청 후보 3개 밖의
       * ID를 반환하면 검증에서 제거된다.
       */
      const validatedResult =
        validateAiMatchResult(
          normalizedResult,
          archive,
          experiences
        );

      if (
        !validatedResult.selected
      ) {
        throw new Error(
          "AI가 전달된 후보 안에서 유효한 경험을 선택하지 못했습니다."
        );
      }

      return createSuccessResponse(
        validatedResult,

        SOURCE_TYPES.SOLAR,

        false
      );
    } catch (error) {
      logSolarFallback(
        API_ACTIONS.MATCH_EXPERIENCE,
        error
      );

      /*
       * 시간 초과, 잘못된 JSON,
       * 후보 밖 ID 등의 경우
       * 규칙 기반 fallback을 사용한다.
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

      if (
        !validatedFallback.selected
      ) {
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

  await wait(
    MOCK_DELAYS
      .MATCH_EXPERIENCE
  );

  /*
   * Mock 모드도 실제 아카이브를 사용한다.
   *
   * 존재하지 않는 가상 ID나
   * 오래된 하드코딩 결과를 만들지 않는다.
   */
  const mockResult =
    createFallbackMatchResult(
      analysis,
      archive
    );

  const validatedMock =
    validateAiMatchResult(
      mockResult,
      archive
    );

  if (
    !validatedMock.selected
  ) {
    return createErrorResponse(
      "NO_MATCH",

      "현재 고민과 연결할 수 있는 경험을 찾지 못했습니다."
    );
  }

  return createSuccessResponse(
    validatedMock,

    SOURCE_TYPES.MOCK,

    false
  );
}

/*
 * ==================================================
 * 공개 함수 3: 어르신 답변 처리
 * ==================================================
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
    cleanText(
      payload?.question
    );

  const selectedMatch =
    payload?.selectedMatch &&
    typeof payload.selectedMatch ===
      "object"
      ? payload.selectedMatch
      : null;

  if (
    AI_MODE ===
    AI_MODES.SOLAR
  ) {
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
      logSolarFallback(
        API_ACTIONS.PROCESS_MENTOR_ANSWER,
        error
      );

      const fallbackResult =
        createMockMentorResult(
          transcript,
          selectedMatch
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
      transcript,
      selectedMatch
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
 * 공개 함수 4: 감사 영향 메시지
 * ==================================================
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

  if (
    AI_MODE ===
    AI_MODES.SOLAR
  ) {
    try {
      const solarResult =
        await callSolarAction(
          API_ACTIONS
            .CREATE_IMPACT_FEEDBACK,

          {
            reaction,

            concernSummary:
              payload
                ?.concernSummary ??
              "",

            selectedMatch:
              payload
                ?.selectedMatch ??
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
      logSolarFallback(
        API_ACTIONS.CREATE_IMPACT_FEEDBACK,
        error
      );

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
 * 기존 팀원 코드와의 임시 호환용 별칭이다.
 */
export async function createFeedbackMessage(
  payload
) {
  return createImpactFeedback(
    payload
  );
}
