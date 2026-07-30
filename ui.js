// ui.js

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
  clearSession
} from "./storage.js";

import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  stopSpeechRecognition
} from "./stt.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM 존재 여부에 따른 페이지 초기화
  if (document.getElementById("pregnancy-input") || document.getElementById("step1-section")) {
    initializePregnantPage();
  }

  if (document.getElementById("record-section") || document.getElementById("mic-btn")) {
    initializeSeniorPage();
  }

  if (document.getElementById("question-list-section") || document.getElementById("mypage-reaction-text")) {
    initializeMyPage();
  }
});

/* ==========================================
   1. 임산부 흐름 (Pregnant Flow)
   ========================================== */
function initializePregnantPage() {
  const submitBtn = document.getElementById("submit-question-btn");
  const clarificationSubmitBtn = document.getElementById("submit-clarification-btn");

  if (submitBtn) {
    submitBtn.addEventListener("click", handleConcernSubmit);
  }

  if (clarificationSubmitBtn) {
    clarificationSubmitBtn.addEventListener("click", handleClarificationSubmit);
  }

  setupFeedbackButtons();
}

async function handleConcernSubmit() {
  const pregnancyInput = document.getElementById("pregnancy-input");
  const concernText = pregnancyInput ? pregnancyInput.value.trim() : "";

  if (!concernText) {
    alert("고민 내용을 입력해 주세요.");
    return;
  }

  updateSession({ concernText, clarificationHistory: [] });
  showLoading(true);

  try {
    const session = loadSession();
    const concernResult = await analyzeConcern({
      text: session.concernText,
      history: session.clarificationHistory,
    });

    showLoading(false);

    if (!concernResult || !concernResult.data) {
      renderAiError("분석 결과를 불러올 수 없습니다.");
      return;
    }

    const { status, analysis, question } = concernResult.data;

    if (status === "CLARIFICATION") {
      // 추가 질문 유도 UI
      renderClarificationQuestion(question);
    } else if (status === "IN_SCOPE") {
      updateSession({ analysis });
      renderConcernAnalysis(analysis);

      // 매칭 수행
      showLoading(true);
      const matchResult = await matchExperience({ analysis });
      showLoading(false);

      if (matchResult && matchResult.data) {
        updateSession({ match: matchResult.data });
        renderMatchResult(matchResult.data);
      }
    } else {
      renderAiError("입력하신 내용은 서비스 제공 범위를 벗어났습니다.");
    }
  } catch (error) {
    showLoading(false);
    renderAiError(error.message || "오류가 발생했습니다.");
  }
}

async function handleClarificationSubmit() {
  const clarificationInput = document.getElementById("clarification-input");
  const answerText = clarificationInput ? clarificationInput.value.trim() : "";

  if (!answerText) return;

  const session = loadSession();
  const updatedHistory = [...session.clarificationHistory, { answer: answerText }];
  updateSession({ clarificationHistory: updatedHistory });

  handleConcernSubmit(); // 다시 분석 요청
}

function renderClarificationQuestion(question) {
  const clarificationBox = document.getElementById("clarification-section");
  const questionLabel = document.getElementById("clarification-question-label");

  if (clarificationBox && questionLabel) {
    questionLabel.innerText = question;
    clarificationBox.classList.remove("hidden");
  }
}

function renderConcernAnalysis(analysis) {
  const summaryElem = document.getElementById("analysis-summary");
  if (summaryElem && analysis) {
    summaryElem.innerText = analysis.summary || "";
  }
}

function renderMatchResult(matchResult) {
  const container = document.querySelector(".experience-card-list");
  const recommendedSection = document.getElementById("recommended-card-section");

  if (!container) return;
  container.innerHTML = "";

  const selected = matchResult.selected || matchResult;
  if (!selected) {
    container.innerHTML = "<p>연결된 멘토 경험이 없습니다.</p>";
    return;
  }

  const card = document.createElement("div");
  card.className = "experience-card";
  card.innerHTML = `
    <div class="mentor-info">
      <strong>${selected.mentorName || "지혜 멘토"}</strong>
    </div>
    <p class="summary">"${selected.summary || selected.letterPreview || ""}"</p>
    <button class="button secondary-btn view-letter-btn">이 어르신의 경험 편지 읽기</button>
  `;

  card.querySelector(".view-letter-btn").addEventListener("click", () => {
    const letterDetailSection = document.getElementById("letter-detail-section");
    const aiLetterContent = document.getElementById("ai-letter-content");
    if (aiLetterContent) {
      aiLetterContent.innerText = selected.letter || selected.summary;
    }
    if (recommendedSection) recommendedSection.classList.add("hidden");
    if (letterDetailSection) letterDetailSection.classList.remove("hidden");
  });

  container.appendChild(card);
  if (recommendedSection) recommendedSection.classList.remove("hidden");
}

function renderAiError(error) {
  alert(`[AI 안내] ${typeof error === "string" ? error : "요청 처리 중 오류가 발생했습니다."}`);
}

/* ==========================================
   2. 어르신 흐름 (Senior Flow)
   ========================================== */
