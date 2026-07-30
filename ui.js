document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================
       1. 스플래시 스크린 타이머 (최초 1.2초 후 종료)
       ========================================== */
    const splashScreen = document.getElementById('splash-screen');
    const isLogoutTransition = sessionStorage.getItem('isLogoutTransition') === 'true';

    if (splashScreen) {
        if (isLogoutTransition) {
            // 로그아웃 후 복귀 시 스플래시 연출 처리 후 키 삭제
            sessionStorage.removeItem('isLogoutTransition');
            setTimeout(() => {
                splashScreen.classList.add('fade-out');
            }, 1200);
        } else {
            // 일반 접속 시
            setTimeout(() => {
                splashScreen.classList.add('fade-out');
            }, 1200);
        }
    }

    /* ==========================================
       2. 메인 페이지 상태 및 프로필 제어 (index.html)
       ========================================== */
    const modeSelectStep = document.getElementById('mode-select-step');
    const pregnantInfoStep = document.getElementById('pregnant-info-step');
    const seniorInfoStep = document.getElementById('senior-info-step');
    const mainHeroStep = document.getElementById('main-hero-step');

    const selectPregnantBtn = document.getElementById('select-pregnant-btn');
    const selectSeniorBtn = document.getElementById('select-senior-btn');
    const startPregnantBtn = document.getElementById('start-pregnant-btn');
    const startSeniorBtn = document.getElementById('start-senior-btn');
    const goModePageBtn = document.getElementById('go-mode-page-btn');

    const mainProfileBtn = document.getElementById('main-profile-btn');

    function switchStep(fromStep, toStep) {
        if (fromStep) fromStep.classList.add('hidden');
        if (toStep) {
            toStep.classList.remove('hidden');
            toStep.classList.add('fade-in');
        }
    }

    function checkUserRegistration() {
        const isRegistered = localStorage.getItem('isRegistered') === 'true';
        const userRole = localStorage.getItem('userRole');

        if (isRegistered && mainHeroStep) {
            if (modeSelectStep) modeSelectStep.classList.add('hidden');
            if (pregnantInfoStep) pregnantInfoStep.classList.add('hidden');
            if (seniorInfoStep) seniorInfoStep.classList.add('hidden');

            mainHeroStep.classList.remove('hidden');
            if (mainProfileBtn) mainProfileBtn.classList.remove('hidden');

            if (userRole === 'pregnant') {
                const name = localStorage.getItem('userName') || '산모';
                document.getElementById('hero-title').innerHTML = `<strong>${name}님</strong>, 반갑습니다!<br>어르신의 지혜를 나눠드립니다.`;
                goModePageBtn.textContent = '고민 나누러 가기 🤰';
            } else if (userRole === 'senior') {
                const name = localStorage.getItem('seniorName') || '어르신';
                const age = localStorage.getItem('seniorAge') || '70';
                document.getElementById('hero-title').innerHTML = `<strong>${name} 멘토님(${age}세)</strong>,<br>소중한 지혜를 들려주세요.`;
                goModePageBtn.textContent = '지혜 들려주러 가기 👵';
            }
        }
    }

    checkUserRegistration();

    if (selectPregnantBtn) {
        selectPregnantBtn.addEventListener('click', () => {
            switchStep(modeSelectStep, pregnantInfoStep);
        });
    }

    if (selectSeniorBtn) {
        selectSeniorBtn.addEventListener('click', () => {
            switchStep(modeSelectStep, seniorInfoStep);
        });
    }

    const chipBtns = document.querySelectorAll('.chip-btn');
    const selectedKeywords = [];
    chipBtns.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
            const tag = chip.getAttribute('data-tag');
            if (chip.classList.contains('active')) {
                selectedKeywords.push(tag);
            } else {
                const idx = selectedKeywords.indexOf(tag);
                if (idx > -1) selectedKeywords.splice(idx, 1);
            }
        });
    });

    if (startPregnantBtn) {
        startPregnantBtn.addEventListener('click', () => {
            const name = document.getElementById('preg-name').value.trim() || '지혜맘';
            const status = document.getElementById('preg-status').value;

            localStorage.setItem('isRegistered', 'true');
            localStorage.setItem('userRole', 'pregnant');
            localStorage.setItem('userName', name);
            localStorage.setItem('userStatus', status);

            document.getElementById('hero-title').innerHTML = `<strong>${name}님</strong>, 반갑습니다!<br>어르신의 지혜를 나눠드립니다.`;
            goModePageBtn.textContent = '고민 나누러 가기 🤰';

            if (mainProfileBtn) mainProfileBtn.classList.remove('hidden');
            switchStep(pregnantInfoStep, mainHeroStep);
        });
    }

    if (startSeniorBtn) {
        startSeniorBtn.addEventListener('click', () => {
            const name = document.getElementById('senior-name').value.trim() || '김정희';
            const age = document.getElementById('senior-age').value.trim() || '72';

            localStorage.setItem('isRegistered', 'true');
            localStorage.setItem('userRole', 'senior');
            localStorage.setItem('seniorName', name);
            localStorage.setItem('seniorAge', age);
            localStorage.setItem('seniorKeywords', JSON.stringify(selectedKeywords));

            document.getElementById('hero-title').innerHTML = `<strong>${name} 멘토님(${age}세)</strong>,<br>소중한 지혜를 들려주세요.`;
            goModePageBtn.textContent = '지혜 들려주러 가기 👵';

            if (mainProfileBtn) mainProfileBtn.classList.remove('hidden');
            switchStep(seniorInfoStep, mainHeroStep);
        });
    }

    if (mainProfileBtn) {
        mainProfileBtn.addEventListener('click', () => {
            window.location.href = 'mypage.html';
        });
    }

    if (goModePageBtn) {
        goModePageBtn.addEventListener('click', () => {
            const role = localStorage.getItem('userRole');
            if (role === 'pregnant') {
                window.location.href = 'pregnant.html';
            } else {
                window.location.href = 'senior.html';
            }
        });
    }

    /* ==========================================
       3. 마이페이지 화면 및 로그아웃 단일화 (mypage.html)
       ========================================== */
    const profileUserName = document.getElementById('profile-user-name');
    const profileUserDetail = document.getElementById('profile-user-detail');
    const profileUserAvatar = document.getElementById('profile-user-avatar');

    const pregnantHistoryView = document.getElementById('pregnant-history-view');
    const seniorHistoryView = document.getElementById('senior-history-view');
    const mypageBackBtn = document.getElementById('mypage-back-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (profileUserName) {
        const userRole = localStorage.getItem('userRole');

        if (userRole === 'pregnant') {
            const name = localStorage.getItem('userName') || '지혜맘';
            const status = localStorage.getItem('userStatus') || '임신 중';

            profileUserAvatar.textContent = '🤰';
            profileUserName.textContent = `${name} 님`;
            profileUserDetail.textContent = `상태: ${status}`;

            if (pregnantHistoryView) pregnantHistoryView.classList.remove('hidden');
            if (seniorHistoryView) seniorHistoryView.classList.add('hidden');

        } else if (userRole === 'senior') {
            const name = localStorage.getItem('seniorName') || '김정희';
            const age = localStorage.getItem('seniorAge') || '72';
            const rawKeywords = localStorage.getItem('seniorKeywords');
            let keywordsText = '';

            if (rawKeywords) {
                const arr = JSON.parse(rawKeywords);
                if (arr.length > 0) keywordsText = ` | 희망 경험: #${arr.join(' #')}`;
            }

            profileUserAvatar.textContent = '👵';
            profileUserName.textContent = `${name} 멘토님`;
            profileUserDetail.textContent = `연령: ${age}세${keywordsText}`;

            if (seniorHistoryView) seniorHistoryView.classList.remove('hidden');
            if (pregnantHistoryView) pregnantHistoryView.classList.add('hidden');
        }
    }

    if (mypageBackBtn) {
        mypageBackBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // 🚪 로그아웃 처리 (1회 이중 연출 제거 및 단일 스플래시 전환)
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            sessionStorage.setItem('isLogoutTransition', 'true');
            window.location.href = 'index.html';
        });
    }

    /* ==========================================
       4. pregnant.html 모드 기능 & '처음으로' 이동
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
                alert('고민 내용을 적어주세요!');
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

    // 임산부 최종 완료 후 '처음으로' 클릭 시 메인 입력창 복귀
    if (pregnantHomeCompleteBtn) {
        pregnantHomeCompleteBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    /* ==========================================
       5. senior.html 녹음 모드 기능 & '처음으로' 이동
       ========================================== */
    const micBtn = document.getElementById('mic-btn');
    const micBtnLabel = document.getElementById('mic-btn-label');
    const recordingStatus = document.getElementById('recording-status');
    const statusLabel = document.getElementById('status-label');
    const sttResultBox = document.getElementById('stt-result-box');
    const sttTextContent = document.getElementById('stt-text-content');
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
                statusLabel.textContent = '듣고 있어요... (말씀 후 눌러주세요)';
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
            const finalSttText = sttTextContent.textContent.trim();
            localStorage.setItem('seniorRecordedVoiceText', finalSttText);
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

    // 어르신 최종 완료 후 '처음으로' 클릭 시 메인 입력창 복귀
    if (seniorHomeCompleteBtn) {
        seniorHomeCompleteBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});