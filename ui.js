// C팀원 멘토 데이터 전역 관리용
let globalMentorsList = [];

// [이 어르신의 경험 편지 읽기] 클릭 시 C팀원의 편지(letter) 세부 내용을 화면에 출력하는 함수
window.openMentorLetter = function(mentorId) {
    const mentor = globalMentorsList.find(m => m.id === mentorId);
    if (!mentor) return;

    const exp = (mentor.experiences && mentor.experiences.length > 0) ? mentor.experiences[0] : null;

    // A팀원 HTML 요소에 C팀원 데이터 주입
    const mentorHeader = document.querySelector('.mentor-header h2');
    const aiLetterContent = document.getElementById('ai-letter-content');

    if (mentorHeader) {
        mentorHeader.innerHTML = `${mentor.profileEmoji || '👵'} ${mentor.name} 멘토님 <span class="age">(${mentor.age}세)</span>의 경험 편지`;
    }

    if (aiLetterContent && exp) {
        // C팀원 JSON의 편지 문단 처리
        const letterParagraphs = exp.letter ? exp.letter.split('\n').filter(p => p.trim() !== '') : [exp.summary];
        aiLetterContent.innerHTML = letterParagraphs.map(p => `<p>${p}</p>`).join('');
    }

    // 화면 전환 (추천 카드 목록 숨기고 -> 편지 읽기 출력)
    const recommendedSection = document.getElementById('recommended-card-section');
    const letterDetailSection = document.getElementById('letter-detail-section');
    if (recommendedSection) recommendedSection.classList.add('hidden');
    if (letterDetailSection) letterDetailSection.classList.remove('hidden');
};

