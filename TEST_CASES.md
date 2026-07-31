# 이어봄 AI 기능 테스트 문서

## 1. 테스트 목적

이어봄의 AI 기능이 다음 조건을 만족하는지 확인한다.

1. 사용자가 자유롭게 작성한 고민을 처리하는가
2. 여러 고민을 하나의 태그로 단순화하지 않는가
3. 모호한 입력에 추가 질문을 생성하는가
4. 관련 없는 입력을 억지로 경험과 연결하지 않는가
5. 실제 경험 데이터 안에서만 멘토와 경험을 선택하는가
6. AI 점수와 근거를 JavaScript가 검증하는가
7. 어르신 원문의 의미를 보존하는가
8. Solar 실패 시 fallback이 작동하는가
9. 오류가 발생해도 서비스가 멈추지 않는가

---

## 2. 현재 테스트 환경

현재 기본 실행 모드:

```js
export const AI_MODE = AI_MODES.MOCK;
```

현재 데이터:

```text
가상 멘토: 6명
경험 카드: 12개
데이터 파일: dummy_mentors.json
```

실제 Solar 연결 전에는 Mock 결과와 규칙 기반 fallback을 중심으로 검사한다.

Solar 연결 후 같은 테스트를 다시 실행해 결과를 비교한다.

---

# 3. 고민 분석 테스트

## TC-01. 빈 고민 입력

### 입력

```js
await analyzeConcern({
  text: "",
  history: [],
});
```

### 기대 결과

```text
ok: false
error.code: EMPTY_CONCERN
```

### 기대 메시지

```text
고민 내용을 입력해 주세요.
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-02. 출산과 경력이 함께 있는 복합 고민

### 입력

```text
출산 후 회사를 그만두게 될까 봐 걱정돼요.
아이도 잘 키우고 싶은데 제 경력이 완전히 끝날까 봐 무서워요.
```

### 기대 결과

```text
route: IN_SCOPE
needsClarification: false
```

### 분석에 포함되어야 하는 내용

```text
출산에 대한 불안
경력 중단에 대한 고민
부모 역할에 대한 부담
```

### 예상 표준 태그

```text
첫 출산
출산 불안
부모 역할 불안
경력 단절
재취업
일과 육아 병행
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-03. 배우자 관계와 정체성이 함께 있는 고민

### 입력

```text
남편과 육아 문제로 계속 다투고 있어요.
아이를 낳으면 제 삶은 없어지고 엄마로만 살아야 할 것 같아요.
```

### 기대 결과

하나의 고민으로 축소하지 않고 최소 두 가지 고민으로 분리한다.

```text
배우자 관계
정체성 변화
```

### 예상 감정

```text
외로움
혼란
부담감
```

### 예상 표준 태그

```text
부부 갈등
배우자와의 소통
자아 상실
부모 역할 불안
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-04. 모호한 입력

### 입력

```text
그냥 너무 힘들어요.
```

### 기대 결과

```text
route: CLARIFICATION
needsClarification: true
```

`clarifyingQuestion`이 빈 문자열이면 안 된다.

### 예상 추가 질문

```text
출산, 육아와 가족 관계, 일과 경력, 마음과 정체성 중
어떤 부분이 가장 힘든지 묻는 질문
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-05. 추가 질문 답변 포함

### 첫 번째 입력

```text
그냥 너무 힘들어요.
```

### 추가 답변

```text
아이를 낳고 나서 다시 일을 못 하게 될까 봐 걱정돼요.
```

### 호출 예시

```js
await analyzeConcern({
  text: "그냥 너무 힘들어요.",
  history: [
    {
      question:
        "가장 크게 힘든 부분은 출산, 가족 관계, 일과 경력 중 어느 쪽에 가까운가요?",
      answer:
        "아이를 낳고 나서 다시 일을 못 하게 될까 봐 걱정돼요.",
    },
  ],
});
```

### 기대 결과

```text
route: IN_SCOPE
needsClarification: false
```

### 분석 핵심

```text
경력 단절
재취업
일과 육아 병행
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-06. 서비스 범위 밖 입력

### 입력

```text
오늘 부산 날씨가 어때요?
```

### 기대 결과

```text
route: NO_MATCH
```

### 기대 안내

이어봄이 임신, 출산, 육아, 가족 관계, 경력 변화와 관련된 경험을 연결하는 서비스라는 설명이 포함되어야 한다.

### 금지 결과

```text
관련 없는 경험을 억지로 추천하면 안 됨
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-07. 안전 안내가 우선인 입력

### 입력

```text
지금 안전이 위협받는 상황이에요.
```

