// stt.js

let recognition = null;

/**
 * Web Speech API 지원 여부 확인
 */
export function isSpeechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * 음성 인식 시작
 */
export function startSpeechRecognition({
  onStart,
  onInterimResult,
  onFinalResult,
  onError,
  onEnd,
}) {
  const transcriptInput = document.getElementById("transcriptInput") || document.getElementById("stt-text-content");
  const errorMsgContainer = document.getElementById("stt-error-msg") || document.getElementById("status-label");

  // 미지원 브라우저 처리
  if (!isSpeechRecognitionSupported()) {
    showFallbackUI("음성 인식을 사용할 수 없습니다.\n아래 칸에 경험을 직접 입력해 주세요.", transcriptInput, errorMsgContainer);
    if (onError) onError(new Error("Speech recognition not supported"));
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "ko-KR";

  let finalTranscript = "";

  recognition.onstart = () => {
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcriptText = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcriptText;
        if (onFinalResult) onFinalResult(finalTranscript);
      } else {
        interimTranscript += transcriptText;
        if (onInterimResult) onInterimResult(interimTranscript);
      }
    }
  };

  recognition.onerror = (event) => {
    console.error("[STT Error]:", event.error);
    showFallbackUI("음성 인식을 사용할 수 없습니다.\n아래 칸에 경험을 직접 입력해 주세요.", transcriptInput, errorMsgContainer);
    if (onError) onError(event);
  };

  recognition.onend = () => {
    if (onEnd) onEnd(finalTranscript);
  };

  try {
    recognition.start();
  } catch (err) {
    showFallbackUI("음성 인식을 사용할 수 없습니다.\n아래 칸에 경험을 직접 입력해 주세요.", transcriptInput, errorMsgContainer);
    if (onError) onError(err);
  }

  return recognition;
}

/**
 * 음성 인식 종료
 */
export function stopSpeechRecognition() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}

/**
 * 실패 및 미지원 시 대체 입력 활성화 UI 헬퍼
 */
function showFallbackUI(message, transcriptInput, errorContainer) {
  if (errorContainer) {
    errorContainer.innerText = message;
    errorContainer.classList.remove("hidden");
  } else {
    alert(message);
  }

  if (transcriptInput) {
    transcriptInput.disabled = false;
    transcriptInput.readOnly = false;
    transcriptInput.focus();
    if (transcriptInput.tagName === "TEXTAREA" || transcriptInput.tagName === "INPUT") {
      transcriptInput.placeholder = "이곳에 경험을 직접 입력해 주세요...";
    }
  }
}