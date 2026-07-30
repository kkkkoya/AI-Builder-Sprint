// mentor.js

// 1. C팀원이 만들어둘 가짜 멘토 데이터(JSON)를 불러오는 함수
async function getMentors() {
    try {
        const response = await fetch('dummy_mentors.json');
        const mentors = await response.json();
        return mentors;
    } catch (error) {
        console.error("멘토 데이터를 불러오는데 실패했습니다:", error);
        return []; // 실패할 경우 프로그램이 멈추지 않게 빈 목록 반환
    }
}

// 2. AI 분석 결과(태그)와 멘토의 태그를 비교해서 찰떡인 멘토를 찾는 함수
function findMatchingMentors(mentors, aiTags) {
    // AI가 뽑아준 태그가 없으면 매칭할 수 없으니 빈 목록 반환
    if (!aiTags || aiTags.length === 0) return [];

    // 멘토 목록을 뒤져서 조건에 맞는 사람만 걸러냅니다(filter).
    const matchedMentors = mentors.filter(mentor => {
        // 멘토가 가진 태그 중에, AI가 뽑은 태그가 하나라도 포함되어 있는지 확인!
        return mentor.tags.some(tag => aiTags.includes(tag));
    });

    return matchedMentors;
}