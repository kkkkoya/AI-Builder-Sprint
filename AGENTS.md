# 이어봄 AI Agent 설계

이어봄은 하나의 Upstage Solar LLM에 역할별 지침을 적용하여  
여러 개의 논리적 Agent를 구성합니다.

실제로 서로 다른 AI 모델 6개를 만드는 것은 아닙니다.

자연어를 이해하고 생성하는 기능은 Solar LLM을 사용하고,  
멘토 추천은 JavaScript 점수 알고리즘으로 직접 구현합니다.

---

## 1. Agent 구성

이어봄은 다음 6개의 논리적 Agent로 구성됩니다.

1. Emotion Agent
2. Matching Agent
3. Question Agent
4. Speech Agent
5. Safety Agent
6. Feedback Agent

각 Agent의 입력값, 출력값, 지침, 금지사항, 오류 처리 방식은  
개발 과정에서 이 문서에 기록합니다.

---

## 2. 실제 처리 구조

발표에서는 6개의 Agent로 설명하지만,  
실제 Solar API 호출은 기능을 묶어서 총 3번 사용합니다.

### Solar 호출 1

다음 두 Agent를 함께 처리합니다.

- Emotion Agent
- Question Agent

처리 내용:

- 고민 요약
- 감정 분석
- 현재 상황 분석
- 핵심 주제 추출
- 필요한 도움 추출
- 경험 태그 생성
- 긴급도 분석
- 노인이 답하기 쉬운 질문 생성

### JavaScript 추천 계산

Matching Agent는 Solar API를 사용하지 않습니다.

사용자의 경험 태그와 멘토의 경험 태그를 비교하여  
JavaScript 점수 알고리즘으로 추천 결과를 계산합니다.

### Solar 호출 2

다음 두 Agent를 함께 처리합니다.

- Speech Agent
- Safety Agent

처리 내용:

- STT 결과를 읽기 쉬운 편지로 정리
- AI가 수정한 내용 기록
- 경험 태그 추출
- 위험 표현 검토
- 안전 안내 문구 생성

### Solar 호출 3

다음 Agent를 처리합니다.

- Feedback Agent

처리 내용:

- 임산부의 짧은 반응을 노인에게 전달할 감사 메시지로 변환

---

## 3. 공통 응답 형식

이어봄의 모든 AI 함수는 동일한 최상위 응답 형식을 사용합니다.

이를 통해 B가 화면을 연결할 때  
기능마다 서로 다른 방식으로 오류를 처리하지 않아도 됩니다.

공통 응답에는 다음 네 가지 항목이 있습니다.

- `ok`: 작업 성공 여부
- `data`: 작업 결과
- `error`: 오류 정보
- `meta`: 결과 생성 방식과 부가 정보

---

### 3.1 성공 응답

작업이 정상적으로 완료되면 `ok` 값은 `true`입니다.

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {
    "source": "mock",
    "usedFallback": false,
    "createdAt": "2026-07-30T06:30:00.000Z"
  }
}
```

각 항목의 의미는 다음과 같습니다.

#### `ok`

```json
true
```

작업이 정상적으로 완료되었다는 뜻입니다.

#### `data`

```json
{}
```

실제 분석 결과가 들어가는 공간입니다.

기능에 따라 내부 내용이 달라집니다.

예를 들어 고민 분석 결과에는 다음 정보가 들어갈 수 있습니다.

```json
{
  "summary": "첫 출산에 대한 불안을 느끼고 있습니다.",
  "emotions": ["두려움", "부담감"],
  "topic": "첫 출산",
  "experienceTags": ["첫 출산", "육아 부담"]
}
```

#### `error`

```json
null
```

성공한 경우에는 오류가 없으므로 `null`을 사용합니다.

#### `meta`

결과가 어떤 방식으로 생성되었는지 기록합니다.

```json
{
  "source": "mock",
  "usedFallback": false,
  "createdAt": "2026-07-30T06:30:00.000Z"
}
```

---

### 3.2 실패 응답

입력값이 없거나 작업을 진행할 수 없으면  
`ok` 값은 `false`입니다.

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "EMPTY_CONCERN",
    "message": "고민 내용을 입력해 주세요."
  },
  "meta": {
    "source": null,
    "usedFallback": false,
    "createdAt": "2026-07-30T06:30:00.000Z"
  }
}
```

각 항목의 의미는 다음과 같습니다.

#### `ok`

```json
false
```

작업이 실패했거나 입력값에 문제가 있다는 뜻입니다.

#### `data`

```json
null
```

결과를 만들지 못했기 때문에 `null`을 사용합니다.

#### `error.code`

```json
"EMPTY_CONCERN"
```

개발자가 오류 종류를 구분하기 위한 코드입니다.

예시:

- `EMPTY_CONCERN`: 고민 입력이 없음
- `EMPTY_TRANSCRIPT`: 멘토 음성 변환 결과가 없음
- `EMPTY_REACTION`: 감사 반응이 선택되지 않음
- `API_ERROR`: Solar API 호출 실패
- `INVALID_RESPONSE`: Solar 응답 형식이 올바르지 않음

#### `error.message`

```json
"고민 내용을 입력해 주세요."
```

사용자 화면에 보여줄 수 있는 오류 안내 문장입니다.

---

## 4. 결과 생성 방식

`meta.source`에는 결과가 어떤 방식으로 생성되었는지 기록합니다.

사용 가능한 값은 다음과 같습니다.

### `solar`

```json
"source": "solar"
```

Upstage Solar LLM이 정상적으로 결과를 생성한 경우입니다.

### `mock`

```json
"source": "mock"
```

실제 API를 연결하기 전에 미리 만든 시연용 데이터를 사용한 경우입니다.

### `rule`

```json
"source": "rule"
```

JavaScript 규칙이나 점수 알고리즘이 결과를 만든 경우입니다.

예를 들어 Matching Agent의 추천 결과에 사용할 수 있습니다.

### `fallback`

```json
"source": "fallback"
```

Solar API 호출이 실패하여 예비 응답을 사용한 경우입니다.

---

## 5. 폴백 사용 여부

`usedFallback`은 예비 응답을 사용했는지를 표시합니다.

정상적으로 Solar 결과를 사용했다면 다음과 같습니다.

```json
{
  "source": "solar",
  "usedFallback": false
}
```

Solar API가 실패하여 예비 응답으로 전환했다면 다음과 같습니다.

```json
{
  "source": "fallback",
  "usedFallback": true
}
```

이를 통해 개발 과정과 시연 과정에서  
실제 AI 결과인지 예비 결과인지 확인할 수 있습니다.

---

## 6. 작성 시각

`createdAt`에는 결과가 생성된 시각을 기록합니다.

```json
{
  "createdAt": "2026-07-30T06:30:00.000Z"
}
```

JavaScript에서는 다음 코드로 자동 생성합니다.

```js
new Date().toISOString();
```

직접 날짜를 입력하는 것이 아니라,  
함수가 실행될 때 현재 시각이 자동으로 기록됩니다.