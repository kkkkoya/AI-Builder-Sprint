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
            }
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

    // 임산부 인적사항 작성 완료 (isRegistered 저장!)
    if (startPregnantBtn) {
        startPregnantBtn.addEventListener('click', () => {
            const name = document.getElementById('preg-name').value.trim() || '지혜맘';
            const status = document.getElementById('preg-status').value;

            localStorage.setItem('isRegistered', 'true'); // ✨ 등록 완료 상태 저장
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

    // 어르신 인적사항 작성 완료 (isRegistered 저장!)
    if (startSeniorBtn) {
        startSeniorBtn.addEventListener('click', () => {
            const name = document.getElementById('senior-name').value.trim() || '김정희';
            const age = document.getElementById('senior-age').value.trim() || '72';

            localStorage.setItem('isRegistered', 'true'); // ✨ 등록 완료 상태 저장
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

            const savedReaction = localStorage.getItem('userThankReactionText');
            const reactionDisplay = document.getElementById('senior-received-reaction');
            if (reactionDisplay && savedReaction) {
                reactionDisplay.textContent = `"${savedReaction}"`;
            }

        } else if (userRole === 'senior') {
            const name = localStorage.getItem('seniorName') || '김정희';
            const age = localStorage.getItem('seniorAge') || '72';

            profileUserAvatar.textContent = '👵';
            profileUserName.textContent = `${name} 멘토님`;
            profileUserDetail.textContent = `연령: ${age}세`;

            if (seniorHistoryView) seniorHistoryView.classList.remove('hidden');
            if (pregnantHistoryView) pregnantHistoryView.classList.add('hidden');
        }
    }

    if (mypageBackBtn) {
        mypageBackBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    // 🚪 로그아웃 버튼을 누르면 등록 정보가 싹 지워져서 초기 선택 화면으로 이동!
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html';
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

    // ✨ 처음으로 돌아가기 클릭 시 index.html로 이동 (isRegistered가 켜져 있어서 메인 바로가기 화면으로 감!)
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

    // ✨ 처음으로 돌아가기 클릭 시 index.html로 이동 (isRegistered가 켜져 있어서 메인 바로가기 화면으로 감!)
    if (seniorHomeCompleteBtn) {
        seniorHomeCompleteBtn.addEventListener('click', () => window.location.href = 'index.html');
    }
});

// --- 이 부분을 JS 파일 아무 곳에나 추가해 주세요 ---

// 1. 알림창 띄우기 함수
function showCustomAlert() {
    document.getElementById('customAlertModal').style.display = 'flex';
}

// 2. 확인(닫기) 버튼 클릭 시 알림창 숨기기
document.getElementById('closeModalBtn').addEventListener('click', function() {
    document.getElementById('customAlertModal').style.display = 'none';
});