/*
 * 이어봄 경험 아카이브 연결 도구
 *
 * 최종 경험 판단은 Solar AI가 담당한다.
 *
 * 이 파일은 다음 역할을 담당한다.
 *
 * 1. dummy_mentors.json 불러오기
 * 2. 멘토별 경험 카드를 하나의 배열로 정리하기
 * 3. Solar에 전달할 경험 데이터 만들기
 * 4. AI가 반환한 멘토·경험 ID 검증하기
 * 5. AI 실패 시 규칙 기반 임시 추천 제공하기
 */

import {
  normalizeTags,
  areRelatedTags,
} from "./tags.js";

/*
 * dummy_mentors.json의 기본 위치다.
 *
 * import.meta.url을 사용하면
 * 현재 JS 파일을 기준으로 정확한 주소를 만든다.
 */
const DEFAULT_ARCHIVE_URL = new URL(
  "./dummy_mentors.json",
  import.meta.url
).href;

/*
 * Solar가 실패했을 때만 사용하는 점수 규칙이다.
 *
 * 정상적인 상황에서는 이 점수가
 * 최종 추천을 결정하지 않는다.
 */
export const FALLBACK_MATCHING_WEIGHTS =
  Object.freeze({
    EXACT_TAG: 25,
    RELATED_TAG: 10,
    NEED: 10,
    EMOTION: 5,
  });

/*
 * fallback 점수에서 각 항목을
 * 최대 몇 개까지 인정할지 정한다.
 */
export const FALLBACK_MATCHING_LIMITS =
  Object.freeze({
    EXACT_TAG_COUNT: 2,
    RELATED_TAG_COUNT: 2,
    NEED_COUNT: 2,
    EMOTION_COUNT: 2,
    RESULT_COUNT: 3,
  });

/*
 * fallback 추천 결과에 포함될 최소 점수다.
 */
export const MIN_FALLBACK_SCORE = 20;

/*
 * 문자열을 안전하게 정리한다.
 */
function cleanText(value, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleanedValue = value.trim();

  return cleanedValue || fallback;
}

/*
 * 문자열 배열을 정리하고 중복을 제거한다.
 */
function cleanStringArray(
  value,
  maximumLength = 20
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const cleanedValues = value
    .filter(
      (item) => typeof item === "string"
    )
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return [...new Set(cleanedValues)].slice(
    0,
    maximumLength
  );
}

/*
 * 숫자를 0~100 범위 안으로 제한한다.
 */
function cleanScore(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(numberValue))
  );
}

/*
 * 두 문장이 완전히 같거나
 * 한 문장이 다른 문장을 포함하는지 확인한다.
 *
 * fallback의 필요 항목 비교에 사용한다.
 */
function looselyMatches(
  firstValue,
  secondValue
) {
  const first = cleanText(firstValue)
    .replace(/\s+/g, "")
    .toLowerCase();

  const second = cleanText(secondValue)
    .replace(/\s+/g, "")
    .toLowerCase();

  if (!first || !second) {
    return false;
  }

  return (
    first === second ||
    first.includes(second) ||
    second.includes(first)
  );
}

/*
 * 고민 분석 결과의 감정 배열에서
 * 감정 이름만 가져온다.
 *
 * 두 형태를 모두 지원한다.
 *
 * ["불안", "막막함"]
 *
 * [
 *   {
 *     name: "불안",
 *     intensity: 80
 *   }
 * ]
 */
function extractEmotionNames(emotions) {
  if (!Array.isArray(emotions)) {
    return [];
  }

  const names = emotions
    .map((emotion) => {
      if (typeof emotion === "string") {
        return emotion.trim();
      }

      if (
        emotion &&
        typeof emotion === "object" &&
        typeof emotion.name === "string"
      ) {
        return emotion.name.trim();
      }

      return "";
    })
    .filter(Boolean);

  return [...new Set(names)];
}

/*
 * ==================================================
 * 경험 아카이브 불러오기
 * ==================================================
 */

/*
 * 브라우저에서 dummy_mentors.json을 읽는다.
 *
 * HTML 파일을 파일 탐색기에서 직접 여는 방식보다
 * VS Code Live Server처럼 로컬 서버로 실행해야
 * fetch가 안정적으로 작동한다.
 */
export async function loadMentorArchive(
  archiveUrl = DEFAULT_ARCHIVE_URL
) {
  const response = await fetch(archiveUrl);

  if (!response.ok) {
    throw new Error(
      `멘토 데이터를 불러오지 못했습니다. 상태 코드: ${response.status}`
    );
  }

  let archive;

  try {
    archive = await response.json();
  } catch {
    throw new Error(
      "멘토 데이터가 올바른 JSON 형식이 아닙니다."
    );
  }

  if (!Array.isArray(archive?.mentors)) {
    throw new Error(
      "멘토 데이터에 mentors 배열이 없습니다."
    );
  }

  return archive;
}

