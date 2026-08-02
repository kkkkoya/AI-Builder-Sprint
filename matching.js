/*
 * 이어봄 경험 아카이브 연결 도구
 *
 * 최종 경험 선택은 Solar AI가 담당한다.
 * 이 파일은 전체 경험에서 관련 후보를 빠르게 찾고,
 * Solar 결과를 실제 데이터와 대조하며,
 * Solar 실패 시에만 규칙 기반 fallback을 제공한다.
 */

import {
  normalizeTags,
  areRelatedTags,
} from "./tags.js";

const DEFAULT_ARCHIVE_URL = new URL(
  "./dummy_mentors.json",
  import.meta.url
).href;

/*
 * 후보 검색용 점수다.
 * 이 점수는 Solar의 최종 추천 점수가 아니다.
 */
export const RETRIEVAL_MATCHING_WEIGHTS =
  Object.freeze({
    EXACT_TAG: 30,
    RELATED_TAG: 12,
    NEED: 15,
    EMOTION: 8,
    KEYWORD: 4,
    SAFE_BONUS: 3,
    CAUTION_PENALTY: 5,
  });

export const RETRIEVAL_MATCHING_LIMITS =
  Object.freeze({
    EXACT_TAG_COUNT: 2,
    RELATED_TAG_COUNT: 2,
    NEED_COUNT: 2,
    EMOTION_COUNT: 2,
    KEYWORD_COUNT: 4,
    PRIMARY_COUNT: 1,
    MAX_CANDIDATES: 3,
  });

/*
 * Solar 실패 시에만 사용하는 임시 추천 점수다.
 */
export const FALLBACK_MATCHING_WEIGHTS =
  Object.freeze({
    EXACT_TAG: 25,
    RELATED_TAG: 10,
    NEED: 10,
    EMOTION: 5,
    SAFE_BONUS: 3,
    CAUTION_PENALTY: 5,
  });

export const FALLBACK_MATCHING_LIMITS =
  Object.freeze({
    EXACT_TAG_COUNT: 2,
    RELATED_TAG_COUNT: 2,
    NEED_COUNT: 2,
    EMOTION_COUNT: 2,
    RESULT_COUNT: 1,
  });

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
    .filter(Boolean);

  return [...new Set(cleanedValues)].slice(
    0,
    maximumLength
  );
}

/*
 * 숫자를 0~100 범위로 제한한다.
 */
function cleanScore(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(numberValue)
    )
  );
}

/*
 * 경험 안전 수준을 정리한다.
 */
function normalizeRiskLevel(value) {
  const riskLevel = cleanText(
    value,
    "safe"
  ).toLowerCase();

  if (
    riskLevel === "safe" ||
    riskLevel === "caution" ||
    riskLevel === "danger"
  ) {
    return riskLevel;
  }

  return "safe";
}

/*
 * 문자열 비교를 위해 공백을 제거하고
 * 소문자로 변환한다.
 */
function normalizeComparableText(value) {
  return cleanText(value)
    .replace(/\s+/g, "")
    .toLowerCase();
}

/*
 * 두 표현이 같거나 서로 포함되는지 검사한다.
 */
function looselyMatches(
  firstValue,
  secondValue
) {
  const first = normalizeComparableText(
    firstValue
  );

  const second = normalizeComparableText(
    secondValue
  );

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
 * 고민 분석 결과에서 감정 이름만 추출한다.
 *
 * 다음 두 형식을 모두 지원한다.
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
 * 복합 고민의 type과 description을 추출한다.
 */
function extractConcernTexts(
  analysis = {}
) {
  if (!Array.isArray(analysis?.concerns)) {
    return [];
  }

  return analysis.concerns.flatMap(
    (concern) => {
      if (
        !concern ||
        typeof concern !== "object"
      ) {
        return [];
      }

      return [
        cleanText(concern.type),
        cleanText(concern.description),
      ].filter(Boolean);
    }
  );
}

/*
 * 문장 배열을 간단한 검색 단어로 나눈다.
 *
 * Solar의 최종 판단을 대신하는 기능이 아니라
 * 후보 검색 누락을 줄이기 위한 보조 기능이다.
 */
function tokenizeTexts(values) {
  const stopWords = new Set([
    "사용자",
    "고민",
    "경험",
    "관련",
    "대한",
    "위한",
    "있다",
    "있는",
    "한다",
    "하고",
    "하며",
    "것을",
    "때문",
  ]);

  const tokens = cleanStringArray(
    values,
    100
  ).flatMap((value) =>
    value
      .toLowerCase()
      .replace(
        /[^가-힣a-z0-9]+/g,
        " "
      )
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token.length >= 2 &&
          !stopWords.has(token)
      )
  );

  return [...new Set(tokens)];
}