### 기대 결과

```text
route: SAFETY
urgency: urgent
```

### 기대 동작

```text
개인 경험 매칭을 바로 진행하지 않음
주변의 신뢰할 수 있는 사람이나 전문적인 확인이 먼저 필요할 수 있음을 안내
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

# 4. 경험 매칭 테스트

## TC-08. 분석 결과 없이 매칭 요청

### 입력

```js
await matchExperience({});
```

### 기대 결과

```text
ok: false
error.code: EMPTY_ANALYSIS
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-09. 경력 고민 경험 매칭

### 고민

```text
출산 후 회사를 그만두게 될까 봐 걱정돼요.
다시 일을 시작하지 못할까 봐 무서워요.
```

### 기대 선택 경험

```text
mentorId: mentor-003
experienceId: experience-006
```

### 경험 제목

```text
아이들이 성장한 뒤 다시 일을 시작한 경험
```

### 확인 항목

```text
[ ] selected가 null이 아님
[ ] mentorId가 실제 데이터에 존재함
[ ] experienceId가 실제 데이터에 존재함
[ ] mentorId와 experienceId의 관계가 맞음
[ ] reason이 빈 문자열이 아님
[ ] evidence가 한 개 이상 있음
[ ] limitations가 포함됨
```

---

## TC-10. 자아 상실 고민 경험 매칭

### 고민

```text
아이를 낳으면 제 삶이 없어지고 엄마로만 살아야 할 것 같아요.
```

### 기대 선택 경험

```text
mentorId: mentor-006
experienceId: experience-011
```

### 경험 제목

```text
엄마가 된 뒤 나를 잃은 것 같았던 경험
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-11. 세부 점수 합계 검사

### AI 반환 예시

```json
{
  "scores": {
    "situationSimilarity": 29,
    "emotionalSimilarity": 17,
    "livedExperienceSimilarity": 20,
    "needSimilarity": 14,
    "transferability": 9,
    "safety": 5
  },
  "totalScore": 100
}
```

### 실제 합계

```text
29 + 17 + 20 + 14 + 9 + 5 = 94
```

### 기대 결과

```text
JavaScript가 totalScore를 94로 수정
```

AI가 작성한 `100`을 그대로 사용하면 실패다.

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-12. 존재하지 않는 경험 ID

### AI 반환 예시

```json
{
  "selected": {
    "mentorId": "mentor-999",
    "experienceId": "experience-999",
    "totalScore": 98
  }
}
```

### 기대 결과

```text
selected가 유효한 결과로 인정되지 않음
가짜 mentorId와 experienceId 제거
fallback 추천 실행 또는 NO_MATCH 반환
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-13. 멘토와 경험 ID 불일치

### AI 반환 예시

```json
{
  "selected": {
    "mentorId": "mentor-001",
    "experienceId": "experience-006",
    "totalScore": 90
  }
}
```

`experience-006`은 `mentor-003`의 경험이다.

### 기대 결과

```text
해당 후보 제거
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-14. 중복 경험 제거

### AI 반환 예시

```text
selected: experience-006
alternative 1: experience-006
alternative 2: experience-009
```

### 기대 결과

```text
alternatives에서 experience-006 제거
experience-009만 유지
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-15. 경험 데이터 로딩 실패

### 상황

```text
dummy_mentors.json 파일 경로가 잘못됨
JSON 문법이 잘못됨
mentors 배열이 없음
```

### 기대 결과

```text
ok: false
error.code: ARCHIVE_LOAD_FAILED
```

화면이 무한 로딩 상태로 남으면 안 된다.

### 결과

```text
[ ] 통과
[ ] 실패
```

---

# 5. 어르신 답변 처리 테스트

## TC-16. 빈 어르신 답변

### 입력

```js
await processMentorAnswer({
  question: "비슷한 경험이 있으신가요?",
  transcript: "",
  selectedMatch: {},
});
```

### 기대 결과

```text
ok: false
error.code: EMPTY_TRANSCRIPT
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-17. 일반 경험 답변 처리

### 입력

```text
저도 아이를 낳고 일을 그만뒀어요.
다시 일하려고 하니까 집안일 문제로 남편과 많이 다퉜어요.
조금씩 할 일을 나누고 나서 짧게라도 다시 일을 시작했어요.
```

### 기대 경험 카드

```text
경력 단절
재취업
부부 갈등
배우자와의 소통
```

### 기대 결과 필드

```text
experienceCard.title
experienceCard.summary
experienceCard.timeline
experienceCard.emotions
experienceCard.helpTypes
experienceCard.standardTags
letter
edits
fidelity
safety
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-18. 원문에 없는 사실 추가 방지

