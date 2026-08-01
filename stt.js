// stt.js

let recognition = null;
let mediaRecorder = null;
let audioChunks = [];

/**
 * Web Speech API 지원 여부 확인
 */
export function isRecordingSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.SpeechRecognition || window.webkitSpeechRecognition) && window.MediaRecorder);
}

/**
 * 음성 녹음 및 텍스트 변환 시작
 */
export async function startRecordingAndTranscription({
  onStart,
  onInterimResult,
  onFinalResult,
  onError,
}) {
  if (!isRecordingSupported()) {
    const err = new Error("Recording APIs not supported");
    if (onError) onError(err);
    return null;
  }

  // 1. Get audio stream
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error("[Recorder] Error getting media stream:", err);
    if (onError) onError(err);
    return;
  }

  // 2. Setup MediaRecorder
  audioChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = event => {
    audioChunks.push(event.data);
  };
  
  // 3. Setup SpeechRecognition
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
    if (onError) onError(event);
  };

  // 4. Start both
  mediaRecorder.start();
  recognition.start();

  // Return a function to stop the recording
  return function stopRecordingAndTranscription() {
    return new Promise((resolve, reject) => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result;
            // Clean up stream
            stream.getTracks().forEach(track => track.stop());
            mediaRecorder = null;
            resolve({
              transcript: finalTranscript,
              audioDataUrl: base64data
            });
          };
          reader.onerror = (err) => {
             stream.getTracks().forEach(track => track.stop());
             reject(err);
          };
        };
        recognition.stop();
        mediaRecorder.stop();
        recognition = null;
      } else {
        resolve({
          transcript: finalTranscript,
          audioDataUrl: null
        });
      }
    });
  };
}