/*
 * ==================================================
 * 멘토별 경험을 하나의 배열로 정리
 * ==================================================
 */

/*
 * 다음처럼 멘토 안에 들어 있는 경험들을:
 *
 * mentor-001
 * ├─ experience-001
 * └─ experience-002
 *
 * mentor-002
 * ├─ experience-003
 * └─ experience-004
 *
 * 다음처럼 하나의 배열로 펼친다.
 *
 * [
 *   experience-001,
 *   experience-002,
 *   experience-003,
 *   experience-004
 * ]
 */
export function flattenExperienceArchive(
  archive = {}
) {
  const mentors = Array.isArray(archive)
    ? archive
    : archive?.mentors;

  if (!Array.isArray(mentors)) {
    return [];
  }

  return mentors.flatMap((mentor) => {
    if (
      !mentor ||
      typeof mentor !== "object" ||
      mentor.available === false ||
      !Array.isArray(mentor.experiences)
    ) {
      return [];
    }

    const mentorId = cleanText(mentor.id);

    if (!mentorId) {
      return [];
    }

    return mentor.experiences
      .map((experience) => {
        if (
          !experience ||
          typeof experience !== "object"
        ) {
          return null;
        }

        const experienceId = cleanText(
          experience.id
        );

        if (!experienceId) {
          return null;
        }

        return {
          mentorId,
          mentorName: cleanText(
            mentor.name,
            "이름을 공개하지 않은 멘토"
          ),
          mentorAge: Number.isFinite(
            Number(mentor.age)
          )
            ? Number(mentor.age)
            : null,
          mentorRegion: cleanText(
            mentor.region
          ),
          mentorIntro: cleanText(
            mentor.intro
          ),

          experienceId,
          title: cleanText(
            experience.title,
            "제목이 없는 경험"
          ),
          summary: cleanText(
            experience.summary
          ),
          transcript: cleanText(
            experience.transcript
          ),
          letter: cleanText(
            experience.letter
          ),

          tags: normalizeTags(
            experience.tags ?? []
          ),

          emotions: cleanStringArray(
            experience.emotions,
            10
          ),

          helpTypes: cleanStringArray(
            experience.helpTypes,
            10
          ),

          safety:
            experience.safety &&
            typeof experience.safety ===
              "object"
              ? {
                  riskLevel: cleanText(
                    experience.safety
                      .riskLevel,
                    "safe"
                  ),

                  flags: cleanStringArray(
                    experience.safety.flags,
                    10
                  ),

                  guidance: cleanText(
                    experience.safety
                      .guidance
                  ),
                }
              : {
                  riskLevel: "safe",
                  flags: [],
                  guidance: "",
                },
        };
      })
      .filter(
        (experience) =>
          experience !== null
      );
  });
}

/*
 * ==================================================
 * Solar에 전달할 경험 데이터 만들기
 * ==================================================
 */

/*
 * Solar가 경험을 평가하는 데 필요한 데이터만
 * 골라서 전달한다.
 *
 * stats, audioUrl, edits처럼 매칭에 직접 필요하지 않은
 * 항목은 제외해 요청 크기를 줄인다.
 */
export function prepareExperienceArchiveForAi(
  archive = {}
) {
  return flattenExperienceArchive(
    archive
  ).map((experience) => ({
    mentorId: experience.mentorId,
    mentorName: experience.mentorName,

    experienceId:
      experience.experienceId,

    title: experience.title,
    summary: experience.summary,

    /*
     * 지나치게 긴 원문이 들어오는 상황에 대비해
     * 최대 1,500자까지만 전달한다.
     */
    transcript:
      experience.transcript.slice(
        0,
        1500
      ),

    tags: experience.tags,
    emotions: experience.emotions,
    helpTypes: experience.helpTypes,

    safety: {
      riskLevel:
        experience.safety.riskLevel,
      flags: experience.safety.flags,
    },
  }));
}

/*
 * ==================================================
 * 경험 검색
 * ==================================================
 */

/*
 * 경험 ID로 실제 경험 카드를 찾는다.
 */
export function findExperienceById(
  archive,
  experienceId
) {
  const cleanedExperienceId =
    cleanText(experienceId);

  if (!cleanedExperienceId) {
    return null;
  }

  return (
    flattenExperienceArchive(
      archive
    ).find(
      (experience) =>
        experience.experienceId ===
        cleanedExperienceId
    ) ?? null
  );
}

/*
 * ==================================================
 * AI 매칭 결과 검증
 * ==================================================
 */