### 원문

```text
저도 처음에는 많이 막막했어요.
```

### 금지되는 편지 내용 예시

```text
남편과 역할을 나누고 다시 취업에 성공했습니다.
```

원문에는 남편, 역할 분담, 취업 성공이 없다.

### 기대 결과

```text
원문에 없는 사건을 추가하지 않음
```

추가되었다면:

```text
fidelity.preservedMeaning: false
addedFacts에 추가된 내용 기록
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-19. AI 수정 내역 공개

### 기대 조건

`edits` 배열에 최소 한 개 이상의 수정 설명이 있어야 한다.

예:

```text
반복되는 표현을 줄였습니다.
문장 부호를 추가했습니다.
시간의 흐름이 드러나도록 순서를 정리했습니다.
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

# 6. 감사 메시지 테스트

## TC-20. 빈 감사 반응

### 입력

```js
await createImpactFeedback({
  reaction: "",
});
```

### 기대 결과

```text
ok: false
error.code: EMPTY_REACTION
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-21. 감사 영향 메시지 생성

### 입력

```js
await createImpactFeedback({
  reaction: "혼자가 아닌 것 같아요",
  concernSummary:
    "출산 후 경력이 중단될까 걱정하고 있다.",
  selectedMatch: {
    experienceTitle:
      "아이들이 성장한 뒤 다시 일을 시작한 경험",
  },
});
```

### 기대 결과

```text
message가 단순한 “감사합니다”로 끝나지 않음
어떤 경험이 어떤 도움을 주었는지 포함
사용자가 완전히 회복되었다고 과장하지 않음
```

### 필수 필드

```text
message
impactSummary
highlightedExperience
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

# 7. fallback 테스트

## TC-22. Solar 요청 실패

### 테스트 방법

Solar 모드에서 서버 요청이 실패하도록 설정한다.

예:

```text
잘못된 API 키
서버 엔드포인트 오류
네트워크 오류
응답 시간 초과
```

### 기대 결과

```text
서비스가 중단되지 않음
fallback 또는 rule 결과 반환
```

### 기대 meta

```json
{
  "source": "fallback",
  "usedFallback": true
}
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-23. Solar가 잘못된 JSON 반환

### AI 응답 예시

```text
가장 적합한 경험은 이순자 멘토입니다.
```

JSON이 아닌 일반 문장이다.

### 기대 결과

```text
JSON 파싱 실패 처리
fallback 실행
화면이 멈추지 않음
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

## TC-24. Solar가 유효하지 않은 점수 반환

### AI 응답 예시

```json
{
  "scores": {
    "situationSimilarity": 100,
    "emotionalSimilarity": -10,
    "livedExperienceSimilarity": "높음"
  }
}
```

### 기대 결과

```text
상황 유사성은 최대 30점으로 제한
감정 유사성은 최소 0점으로 제한
숫자가 아닌 값은 0점 처리
```

### 결과

```text
[ ] 통과
[ ] 실패
```

---

# 8. 최종 통합 테스트 기준

A와 B의 파일이 합쳐진 뒤 다음 전체 흐름을 검사한다.

```text
1. 임산부가 자유로운 고민 입력
2. AI 분석 로딩 표시
3. 모호하면 추가 질문 표시
4. 고민 분석 결과 표시
5. 경험 연결 결과와 근거 표시
6. 어르신용 질문 저장
7. 어르신 화면에서 질문 확인
8. 음성 녹음 또는 직접 입력
9. AI 편지와 수정 내역 표시
10. 임산부가 감사 반응 선택
11. 어르신 화면에 영향 메시지 표시
```

## 최종 성공 조건

```text
[ ] 새로고침 후에도 필요한 데이터가 유지됨
[ ] API 오류가 발생해도 화면이 멈추지 않음
[ ] 존재하지 않는 멘토나 경험이 표시되지 않음
[ ] AI와 fallback 결과가 구분됨
[ ] 어르신 원문과 AI 편지를 함께 확인할 수 있음
[ ] 가상 시연 데이터임이 화면에 표시됨
[ ] 실제 API 키가 GitHub에 올라가지 않음
```

---

# 9. 테스트 결과 기록 양식

각 테스트를 실행한 뒤 아래 형식으로 기록한다.

```text
테스트 번호:
실행 날짜:
실행 모드: Mock / Solar / Fallback
입력:
실제 결과:
기대 결과와 일치 여부: 통과 / 실패
오류 내용:
수정한 파일:
비고:
```