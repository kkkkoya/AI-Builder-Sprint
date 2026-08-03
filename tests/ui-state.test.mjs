import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ANALYZING 상태는 새로고침 후 저장된 고민으로 재실행된다", async () => {
  const ui = await readProjectFile("ui.js");
  assert.match(ui, /restoredPregnantSession\.currentStep === 'ANALYZING'/);
  assert.match(ui, /handleConcernAnalysis\(\s*restoredPregnantSession\.concernText/);
  assert.match(ui, /concernAnalysisInFlight/);
});

test("로그아웃은 계정 정보만 지우고 질문 세션은 보존한다", async () => {
  const ui = await readProjectFile("ui.js");
  assert.doesNotMatch(ui, /localStorage\.clear\(\)/);
  assert.match(ui, /'isRegistered'[\s\S]*'userRole'[\s\S]*localStorage\.removeItem/);
});

test("추가 질문 신호와 답변 이력을 안전하게 이어서 처리한다", async () => {
  const ui = await readProjectFile("ui.js");
  assert.match(ui, /route === 'CLARIFICATION' \|\| needsClarification === true/);
  assert.match(ui, /clarifyingQuestion: nextClarifyingQuestion/);
  assert.match(ui, /Array\.isArray\(session\.clarificationHistory\)/);
  assert.match(ui, /await handleConcernAnalysis\(session\.concernText, newHistory\)/);
});

test("기존 감사 기록도 임산부 반응을 우선 표시하고 과장 문장을 숨긴다", async () => {
  const ui = await readProjectFile("ui.js");
  assert.match(ui, /function getFeedbackDisplayMessage\(feedback, reaction = ''\)/);
  assert.match(ui, /getFeedbackDisplayMessage\(question\.feedback, question\.feedbackReaction\)/);
  assert.match(ui, /해소\|해결되\|극복\|회복/);
  assert.match(ui, /이용자가 선생님의 경험을 읽고 감사의 마음을 전했습니다/);
});

test("로그인은 현재 브라우저 탭에서만 유지되고 새 탭에서는 초기화된다", async () => {
  const ui = await readProjectFile("ui.js");
  assert.match(ui, /const LOGIN_SESSION_KEY = 'eobom_demo_login_active'/);
  assert.match(ui, /sessionStorage\.setItem\(LOGIN_SESSION_KEY, 'true'\)/);
  assert.match(ui, /if \(!hasActiveBrowserLogin\)[\s\S]*clearLoginState\(\{ clearScreen: true \}\)/);
  assert.match(ui, /\['pregnant\.html', 'senior\.html', 'mypage\.html'\][\s\S]*window\.location\.replace\('index\.html'\)/);
});

test("새 고민과 새 이야기는 이전 답변 및 녹음 데이터를 초기화한다", async () => {
  const ui = await readProjectFile("ui.js");
  const resetFields = [
    "transcript: ''",
    "audioUrl: ''",
    "mentorResult: null",
    "mentorDraftResult: null",
    "temporaryMentorTranscript: ''",
  ];
  resetFields.forEach(field => assert.match(ui, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
  assert.ok((ui.match(/transcript: ''/g) || []).length >= 2);
});

test("프로필 오디오와 하위 페이지 프로필 버튼을 표시하는 코드가 있다", async () => {
  const ui = await readProjectFile("ui.js");
  assert.match(ui, /closest\('\.audio-container'\)\?\.classList\.remove\('hidden'\)/);
  assert.match(ui, /if \(isRegistered && hasRequiredProfile\)[\s\S]*mainProfileBtn\.classList\.remove\('hidden'\)/);
});

test("질문 없는 어르신 제출을 차단하고 도착 알림을 안내한다", async () => {
  const [ui, seniorHtml, demo] = await Promise.all([
    readProjectFile("ui.js"),
    readProjectFile("senior.html"),
    readProjectFile("DEMO.md"),
  ]);
  assert.match(ui, /if \(!currentQuestion\)/);
  assert.match(ui, /아직 도착한 고민이 없어요/);
  assert.match(seniorHtml, /도착한 질문이 있으면 알려드릴게요/);
  assert.match(demo, /서로 다른 기기나 브라우저 사이의 실제 전달 기능은 아직 구현되지 않았습니다/);
});

test("어르신 화면은 AI 고민 요약을 보여주고 여러 질문 중 하나를 선택한다", async () => {
  const ui = await readProjectFile("ui.js");
  assert.match(ui, /question\?\.analysis\?\.summary \|\| question\?\.originalConcern/);
  assert.match(ui, /concernLabel\.textContent = '정리된 고민'/);
  assert.match(ui, /questionLabel\.textContent = '어르신께 드리는 질문'/);
  assert.match(ui, /pendingDemoQuestions\.length === 1/);
  assert.match(ui, /답변하고 싶은 고민을 골라 주세요/);
  assert.match(ui, /button\.addEventListener\('click',[\s\S]*selectSeniorQuestion\(question\)/);
});

test("어르신 프로필에는 질문 알림 숫자를 표시하지 않는다", async () => {
  const ui = await readProjectFile("ui.js");
  assert.match(ui, /const count = role === 'pregnant'[\s\S]*: 0;/);
  assert.doesNotMatch(ui, /role === 'senior'[\s\S]*getUnreadNotificationCount/);
});

test("정리된 경험 키워드는 해시 태그 칩으로 표시한다", async () => {
  const [ui, seniorHtml, style] = await Promise.all([
    readProjectFile("ui.js"),
    readProjectFile("senior.html"),
    readProjectFile("style.css"),
  ]);
  assert.match(ui, /chip\.className = 'tag experience-keyword-chip'/);
  assert.match(ui, /chip\.textContent = `#\$\{tag\}`/);
  assert.match(seniorHtml, /경험 키워드/);
  assert.match(style, /\.experience-keyword-list[\s\S]*flex-wrap: wrap/);
  assert.match(style, /\.experience-keyword-chip[\s\S]*border-radius: 999px/);
});

test("마이페이지는 누적 고민과 답변 배열을 최신순으로 렌더링한다", async () => {
  const [ui, mypage] = await Promise.all([
    readProjectFile("ui.js"),
    readProjectFile("mypage.html"),
  ]);
  assert.match(ui, /session\.concernHistory[\s\S]*\.reverse\(\)/);
  assert.match(ui, /session\.mentorAnswerHistory\.filter/);
  assert.match(ui, /answers\.forEach\(answer/);
  assert.match(mypage, /id="pregnant-history-records"/);
  assert.match(mypage, /id="senior-history-records"/);
});