/*
 * AI가 반환한 후보 하나를 실제 데이터와 비교한다.
 *
 * AI가 이름이나 제목을 다르게 만들어도
 * 실제 dummy_mentors.json의 값으로 교체한다.
 */
function validateMatchCandidate(
  candidate,
  experienceMap
) {
  if (
    !candidate ||
    typeof candidate !== "object"
  ) {
    return null;
  }

  const experienceId = cleanText(
    candidate.experienceId
  );

  if (!experienceId) {
    return null;
  }

  const realExperience =
    experienceMap.get(experienceId);

  /*
   * 데이터에 없는 경험 ID라면 제거한다.
   */
  if (!realExperience) {
    return null;
  }

  const returnedMentorId = cleanText(
    candidate.mentorId
  );

  /*
   * AI가 experienceId는 맞게 반환했지만
   * mentorId를 잘못 연결한 경우 제거한다.
   */
  if (
    returnedMentorId &&
    returnedMentorId !==
      realExperience.mentorId
  ) {
    return null;
  }

  return {
    ...candidate,

    mentorId:
      realExperience.mentorId,

    mentorName:
      realExperience.mentorName,

    experienceId:
      realExperience.experienceId,

    experienceTitle:
      realExperience.title,

    totalScore: cleanScore(
      candidate.totalScore ??
        candidate.score
    ),

    matchedConcerns:
      cleanStringArray(
        candidate.matchedConcerns ??
          candidate.matchedTags,
        10
      ),

    reason: cleanText(
      candidate.reason,
      "현재 고민과 관련된 경험입니다."
    ),

    evidence: cleanStringArray(
      candidate.evidence,
      10
    ),

    limitations: cleanText(
      candidate.limitations
    ),
  };
}

/*
 * normalizeAiMatchResult()를 거친 결과를
 * 실제 경험 아카이브와 대조한다.
 */
export function validateAiMatchResult(
  matchResult,
  archive
) {
  if (
    !matchResult ||
    typeof matchResult !== "object"
  ) {
    return {
      selected: null,
      alternatives: [],
      mentorQuestion: "",
    };
  }

  const experiences =
    flattenExperienceArchive(archive);

  const experienceMap = new Map(
    experiences.map((experience) => [
      experience.experienceId,
      experience,
    ])
  );

  const selected =
    validateMatchCandidate(
      matchResult.selected,
      experienceMap
    );

  const rawAlternatives =
    Array.isArray(
      matchResult.alternatives
    )
      ? matchResult.alternatives
      : [];

  const seenExperienceIds = new Set();

  if (selected) {
    seenExperienceIds.add(
      selected.experienceId
    );
  }

  const alternatives =
    rawAlternatives
      .map((candidate) =>
        validateMatchCandidate(
          candidate,
          experienceMap
        )
      )
      .filter(
        (candidate) =>
          candidate !== null
      )
      .filter((candidate) => {
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
      })
      .sort(
        (first, second) =>
          second.totalScore -
          first.totalScore
      )
      .slice(0, 2);

  return {
    selected,
    alternatives,

    mentorQuestion: cleanText(
      matchResult.mentorQuestion,
      "비슷한 경험이 있으시다면 들려주세요."
    ),
  };
}

/*
 * ==================================================
 * fallback 추천
 * ==================================================
 */

/*
 * 사용자와 경험 카드에서 정확히 일치하는
 * 문자열을 찾는다.
 */
function findExactMatches(
  userValues,
  experienceValues
) {
  return userValues.filter((userValue) =>
    experienceValues.some(
      (experienceValue) =>
        looselyMatches(
          userValue,
          experienceValue
        )
    )
  );
}

/*
 * 정확히 일치하지는 않지만
 * 같은 태그 카테고리에 속하는 태그를 찾는다.
 */
function findRelatedTagMatches(
  userTags,
  experienceTags,
  exactTagMatches
) {
  const relatedMatches = [];

  for (const userTag of userTags) {
    if (
      exactTagMatches.includes(userTag)
    ) {
      continue;
    }

    const relatedExperienceTag =
      experienceTags.find(
        (experienceTag) =>
          userTag !== experienceTag &&
          areRelatedTags(
            userTag,
            experienceTag
          )
      );

    if (relatedExperienceTag) {
      relatedMatches.push(userTag);
    }
  }

  return [...new Set(relatedMatches)];
}

/*
 * 한 경험 카드의 fallback 점수를 계산한다.
 */
