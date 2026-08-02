document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================
       1. 스플래시 스크린 타이머 (1.2초)
       ========================================== */
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        setTimeout(() => splashScreen.classList.add('fade-out'), 1200);
    }

    /* ==========================================
       2. 인적사항 및 등록 상태 자동 체크 (핵심 로직!)
       ========================================== */
    const modeSelectStep = document.getElementById('mode-select-step');
    const pregnantInfoStep = document.getElementById('pregnant-info-step');
    const seniorInfoStep = document.getElementById('senior-info-step');
    const mainHeroStep = document.getElementById('main-hero-step');

    const selectPregnantBtn = document.getElementById('select-pregnant-btn');
    const selectSeniorBtn = document.getElementById('select-senior-btn');
    const startPregnantBtn = document.getElementById('start-pregnant-btn');
    const startSeniorBtn = document.getElementById('start-senior-btn');

    const pregnantStartButton = document.getElementById('pregnantStartButton');
    const seniorStartButton = document.getElementById('seniorStartButton');
    const mainProfileBtn = document.getElementById('main-profile-btn');

    function switchStep(fromStep, toStep) {
        if (fromStep) fromStep.classList.add('hidden');
        if (toStep) {
            toStep.classList.remove('hidden');
            toStep.classList.add('fade-in');
        }
    }

    // ✨ 인적사항이 이미 등록되어 있다면 바로 메인 히어로 화면으로 고정!
    function checkRegistrationStatus() {
        const isRegistered = localStorage.getItem('isRegistered') === 'true';
        const userRole = localStorage.getItem('userRole');

        if (isRegistered && mainHeroStep) {
            if (modeSelectStep) modeSelectStep.classList.add('hidden');
            if (pregnantInfoStep) pregnantInfoStep.classList.add('hidden');
            if (seniorInfoStep) seniorInfoStep.classList.add('hidden');

            mainHeroStep.classList.remove('hidden');
            if (mainProfileBtn) mainProfileBtn.classList.remove('hidden');

            if (userRole === 'pregnant') {
                const name = localStorage.getItem('userName') || '지혜맘';
                document.getElementById('hero-title').innerHTML = `<strong>${name}님</strong>, 반갑습니다!<br>어르신의 지혜를 나눠드립니다.`;
                if (pregnantStartButton) pregnantStartButton.classList.remove('hidden');
                if (seniorStartButton) seniorStartButton.classList.add('hidden');
            } else if (userRole === 'senior') {
                const name = localStorage.getItem('seniorName') || '김정희';
                const age = localStorage.getItem('seniorAge') || '72';
                document.getElementById('hero-title').innerHTML = `<strong>${name} 멘토님(${age}세)</strong>,<br>소중한 지혜를 들려주세요.`;
                if (seniorStartButton) seniorStartButton.classList.remove('hidden');
                if (pregnantStartButton) pregnantStartButton.classList.add('hidden');
                
                const savedSeniorText = localStorage.getItem('seniorRecordText');
                const mypageSttText = document.getElementById('mypage-stt-text');
            
                if (mypageSttText && savedSeniorText) {
                    mypageSttText.textContent = `"${savedSeniorText}"`;
                }
            }
        } else {
            // 👇 로그아웃 상태일 때 초기 모드 선택 화면을 강제로 복구!
            if (modeSelectStep) modeSelectStep.classList.remove('hidden');
            if (pregnantInfoStep) pregnantInfoStep.classList.add('hidden');
            if (seniorInfoStep) seniorInfoStep.classList.add('hidden');
            if (mainHeroStep) mainHeroStep.classList.add('hidden');
            if (mainProfileBtn) mainProfileBtn.classList.add('hidden');
        }
    }

    // 페이지 진입/새로고침 시 상태 확인 실행
    checkRegistrationStatus();

    // 모드 선택 버튼
    if (selectPregnantBtn) {
        selectPregnantBtn.addEventListener('click', () => switchStep(modeSelectStep, pregnantInfoStep));
    }
    if (selectSeniorBtn) {
        selectSeniorBtn.addEventListener('click', () => switchStep(modeSelectStep, seniorInfoStep));
    }

    // 키워드 칩 토글
    const chipBtns = document.querySelectorAll('.chip-btn');
    chipBtns.forEach(chip => chip.addEventListener('click', () => chip.classList.toggle('active')));

    // 임산부 인적사항 작성 완료 
    if (startPregnantBtn) {
        startPregnantBtn.addEventListener('click', () => {
            const name = document.getElementById('preg-name').value.trim() || '지혜맘';
            const status = document.getElementById('preg-status').value;

            localStorage.setItem('isRegistered', 'true'); 
            localStorage.setItem('userName', name);
            localStorage.setItem('userStatus', status);
            localStorage.setItem('userRole', 'pregnant');

            document.getElementById('hero-title').innerHTML = `<strong>${name}님</strong>, 반갑습니다!<br>어르신의 지혜를 나눠드립니다.`;
            if (pregnantStartButton) pregnantStartButton.classList.remove('hidden');
            if (seniorStartButton) seniorStartButton.classList.add('hidden');
            if (mainProfileBtn) mainProfileBtn.classList.remove('hidden');

            switchStep(pregnantInfoStep, mainHeroStep);
        });
    }

    // 어르신 인적사항 작성 완료 
    if (startSeniorBtn) {
        startSeniorBtn.addEventListener('click', () => {
            const name = document.getElementById('senior-name').value.trim() || '김정희';
            const age = document.getElementById('senior-age').value.trim() || '72';

            localStorage.setItem('isRegistered', 'true'); 
            localStorage.setItem('seniorName', name);
            localStorage.setItem('seniorAge', age);
            localStorage.setItem('userRole', 'senior');

            document.getElementById('hero-title').innerHTML = `<strong>${name} 멘토님(${age}세)</strong>,<br>소중한 지혜를 들려주세요.`;
            if (seniorStartButton) seniorStartButton.classList.remove('hidden');
            if (pregnantStartButton) pregnantStartButton.classList.add('hidden');
            if (mainProfileBtn) mainProfileBtn.classList.remove('hidden');

            switchStep(seniorInfoStep, mainHeroStep);
        });
    }

    if (mainProfileBtn) {
        mainProfileBtn.addEventListener('click', () => window.location.href = 'mypage.html');
    }

    /* ==========================================
       3. 마이페이지 로드 및 로그아웃 (mypage.html)
       ========================================== */
    const profileUserName = document.getElementById('profile-user-name');
    const profileUserDetail = document.getElementById('profile-user-detail');
    const profileUserAvatar = document.getElementById('profile-user-avatar');

    const pregnantHistoryView = document.getElementById('pregnant-history-view');
    const seniorHistoryView = document.getElementById('senior-history-view');
    const mypageBackBtn = document.getElementById('mypage-back-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (profileUserName) {
        const userRole = localStorage.getItem('userRole') || 'pregnant';

        if (userRole === 'pregnant') {
            const name = localStorage.getItem('userName') || '지혜맘';
            const status = localStorage.getItem('userStatus') || '임신 초기';

            profileUserAvatar.textContent = '🤰';
            profileUserName.textContent = `${name} 님`;
            profileUserDetail.textContent = `상태: ${status}`;

            if (pregnantHistoryView) pregnantHistoryView.classList.remove('hidden');
            if (seniorHistoryView) seniorHistoryView.classList.add('hidden');

            // 💡 [임산부 시나리오] 고민 작성 여부에 따른 빈 화면 vs 매칭 화면 제어
            const userConcern = localStorage.getItem('userPregnancyInput');
            const emptyState = document.getElementById('pregnant-empty-state');
            const historyItem = document.getElementById('pregnant-history-item');
            const concernText = document.getElementById('mypage-user-concern');

            if (!userConcern) {
                if (emptyState) emptyState.classList.remove('hidden');
                if (historyItem) historyItem.classList.add('hidden');
            } else {
                if (emptyState) emptyState.classList.add('hidden');
                if (historyItem) historyItem.classList.remove('hidden');
                if (concernText) concernText.textContent = `"${userConcern}"`;
            }

        } else if (userRole === 'senior') {
            const name = localStorage.getItem('seniorName') || '김정희';
            const age = localStorage.getItem('seniorAge') || '72';

            profileUserAvatar.textContent = '👵';
            profileUserName.textContent = `${name} 멘토님`;
            profileUserDetail.textContent = `연령: ${age}세`;

            if (seniorHistoryView) seniorHistoryView.classList.remove('hidden');
            if (pregnantHistoryView) pregnantHistoryView.classList.add('hidden');

            // 💡 [어르신 시나리오] 녹음 여부에 따른 빈 화면 vs 기록 화면 제어
            const savedSeniorText = localStorage.getItem('seniorRecordText');
            const emptyState = document.getElementById('senior-empty-state');
            const historyItem = document.getElementById('senior-history-item');
            const mypageSttText = document.getElementById('mypage-stt-text');
            const answeredSummary = document.getElementById('mypage-answered-summary');
            
            if (!savedSeniorText) {
                if (emptyState) emptyState.classList.remove('hidden');
                if (historyItem) historyItem.classList.add('hidden');
            } else {
                if (emptyState) emptyState.classList.add('hidden');
                if (historyItem) historyItem.classList.remove('hidden');
                if (mypageSttText) mypageSttText.textContent = `"${savedSeniorText}"`;
                
                const currentConcern = localStorage.getItem('userPregnancyInput') || "처음 엄마가 되었을 때의 두려움과 막막함";
                if (answeredSummary) answeredSummary.textContent = `"${currentConcern.substring(0, 20)}..."`;
            }
        }
    }

    if (mypageBackBtn) {
        mypageBackBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    // 🚪 로그아웃 버튼 이벤트가 정상적으로 들어간 곳!
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.replace('index.html'); 
        });
    }

    /* ==========================================
       4. pregnant.html 모드 기능 & 처음으로 이동
       ========================================== */
    const step1Section = document.getElementById('step1-section');
    const pregnancyInput = document.getElementById('pregnancy-input');
    const submitBtn = document.getElementById('submit-question-btn');
    const loadingSection = document.getElementById('ai-analyzing-loading');
    const recommendedSection = document.getElementById('recommended-card-section');
    const viewLetterBtn = document.querySelector('.view-letter-btn');
    const letterDetailSection = document.getElementById('letter-detail-section');
    const resetBtn = document.getElementById('reset-btn');
    const thankBtns = document.querySelectorAll('.thank-btn');
    const thankCompleteMsg = document.getElementById('thank-complete-msg');
    const pregnantHomeCompleteBtn = document.getElementById('pregnant-home-complete-btn');

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const content = pregnancyInput.value.trim();
            if (content === '') {
                showCustomAlert();
                pregnancyInput.focus();
                return;
            }
            localStorage.setItem('userPregnancyInput', content);
            pregnancyInput.disabled = true;
            submitBtn.disabled = true;

            step1Section.classList.add('hidden');
            loadingSection.classList.remove('hidden');

            setTimeout(() => {
                loadingSection.classList.add('hidden');
                recommendedSection.classList.remove('hidden');
            }, 2500);
        });
    }

    if (viewLetterBtn) {
        viewLetterBtn.addEventListener('click', () => {
            recommendedSection.classList.add('hidden');
            letterDetailSection.classList.remove('hidden');
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            pregnancyInput.disabled = false;
            submitBtn.disabled = false;
            pregnancyInput.value = '';
            thankBtns.forEach(btn => btn.disabled = false);
            thankCompleteMsg.classList.add('hidden');

            letterDetailSection.classList.add('hidden');
            recommendedSection.classList.add('hidden');
            loadingSection.classList.add('hidden');
            step1Section.classList.remove('hidden');
        });
    }

    thankBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const thankText = e.target.textContent.trim();
            localStorage.setItem('userThankReactionText', thankText);
            thankBtns.forEach(b => b.disabled = true);
            thankCompleteMsg.classList.remove('hidden');
        });
    });

    if (pregnantHomeCompleteBtn) {
        pregnantHomeCompleteBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    /* ==========================================
       5. senior.html 어르신 모드 기능 & 처음으로 이동
       ========================================== */
    const micBtn = document.getElementById('mic-btn');
    const micBtnLabel = document.getElementById('mic-btn-label');
    const recordingStatus = document.getElementById('recording-status');
    const sttResultBox = document.getElementById('stt-result-box');
    const sendExperienceBtn = document.getElementById('send-experience-btn');
    const questionSection = document.getElementById('question-section');
    const recordSection = document.getElementById('record-section');
    const thankYouSection = document.getElementById('thank-you-section');
    const seniorResetBtn = document.getElementById('senior-reset-btn');
    const seniorHomeCompleteBtn = document.getElementById('senior-home-complete-btn');

    let isRecording = false;

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (!isRecording) {
                isRecording = true;
                micBtn.classList.add('recording');
                micBtnLabel.textContent = '말씀 끝내기';
                recordingStatus.classList.remove('hidden');
                sttResultBox.classList.add('hidden');
                sendExperienceBtn.classList.add('hidden');
            } else {
                isRecording = false;
                micBtn.classList.remove('recording');
                micBtnLabel.textContent = '다시 말씀하기';
                recordingStatus.classList.add('hidden');
                sttResultBox.classList.remove('hidden');
                sendExperienceBtn.classList.remove('hidden');
            }
        });
    }

    if (sendExperienceBtn) {
        sendExperienceBtn.addEventListener('click', () => {
            const transcriptInput = document.getElementById('transcriptInput');
            if (transcriptInput) {
                localStorage.setItem('seniorRecordText', transcriptInput.value);
            }
            questionSection.classList.add('hidden');
            recordSection.classList.add('hidden');
            thankYouSection.classList.remove('hidden');
        });
    }

    if (seniorResetBtn) {
        seniorResetBtn.addEventListener('click', () => {
            sttResultBox.classList.add('hidden');
            sendExperienceBtn.classList.add('hidden');
            micBtnLabel.textContent = '말씀 시작하기';
            thankYouSection.classList.add('hidden');
            questionSection.classList.remove('hidden');
            recordSection.classList.remove('hidden');
        });
    }

    if (seniorHomeCompleteBtn) {
        seniorHomeCompleteBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    /* ==========================================
       추가: 어르신 모드 메인 진입 시 '초기 더미 고민' 주입 로직
       ========================================== */
    const mentorQuestionText = document.getElementById('mentorQuestionText');
    if (mentorQuestionText) {
        const userConcern = localStorage.getItem('userPregnancyInput');
        if (userConcern) {
            mentorQuestionText.textContent = `"${userConcern}"`;
        } else {
            mentorQuestionText.innerHTML = `"첫 아이를 가지게 되어 기쁘지만, 출산 시 통증과 엄마가 될 준비가 되었는지 너무 두렵고 막막합니다."<br><span style="font-size: 14px; color: #666; font-weight: normal; display: block; margin-top: 10px;">(💡 시스템 추천 고민)</span>`;
        }
    }

    // 알림창 닫기 버튼 이벤트 연결
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            document.getElementById('customAlertModal').style.display = 'none';
        });
    }

}); // DOMContentLoaded 괄호 닫힘 (전체 로직을 감싸는 역할)

// 1. 알림창 띄우기 함수 (이벤트 리스너 밖에서 선언해야 HTML에서 호출 가능)
function showCustomAlert() {
    document.getElementById('customAlertModal').style.display = 'flex';
}