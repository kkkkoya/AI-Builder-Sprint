// stt.js

// 1. 브라우저가 음성 인식을 지원하는지 확인합니다.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; // 한 번 말씀하시고 쉬면 자동으로 녹음 종료
    recognition.lang = 'ko-KR'; // 한국어 설정
    recognition.interimResults = false; // 중간 과정은 무시하고 최종 완성된 문장만 가져옴
} else {
    console.error("이 브라우저는 음성 인식을 지원하지 않습니다. 크롬(Chrome)을 사용해주세요.");
}

// 2. 녹음을 시작하고, 결과 글자를 우리 프로그램으로 전달하는 함수
function startRecording(onResultCallback) {
    if (!recognition) {
        alert("음성 인식이 지원되지 않는 브라우저입니다. 크롬(Chrome)을 사용해주세요!");
        return;
    }

    // 마이크 녹음 시작
    recognition.start();
    console.log("마이크 녹음이 시작되었습니다...");

    // 3. 어르신이 말씀을 끝내고 음성 인식이 성공적으로 완료되었을 때
    recognition.onresult = function(event) {
        // 변환된 텍스트(글자)를 추출합니다.
        const transcript = event.results[0][0].transcript;
        console.log("인식된 음성:", transcript);
        
        // 추출한 글자를 결과 처리 함수(콜백)로 넘겨줍니다.
        onResultCallback(transcript);
    };

    // 4. 에러가 발생했을 때
    recognition.onerror = function(event) {
        console.error("음성 인식 에러 발생:", event.error);
        alert("마이크 연결을 확인하거나 다시 시도해주세요.");
    };
}