function calculateFallbackCandidate(
  analysis,
  experience
) {
  const userTags = normalizeTags(
    analysis?.standardTags ??
      analysis?.experienceTags ??
      []
  );

  const userNeeds = cleanStringArray(
    analysis?.needs,
    10
  );

  const userEmotions =
    extractEmotionNames(
      analysis?.emotions
    );

  const experienceTags =
    normalizeTags(experience.tags);

  const experienceNeeds =
    cleanStringArray(
      experience.helpTypes,
      10
    );

  const experienceEmotions =
    cleanStringArray(
      experience.emotions,
      10
    );

  const exactTagMatches =
    findExactMatches(
      userTags,
      experienceTags
    ).slice(
      0,
      FALLBACK_MATCHING_LIMITS
        .EXACT_TAG_COUNT
    );

  const relatedTagMatches =
    findRelatedTagMatches(
      userTags,
      experienceTags,
      exactTagMatches
    ).slice(
      0,
      FALLBACK_MATCHING_LIMITS
        .RELATED_TAG_COUNT
    );

  const needMatches =
    findExactMatches(
      userNeeds,
      experienceNeeds
    ).slice(
      0,
      FALLBACK_MATCHING_LIMITS
        .NEED_COUNT
    );

  const emotionMatches =
    findExactMatches(
      userEmotions,
      experienceEmotions
    ).slice(
      0,
      FALLBACK_MATCHING_LIMITS
        .EMOTION_COUNT
    );

  const exactTagScore =
    exactTagMatches.length *
    FALLBACK_MATCHING_WEIGHTS
      .EXACT_TAG;

  const relatedTagScore =
    relatedTagMatches.length *
    FALLBACK_MATCHING_WEIGHTS
      .RELATED_TAG;

  const needScore =
    needMatches.length *
    FALLBACK_MATCHING_WEIGHTS.NEED;

  const emotionScore =
    emotionMatches.length *
    FALLBACK_MATCHING_WEIGHTS.EMOTION;

  const totalScore = cleanScore(
    exactTagScore +
      relatedTagScore +
      needScore +
      emotionScore
  );

  const matchedConcerns = [
    ...exactTagMatches,
    ...relatedTagMatches,
  ];

  const evidence = [];

  if (exactTagMatches.length > 0) {
    evidence.push(
      `정확히 일치한 경험 주제: ${exactTagMatches.join(
        ", "
      )}`
    );
  }

  if (relatedTagMatches.length > 0) {
    evidence.push(
      `관련된 경험 주제: ${relatedTagMatches.join(
        ", "
      )}`
    );
  }

  if (needMatches.length > 0) {
    evidence.push(
      `필요한 도움과 일치: ${needMatches.join(
        ", "
      )}`
    );
  }

  if (experience.summary) {
    evidence.push(experience.summary);
  }

  return {
    mentorId: experience.mentorId,
    mentorName:
      experience.mentorName,

    experienceId:
      experience.experienceId,

    experienceTitle:
      experience.title,

    totalScore,

    scores: {
      exactTagScore,
      relatedTagScore,
      needScore,
      emotionScore,
    },

    matchedConcerns,

    reason:
      matchedConcerns.length > 0
        ? `${matchedConcerns.join(
            ", "
          )}과 관련된 삶의 경험을 가지고 있습니다.`
        : "현재 고민과 일부 정서적 관련성이 있는 경험입니다.",

    evidence: evidence.slice(0, 3),

    limitations:
      "Solar 연결 실패로 태그·감정·필요를 기준으로 임시 추천한 결과입니다.",
  };
}

/*
 * fallback 결과에 사용할 어르신용 질문을 만든다.
 */
function createFallbackMentorQuestion(
  selected
) {
  if (!selected) {
    return "";
  }

  const topics =
    selected.matchedConcerns
      .slice(0, 2)
      .join("과 ");

  if (topics) {
    return `${topics}과 비슷한 경험이 있으신가요? 그 시기를 어떻게 지나오셨는지 들려주세요.`;
  }

  return `${selected.experienceTitle}와 비슷한 경험이 있으시다면 들려주세요.`;
}

/*
 * Solar가 실패했을 때만 사용하는
 * 규칙 기반 경험 추천 결과다.
 */
export function createFallbackMatchResult(
  analysis,
  archive,
  resultCount =
    FALLBACK_MATCHING_LIMITS.RESULT_COUNT
) {
  const candidates =
    flattenExperienceArchive(archive)
      .map((experience) =>
        calculateFallbackCandidate(
          analysis,
          experience
        )
      )
      .filter(
        (candidate) =>
          candidate.totalScore >=
          MIN_FALLBACK_SCORE
      )
      .sort(
        (first, second) =>
          second.totalScore -
          first.totalScore
      )
      .slice(
        0,
        Math.max(1, resultCount)
      );

  const selected =
    candidates[0] ?? null;

  return {
    selected,
    alternatives:
      candidates.slice(1, 3),

    mentorQuestion:
      createFallbackMentorQuestion(
        selected
      ),
  };
}