// ui.js

// 1. 멘토 목록을 화면에 그려주는 함수 (새로 추가됨!)
function displayMentors(mentors) {
    const container = document.getElementById('mentor-list');
    
    // A팀원이 아직 화면에 mentor-list라는 공간을 안 만들었으면 중단
    if (!container) return; 

    // 화면에 있던 기존 내용을 깨끗하게 비우기
    container.innerHTML = ""; 

    if (mentors.length === 0) {
        container.innerHTML = "<p>아직 조건에 맞는 멘토가 없습니다.</p>";
        return;
    }

    // 멘토 한 명씩 카드를 만들어서 화면에 추가
    mentors.forEach(mentor => {
        const card = document.createElement('div');
        card.className = 'mentor-card'; // A팀원이 예쁘게 꾸며줄 CSS 이름
        
        // 카드 안에 들어갈 내용(HTML) 구성
        card.innerHTML = `
            <h3>${mentor.name} 멘토님 (${mentor.age}세)</h3>
            <p><strong>경험 태그:</strong> ${mentor.tags.join(', ')}</p>
            <p>💬 "${mentor.previewText}"</p>
            <button onclick="alert('${mentor.name} 멘토님에게 질문을 보냅니다!')">이 멘토에게 질문하기</button>
            <hr>
        `;
        container.appendChild(card);
    });
}

// 2. 임산부가 고민을 적고 '완료' 버튼을 눌렀을 때 실행될 함수
async function handleWorrySubmit() {
    const worryInput = document.getElementById('worry-text');
    const worryText = worryInput ? worryInput.value : "";

    if (worryText.trim() === "") {
        alert("고민을 먼저 입력해주세요.");
        return;
    }

    // 고민 내용 저장
    saveData('pregnantWorry', worryText);

    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) loadingSpinner.style.display = 'block';

    // (임시) AI가 분석한 결과 태그라고 가정
    const dummyAiTags = ["첫 출산", "독박육아"]; 

    // 멘토 찾아오기
    const allMentors = await getMentors();
    const matchedMentors = findMatchingMentors(allMentors, dummyAiTags);

    // 💡 방금 새로 만든 함수를 사용해 화면에 출력!
    displayMentors(matchedMentors);

    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

// 3. 브라우저가 화면을 다 읽어오면 클릭 이벤트 달아주기
document.addEventListener("DOMContentLoaded", () => {
    const submitBtn = document.getElementById('submit-worry-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleWorrySubmit);
    }
});