/*
 * 이어봄 표준 태그 사전
 *
 * Solar LLM이 생성한 표현과 멘토 데이터의 표현을
 * 동일한 표준 태그로 맞추기 위해 사용한다.
 *
 * 예:
 * "출산에 대한 두려움" → "출산 불안"
 * "혼자 육아" → "독박육아"
 */

/*
 * 경험 태그를 주제별로 나눈다.
 *
 * Object.freeze()는 실행 중에 태그 목록이
 * 실수로 변경되는 것을 막아준다.
 */
export const TAG_CATEGORIES = Object.freeze({
  PREGNANCY_AND_BIRTH: Object.freeze([
    "첫 출산",
    "출산 불안",
    "늦은 출산",
    "산후 회복",
    "산후우울 경험",
  ]),

  PARENTING: Object.freeze([
    "육아 부담",
    "독박육아",
    "맞벌이 육아",
    "육아 적응",
    "다자녀 육아",
    "자녀 교육",
    "배우자 육아 참여 부족",
  ]),

  FAMILY_AND_RELATIONSHIP: Object.freeze([
    "부부 갈등",
    "시부모 갈등",
    "배우자와의 소통",
    "가족 관계 회복",
  ]),

  CAREER_AND_IDENTITY: Object.freeze([
    "경력 단절",
    "재취업",
    "일과 육아 병행",
    "자아 상실",
    "부모 역할 불안",
  ]),

  EMOTIONAL_EXPERIENCE: Object.freeze([
    "출산 후 외로움",
    "도움 요청 어려움",
    "정서적 지지 필요",
  ]),

  ECONOMIC_LIFE: Object.freeze([
    "경제적 어려움",
    "가족 부양 부담",
  ]),
});

/*
 * 위의 모든 카테고리에 들어 있는 태그를
 * 하나의 배열로 합친다.
 *
 * 나중에 Solar가 생성한 태그가
 * 실제 표준 태그인지 검사할 때 사용한다.
 */
export const STANDARD_EXPERIENCE_TAGS = Object.freeze(
  Object.values(TAG_CATEGORIES).flat()
);

/*
 * 고민 분석에서 사용할 표준 감정 목록이다.
 *
 * 감정은 경험 태그와 별도로 관리한다.
 */
export const STANDARD_EMOTIONS = Object.freeze([
  "두려움",
  "불안",
  "부담감",
  "외로움",
  "죄책감",
  "막막함",
  "슬픔",
  "분노",
  "지침",
  "혼란",
  "안도",
  "희망",
]);

/*
 * 사용자가 필요로 하는 도움의 표준 목록이다.
 */
export const STANDARD_NEEDS = Object.freeze([
  "공감",
  "실제 경험",
  "정서적 지지",
  "현실적인 조언",
  "육아 적응 경험",
  "관계 회복 경험",
  "경력 회복 경험",
]);

/*
 * 서로 다른 표현을 표준 경험 태그로 바꾸는 사전이다.
 *
 * 왼쪽: 사용자가 말하거나 Solar가 생성할 수 있는 표현
 * 오른쪽: 이어봄에서 사용하는 공식 표준 태그
 */
export const TAG_ALIASES = Object.freeze({
  /*
   * 임신과 출산
   */
  "초산": "첫 출산",
  "처음 출산": "첫 출산",
  "첫아이 출산": "첫 출산",

  "출산에 대한 두려움": "출산 불안",
  "출산 두려움": "출산 불안",
  "출산 공포": "출산 불안",
  "출산이 무서움": "출산 불안",

  "고령 출산": "늦은 출산",

  "출산 후 회복": "산후 회복",

  "산후 우울": "산후우울 경험",
  "산후우울": "산후우울 경험",
  "산후 우울감": "산후우울 경험",

  /*
   * 육아
   */
  "육아가 부담됨": "육아 부담",
  "육아 책임 부담": "육아 부담",

  "혼자 육아": "독박육아",
  "육아 독박": "독박육아",
  "홀로 육아": "독박육아",

  "직장과 육아": "맞벌이 육아",
  "맞벌이와 육아": "맞벌이 육아",

  "육아에 적응": "육아 적응",
  "엄마 역할 적응": "육아 적응",

  "여러 아이 육아": "다자녀 육아",

  "아이 교육": "자녀 교육",

  "남편 육아 부족": "배우자 육아 참여 부족",
  "배우자의 육아 참여 부족": "배우자 육아 참여 부족",
  "배우자가 육아를 돕지 않음": "배우자 육아 참여 부족",

  /*
   * 가족과 관계
   */
  "남편과 갈등": "부부 갈등",
  "배우자와 갈등": "부부 갈등",

  "시댁 갈등": "시부모 갈등",

  "부부 소통": "배우자와의 소통",
  "배우자 소통 부족": "배우자와의 소통",

  "가족 관계 개선": "가족 관계 회복",
  "가족 갈등 회복": "가족 관계 회복",

  /*
   * 경력과 정체성
   */
  "출산으로 인한 경력 단절": "경력 단절",
  "육아로 인한 경력 단절": "경력 단절",

  "직장 복귀": "재취업",
  "다시 취업": "재취업",

  "직장과 육아 병행": "일과 육아 병행",
  "일과 가정 병행": "일과 육아 병행",

  "나를 잃은 느낌": "자아 상실",
  "내 삶이 사라진 느낌": "자아 상실",

  "엄마가 될 자신이 없음": "부모 역할 불안",
  "부모가 될 자신이 없음": "부모 역할 불안",
  "엄마 역할 불안": "부모 역할 불안",

  /*
   * 정서적 경험
   */
  "출산 후 고립감": "출산 후 외로움",
  "육아 중 외로움": "출산 후 외로움",

  "도움을 요청하기 어려움": "도움 요청 어려움",
  "도움을 청하지 못함": "도움 요청 어려움",

  "정서적 도움 필요": "정서적 지지 필요",
  "마음의 지지 필요": "정서적 지지 필요",

  /*
   * 경제
   */
  "돈 걱정": "경제적 어려움",
  "생활비 부담": "경제적 어려움",
  "육아 비용 부담": "경제적 어려움",

  "가족 생계 부담": "가족 부양 부담",
});

