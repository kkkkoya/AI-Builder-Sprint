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

    function setText(id, value, fallback = '') {
        const element = document.getElementById(id);
        if (!element) return;

        const text = typeof value === 'string' ? value.trim() : '';
        element.textContent = text || fallback;
    }

    function replaceTextItems(id, values, itemTag = 'p') {
        const container = document.getElementById(id);
        if (!container) return;

        container.replaceChildren();

        (Array.isArray(values) ? values : [])
            .filter(value => typeof value === 'string' && value.trim())
            .forEach(value => {
                const item = document.createElement(itemTag);
                item.textContent = value.trim();
                container.appendChild(item);
            });
    }

    function renderAnalysis() {
        // Analysis is stored for matching only and is not rendered to the user.
    }

    function renderMatch(match) {
        const selected = match?.selected;
        const list = document.getElementById('experience-card-list');
        if (!list) return;

        list.replaceChildren();
        if (!selected) return;
        const card = document.createElement('div');
        card.className = 'experience-card';
        const mentor = document.createElement('div');
        mentor.className = 'mentor-info';
        const mentorName = document.createElement('strong');
        mentorName.textContent = `${selected.mentorName || '멘토'} 멘토`;
        mentor.appendChild(mentorName);
        if (selected.mentorAge) {
            const age = document.createElement('span');
            age.className = 'age';
            age.textContent = ` (${selected.mentorAge}세)`;
            mentor.appendChild(age);
        }
        const summary = document.createElement('p');
        summary.className = 'summary';
        summary.textContent = selected.summary || selected.experienceTitle || '';
        const openLetter = document.createElement('button');
        openLetter.type = 'button';
        openLetter.className = 'button secondary-btn';
        openLetter.textContent = '멘토의 경험 편지 읽기';
        openLetter.addEventListener('click', () => {
            updateSession({ currentStep: 'WAITING_FOR_MENTOR' });
            document.getElementById('recommended-card-section')?.classList.add('hidden');
            document.getElementById('letter-detail-section')?.classList.remove('hidden');
        });
        card.append(mentor, summary, openLetter);
        list.appendChild(card);
        setText('letter-mentor-title', selected.mentorName ? selected.mentorName + ' 멘토님의 경험 편지' : '');
        setText('receivedLetterText', selected.letter || '');
        const issueTags = document.getElementById('issue-tags');
        if (issueTags) {
            issueTags.replaceChildren();
            (selected.tags || []).forEach(tag => {
                const chip = document.createElement('span');
                chip.className = 'tag';
                chip.textContent = '#' + tag;
                issueTags.appendChild(chip);
            });
        }
        const tags = document.getElementById('letter-tags');
        if (tags) {
            tags.replaceChildren();
            (selected.tags || []).forEach(tag => {
                const chip = document.createElement('span');
                chip.className = 'tag';
                chip.textContent = `#${tag}`;
                tags.appendChild(chip);
            });
        }
        const audioContainer = document.getElementById('letter-audio-container');
        const audioPlayer = document.getElementById('audio-player');
        if (audioPlayer && selected.audioUrl) {
            audioPlayer.src = selected.audioUrl;
            audioContainer?.classList.remove('hidden');
        } else {
            audioContainer?.classList.add('hidden');
        }
        const safety = document.getElementById('receivedSafetyNotice');
        if (safety) safety.textContent = [selected.safety?.guidance, ...(selected.safety?.flags || [])].filter(Boolean).join(' ');
    }
    function renderMentorResult(result) {
        if (!result) return;

        setText('experienceResultTitle', result.experienceCard?.title || '경험 이야기');
        setText('experienceResultSummary', result.experienceCard?.summary || '');
        setText('receivedLetterText', result.letter || '');
        setText('letterText', result.letter || '');
        replaceTextItems('editList', result.edits || [], 'li');
        replaceTextItems('experienceTags', result.experienceCard?.standardTags || []);

        const safetyText = [
            result.safety?.guidance,
            ...(result.safety?.flags || []),
            ...(result.fidelity?.warnings || []),
        ].filter(Boolean).join(' ');

        setText('safetyBox', safetyText);

        const safetyNotice = document.getElementById('receivedSafetyNotice');
        if (safetyNotice) {
            safetyNotice.textContent = safetyText;
        }

        const resultSection = document.getElementById('letterResultSection');
        if (resultSection) resultSection.classList.remove('hidden');
    }

    function renderFeedback(feedback) {
        if (!feedback) return;

        setText('impactMessage', feedback.message || feedback.impactSummary || '');
        setText('senior-received-reaction', feedback.message || feedback.impactSummary || '');
    }

    const initialSession = loadSession();
    renderAnalysis(initialSession.analysis);
    renderMatch(initialSession.match);
    renderMentorResult(initialSession.mentorDraftResult || initialSession.mentorResult);
    renderFeedback(initialSession.feedback);

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

    function requestRequiredField(message, input) {
        alert(message);
        input?.focus();
    }

    function isValidAge(value) {
        const age = Number(value);
        return Number.isInteger(age) && age >= 1 && age <= 120;
    }

    function checkRegistrationStatus() {
        const isRegistered = localStorage.getItem('isRegistered') === 'true';
        const userRole = localStorage.getItem('userRole');

        const hasRequiredProfile = userRole === 'pregnant'
            ? Boolean(localStorage.getItem('userName')?.trim() && localStorage.getItem('userStatus')?.trim())
            : userRole === 'senior'
                ? Boolean(localStorage.getItem('seniorName')?.trim() && isValidAge(localStorage.getItem('seniorAge')))
                : false;

        if (isRegistered && !hasRequiredProfile) {
            localStorage.removeItem('isRegistered');
            return;
        }

        if (isRegistered && hasRequiredProfile && mainHeroStep) {
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
                const name = localStorage.getItem('seniorName') || '어르신';
                const age = localStorage.getItem('seniorAge') || '';
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
            const name = nameInput?.value.trim() || '';
            const status = statusInput?.value.trim() || '';

            if (!name) {
                requestRequiredField('이름 또는 닉네임을 입력해 주세요.', nameInput);
                return;
            }

            if (!status) {
                requestRequiredField('현재 임신 주기를 선택해 주세요.', statusInput);
                return;
            }

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
            const name = nameInput?.value.trim() || '';
            const age = ageInput?.value.trim() || '';

            if (!name) {
                requestRequiredField('성함을 입력해 주세요.', nameInput);
                return;
            }

            if (!age) {
                requestRequiredField('나이를 입력해 주세요.', ageInput);
                return;
            }

            if (!isValidAge(age)) {
                requestRequiredField('나이는 1세부터 120세 사이의 정수로 입력해 주세요.', ageInput);
                return;
            }

            const selectedTags = [
                ...document.querySelectorAll('.chip-btn.active')
            ]
                .map(button => button.dataset.tag)
                .filter(Boolean);

            localStorage.setItem('isRegistered', 'true');
            localStorage.setItem('seniorName', name);
            localStorage.setItem('seniorAge', age);
            localStorage.setItem(
                'seniorExperienceTags',
                JSON.stringify(selectedTags)
            );
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
    const audioPlayers = document.querySelectorAll('audio');
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
            const name = localStorage.getItem('seniorName') || '어르신';
            const age = localStorage.getItem('seniorAge') || '';

            if (profileUserAvatar) profileUserAvatar.textContent = '👵';
            profileUserName.textContent = `${name} 멘토님`;
            if (profileUserDetail) profileUserDetail.textContent = age ? '연령: ' + age + '세' : '';

            if (seniorHistoryView) seniorHistoryView.classList.remove('hidden');
            if (pregnantHistoryView) pregnantHistoryView.classList.add('hidden');

            // 오디오 및 AI 결과 표시
            if (session.audioUrl) {
                audioPlayers.forEach(player => {
                    player.src = session.audioUrl;
                });
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

    // Profile cards show user-facing records only; raw AI analysis is never rendered here.
    function renderProfileHistory() {
        if (!profileUserName) return;

        const session = loadSession();
        const isPregnant = (localStorage.getItem('userRole') || 'pregnant') === 'pregnant';
        const toggle = (element, visible) => element?.classList.toggle('hidden', !visible);

        if (isPregnant) {
            const empty = document.getElementById('pregnant-empty-state');
            const item = document.getElementById('pregnant-history-item');
            const concern = document.getElementById('mypage-user-concern');
            const answerBox = item?.querySelector('.matched-answer-box');
            const selected = session.match?.selected;
            toggle(empty, !session.concernText);
            toggle(item, Boolean(session.concernText));
            if (!session.concernText) return;
            if (concern) concern.textContent = `"${session.concernText}"`;
            toggle(answerBox, Boolean(selected));

            let status = document.getElementById('profile-match-status');
            if (!status && item) {
                status = document.createElement('p');
                status.id = 'profile-match-status';
                status.className = 'empty-sub';
                item.appendChild(status);
            }
            if (!selected) {
                if (status) status.textContent = '아직 전달된 경험이 없어요.';
                return;
            }
            if (status) status.remove();
            document.getElementById('profile-fallback-wisdom')?.remove();
            const label = answerBox?.querySelector('.mentor-label');
            const letter = answerBox?.querySelector('.answer-text');
            const audio = answerBox?.querySelector('audio');
            if (label) label.textContent = selected.mentorName ? '💌 ' + selected.mentorName + ' 멘토님의 답변' : '';
            if (letter) letter.textContent = session.mentorResult?.letter || selected.letter || '';
            if (audio && selected.audioUrl) {
                audio.src = selected.audioUrl;
            } else if (audio && 'speechSynthesis' in window) {
                const container = audio.closest('.audio-container');
                let speakButton = container?.querySelector('.mentor-speech-button');
                if (!speakButton && container) {
                    speakButton = document.createElement('button');
                    speakButton.type = 'button';
                    speakButton.className = 'button secondary-btn mentor-speech-button';
                    speakButton.textContent = '답변 음성으로 듣기';
                    container.appendChild(speakButton);
                }
                if (speakButton) {
                    speakButton.onclick = () => {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(session.mentorResult?.letter || selected.letter || '');
                        utterance.lang = 'ko-KR';
                        window.speechSynthesis.speak(utterance);
                    };
                }
            }
        } else {
            const empty = document.getElementById('senior-empty-state');
            const item = document.getElementById('senior-history-item');
            const hasRecord = Boolean(session.transcript);
            toggle(empty, !hasRecord);
            toggle(item, hasRecord);
            if (!hasRecord) return;
            setText('mypage-answered-summary', session.match?.selected?.experienceTitle || session.mentorQuestion || '');
            setText('mypage-stt-text', `"${session.transcript}"`);
            const audio = item?.querySelector('audio');
            if (audio && session.audioUrl) audio.src = session.audioUrl;
            setText('senior-received-reaction', session.feedback?.message || '감사 메시지가 도착하면 이곳에서 확인할 수 있어요.');
        }
    }

    renderProfileHistory();
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

    function hideAllPregnantSections() {
        [step1Section, loadingSection, clarificationSection, recommendedSection, letterDetailSection]
            .forEach(section => section?.classList.add('hidden'));
    }

    function restorePregnantStep(session) {
        if (!step1Section) return;

        hideAllPregnantSections();
        const step = session.currentStep || 'INPUT';

        if (step === 'ANALYZING') {
            loadingSection?.classList.remove('hidden');
        } else if (step === 'CLARIFICATION') {
            if (clarificationQuestionElem) {
                clarificationQuestionElem.textContent = session.clarifyingQuestion || '';
            }
            clarificationSection?.classList.remove('hidden');
        } else if (step === 'RECOMMENDED') {
            recommendedSection?.classList.remove('hidden');
        } else if (step === 'LETTER' || step === 'WAITING_FOR_MENTOR' || step === 'MENTOR_RESULT') {
            letterDetailSection?.classList.remove('hidden');
        } else if (step === 'FEEDBACK_COMPLETE') {
            letterDetailSection?.classList.remove('hidden');
            thankCompleteMsg?.classList.remove('hidden');
        } else {
            step1Section?.classList.remove('hidden');
        }
    }

    restorePregnantStep(loadSession());
    async function handleConcernAnalysis(content, history) {
        if (step1Section) step1Section.classList.add('hidden');
        if (clarificationSection) clarificationSection.classList.add('hidden');
        if (loadingSection) loadingSection.classList.remove('hidden');

        try {
            updateSession({ concernText: content, clarificationHistory: history, currentStep: 'ANALYZING' });
            
            const concernResult = await analyzeConcern({ text: content, history: history });

            if (concernResult && concernResult.ok) {
                const { route, analysis, clarifyingQuestion, response } = concernResult.data;

                if (route === 'CLARIFICATION') {
                    updateSession({ currentStep: 'CLARIFICATION', clarifyingQuestion: clarifyingQuestion || '' });
                    if (loadingSection) loadingSection.classList.add('hidden');
                    if (clarificationQuestionElem) clarificationQuestionElem.innerText = clarifyingQuestion || '구체적인 고민 내용을 조금 더 들려주시겠어요?';
                    if (clarificationInput) clarificationInput.value = '';
                    if (clarificationSection) clarificationSection.classList.remove('hidden');
                    return;
                }

                if (route === 'IN_SCOPE') {
                    updateSession({ analysis });
                    renderAnalysis(analysis);
                    
                    const matchResult = await matchExperience({ analysis });
                    if (loadingSection) loadingSection.classList.add('hidden');

                    if (matchResult && matchResult.ok) {
                        if (!matchResult.data.selected) {
                            updateSession({ currentStep: 'INPUT' });
                            alert("죄송합니다, 현재 고민과 연결할 수 있는 적절한 경험을 찾지 못했습니다. 고민 내용을 조금 더 자세하게 작성해 주시면 더 좋은 경험을 찾을 수 있습니다.");
                            if (loadingSection) loadingSection.classList.add('hidden');
                            if (step1Section) step1Section.classList.remove('hidden');
                            if (pregnancyInput) pregnancyInput.disabled = false;
                            if(submitBtn) submitBtn.disabled = false;
                            return;
                        }

                        updateSession({ match: matchResult.data, mentorQuestion: matchResult.data.mentorQuestion, currentStep: 'RECOMMENDED' });
                        renderMatch(matchResult.data);
                        const selected = matchResult.data.selected;

                        if (recommendedSection) recommendedSection.classList.remove('hidden');
                    } else {
                        alert('경험 추천을 불러오지 못했습니다.');
                        updateSession({ currentStep: 'INPUT' });
                        if (loadingSection) loadingSection.classList.add('hidden');
                        if (step1Section) step1Section.classList.remove('hidden');
                        if (pregnancyInput) pregnancyInput.disabled = false;
                        if(submitBtn) submitBtn.disabled = false;
                    }
                } else {
                    if (loadingSection) loadingSection.classList.add('hidden');
                    alert(response || '입력하신 내용은 서비스 제공 범위를 벗어났습니다.');
                    updateSession({ currentStep: 'INPUT' });
                    if (step1Section) step1Section.classList.remove('hidden');
                    if (pregnancyInput) pregnancyInput.disabled = false;
                    if(submitBtn) submitBtn.disabled = false;
                }
            } else {
                if (loadingSection) loadingSection.classList.add('hidden');
                alert(concernResult?.error?.message || '고민 분석 중 오류가 발생했습니다.');
                updateSession({ currentStep: 'INPUT' });
                if (step1Section) step1Section.classList.remove('hidden');
                if (pregnancyInput) pregnancyInput.disabled = false;
                if(submitBtn) submitBtn.disabled = false;
            }
        } catch (err) {
            console.error('고민 처리 오류:', err);
            updateSession({ currentStep: 'INPUT' });
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
            updateSession({ currentStep: 'WAITING_FOR_MENTOR' });
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

            updateSession({
                concernText: '',
                clarificationHistory: [],
                analysis: null,
                match: null,
                mentorQuestion: '',
                feedback: null,
                currentStep: 'INPUT',
                clarifyingQuestion: '',
            });
        });
    }

    thankBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const thankText = e.target.textContent.trim();
            const reaction = e.target.getAttribute('data-reaction') || thankText;
            thankBtns.forEach(b => b.disabled = true);

            try {
                const session = loadSession();
                const feedbackResult = await createImpactFeedback({
                    reaction,
                    concernSummary: session.analysis ? session.analysis.summary : '',
                    selectedMatch: session.match ? session.match.selected : null
                });

                if (!feedbackResult?.ok) {
                    throw new Error(feedbackResult?.error?.message || '감사 메시지를 만들지 못했습니다.');
                }

                updateSession({ feedback: feedbackResult.data, currentStep: 'FEEDBACK_COMPLETE' });
                localStorage.setItem('userThankReactionText', thankText);
                renderFeedback(feedbackResult.data);
                if (thankCompleteMsg) thankCompleteMsg.classList.remove('hidden');
            } catch (err) {
                console.error("감사 전송 오류:", err);
                thankBtns.forEach(b => b.disabled = false);
                alert(err.message || '감사 메시지 전송에 실패했습니다.');
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
    const answerGuidance = document.getElementById('mentor-answer-guidance');
    const temporaryNotice = document.getElementById('mentor-temporary-notice');
    const retryMentorProcessingBtn = document.getElementById('retry-mentor-processing-btn');
    const editMentorResultBtn = document.getElementById('edit-mentor-result-btn');
    const finalizeMentorResultBtn = document.getElementById('finalize-mentor-result-btn');
    const letterResultSection = document.getElementById('letterResultSection');

    const sessionData = loadSession();
    const initialTranscriptInput = document.getElementById('transcriptInput');
    if (initialTranscriptInput && sessionData.transcript) {
        initialTranscriptInput.value = sessionData.transcript;
        sttResultBox?.classList.remove('hidden');
        sendExperienceBtn?.classList.remove('hidden');
    }
    const mentorQuestionText = document.getElementById('mentorQuestionText');
    const mentorEmptyState = document.getElementById('mentor-empty-state');
    const mentorQuestion = sessionData.mentorQuestion || sessionData.match?.mentorQuestion || '';
    if (mentorQuestionText) {
        mentorQuestionText.textContent = mentorQuestion ? `"${mentorQuestion}"` : '';
        mentorQuestionText.classList.toggle('hidden', !mentorQuestion);
    }
    if (mentorEmptyState) mentorEmptyState.classList.toggle('hidden', Boolean(mentorQuestion));

    function restoreSeniorStep(session) {
        if (!questionSection) return;

        const hasMentorResult =
            (session.currentStep === 'MENTOR_RESULT' || session.currentStep === 'FEEDBACK_COMPLETE') &&
            Boolean(session.mentorResult);
        const isReviewing = session.currentStep === 'MENTOR_REVIEW' && Boolean(session.mentorDraftResult);
        const isRetrying = session.currentStep === 'MENTOR_RETRY';

        questionSection.classList.toggle('hidden', hasMentorResult || isReviewing);
        recordSection?.classList.toggle('hidden', hasMentorResult || isReviewing);
        letterResultSection?.classList.toggle('hidden', !isReviewing);
        thankYouSection?.classList.toggle('hidden', !hasMentorResult);
        temporaryNotice?.classList.toggle('hidden', !isRetrying);
        retryMentorProcessingBtn?.classList.toggle('hidden', !isRetrying);
        if (isRetrying && temporaryNotice) {
            temporaryNotice.textContent = session.mentorProcessingNotice ||
                '말씀하신 내용은 잘 담아두었어요. 지금은 편지로 다듬는 데 잠시 어려움이 있어요. 잠시 후 다시 정리해 주세요.';
        }
    }

    restoreSeniorStep(sessionData);
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

    async function submitMentorTranscript() {
        const transcriptInput = document.getElementById('transcriptInput');
        const currentTranscript = transcriptInput ? transcriptInput.value.trim() : '';

        if (!currentTranscript) {
            alert('경험 내용을 말씀해 주세요!');
            return;
        }

        answerGuidance?.classList.add('hidden');
        temporaryNotice?.classList.add('hidden');
        retryMentorProcessingBtn?.classList.add('hidden');
        sendExperienceBtn?.setAttribute('disabled', '');
        updateSession({ transcript: currentTranscript });
        const session = loadSession();

        try {
            const mentorResult = await processMentorAnswer({
                question: session.mentorQuestion || '어르신의 경험을 말씀해 주세요.',
                transcript: currentTranscript,
                selectedMatch: session.match ? session.match.selected : null
            });

            if (!mentorResult?.ok) {
                throw new Error(mentorResult?.error?.message || '답변 처리 중 오류가 발생했습니다.');
            }

            const result = mentorResult.data;
            if (result.processingStatus === 'TEMPORARY_SAVED') {
                const notice = result.userMessage ||
                    '말씀하신 내용은 잘 담아두었어요. 지금은 편지로 다듬는 데 잠시 어려움이 있어요. 잠시 후 다시 정리해 주세요.';
                updateSession({
                    mentorResult: null,
                    mentorDraftResult: null,
                    temporaryMentorTranscript: currentTranscript,
                    mentorProcessingNotice: notice,
                    currentStep: 'MENTOR_RETRY'
                });
                if (temporaryNotice) temporaryNotice.textContent = notice;
                temporaryNotice?.classList.remove('hidden');
                retryMentorProcessingBtn?.classList.remove('hidden');
                return;
            }

            if (result.answerCheck?.status !== 'VALID') {
                updateSession({
                    mentorResult: null,
                    mentorDraftResult: null,
                    currentStep: 'MENTOR_EDITING'
                });
                answerGuidance?.classList.remove('hidden');
                sttResultBox?.classList.remove('hidden');
                sendExperienceBtn?.classList.remove('hidden');
                return;
            }

            if (result.processingStatus !== 'COMPLETED' || !result.experienceCard || !result.letter) {
                throw new Error('AI 정리 결과를 확인하지 못했습니다. 다시 시도해 주세요.');
            }

            updateSession({
                mentorResult: null,
                mentorDraftResult: result,
                temporaryMentorTranscript: '',
                mentorProcessingNotice: '',
                currentStep: 'MENTOR_REVIEW'
            });
            renderMentorResult(result);
            questionSection?.classList.add('hidden');
            recordSection?.classList.add('hidden');
            letterResultSection?.classList.remove('hidden');
            thankYouSection?.classList.add('hidden');
        } catch (err) {
            console.error("어르신 답변 제출 오류:", err);
            alert(err.message || '답변 처리 중 오류가 발생했습니다.');
        } finally {
            sendExperienceBtn?.removeAttribute('disabled');
        }
    }

    sendExperienceBtn?.addEventListener('click', submitMentorTranscript);
    retryMentorProcessingBtn?.addEventListener('click', submitMentorTranscript);

    editMentorResultBtn?.addEventListener('click', () => {
        letterResultSection?.classList.add('hidden');
        questionSection?.classList.remove('hidden');
        recordSection?.classList.remove('hidden');
        sttResultBox?.classList.remove('hidden');
        sendExperienceBtn?.classList.remove('hidden');
        updateSession({ mentorDraftResult: null, currentStep: 'MENTOR_EDITING' });
    });

    finalizeMentorResultBtn?.addEventListener('click', () => {
        const session = loadSession();
        if (!session.mentorDraftResult) return;
        updateSession({
            mentorResult: session.mentorDraftResult,
            mentorDraftResult: null,
            currentStep: 'MENTOR_RESULT'
        });
        letterResultSection?.classList.add('hidden');
        thankYouSection?.classList.remove('hidden');
    });

    if (seniorResetBtn) {
        seniorResetBtn.addEventListener('click', () => {
            if (sttResultBox) sttResultBox.classList.add('hidden');
            if (sendExperienceBtn) sendExperienceBtn.classList.add('hidden');
            if (micBtnLabel) micBtnLabel.textContent = '말씀 시작하기';
            if (thankYouSection) thankYouSection.classList.add('hidden');
            if (questionSection) questionSection.classList.remove('hidden');
            if (recordSection) recordSection.classList.remove('hidden');
            letterResultSection?.classList.add('hidden');
            answerGuidance?.classList.add('hidden');
            temporaryNotice?.classList.add('hidden');
            retryMentorProcessingBtn?.classList.add('hidden');
            updateSession({
                mentorResult: null,
                mentorDraftResult: null,
                temporaryMentorTranscript: '',
                mentorProcessingNotice: '',
                currentStep: 'WAITING_FOR_MENTOR'
            });
        });
    }

    if (seniorHomeCompleteBtn) {
        seniorHomeCompleteBtn.addEventListener('click', () => window.location.href = 'index.html');
    }
});