/*
 * 사용자 값과 경험 값 중
 * 느슨하게 일치하는 사용자 값을 찾는다.
 */
function findLooseMatches(
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
 * 정확히 같은 표준 태그를 찾는다.
 */
function findExactTagMatches(
  userTags,
  experienceTags
) {
  return userTags.filter((userTag) =>
    experienceTags.includes(userTag)
  );
}

/*
 * 완전히 같지는 않지만
 * 같은 태그 범주에 속하는 태그를 찾는다.
 */
function findRelatedTagMatches(
  userTags,
  experienceTags,
  exactTagMatches = []
) {
  const relatedMatches = [];

  for (const userTag of userTags) {
    if (
      exactTagMatches.includes(userTag)
    ) {
      continue;
    }

    const hasRelatedTag =
      experienceTags.some(
        (experienceTag) =>
          userTag !== experienceTag &&
          areRelatedTags(
            userTag,
            experienceTag
          )
      );

    if (hasRelatedTag) {
      relatedMatches.push(userTag);
    }
  }

  return [...new Set(relatedMatches)];
}

/*
 * 값이 경험 아카이브 형태인지 확인한다.
 */
function isArchiveLike(value) {
  return (
    Array.isArray(value) ||
    Array.isArray(value?.mentors)
  );
}

/*
 * ==================================================
 * 경험 아카이브 로딩
 * ==================================================
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
 * 멘토별 경험을 한 배열로 정리
 * ==================================================
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
      !Array.isArray(
        mentor.experiences
      )
    ) {
      return [];
    }

    const mentorId = cleanText(
      mentor.id
    );

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

        const rawSafety =
          experience.safety &&
          typeof experience.safety ===
            "object"
            ? experience.safety
            : {};

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

          /*
           * 원문은 아카이브에 그대로 보존한다.
           * 매칭 요청에는 전송하지 않는다.
           */
          transcript: cleanText(
            experience.transcript
          ),

          letter: cleanText(
            experience.letter
          ),

          edits: cleanStringArray(
            experience.edits,
            10
          ),

          audioUrl: cleanText(
            experience.audioUrl
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

          safety: {
            riskLevel:
              normalizeRiskLevel(
                rawSafety.riskLevel
              ),

            flags: cleanStringArray(
              rawSafety.flags,
              10
            ),

            guidance: cleanText(
              rawSafety.guidance
            ),
          },
        };
      })
      .filter(Boolean);
  });
}

/*
 * ==================================================
 * Solar 후보 검색
 * ==================================================
 */

/*
 * 경험 하나가 사용자의 고민과
 * 얼마나 관련될 가능성이 있는지 계산한다.
 *
 * 이 점수는 후보 검색용이며
 * 최종 매칭 점수가 아니다.
 */