function initializeSeniorPage() {
  const session = loadSession();
  const questionDisplay = document.getElementById("mentor-question-display");

  if (questionDisplay && session.mentorQuestion) {
    questionDisplay.innerText = session.mentorQuestion;
  }

  const micBtn = document.getElementById("mic-btn");
  if (micBtn) {
    micBtn.addEventListener("click", () => {
      const isRecording = micBtn.classList.contains("recording");
      if (!isRecording) {
        handleRecordStart();
      } else {
        handleRecordStop();
      }
    });
  }

  const sendBtn = document.getElementById("send-experience-btn");
  if (sendBtn) {
    sendBtn.addEventListener("click", handleMentorAnswerSubmit);
  }
}

function handleRecordStart() {
  const micBtn = document.getElementById("mic-btn");
  const statusLabel = document.getElementById("status-label");
  const transcriptInput = document.getElementById("transcriptInput") || document.getElementById("stt-text-content");

  if (micBtn) micBtn.classList.add("recording");
  if (statusLabel) statusLabel.innerText = "말씀을 듣고 있습니다...";

  startSpeechRecognition({
    onStart: () => {},
    onInterimResult: (text) => {
      if (transcriptInput) {
        if (transcriptInput.tagName === "TEXTAREA" || transcriptInput.tagName === "INPUT") {
          transcriptInput.value = text;
        } else {
          transcriptInput.innerText = text;
        }
      }
    },
    onFinalResult: (text) => {
      updateSession({ transcript: text });
      if (transcriptInput) {
        if (transcriptInput.tagName === "TEXTAREA" || transcriptInput.tagName === "INPUT") {
          transcriptInput.value = text;
        } else {
          transcriptInput.innerText = text;
        }
      }
    },
    onError: (err) => {
      if (micBtn) micBtn.classList.remove("recording");
    },
    onEnd: () => {
      if (micBtn) micBtn.classList.remove("recording");
    }
  });
}

function handleRecordStop() {
  const micBtn = document.getElementById("mic-btn");
  if (micBtn) micBtn.classList.remove("recording");
  stopSpeechRecognition();
}

async function handleMentorAnswerSubmit() {
  const transcriptInput = document.getElementById("transcriptInput") || document.getElementById("stt-text-content");
  const transcript = transcriptInput ? (transcriptInput.value || transcriptInput.innerText).trim() : "";

  if (!transcript) {
    alert("경험 내용을 입력하거나 음성으로 말씀해 주세요.");
    return;
  }

  updateSession({ transcript });
  const session = loadSession();

  showLoading(true);
  try {
    const mentorResult = await processMentorAnswer({
      question: session.mentorQuestion || "어르신의 소중한 경험을 나누어 주세요.",
      transcript: session.transcript,
      selectedMatch: session.match ? session.match.selected : null,
    });

    showLoading(false);

    if (mentorResult && mentorResult.data) {
      updateSession({ mentorResult: mentorResult.data });
      renderMentorResult(mentorResult.data);
    }
  } catch (error) {
    showLoading(false);
    alert(`[처리 오류] ${error.message}`);
  }
}

function renderMentorResult(result) {
  const thankYouSection = document.getElementById("thank-you-section");
  const recordSection = document.getElementById("record-section");
  const letterPreview = document.getElementById("generated-letter-preview");

  if (letterPreview) {
    letterPreview.innerText = result.letter || result.summary || "";
  }

  if (recordSection) recordSection.classList.add("hidden");
  if (thankYouSection) thankYouSection.classList.remove("hidden");
}

/* ==========================================
   3. 감사 반응 흐름 (Impact Feedback)
   ========================================== */
function setupFeedbackButtons() {
  const thankBtns = document.querySelectorAll(".thank-btn");
  thankBtns.forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const reaction = e.target.textContent.trim();
      const session = loadSession();

      try {
        const feedbackResult = await createImpactFeedback({
          reaction,
          concernSummary: session.analysis ? session.analysis.summary : "",
          selectedMatch: session.match ? session.match.selected : null,
        });

        if (feedbackResult && feedbackResult.data) {
          updateSession({ feedback: feedbackResult.data });
        }
      } catch (err) {
        console.error("피드백 생성 오류:", err);
      }
    });
  });
}

/* ==========================================
   4. 마이페이지 연동 (MyPage)
   ========================================== */
function initializeMyPage() {
  const session = loadSession();
  const questionListSection = document.getElementById("question-list-section");
  const mypageReactionText = document.getElementById("mypage-reaction-text");

  if (questionListSection && session.concernText) {
    questionListSection.innerHTML = `
      <div class="history-item">
        <div class="item-header">
          <span class="item-tag">#내고민기록</span>
        </div>
        <p class="item-content">"${session.concernText}"</p>
      </div>
    `;
  }

  if (mypageReactionText && session.feedback) {
    mypageReactionText.innerText = typeof session.feedback === "string" 
      ? session.feedback 
      : (session.feedback.message || JSON.stringify(session.feedback));
    mypageReactionText.classList.add("active");
  }
}

/* 헬퍼 함수: 로딩 표시 */
function showLoading(isLoading) {
  const loadingElem = document.getElementById("ai-analyzing-loading");
  if (loadingElem) {
    if (isLoading) loadingElem.classList.remove("hidden");
    else loadingElem.classList.add("hidden");
  }
}