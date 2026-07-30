// ui.js

// 임산부가 고민을 적고 '완료' 버튼을 눌렀을 때 실행될 함수
async function handleWorrySubmit() {
    // 1. A가 만든 입력창(HTML)에서 글자 가져오기
    const worryInput = document.getElementById('worry-text');
    const worryText = worryInput ? worryInput.value : "";

    if (worryText.trim() === "") {
        alert("고민을 먼저 입력해주세요.");
        return;
    }

    // 2. storage.js의 함수를 써서 입력한 고민을 창고에 저장
    saveData('pregnantWorry', worryText);

    // 3. A가 만든 로딩 스피너 켜기 (화면에 '잠시만 기다려주세요' 표시)
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) loadingSpinner.style.display = 'block';

    // 4. (임시) C가 AI로 분석한 결과 태그라고 가정
    // 나중에 C팀원이 API를 완성하면 이 부분을 교체할 겁니다.
    const dummyAiTags = ["첫 출산", "독박육아"]; 

    // 5. mentor.js의 함수를 써서 멘토 찾아오기
    const allMentors = await getMentors();
    const matchedMentors = findMatchingMentors(allMentors, dummyAiTags);

    // 개발자 도구(F12) 콘솔창에서 매칭된 결과를 확인하기 위한 코드
    console.log("매칭된 어르신 멘토 목록:", matchedMentors);

    // 6. 로딩 끄기 및 알림
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    alert("멘토 매칭 완료! (F12를 눌러 콘솔창을 확인해보세요)");
}

// 브라우저가 화면(HTML)을 다 읽어오면, 버튼에 클릭 이벤트를 달아줍니다.
document.addEventListener("DOMContentLoaded", () => {
    const submitBtn = document.getElementById('submit-worry-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleWorrySubmit);
    }
});