function calculateRetrievalCandidate(
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
    20
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
      20
    );

  const experienceEmotions =
    cleanStringArray(
      experience.emotions,
      20
    );

  /*
   * 정확히 같은 태그
   */
  const exactTagMatches =
    findExactTagMatches(
      userTags,
      experienceTags
    ).slice(
      0,
      RETRIEVAL_MATCHING_LIMITS
        .EXACT_TAG_COUNT
    );

  /*
   * 같은 범주에 속하는 관련 태그
   */
  const relatedTagMatches =
    findRelatedTagMatches(
      userTags,
      experienceTags,
      exactTagMatches
    ).slice(
      0,
      RETRIEVAL_MATCHING_LIMITS
        .RELATED_TAG_COUNT
    );

  /*
   * 필요한 경험과 helpTypes 비교
   */
  const needMatches =
    findLooseMatches(
      userNeeds,
      experienceNeeds
    ).slice(
      0,
      RETRIEVAL_MATCHING_LIMITS
        .NEED_COUNT
    );

  /*
   * 고민 감정과 경험 감정 비교
   */
  const emotionMatches =
    findLooseMatches(
      userEmotions,
      experienceEmotions
    ).slice(
      0,
      RETRIEVAL_MATCHING_LIMITS
        .EMOTION_COUNT
    );

  /*
   * 요약·상황·복합 고민에서
   * 간단한 검색 단어를 추출한다.
   */
  const userKeywords = tokenizeTexts([
    cleanText(analysis?.summary),
    cleanText(analysis?.situation),
    ...extractConcernTexts(analysis),
    ...userNeeds,
    ...userTags,
    ...userEmotions,
  ]);

  /*
   * 매칭 단계에서는 transcript를 사용하지 않는다.
   */
  const experienceKeywords =
    tokenizeTexts([
      experience.title,
      experience.summary,
      ...experienceTags,
      ...experienceNeeds,
      ...experienceEmotions,
    ]);

  const keywordMatches =
    userKeywords
      .filter((keyword) =>
        experienceKeywords.some(
          (experienceKeyword) =>
            looselyMatches(
              keyword,
              experienceKeyword
            )
        )
      )
      .slice(
        0,
        RETRIEVAL_MATCHING_LIMITS
          .KEYWORD_COUNT
      );

  const exactTagScore =
    exactTagMatches.length *
    RETRIEVAL_MATCHING_WEIGHTS
      .EXACT_TAG;

  const relatedTagScore =
    relatedTagMatches.length *
    RETRIEVAL_MATCHING_WEIGHTS
      .RELATED_TAG;

  const needScore =
    needMatches.length *
    RETRIEVAL_MATCHING_WEIGHTS.NEED;

  const emotionScore =
    emotionMatches.length *
    RETRIEVAL_MATCHING_WEIGHTS
      .EMOTION;

  const keywordScore =
    keywordMatches.length *
    RETRIEVAL_MATCHING_WEIGHTS
      .KEYWORD;

  let safetyAdjustment = 0;

  if (
    experience.safety.riskLevel ===
    "safe"
  ) {
    safetyAdjustment =
      RETRIEVAL_MATCHING_WEIGHTS
        .SAFE_BONUS;
  } else if (
    experience.safety.riskLevel ===
    "caution"
  ) {
    safetyAdjustment =
      -RETRIEVAL_MATCHING_WEIGHTS
        .CAUTION_PENALTY;
  }

  const retrievalScore = Math.max(
    0,
    exactTagScore +
      relatedTagScore +
      needScore +
      emotionScore +
      keywordScore +
      safetyAdjustment
  );

  return {
    experience,

    retrieval: {
      retrievalScore,
      exactTagMatches,
      relatedTagMatches,
      needMatches,
      emotionMatches,
      keywordMatches,

      /*
       * 후보 다양성 검사에 사용한다.
       */
      matchedTopics: [
        ...exactTagMatches,
        ...relatedTagMatches,
        ...needMatches,
      ],
    },
  };
}

/*
 * 후보를 관련도 순으로 정렬한다.
 */
function compareRetrievalCandidates(
  first,
  second
) {
  const scoreDifference =
    second.retrieval.retrievalScore -
    first.retrieval.retrievalScore;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const exactTagDifference =
    second.retrieval
      .exactTagMatches.length -
    first.retrieval
      .exactTagMatches.length;

  if (exactTagDifference !== 0) {
    return exactTagDifference;
  }

  const needDifference =
    second.retrieval.needMatches.length -
    first.retrieval.needMatches.length;

  if (needDifference !== 0) {
    return needDifference;
  }

  return first.experience.experienceId
    .localeCompare(
      second.experience.experienceId
    );
}

/*
 * 같은 경험이 중복되지 않도록
 * 후보 배열에 추가한다.
 */
function pushUniqueCandidate(
  target,
  candidate,
  maximumLength
) {
  if (!candidate) {
    return;
  }

  if (target.length >= maximumLength) {
    return;
  }

  const alreadyExists = target.some(
    (item) =>
      item.experience.experienceId ===
      candidate.experience.experienceId
  );

  if (!alreadyExists) {
    target.push(candidate);
  }
}

/*
 * 전체 경험 중 Solar가 비교할 후보를
 * 최대 3개 선택한다.
 *
 * 구성:
 *
 * 1. 기본 관련도 1위 후보
 * 2. 감정적으로 가까운 추가 후보
 * 3. 아직 포함되지 않은 고민 영역 후보
 * 4. 남는 자리는 관련도 순으로 채움
 */
