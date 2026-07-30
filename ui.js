document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================
       1. 스플래시 스크린 타이머 (1.5초)
       ========================================== */
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        setTimeout(() => {
            splashScreen.classList.add('fade-out');
        }, 1500);
    }

    /* ==========================================
       2. 인적사항 작성 및 메인 화면 전환
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

    let selectedTargetPage = 'pregnant.html';

    function switchStep(fromStep, toStep) {
        if (fromStep) fromStep.classList.add('hidden');
        if (toStep) {
            toStep.classList.remove('hidden');
            toStep.classList.add('fade-in');
        }
    }

    if (selectPregnantBtn) {
        selectPregnantBtn.addEventListener('click', () => {
            selectedTargetPage = 'pregnant.html';
            switchStep(modeSelectStep, pregnantInfoStep);
        });
    }

    if (selectSeniorBtn) {
        selectSeniorBtn.addEventListener('click', () => {
            selectedTargetPage = 'senior.html';
            switchStep(modeSelectStep, seniorInfoStep);
        });
    }

    const chipBtns = document.querySelectorAll('.chip-btn');
    chipBtns.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');
        });
    });

    if (startPregnantBtn) {
        startPregnantBtn.addEventListener('click', () => {
            const name = document.getElementById('preg-name').value.trim() || '지혜맘';
            const status = document.getElementById('preg-status').value;

            localStorage.setItem('userName', name);
            localStorage.setItem('userStatus', status);

            document.getElementById('hero-title').innerHTML = `<strong>${name}님</strong>, 반갑습니다!<br>어르신의 지혜를 나눠드립니다.`;
            goModePageBtn.textContent = '고민 나누러 가기 🤰';

            switchStep(pregnantInfoStep, mainHeroStep);
        });
    }

    if (startSeniorBtn) {
        startSeniorBtn.addEventListener('click', () => {
            const name = document.getElementById('senior-name').value.trim() || '김정희';
            const age = document.getElementById('senior-age').value.trim() || '72';

            localStorage.setItem('seniorName', name);
            localStorage.setItem('seniorAge', age);

            document.getElementById('hero-title').innerHTML = `<strong>${name} 멘토님(${age}세)</strong>,<br>소중한 지혜를 들려주세요.`;
            goModePageBtn.textContent = '지혜 들려주러 가기 👵';

            switchStep(seniorInfoStep, mainHeroStep);
        });
    }

    if (goModePageBtn) {
        goModePageBtn.addEventListener('click', () => {
            window.location.href = selectedTargetPage;
        });
    }

    /* ==========================================
       3. pregnant.html 모드 기능
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

    /* ==========================================
       4. senior.html 어르신 녹음 모드 기능
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
});