/**
 * 태그 비교 전에 문자열을 기본적으로 정리한다.
 *
 * 처리 내용:
 * 1. 문자열이 아니면 빈 문자열 반환
 * 2. 앞뒤 공백 제거
 * 3. 중간에 연속된 공백을 하나로 변경
 *
 * @param {*} value
 * @returns {string}
 */
function cleanTagText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * 태그 하나를 이어봄의 표준 경험 태그로 변환한다.
 *
 * 반환값:
 * - 표준화 성공: 표준 태그 문자열
 * - 표준화 실패: null
 *
 * @param {*} tag
 * @returns {string|null}
 */
export function normalizeTag(tag) {
  const cleanedTag = cleanTagText(tag);

  /*
   * 빈 문자열이라면 사용할 수 없는 태그다.
   */
  if (!cleanedTag) {
    return null;
  }

  /*
   * 이미 표준 태그라면 그대로 반환한다.
   *
   * 예:
   * "첫 출산" → "첫 출산"
   */
  if (STANDARD_EXPERIENCE_TAGS.includes(cleanedTag)) {
    return cleanedTag;
  }

  /*
   * 별칭 사전에 등록된 표현이면
   * 대응되는 표준 태그를 반환한다.
   *
   * 예:
   * "혼자 육아" → "독박육아"
   */
  if (Object.prototype.hasOwnProperty.call(
    TAG_ALIASES,
    cleanedTag
  )) {
    return TAG_ALIASES[cleanedTag];
  }

  /*
   * 표준 태그도 아니고 별칭에도 없다면
   * 추천에 사용하지 않도록 null을 반환한다.
   */
  return null;
}

/**
 * 여러 개의 태그를 한꺼번에 표준화한다.
 *
 * 처리 내용:
 * 1. 배열이 아니면 빈 배열 반환
 * 2. 각 태그를 표준화
 * 3. 표준화되지 않은 값 제거
 * 4. 중복 태그 제거
 * 5. 최대 8개까지만 반환
 *
 * @param {*} tags
 * @returns {string[]}
 */
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalizedTags = tags
    .map((tag) => normalizeTag(tag))
    .filter((tag) => tag !== null);

  return [...new Set(normalizedTags)].slice(0, 8);
}

/**
 * 표준 태그가 속한 카테고리 이름을 찾는다.
 *
 * 예:
 * "첫 출산" → "PREGNANCY_AND_BIRTH"
 * "독박육아" → "PARENTING"
 *
 * 찾지 못하면 null을 반환한다.
 *
 * @param {*} tag
 * @returns {string|null}
 */
export function getTagCategory(tag) {
  const normalizedTag = normalizeTag(tag);

  if (!normalizedTag) {
    return null;
  }

  for (const [categoryName, categoryTags]
    of Object.entries(TAG_CATEGORIES)) {
    if (categoryTags.includes(normalizedTag)) {
      return categoryName;
    }
  }

  return null;
}

/**
 * 두 태그가 정확히 같거나
 * 같은 카테고리에 속하는지 확인한다.
 *
 * @param {*} firstTag
 * @param {*} secondTag
 * @returns {boolean}
 */
export function areRelatedTags(firstTag, secondTag) {
  const normalizedFirstTag = normalizeTag(firstTag);
  const normalizedSecondTag = normalizeTag(secondTag);

  /*
   * 둘 중 하나라도 표준화되지 않으면
   * 관련성을 판단할 수 없다.
   */
  if (!normalizedFirstTag || !normalizedSecondTag) {
    return false;
  }

  /*
   * 두 태그가 정확히 같으면 관련 태그다.
   */
  if (normalizedFirstTag === normalizedSecondTag) {
    return true;
  }

  const firstCategory =
    getTagCategory(normalizedFirstTag);

  const secondCategory =
    getTagCategory(normalizedSecondTag);

  /*
   * 카테고리를 찾지 못한 경우에는 false다.
   */
  if (!firstCategory || !secondCategory) {
    return false;
  }

  /*
   * 같은 카테고리라면 관련 태그로 판단한다.
   */
  return firstCategory === secondCategory;
}