export function selectExperienceCandidates(
  analysis,
  archive,
  maximumCandidates =
    RETRIEVAL_MATCHING_LIMITS
      .MAX_CANDIDATES
) {
  const requestedMaximum = Number(
    maximumCandidates
  );

  const limit = Math.max(
    1,
    Math.min(
      RETRIEVAL_MATCHING_LIMITS
        .MAX_CANDIDATES,

      Number.isFinite(requestedMaximum)
        ? Math.floor(requestedMaximum)
        : RETRIEVAL_MATCHING_LIMITS
            .MAX_CANDIDATES
    )
  );

  const rankedCandidates =
    flattenExperienceArchive(archive)
      /*
       * danger 경험은 후보에서 제외한다.
       */
      .filter(
        (experience) =>
          experience.safety.riskLevel !==
          "danger"
      )
      .map((experience) =>
        calculateRetrievalCandidate(
          analysis,
          experience
        )
      )
      .sort(compareRetrievalCandidates);

  if (rankedCandidates.length === 0) {
    return [];
  }

  const selectedCandidates = [];

  /*
   * 1. 관련도 1위 후보를 먼저 포함한다.
   */
  const primaryCount = Math.min(
    RETRIEVAL_MATCHING_LIMITS
      .PRIMARY_COUNT,
    limit
  );

  rankedCandidates
    .slice(0, primaryCount)
    .forEach((candidate) =>
      pushUniqueCandidate(
        selectedCandidates,
        candidate,
        limit
      )
    );

  /*
   * 2. 감정 일치 후보를 보완한다.
   */
  const emotionalCandidate =
    rankedCandidates.find(
      (candidate) =>
        candidate.retrieval
          .emotionMatches.length > 0 &&
        !selectedCandidates.some(
          (selected) =>
            selected.experience
              .experienceId ===
            candidate.experience
              .experienceId
        )
    );

  pushUniqueCandidate(
    selectedCandidates,
    emotionalCandidate,
    limit
  );

  /*
   * 3. 기존 후보가 다루지 않는
   * 다른 고민 영역의 후보를 찾는다.
   */
  const coveredTopics = new Set(
    selectedCandidates.flatMap(
      (candidate) =>
        candidate.retrieval
          .matchedTopics
    )
  );

  const complementaryCandidate =
    rankedCandidates.find(
      (candidate) =>
        !selectedCandidates.some(
          (selected) =>
            selected.experience
              .experienceId ===
            candidate.experience
              .experienceId
        ) &&
        candidate.retrieval
          .matchedTopics.some(
            (topic) =>
              !coveredTopics.has(topic)
          )
    );

  pushUniqueCandidate(
    selectedCandidates,
    complementaryCandidate,
    limit
  );

  /*
   * 4. 최대 개수보다 적으면
   * 관련도 순서대로 나머지를 채운다.
   */
  for (
    const candidate of rankedCandidates
  ) {
    pushUniqueCandidate(
      selectedCandidates,
      candidate,
      limit
    );

    if (
      selectedCandidates.length >= limit
    ) {
      break;
    }
  }

  return selectedCandidates.map(
    (candidate) => ({
      ...candidate.experience,

      /*
       * 이 값은 내부 검사와 테스트용이다.
       * Solar 전달 데이터에는 포함하지 않는다.
       */
      retrieval: candidate.retrieval,
    })
  );
}

/*
 * ==================================================
 * Solar 전달 데이터 생성
 * ==================================================
 */

/*
 * Solar에는 후보 최대 3개의
 * 요약 정보만 전달한다.
 *
 * transcript와 letter는 보내지 않는다.
 *
 * 기존 api.js가 잠시 깨지지 않도록
 * 다음 두 호출 방식을 모두 지원한다.
 *
 * prepareExperienceArchiveForAi(
 *   analysis,
 *   archive
 * )
 *
 * prepareExperienceArchiveForAi(
 *   archive,
 *   analysis
 * )
 */
export function prepareExperienceArchiveForAi(
  firstValue = {},
  secondValue = {},
  maximumCandidates =
    RETRIEVAL_MATCHING_LIMITS
      .MAX_CANDIDATES
) {
  let analysis;
  let archive;

  if (isArchiveLike(firstValue)) {
    archive = firstValue;

    analysis = isArchiveLike(secondValue)
      ? {}
      : secondValue;
  } else {
    analysis = firstValue;
    archive = secondValue;
  }

  return selectExperienceCandidates(
    analysis,
    archive,
    maximumCandidates
  ).map((experience) => ({
    mentorId: experience.mentorId,

    mentorName: experience.mentorName,

    experienceId:
      experience.experienceId,

    title: experience.title,

    summary: experience.summary,

    tags: experience.tags,

    emotions: experience.emotions,

    helpTypes: experience.helpTypes,

    safety: {
      riskLevel:
        experience.safety.riskLevel,

      flags:
        experience.safety.flags,
    },
  }));
}

/*
 * ==================================================
 * 경험 검색
 * ==================================================
 */

/*
 * Solar가 선택한 experienceId로
 * 실제 원문이 포함된 경험을 다시 찾는다.
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
 * Solar 결과 검증
 * ==================================================
 */

/*
 * Solar가 반환한 경험 하나를
 * 실제 경험 데이터와 비교한다.
 */