// C팀원의 JSON 파싱 데이터를 받아서 카드를 동적으로 그려주는 함수
function displayMentors(mentors) {
    globalMentorsList = mentors;
    const container = document.querySelector('.experience-card-list');
    if (!container) return; 

    container.innerHTML = ""; 

    if (!mentors || mentors.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#666;'>조건에 일치하는 멘토 카드가 없습니다.</p>";
        return;
    }

    mentors.forEach(mentor => {
        const exp = (mentor.experiences && mentor.experiences.length > 0) ? mentor.experiences[0] : null;
        const summaryText = exp ? exp.summary : mentor.intro;

        const card = document.createElement('div');
        card.className = 'experience-card';
        card.style.marginBottom = "12px";
        card.innerHTML = `
            <div class="mentor-info">
                <strong>${mentor.profileEmoji || '👵'} ${mentor.name} 멘토</strong> <span class="age">(${mentor.age}세, ${mentor.region || '부산'})</span>
            </div>
            <p class="summary">"${summaryText}"</p>
            <button class="button secondary-btn view-letter-btn" onclick="openMentorLetter('${mentor.id}')">이 어르신의 경험 편지 읽기</button>
        `;
        container.appendChild(card);
    });
}

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
            const nameInput = document.getElementById('preg-name');
            const statusInput = document.getElementById('preg-status');
            const name = nameInput ? (nameInput.value.trim() || '지혜맘') : '지혜맘';
            const status = statusInput ? statusInput.value : '임신 초기';

            if (typeof saveData === 'function') {
                saveData('userName', name);
                saveData('userStatus', status);
            } else {
                localStorage.setItem('userName', name);
                localStorage.setItem('userStatus', status);
            }

            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) {
                heroTitle.innerHTML = `<strong>${name}님</strong>, 반갑습니다!<br>어르신의 지혜를 나눠드립니다.`;
            }
            if (goModePageBtn) goModePageBtn.textContent = '고민 나누러 가기 🤰';

            switchStep(pregnantInfoStep, mainHeroStep);
        });
    }

    if (startSeniorBtn) {
        startSeniorBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('senior-name');
            const ageInput = document.getElementById('senior-age');
            const name = nameInput ? (nameInput.value.trim() || '김정희') : '김정희';
            const age = ageInput ? (ageInput.value.trim() || '72') : '72';

            if (typeof saveData === 'function') {
                saveData('seniorName', name);
                saveData('seniorAge', age);
            } else {
                localStorage.setItem('seniorName', name);
                localStorage.setItem('seniorAge', age);
            }

            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) {
                heroTitle.innerHTML = `<strong>${name} 멘토님(${age}세)</strong>,<br>소중한 지혜를 들려주세요.`;
            }
            if (goModePageBtn) goModePageBtn.textContent = '지혜 들려주러 가기 👵';

            switchStep(seniorInfoStep, mainHeroStep);
        });
    }

    if (goModePageBtn) {
        goModePageBtn.addEventListener('click', () => {
            window.location.href = selectedTargetPage;
        });
    }

    /* ==========================================
       3. pregnant.html 모드 기능 (A동작 + B로직 + C데이터 연동)
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
        submitBtn.addEventListener('click', async () => {
            const content = pregnancyInput ? pregnancyInput.value.trim() : '';
            if (content === '') {
                alert('고민 내용을 적어주세요!');
                if (pregnancyInput) pregnancyInput.focus();
                return;
            }

            // B님의 storage 기능 활용
            if (typeof saveData === 'function') {
                saveData('userPregnancyInput', content);
            } else {
                localStorage.setItem('userPregnancyInput', content);
            }

            if (pregnancyInput) pregnancyInput.disabled = true;
            submitBtn.disabled = true;

            if (step1Section) step1Section.classList.add('hidden');
            if (loadingSection) loadingSection.classList.remove('hidden');

            // C팀원의 JSON 데이터를 fetch로 불러와서 매칭 연동
            let matchedMentors = [];
            try {
                const response = await fetch('dummy_mentors.json');
                const data = await response.json();
                
                // 임시 AI 태그 (C팀원 AI 완성 전까지 테스트용)
                const dummyAiTags = ["첫 출산", "독박육아", "출산 불안"]; 
                if (typeof findMatchingMentors === 'function') {
                    matchedMentors = findMatchingMentors(data, dummyAiTags);
                }
            } catch (error) {
                console.error("멘토 데이터 로드 실패:", error);
            }

            setTimeout(() => {
                if (loadingSection) loadingSection.classList.add('hidden');
                
                // 검색된 멘토 데이터가 있을 경우 화면에 동적 동기화
                if (matchedMentors.length > 0) {
                    displayMentors(matchedMentors);
                }
                
                if (recommendedSection) recommendedSection.classList.remove('hidden');
            }, 2500);
        });
    }

    // A팀원 기본 하드코딩 카드 편지 연결 동작 (만약 동적 카드 외에 하드코딩 카드가 남을 경우 대비)
    if (viewLetterBtn) {
        viewLetterBtn.addEventListener('click', () => {
            if (recommendedSection) recommendedSection.classList.add('hidden');
            if (letterDetailSection) letterDetailSection.classList.remove('hidden');
        });
    }

    // [다른 고민 다시 적기] 버튼 전체 초기화 동작 (A팀원 100% 보존)
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (pregnancyInput) {
                pregnancyInput.disabled = false;
                pregnancyInput.value = '';
            }
            if (submitBtn) submitBtn.disabled = false;
            
            thankBtns.forEach(btn => btn.disabled = false);
            if (thankCompleteMsg) thankCompleteMsg.classList.add('hidden');

            if (letterDetailSection) letterDetailSection.classList.add('hidden');
            if (recommendedSection) recommendedSection.classList.add('hidden');
            if (loadingSection) loadingSection.classList.add('hidden');
            if (step1Section) step1Section.classList.remove('hidden');
        });
    }

    // [감사 버튼 클릭] 반응 동작 (A팀원 100% 보존)
    thankBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const thankText = e.target.textContent.trim();
            
            if (typeof saveData === 'function') {
                saveData('userThankReactionText', thankText);
            } else {
                localStorage.setItem('userThankReactionText', thankText);
            }

            thankBtns.forEach(b => b.disabled = true);
            if (thankCompleteMsg) thankCompleteMsg.classList.remove('hidden');
        });
    });

    /* ==========================================
       4. senior.html 어르신 녹음 모드 (A동작 + B STT)
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
                if (micBtnLabel) micBtnLabel.textContent = '말씀 끝내기';
                if (recordingStatus) recordingStatus.classList.remove('hidden');
                if (statusLabel) statusLabel.textContent = '듣고 있어요... (말씀 후 눌러주세요)';
                if (sttResultBox) sttResultBox.classList.add('hidden');
                if (sendExperienceBtn) sendExperienceBtn.classList.add('hidden');

                // B팀원의 실제 마이크 STT 음성 인식 가동
                if (typeof startRecording === 'function') {
                    startRecording((transcript) => {
                        if (sttTextContent) sttTextContent.textContent = `"${transcript}"`;
                        
                        isRecording = false;
                        micBtn.classList.remove('recording');
                        if (micBtnLabel) micBtnLabel.textContent = '다시 말씀하기';
                        if (recordingStatus) recordingStatus.classList.add('hidden');
                        if (sttResultBox) sttResultBox.classList.remove('hidden');
                        if (sendExperienceBtn) sendExperienceBtn.classList.remove('hidden');
                    });
                }
            } else {
                isRecording = false;
                micBtn.classList.remove('recording');
                if (micBtnLabel) micBtnLabel.textContent = '다시 말씀하기';
                if (recordingStatus) recordingStatus.classList.add('hidden');
                if (sttResultBox) sttResultBox.classList.remove('hidden');
                if (sendExperienceBtn) sendExperienceBtn.classList.remove('hidden');
            }
        });
    }

    // [이 경험 전달하기] 버튼 클릭 동작 (A팀원 100% 보존)
    if (sendExperienceBtn) {
        sendExperienceBtn.addEventListener('click', () => {
            const finalSttText = sttTextContent ? sttTextContent.textContent.trim() : '';
            
            if (typeof saveData === 'function') {
                saveData('seniorRecordedVoiceText', finalSttText);
            } else {
                localStorage.setItem('seniorRecordedVoiceText', finalSttText);
            }

            if (questionSection) questionSection.classList.add('hidden');
            if (recordSection) recordSection.classList.add('hidden');
            if (thankYouSection) thankYouSection.classList.remove('hidden');
        });
    }

    // [다른 이야기 또 들려주기] 리셋 버튼 동작 (A팀원 100% 보존)
    if (seniorResetBtn) {
        seniorResetBtn.addEventListener('click', () => {
            if (sttResultBox) sttResultBox.classList.add('hidden');
            if (sendExperienceBtn) sendExperienceBtn.classList.add('hidden');
            if (micBtnLabel) micBtnLabel.textContent = '말씀 시작하기';
            if (thankYouSection) thankYouSection.classList.add('hidden');
            if (questionSection) questionSection.classList.remove('hidden');
            if (recordSection) recordSection.classList.remove('hidden');
        });
    }
    /* ==========================================
       5. mypage.html 마이페이지 데이터 출력 연동
       ========================================== */
    const questionListSection = document.getElementById('question-list-section');
    const mypageReactionText = document.getElementById('mypage-reaction-text');

    if (questionListSection) {
        // 저장된 고민 내용 불러오기
        const savedWorry = (typeof loadData === 'function') 
            ? loadData('userPregnancyInput') 
            : localStorage.getItem('userPregnancyInput');

        if (savedWorry) {
            questionListSection.innerHTML = `
                <div class="history-item">
                    <div class="item-header">
                        <span class="item-tag">#내고민기록</span>
                        <span class="item-date">최근 작성</span>
                    </div>
                    <p class="item-content">"${savedWorry}"</p>
                </div>
            `;
        }
    }

    if (mypageReactionText) {
        // 저장된 감사 반응 불러오기 (수정사항: setItem -> getItem으로 오타 수정)
        const savedReaction = (typeof loadData === 'function') 
            ? loadData('userThankReactionText') 
            : localStorage.getItem('userThankReactionText');

        if (savedReaction) {
            mypageReactionText.textContent = savedReaction;
            mypageReactionText.classList.add('active');
        }
    }
});