import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

globalThis.localStorage = new MemoryStorage();

const db = await import('../demo-db.js');

const archive = {
  mentors: [
    { id: 'mentor-001', name: '김정희', age: 72, available: true },
    { id: 'mentor-002', name: '박영자', age: 68, available: true },
    { id: 'mentor-hidden', name: '비공개', age: 70, available: false },
  ],
};

function createQuestion(overrides = {}) {
  return db.createDemoQuestion({
    pregnantUserId: 'pregnant-1',
    pregnantName: '봄이',
    originalConcern: '출산 후 다시 일을 시작할 수 있을지 걱정돼요.',
    analysis: { summary: '경력 복귀에 관한 고민' },
    mentorQuestion: '아이를 키운 뒤 다시 일을 시작한 경험을 들려주세요.',
    mentorId: 'mentor-001',
    mentorName: '김정희',
    mentorAge: 72,
    experienceId: 'experience-001',
    matchedTags: ['경력 단절'],
    selectedMatch: { mentorId: 'mentor-001', experienceId: 'experience-001' },
    ...overrides,
  });
}

test.beforeEach(() => {
  localStorage.clear();
  db.initializeDemoDatabase(archive);
});

test('더미 멘토는 이름과 나이가 모두 일치할 때만 로그인 계정으로 확인된다', () => {
  assert.equal(db.findMentorAccount('김정희', '72')?.mentorId, 'mentor-001');
  assert.equal(db.findMentorAccount('김정희', '68'), null);
  assert.equal(db.findMentorAccount('없는 멘토', '72'), null);
  assert.equal(db.findMentorAccount('비공개', '70'), null);
});

test('같은 임산부 정보로 다시 로그인하면 동일한 pregnantUserId를 사용한다', () => {
  const first = db.getOrCreatePregnantUser('봄이', '임신 20주');
  const second = db.getOrCreatePregnantUser('봄이', '임신 20주');
  assert.equal(second.userId, first.userId);
});

test('질문은 mentorId와 pregnantUserId별로 분리되고 새로고침 가능한 저장소에 남는다', () => {
  const first = createQuestion();
  createQuestion({
    pregnantUserId: 'pregnant-2',
    pregnantName: '여름이',
    mentorId: 'mentor-002',
    mentorName: '박영자',
    mentorAge: 68,
    experienceId: 'experience-002',
    selectedMatch: { mentorId: 'mentor-002', experienceId: 'experience-002' },
  });

  assert.deepEqual(db.getPendingQuestionsForMentor('mentor-001').map(item => item.questionId), [first.questionId]);
  assert.equal(db.getPendingQuestionsForMentor('mentor-002').length, 1);
  assert.equal(db.getQuestionsForPregnant('pregnant-1').length, 1);
  assert.ok(localStorage.getItem(db.DEMO_DB_KEYS.messages)?.includes(first.questionId));
});

test('배정된 멘토만 한 번 답변할 수 있고 임산부 알림이 생성된다', () => {
  const question = createQuestion();
  const denied = db.saveDemoAnswer(question.questionId, 'mentor-002', {
    transcript: '다른 멘토의 답변',
    mentorResult: { letter: '저장되면 안 됨' },
  });
  assert.equal(denied, null);
  assert.equal(db.getQuestionById(question.questionId).status, 'pending');

  const answered = db.saveDemoAnswer(question.questionId, 'mentor-001', {
    transcript: '저도 아이를 낳은 뒤 일을 쉬었다가 다시 시작했습니다.',
    audioUrl: 'data:audio/webm;base64,AAAA',
    mentorResult: { letter: '저도 일을 쉬었다가 다시 시작했습니다.' },
  });
  assert.equal(answered.status, 'answered');
  assert.equal(answered.pregnantAnswerRead, false);
  assert.equal(db.getUnreadNotificationCount({ role: 'pregnant', pregnantUserId: 'pregnant-1' }), 1);
  assert.equal(db.saveDemoAnswer(question.questionId, 'mentor-001', {}), null);
});

test('마이페이지 읽음 처리와 감사 알림은 질문 소유자 및 배정 멘토에게만 적용된다', () => {
  const question = createQuestion();
  db.saveDemoAnswer(question.questionId, 'mentor-001', {
    transcript: '경험 답변',
    mentorResult: { letter: '정리된 편지' },
  });
  assert.equal(db.markPregnantAnswerRead(question.questionId, 'pregnant-2'), null);
  db.markPregnantAnswerRead(question.questionId, 'pregnant-1');
  assert.equal(db.getUnreadNotificationCount({ role: 'pregnant', pregnantUserId: 'pregnant-1' }), 0);

  assert.equal(db.saveDemoFeedback(question.questionId, 'pregnant-2', { message: '잘못된 감사' }), null);
  db.saveDemoFeedback(question.questionId, 'pregnant-1', { message: '경험이 힘이 되었어요.' }, '마음이 놓였어요');
  assert.equal(db.getUnreadNotificationCount({ role: 'senior', mentorId: 'mentor-001' }), 2);
  assert.equal(db.getUnreadNotificationCount({ role: 'senior', mentorId: 'mentor-002' }), 0);
  db.markQuestionRead(question.questionId, 'mentor-001');
  db.markMentorFeedbackRead(question.questionId, 'mentor-001');
  assert.equal(db.getUnreadNotificationCount({ role: 'senior', mentorId: 'mentor-001' }), 0);
});

