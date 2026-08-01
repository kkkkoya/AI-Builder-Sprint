// ui.js - A팀원 프론트엔드 구조 100% 보존 & C팀원 AI API 완벽 연동

import {
  analyzeConcern,
  matchExperience,
  processMentorAnswer,
  createImpactFeedback,
} from "./api.js";

import {
  loadSession,
  saveSession,
  updateSession,
  clearSession,
} from "./storage.js";

import {
  startRecordingAndTranscription,
} from "./stt.js";

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================
       1. 스플래시 스크린 타이머 (1.2초) - A팀원 원본
       ========================================== */
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        setTimeout(() => splashScreen.classList.add('fade-out'), 1200);
    }

    /* ==========================================
       2. 인적사항 및 등록 상태 자동 체크 - A팀원 원본
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
                const heroTitle = document.getElementById('hero-title');
                if (heroTitle) heroTitle.innerHTML = `<strong>${name}님</strong>, 반갑습니다!<br>어르신의 지혜를 나눠드립니다.`;
                if (pregnantStartButton) pregnantStartButton.classList.remove('hidden');
                if (seniorStartButton) seniorStartButton.classList.add('hidden');
            } else if (userRole === 'senior') {
                const name = localStorage.getItem('seniorName') || '김정희';
                const age = localStorage.getItem('seniorAge') || '72';
                const heroTitle = document.getElementById('hero-title');
                if (heroTitle) heroTitle.innerHTML = `<strong>${name} 멘토님(${age}세)</strong>,<br>소중한 지혜를 들려주세요.`;
                if (seniorStartButton) seniorStartButton.classList.remove('hidden');
                if (pregnantStartButton) pregnantStartButton.classList.add('hidden');
            }
        }
    }

    checkRegistrationStatus();

    if (selectPregnantBtn) {
        selectPregnantBtn.addEventListener('click', () => switchStep(modeSelectStep, pregnantInfoStep));
    }
    if (selectSeniorBtn) {
        selectSeniorBtn.addEventListener('click', () => switchStep(modeSelectStep, seniorInfoStep));
    }

    const chipBtns = document.querySelectorAll('.chip-btn');
    chipBtns.forEach(chip => chip.addEventListener('click', () => chip.classList.toggle('active')));

    if (startPregnantBtn) {
        startPregnantBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('preg-name');
            const statusInput = document.getElementById('preg-status');
            const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : '지혜맘';
            const status = statusInput ? statusInput.value : '임신 초기 (1~12주)';

            localStorage.setItem('isRegistered', 'true');
            localStorage.setItem('userName', name);
            localStorage.setItem('userStatus', status);
            localStorage.setItem('userRole', 'pregnant');

            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) heroTitle.innerHTML = `<strong>${name}님</strong>, 반갑습니다!<br>어르신의 지혜를 나눠드립니다.`;
            if (pregnantStartButton) pregnantStartButton.classList.remove('hidden');
            if (seniorStartButton) seniorStartButton.classList.add('hidden');
            if (mainProfileBtn) mainProfileBtn.classList.remove('hidden');

            switchStep(pregnantInfoStep, mainHeroStep);
        });
    }

    if (startSeniorBtn) {
        startSeniorBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('senior-name');
            const ageInput = document.getElementById('senior-age');
            const name = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : '김정희';
            const age = (ageInput && ageInput.value.trim()) ? ageInput.value.trim() : '72';

            localStorage.setItem('isRegistered', 'true');
            localStorage.setItem('seniorName', name);
            localStorage.setItem('seniorAge', age);
            localStorage.setItem('userRole', 'senior');

            const heroTitle = document.getElementById('hero-title');
            if (heroTitle) heroTitle.innerHTML = `<strong>${name} 멘토님(${age}세)</strong>,<br>소중한 지혜를 들려주세요.`;
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
       3. 마이페이지 로드 및 로그아웃 - A팀원 원본
       ========================================== */
    const profileUserName = document.getElementById('profile-user-name');
    const profileUserDetail = document.getElementById('profile-user-detail');
    const profileUserAvatar = document.getElementById('profile-user-avatar');
    const audioPlayer = document.getElementById('audioPlayer');
    const answeredSummary = document.getElementById('answeredSummary');
    const answeredTags = document.getElementById('answeredTags');

    const pregnantHistoryView = document.getElementById('pregnant-history-view');
    const seniorHistoryView = document.getElementById('senior-history-view');
    const mypageBackBtn = document.getElementById('mypage-back-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (profileUserName) { // mypage.html에서만 실행
        const userRole = localStorage.getItem('userRole') || 'pregnant';
        const session = loadSession();

        if (userRole === 'pregnant') {
            const name = localStorage.getItem('userName') || '지혜맘';
            const status = localStorage.getItem('userStatus') || '임신 초기';

            if (profileUserAvatar) profileUserAvatar.textContent = '🤰';
            profileUserName.textContent = `${name} 님`;
            if (profileUserDetail) profileUserDetail.textContent = `상태: ${status}`;

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

            if (profileUserAvatar) profileUserAvatar.textContent = '👵';
            profileUserName.textContent = `${name} 멘토님`;
            if (profileUserDetail) profileUserDetail.textContent = `연령: ${age}세`;

            if (seniorHistoryView) seniorHistoryView.classList.remove('hidden');
            if (pregnantHistoryView) pregnantHistoryView.classList.add('hidden');

            // 오디오 및 AI 결과 표시
            if (session.audioUrl && audioPlayer) {
                audioPlayer.src = session.audioUrl;
            }
            if (session.mentorResult?.experienceCard) {
                const card = session.mentorResult.experienceCard;
                if (answeredSummary) {
                    answeredSummary.textContent = card.summary || "요약 정보가 없습니다.";
                }
                if (answeredTags) {
                    answeredTags.innerHTML = ''; // Clear existing
                    if (card.standardTags && card.standardTags.length > 0) {
                        card.standardTags.forEach(tag => {
                            const tagEl = document.createElement('div');
                            tagEl.className = 'chip-btn active';
                            tagEl.textContent = `#${tag}`;
                            answeredTags.appendChild(tagEl);
                        });
                    } else {
                        answeredTags.textContent = "생성된 태그가 없습니다.";
                    }
                }
            }
        }
    }

    if (mypageBackBtn) {
        mypageBackBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            clearSession();
            window.location.href = 'index.html';
        });
    }

    /* ==========================================
       4. pregnant.html 모드 기능 (C팀원 AI 연동)
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

    const clarificationSection = document.getElementById('clarificationSection');
    const clarificationQuestionElem = document.getElementById('clarificationQuestion');
    const clarificationInput = document.getElementById('clarificationInput');
    const clarificationSubmitBtn = document.getElementById('clarificationSubmitButton');

    async function handleConcernAnalysis(content, history) {
        if (step1Section) step1Section.classList.add('hidden');
        if (clarificationSection) clarificationSection.classList.add('hidden');
        if (loadingSection) loadingSection.classList.remove('hidden');

        try {
            updateSession({ concernText: content, clarificationHistory: history });
            
            const concernResult = await analyzeConcern({ text: content, history: history });

            if (concernResult && concernResult.ok) {
                const { route, analysis, clarifyingQuestion, response } = concernResult.data;

                if (route === 'CLARIFICATION') {
                    if (loadingSection) loadingSection.classList.add('hidden');
                    if (clarificationQuestionElem) clarificationQuestionElem.innerText = clarifyingQuestion || '구체적인 고민 내용을 조금 더 들려주시겠어요?';
                    if (clarificationInput) clarificationInput.value = '';
                    if (clarificationSection) clarificationSection.classList.remove('hidden');
                    return;
                }

                if (route === 'IN_SCOPE') {
                    updateSession({ analysis });
                    
                    const matchResult = await matchExperience({ analysis });
                    if (loadingSection) loadingSection.classList.add('hidden');

                    if (matchResult && matchResult.ok) {
                        if (!matchResult.data.selected) {
                            alert("죄송합니다, 현재 고민과 연결할 수 있는 적절한 경험을 찾지 못했습니다. 고민 내용을 조금 더 자세하게 작성해 주시면 더 좋은 경험을 찾을 수 있습니다.");
                            if (loadingSection) loadingSection.classList.add('hidden');
                            if (step1Section) step1Section.classList.remove('hidden');
                            if (pregnancyInput) pregnancyInput.disabled = false;
                            if(submitBtn) submitBtn.disabled = false;
                            return;
                        }

                        updateSession({ match: matchResult.data, mentorQuestion: matchResult.data.mentorQuestion });
                        const selected = matchResult.data.selected;

                        const receivedLetterText = document.getElementById('receivedLetterText');
                        if (receivedLetterText && selected) {
                            const mentorQuestion = matchResult.data.mentorQuestion;
                        }

                        // TODO: recommendedSection 내부의 다른 요소들(경험 제목, 멘토 이름 등)을 selected 객체의 데이터로 채워야 합니다.

                        if (recommendedSection) recommendedSection.classList.remove('hidden');
                    } else {
                        alert('경험 추천을 불러오지 못했습니다.');
                        if (loadingSection) loadingSection.classList.add('hidden');
                        if (step1Section) step1Section.classList.remove('hidden');
                        if (pregnancyInput) pregnancyInput.disabled = false;
                        if(submitBtn) submitBtn.disabled = false;
                    }
                } else {
                    if (loadingSection) loadingSection.classList.add('hidden');
                    alert(response || '입력하신 내용은 서비스 제공 범위를 벗어났습니다.');
                    if (step1Section) step1Section.classList.remove('hidden');
                    if (pregnancyInput) pregnancyInput.disabled = false;
                    if(submitBtn) submitBtn.disabled = false;
                }
            } else {
                if (loadingSection) loadingSection.classList.add('hidden');
                alert(concernResult?.error?.message || '고민 분석 중 오류가 발생했습니다.');
                if (step1Section) step1Section.classList.remove('hidden');
                if (pregnancyInput) pregnancyInput.disabled = false;
                if(submitBtn) submitBtn.disabled = false;
            }
        } catch (err) {
            console.error("고민 처리 오류:", err);
            if (loadingSection) loadingSection.classList.add('hidden');
            if (step1Section) step1Section.classList.remove('hidden');
            if (pregnancyInput) pregnancyInput.disabled = false;
            if(submitBtn) submitBtn.disabled = false;
        }
    }


    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const content = pregnancyInput ? pregnancyInput.value.trim() : '';
            if (content === '') {
                alert('고민 내용을 적어주세요!');
                if (pregnancyInput) pregnancyInput.focus();
                return;
            }

            localStorage.setItem('userPregnancyInput', content);
            if (pregnancyInput) pregnancyInput.disabled = true;
            submitBtn.disabled = true;

            await handleConcernAnalysis(content, []);
        });
    }

    if (clarificationSubmitBtn) {
        clarificationSubmitBtn.addEventListener('click', async () => {
            const answer = clarificationInput ? clarificationInput.value.trim() : '';
            if (answer === '') {
                alert('답변을 입력해주세요.');
                if(clarificationInput) clarificationInput.focus();
                return;
            }

            const session = loadSession();
            const question = clarificationQuestionElem ? clarificationQuestionElem.innerText : '';
            
            const newHistory = [
                ...session.clarificationHistory,
                { question, answer }
            ];

            await handleConcernAnalysis(session.concernText, newHistory);
        });
    }

    if (viewLetterBtn) {
        viewLetterBtn.addEventListener('click', () => {
            if (recommendedSection) recommendedSection.classList.add('hidden');
            if (letterDetailSection) letterDetailSection.classList.remove('hidden');
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (pregnancyInput) {
                pregnancyInput.disabled = false;
                pregnancyInput.value = '';
            }
            if (submitBtn) submitBtn.disabled = false;
            thankBtns.forEach(btn => btn.disabled = false);
            if (thankCompleteMsg) thankCompleteMsg.classList.add('hidden');

            document.getElementById('clarificationSection')?.classList.add('hidden');
            if (letterDetailSection) letterDetailSection.classList.add('hidden');
            if (recommendedSection) recommendedSection.classList.add('hidden');
            if (loadingSection) loadingSection.classList.add('hidden');
            if (step1Section) step1Section.classList.remove('hidden');
        });
    }

    thankBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const thankText = e.target.textContent.trim();
            const reaction = e.target.getAttribute('data-reaction') || thankText;
            localStorage.setItem('userThankReactionText', thankText);
            thankBtns.forEach(b => b.disabled = true);
            if (thankCompleteMsg) thankCompleteMsg.classList.remove('hidden');

            try {
                const session = loadSession();
                await createImpactFeedback({
                    reaction,
                    concernSummary: session.analysis ? session.analysis.summary : '',
                    selectedMatch: session.match ? session.match.selected : null
                });
            } catch (err) {
                console.error("감사 전송 오류:", err);
            }
        });
    });

    if (pregnantHomeCompleteBtn) {
        pregnantHomeCompleteBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    /* ==========================================
       5. senior.html 어르신 모드 기능 (C팀원 AI 연동)
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

    const sessionData = loadSession();
    const mentorQuestionText = document.getElementById('mentorQuestionText');
    if (mentorQuestionText && sessionData.match?.mentorQuestion) {
        mentorQuestionText.innerText = `"${sessionData.match.mentorQuestion}"`;
    }

    let isRecording = false;
    let stopRecording = null;

    if (micBtn) {
        micBtn.addEventListener('click', async () => {
            const transcriptInput = document.getElementById('transcriptInput');
            if (!isRecording) {
                isRecording = true;
                micBtn.classList.add('recording');
                if (micBtnLabel) micBtnLabel.textContent = '말씀 끝내기';
                if (recordingStatus) recordingStatus.classList.remove('hidden');
                if (sttResultBox) sttResultBox.classList.add('hidden');
                if (sendExperienceBtn) sendExperienceBtn.classList.add('hidden');
                
                try {
                    stopRecording = await startRecordingAndTranscription({
                        onInterimResult: (text) => {
                            if (transcriptInput) transcriptInput.value = text;
                        },
                        onFinalResult: (text) => {
                            if (transcriptInput) transcriptInput.value = text;
                        },
                        onError: (err) => {
                            alert(`녹음 중 오류가 발생했습니다: ${err.message}`);
                            isRecording = false;
                            micBtn.classList.remove('recording');
                            if (micBtnLabel) micBtnLabel.textContent = '말씀 시작하기';
                            if (recordingStatus) recordingStatus.classList.add('hidden');
                        },
                    });
                } catch (err) {
                    alert(`녹음을 시작할 수 없습니다: ${err.message}`);
                    isRecording = false;
                    micBtn.classList.remove('recording');
                    if (micBtnLabel) micBtnLabel.textContent = '말씀 시작하기';
                }
            } else {
                isRecording = false;
                if (stopRecording) {
                    try {
                        const { transcript, audioDataUrl } = await stopRecording();
                        updateSession({ transcript, audioUrl: audioDataUrl });
                        if (transcriptInput) transcriptInput.value = transcript;
                    } catch (err) {
                        alert(`녹음 처리에 실패했습니다: ${err.message}`);
                    } finally {
                        stopRecording = null;
                    }
                }
                micBtn.classList.remove('recording');
                if (micBtnLabel) micBtnLabel.textContent = '다시 말씀하기';
                if (recordingStatus) recordingStatus.classList.add('hidden');
                if (sttResultBox) sttResultBox.classList.remove('hidden');
                if (sendExperienceBtn) sendExperienceBtn.classList.remove('hidden');
            }
        });
    }

    if (sendExperienceBtn) {
        sendExperienceBtn.addEventListener('click', async () => {
            const transcriptInput = document.getElementById('transcriptInput');
            const currentTranscript = transcriptInput ? transcriptInput.value.trim() : '';

            if (!currentTranscript) {
                alert('경험 내용을 말씀해 주세요!');
                return;
            }

            // Use the current text from the UI as the source of truth
            updateSession({ transcript: currentTranscript });
            const session = loadSession(); // Reload session to have the latest transcript

            try {
                const mentorResult = await processMentorAnswer({
                    question: session.mentorQuestion || '어르신의 경험을 말씀해 주세요.',
                    transcript: currentTranscript, // Use the UI value for the API call
                    selectedMatch: session.match ? session.match.selected : null
                });

                if (mentorResult && mentorResult.ok) {
                    updateSession({ mentorResult: mentorResult.data });
                    const letterText = document.getElementById('letterText');
                    if (letterText && mentorResult.data.letter) {
                        letterText.innerText = mentorResult.data.letter;
                    }
                } else {
                  // Handle AI processing failure
                  alert(mentorResult?.error?.message || '답변 처리 중 오류가 발생했습니다.');
                }
            } catch (err) {
                console.error("어르신 답변 제출 오류:", err);
                alert('답변 제출 중 심각한 오류가 발생했습니다.');
            }

            if (questionSection) questionSection.classList.add('hidden');
            if (recordSection) recordSection.classList.add('hidden');
            if (thankYouSection) thankYouSection.classList.remove('hidden');
        });
    }

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

    if (seniorHomeCompleteBtn) {
        seniorHomeCompleteBtn.addEventListener('click', () => window.location.href = 'index.html');
    }
});