function validateMatchCandidate(
  candidate,
  experienceMap,
  allowedExperienceIds = null
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

  /*
   * Solar에 전달했던 후보 목록 밖의
   * experienceId를 반환하면 제거한다.
   */
  if (
    allowedExperienceIds instanceof Set &&
    !allowedExperienceIds.has(
      experienceId
    )
  ) {
    return null;
  }

  const realExperience =
    experienceMap.get(experienceId);

  /*
   * 전체 데이터에도 없는 ID라면 제거한다.
   */
  if (!realExperience) {
    return null;
  }

  const returnedMentorId = cleanText(
    candidate.mentorId
  );

  /*
   * experienceId와 mentorId 연결이
   * 실제 데이터와 다르면 제거한다.
   */
  if (
    returnedMentorId &&
    returnedMentorId !==
      realExperience.mentorId
  ) {
    return null;
  }

  /*
   * 이름과 제목은 AI가 반환한 값 대신
   * 실제 아카이브 값을 사용한다.
   */
  return {
    ...candidate,

    mentorId:
      realExperience.mentorId,

    mentorName:
      realExperience.mentorName,

    mentorAge:
      realExperience.mentorAge,

    mentorRegion:
      realExperience.mentorRegion,

    mentorIntro:
      realExperience.mentorIntro,

    experienceId:
      realExperience.experienceId,

    experienceTitle:
      realExperience.title,

    summary:
      realExperience.summary,

    transcript:
      realExperience.transcript,

    letter:
      realExperience.letter,

    tags:
      realExperience.tags,

    emotions:
      realExperience.emotions,

    helpTypes:
      realExperience.helpTypes,

    edits:
      realExperience.edits,

    safety:
      realExperience.safety,

    audioUrl:
      realExperience.audioUrl,

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
 * Solar 결과 전체를 검증한다.
 *
 * allowedCandidates를 전달하면
 * 이번 요청에 포함된 후보 안에서만
 * selected와 alternatives를 허용한다.
 */
export function validateAiMatchResult(
  matchResult,
  archive,
  allowedCandidates = null
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

  const allowedExperienceIds =
    Array.isArray(allowedCandidates)
      ? new Set(
          allowedCandidates
            .map((candidate) =>
              cleanText(
                candidate?.experienceId
              )
            )
            .filter(Boolean)
        )
      : null;

  const selected =
    validateMatchCandidate(
      matchResult.selected,
      experienceMap,
      allowedExperienceIds
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
          experienceMap,
          allowedExperienceIds
        )
      )
      .filter(Boolean)
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

      selected
        ? "비슷한 경험이 있으시다면 들려주세요."
        : ""
    ),
  };
}

/*
 * ==================================================
 * Solar 실패 시 fallback 추천
 * ==================================================
 */

/*
 * 경험 하나의 규칙 기반 임시 점수를 계산한다.
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
    findExactTagMatches(
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
    findLooseMatches(
      userNeeds,
      experienceNeeds
    ).slice(
      0,
      FALLBACK_MATCHING_LIMITS
        .NEED_COUNT
    );

  const emotionMatches =
    findLooseMatches(
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
    FALLBACK_MATCHING_WEIGHTS
      .EMOTION;

  let safetyAdjustment = 0;

  if (
    experience.safety.riskLevel ===
    "safe"
  ) {
    safetyAdjustment =
      FALLBACK_MATCHING_WEIGHTS
        .SAFE_BONUS;
  } else if (
    experience.safety.riskLevel ===
    "caution"
  ) {
    safetyAdjustment =
      -FALLBACK_MATCHING_WEIGHTS
        .CAUTION_PENALTY;
  }

  const totalScore = cleanScore(
    exactTagScore +
      relatedTagScore +
      needScore +
      emotionScore +
      safetyAdjustment
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
    evidence.push(
      experience.summary
    );
  }

  return {
    mentorId:
      experience.mentorId,

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
      safetyAdjustment,
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
 * fallback 결과에 사용할
 * 어르신용 질문을 생성한다.
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
 * 규칙 기반 임시 추천이다.
 */
export function createFallbackMatchResult(
  analysis,
  archive,
  resultCount =
    FALLBACK_MATCHING_LIMITS
      .RESULT_COUNT
) {
  const candidates =
    flattenExperienceArchive(archive)
      /*
       * danger 경험은 fallback에서도
       * 추천하지 않는다.
       */
      .filter(
        (experience) =>
          experience.safety.riskLevel !==
          "danger"
      )
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

    alternatives: [],

    mentorQuestion:
      createFallbackMentorQuestion(
        selected
      ),
  };
}
