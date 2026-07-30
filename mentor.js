// mentor.js

/**
 * C팀원의 AI 분석 태그와 멘토 JSON 데이터를 받아 가장 잘 맞는 멘토를 추출하는 함수
 * @param {Object|Array} allMentorsData - C팀원의 JSON 데이터 ({ mentors: [...] } 또는 배열)
 * @param {Array} aiTags - AI가 분석한 고민 키워드 태그 배열
 */
function findMatchingMentors(allMentorsData, aiTags = []) {
    // 1. C팀원 JSON 데이터에서 mentors 배열 추출
    let mentors = [];
    if (Array.isArray(allMentorsData)) {
        mentors = allMentorsData;
    } else if (allMentorsData && Array.isArray(allMentorsData.mentors)) {
        mentors = allMentorsData.mentors;
    }

    if (mentors.length === 0) return [];

    // 2. AI 태그가 없거나 비어있으면 상위 2명 기본 추천
    if (!aiTags || aiTags.length === 0) {
        return mentors.slice(0, 2);
    }

    // 3. AI 태그와 멘토/경험 태그 일치 점수 계산
    const scoredMentors = mentors.map(mentor => {
        let matchCount = 0;

        // 멘토 공통 태그 검사
        if (mentor.tags && Array.isArray(mentor.tags)) {
            mentor.tags.forEach(tag => {
                if (aiTags.includes(tag)) matchCount += 1;
            });
        }

        // 멘토 세부 경험(experiences) 태그 검사
        if (mentor.experiences && Array.isArray(mentor.experiences)) {
            mentor.experiences.forEach(exp => {
                if (exp.tags && Array.isArray(exp.tags)) {
                    exp.tags.forEach(tag => {
                        if (aiTags.includes(tag)) matchCount += 1;
                    });
                }
            });
        }

        return { ...mentor, score: matchCount };
    });

    // 4. 점수가 높은 순으로 정렬 후 매칭된 멘토 리턴 (없으면 상위 2명)
    scoredMentors.sort((a, b) => b.score - a.score);
    const matched = scoredMentors.filter(m => m.score > 0);

    return matched.length > 0 ? matched : scoredMentors.slice(0, 2);
}