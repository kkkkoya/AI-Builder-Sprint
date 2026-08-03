# 이어봄

> AI가 사람을 대신 위로하는 것이 아니라, 먼저 그 시간을 살아본 사람의 경험이 필요한 사람에게 닿도록 연결하는 세대 경험 연결 플랫폼

---

## 1. 프로젝트 소개

이어봄은 임산부의 고민과 출산·육아 경험을 가진 어르신의 실제 경험을 연결하는 웹 서비스다.

AI가 직접 상담 답변을 만드는 것이 아니라 다음 과정을 지원한다.

- 임산부의 자유로운 고민 분석
- 실제 상황이 드러나지 않은 고민에 대한 주제별 추가 질문 생성
- 경험 아카이브 검색
- 검색된 경험의 의미 적합성 검토
- 어르신이 답하기 쉬운 질문 생성
- 어르신 음성 답변의 STT 변환
- 경험 카드와 편지 형태로 정리
- 원문 충실도와 안전성 검토
- 임산부의 감사 반응을 어르신에게 전달

현재 해커톤 MVP는 같은 브라우저의 LocalStorage를 사용해 임산부와 어르신의 계정, 질문, 답변, 감사와 알림 흐름을 재현한다.

---

## 2. 주요 기능

### 임산부 모드

- 이름·닉네임과 임신 상태로 등록
- 자유로운 고민 입력
- Solar 고민 분석
- 모호한 입력에 상황을 하나 묻는 추가 질문과 답변 이어서 분석
- 관련 경험 검색 및 의미 적합성 검토
- 멘토 이름·나이·경험 태그 확인
- 지정 멘토에게 질문 전송
- 프로필 답변 알림
- 마이페이지 고민·답변 이력
- 음성 및 AI 편지 확인
- 감사 반응 전달
- 임산부가 직접 남긴 반응만 사용하는 감사 메시지와 과장 표현 차단

### 어르신 모드

- 사전 등록된 더미 멘토 계정 로그인
- 자신에게 배정된 질문만 확인
- 여러 질문 중 답변할 고민 선택
- 큰 마이크 버튼을 통한 음성 녹음
- Web Speech API 기반 STT
- 관련 없거나 너무 짧은 답변 재요청
- 경험 카드 및 편지 생성
- AI 수정 내용·안전 안내 확인
- 최종 전달 전 검토
- 전달한 경험과 감사 이력 확인

### 시스템

- 질문·사용자·멘토 ID 기반 데이터 분리
- 중복 답변 방지
- 읽지 않은 알림 관리
- 새로고침 후 상태 복원
- 누적 고민·답변 이력
- Solar 오류 재시도와 fallback
- 저장 공간 부족 시 텍스트 기록 보호

---

## 3. 기술 스택

| 구분 | 기술 |
| --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript ES Modules |
| AI | Upstage Solar `solar-pro3` |
| Development AI | OpenAI Codex, GPT-5.6, Google Gemini Pro |
| Server API | Vercel Serverless Function |
| Voice | Web Speech API, MediaRecorder |
| Demo Database | LocalStorage |
| Login State | SessionStorage |
| Test | Node.js `node:test`, `node:assert/strict` |
| Font | Google Fonts `Gowun Dodum` |

배포된 이어봄 서비스의 고민 분석·경험 검토·편지 정리·감사 메시지 생성은 Upstage Solar가 담당한다. OpenAI Codex, GPT-5.6과 Google Gemini Pro는 요구사항 정리, 구현, 디버깅, 테스트와 문서 검토에 활용한 개발 지원 도구이며 서비스의 실행 API 경로에는 포함되지 않는다.

---

## 4. 프로젝트 구조

```text
.
├── index.html                  # 모드 선택, 사용자 등록, 메인 화면
├── pregnant.html               # 임산부 고민 입력 및 매칭 결과 화면
├── senior.html                 # 어르신 질문 확인, 녹음, 편지 검토 화면
├── mypage.html                 # 임산부·어르신 활동 이력 화면
├── style.css                   # 전체 UI 스타일
├── ui.js                       # 페이지 이벤트, UI 상태, 전체 기능 연결
│
├── api.js                      # 브라우저 AI 통합 인터페이스와 fallback
├── agents.js                   # AI 응답 정규화·검증·공통 응답 구조
├── matching.js                 # 경험 검색, 후보 생성, ID 검증
├── tags.js                     # 표준 태그·감정·필요 사전
├── stt.js                      # 음성 녹음 및 STT
├── storage.js                  # 현재 세션과 누적 이력 저장
├── demo-db.js                  # 계정·질문·답변·감사·알림 데모 DB
├── dummy_mentors.json          # 가상 멘토 및 경험 아카이브
│
├── api/
│   └── solar.js                # Vercel 서버리스 Upstage Solar API
│
├── tests/
│   ├── ai-contract.test.mjs
│   ├── demo-db.test.mjs
│   ├── history-storage.test.mjs
│   ├── impact-feedback.test.mjs
│   ├── mentor-answer.test.mjs
│   ├── solar-handler.test.mjs
│   ├── stt.test.mjs
│   └── ui-state.test.mjs
│
├── AGENTS.md                   # AI Agent 설계 문서
├── DEMO.md                     # 로컬 데모 데이터 흐름과 한계
├── PROJECT_PLAN.md             # 프로젝트 상세 기획서
├── eobom.png                   # 스플래시 로고 이미지
└── eobom(nowriting).png        # 헤더 로고 이미지
```

> HTML에서 `eobom.png`와 `eobom(nowriting).png`를 직접 참조한다. 두 이미지가 저장소 루트에 정확한 파일명으로 존재해야 한다.

---

## 5. 실행 환경

### 필수 환경

- Node.js가 설치된 환경
- 인터넷 연결
- Upstage API Key
- 마이크가 연결된 PC 또는 모바일 기기
- ES Module과 Web Speech API를 지원하는 브라우저

### 권장 브라우저

- Google Chrome
- Microsoft Edge

Web Speech API와 MediaRecorder 지원은 브라우저마다 다르다. 음성 시연은 Chrome 또는 Edge에서 먼저 확인하는 것을 권장한다.

### 마이크 사용 조건

브라우저 마이크 권한이 필요하다.

일반적으로 마이크 기능은 다음 환경에서 사용해야 한다.

- `localhost`
- HTTPS가 적용된 배포 주소

브라우저 주소창 또는 사이트 설정에서 마이크 권한을 허용해야 한다.

---

## 6. 환경변수

현재 필수 환경변수는 하나다.

| 변수명 | 필수 | 사용 위치 | 설명 |
| --- | --- | --- | --- |
| `UPSTAGE_API_KEY` | 필수 | `api/solar.js` | Upstage Solar API 호출 인증 키 |

### 로컬 환경변수 파일

프로젝트 루트에 `.env.local` 파일을 만든다.

```env
UPSTAGE_API_KEY=여기에_본인의_Upstage_API_Key_입력
```

주의사항:

- API Key 앞뒤에 불필요한 공백을 넣지 않는다.
- 실제 키를 README, 코드, 화면 캡처, 커밋 기록에 포함하지 않는다.
- `.env.local`은 Git에 올리지 않는다.
- 브라우저 JavaScript 파일에 API Key를 직접 작성하지 않는다.
- API Key는 서버 함수인 `api/solar.js`에서만 읽는다.

### 환경변수와 코드 설정의 차이

`api.js`의 `AI_MODE`는 현재 코드 상수로 `solar`에 설정되어 있다.

```js
export const AI_MODE = AI_MODES.SOLAR;
```

`AI_MODE`는 현재 환경변수가 아니다. 실행 환경에서 변경하려면 코드를 수정해야 하므로, 제출본에서는 그대로 유지한다.

---

## 7. 로컬 실행 가이드

AI 서버 함수까지 포함한 전체 기능을 실행하려면 Vercel 개발 서버를 사용한다.

### 7.1 저장소 클론

```bash
git clone <저장소-주소>
cd <저장소-폴더>
```

이미 프로젝트 폴더가 있다면 해당 폴더로 이동한다.

### 7.2 파일 확인

프로젝트 루트에 최소한 다음 파일이 있는지 확인한다.

```text
index.html
pregnant.html
senior.html
mypage.html
ui.js
api.js
api/solar.js
dummy_mentors.json
eobom.png
eobom(nowriting).png
```

### 7.3 환경변수 설정

프로젝트 루트에 `.env.local`을 만든다.

```env
UPSTAGE_API_KEY=본인의_API_Key
```

### 7.4 Vercel 개발 서버 실행

```bash
npx vercel dev
```

처음 실행할 때 Vercel CLI 설치 또는 로그인, 프로젝트 연결 질문이 나타날 수 있다. 터미널 안내에 따라 진행한다.

실행이 완료되면 터미널에 표시된 로컬 주소로 접속한다.

일반적인 주소 예시:

```text
http://localhost:3000
```

포트가 이미 사용 중이면 다른 포트가 표시될 수 있으므로 터미널에 출력된 주소를 우선한다.

### 7.5 첫 화면 접속

브라우저에서 다음 파일을 직접 열지 말고 개발 서버 주소로 접속한다.

```text
http://localhost:3000
```

`file:///.../index.html` 형태로 직접 열면 ES Module, JSON fetch, 서버 API, 마이크 권한이 정상적으로 동작하지 않을 수 있다.

---

## 8. 화면 확인만 필요한 정적 실행

AI 서버 연결 없이 HTML과 CSS 화면만 확인하려면 간단한 정적 서버를 사용할 수 있다.

Python이 설치된 경우:

```bash
python -m http.server 8000
```

그다음 다음 주소로 접속한다.

```text
http://localhost:8000
```

주의:

- 이 방식에서는 Vercel의 `/api/solar` 서버 함수가 실행되지 않는다.
- 실제 Solar 응답을 확인할 수 없다.
- AI 통합 데모와 제출 전 검증에는 `npx vercel dev`를 사용해야 한다.

---

## 9. 로컬 데모 계정

현재 더미 멘토 계정은 `dummy_mentors.json`에서 자동 등록된다.

어르신은 이름과 나이가 모두 정확히 일치해야 로그인할 수 있다.

| 이름 | 나이 | 멘토 ID |
| --- | ---: | --- |
| 김정희 | 72 | `mentor-001` |
| 박영자 | 68 | `mentor-002` |
| 이순자 | 75 | `mentor-003` |
| 최명숙 | 70 | `mentor-004` |
| 한미자 | 69 | `mentor-005` |
| 오순희 | 73 | `mentor-006` |

임산부 계정은 사용자가 입력한 이름과 임신 상태로 생성된다.

같은 이름과 같은 상태로 다시 로그인하면 같은 `pregnantUserId`를 사용한다.

---

## 10. 전체 데모 실행 순서

### 10.1 임산부 질문 전송

1. 메인 화면에서 `임산부입니다`를 선택한다.
2. 이름 또는 닉네임을 입력한다.
3. 현재 임신 상태를 선택한다.
4. `시작하기`를 누른다.
5. `고민 나누러 가기`를 누른다.
6. 임신·출산·육아·가족·경력 관련 고민을 입력한다.
7. `내 고민 전달하기`를 누른다.
8. Solar 분석과 경험 검색이 완료될 때까지 기다린다.
9. 표시된 멘토 이름과 나이를 확인한다.
10. `고민 전달하기`를 눌러 질문을 저장한다.
!! 고민의 내용은 데모버전에 더미 멘토와 관련된 내용이 있는 고민으로 한정한다. 추후 배포시에 많은 정보가 쌓이면 다양한 고민 매칭이 가능하다.

### 10.2 선택된 어르신으로 답변

1. 메인 화면 또는 프로필에서 로그아웃한다.
2. `어르신입니다`를 선택한다.
3. 임산부 화면에 표시되었던 멘토의 이름과 나이를 입력한다.
4. 로그인한다.
5. 도착한 고민을 선택한다.
6. 마이크 버튼을 누르고 질문과 관련된 실제 경험을 말한다.
7. 녹음을 종료한다.
8. STT 원문을 확인한다.
9. 경험 전달 버튼을 누른다.
10. AI가 만든 경험 카드와 편지를 확인한다.
11. 필요하면 내용을 수정하거나 다시 정리한다.
12. `최종 전달하기`를 누른다.

### 10.3 임산부 답변 확인

1. 어르신 계정에서 로그아웃한다.
2. 처음 사용한 임산부 이름과 상태로 다시 로그인한다.
3. 프로필 버튼의 답변 알림을 확인한다.
4. 마이페이지에 들어간다.
5. 자신이 남긴 고민과 도착한 답변을 확인한다.
6. 음성, AI 편지, 경험 키워드와 안전 안내를 확인한다.
7. 감사 반응을 남긴다.

### 10.4 어르신 감사 확인

1. 다시 해당 어르신 계정으로 로그인한다.
2. 마이페이지에서 임산부의 감사 반응을 확인한다.

---

## 11. 입력 예시

### 경력 고민

```text
출산 후 다시 일을 시작하지 못할까 봐 걱정돼요.
아이도 잘 키우고 싶지만 제 경력이 완전히 끝날 것 같아 무서워요.
```

### 가족 관계 고민

```text
남편과 육아 역할을 어떻게 나눌지 계속 다투고 있어요.
아이를 낳은 뒤에도 모든 일을 혼자 감당하게 될까 봐 걱정돼요.
```

### 모호한 입력 테스트

```text
그냥 너무 힘들어요.
```

이 경우 다음처럼 실제 상황을 한 가지 말할 수 있는 추가 질문 화면이 나타나야 한다.

```text
요즘 어떤 일 때문에 가장 힘든지, 실제로 겪고 있는 상황을 한 가지만 들려주시겠어요?
```

주제만 확인되는 입력에는 해당 주제에 맞는 질문을 표시한다.

```text
입력: 출산이 걱정돼요.
질문: 출산을 생각할 때 가장 걱정되는 순간이나 상황이 무엇인지 조금 더 들려주시겠어요?
```

사용자가 답변을 보내면 원래 고민과 추가 답변을 함께 다시 분석한다. 구체적인 상황이 확인되면 경험 검색으로 진행하며, 이미 답한 내용을 반복해서 묻지 않는다.

### 서비스 범위 밖 입력 테스트

```text
오늘 부산 날씨가 어때요?
```

이 경우 경험을 억지로 추천하지 않고 서비스 범위 안내가 나타나야 한다.

### 어르신 유효 답변 예시

```text
저도 아이를 낳고 일을 오래 쉬었어요.
다시 일을 시작하려고 할 때는 제가 할 수 있는 일이 없다고 느껴져 많이 막막했어요.
처음에는 짧은 시간 동안 할 수 있는 일부터 시작했고, 조금씩 자신감을 되찾았어요.
```

### 어르신 관련 없는 답변 테스트

```text
도착한 질문을 받는 방법이 뭐예요?
```

이 경우 경험 편지를 생성하지 않고 실제 경험을 다시 들려달라는 안내가 나타나야 한다.

---

## 12. AI API 구조

브라우저는 다음 엔드포인트로 요청한다.

```text
POST /api/solar
```

요청 본문:

```json
{
  "action": "analyze-concern",
  "payload": {}
}
```

지원 action:

| action | 기능 |
| --- | --- |
| `analyze-concern` | 고민 범위·모호성·감정·상황·필요 분석 |
| `match-experience` | 검색된 관련도 1위 경험의 의미 적합성 검토 및 질문 생성 |
| `process-mentor-answer` | 어르신 답변 유효성 확인, 경험 카드·편지·안전 검토 |
| `create-impact-feedback` | 임산부 감사 반응을 어르신용 메시지로 정리 |

### 모델

```text
solar-pro3
```

### action별 제한 설정

| action | 제한 시간 | 최대 출력 토큰 | JSON 모드 |
| --- | ---: | ---: | --- |
| `analyze-concern` | 20초 | 1200 | 기본 요청 후 필요 시 JSON 재요청 |
| `match-experience` | 25초 | 900 | 사용 |
| `process-mentor-answer` | 30초 | 1800 | 사용 |
| `create-impact-feedback` | 15초 | 500 | 사용 |

### 오류 처리

- 일시적인 408, 409, 429, 5xx 응답은 한 번 재시도한다.
- `max_tokens` 또는 `response_format`이 거부되면 기본 요청으로 한 번 다시 시도한다.
- JSON 응답이 잘못되면 복구 또는 JSON 모드 재요청을 시도한다.
- 검증에 실패한 Solar 응답은 정상 성공으로 처리하지 않는다.
- 시간 초과는 `SOLAR_TIMEOUT`으로 반환한다.

---

## 13. AI와 검색 엔진의 역할

경험 연결은 Solar에 전체 경험 원문을 모두 보내는 방식이 아니다.

```text
전체 dummy_mentors.json
→ matching.js 검색
→ 관련도 1위 경험 한 개
→ Solar 의미 적합성 검토
→ 실제 경험 원본 복원
```

### `matching.js`

- 전체 경험 검색
- 태그·감정·필요·키워드 비교
- 안전 수준 반영
- 후보 한 개 준비
- 후보 ID 검증
- Solar 실패 시 fallback

### Solar

- 고민과 후보 경험의 의미 관계 검토
- 상황·감정·필요 일치 평가
- 근거와 한계 생성
- 어르신용 질문 생성

> JavaScript 검색 엔진이 전체 경험 아카이브에서 관련도 1위 후보를 검색하고, Solar가 고민의 상황·감정·필요와 후보 경험의 의미 적합성을 검토한다.

---

## 14. 브라우저 저장소

### LocalStorage 키

| 키 | 내용 |
| --- | --- |
| `eobom_demo_users_v1` | 임산부와 더미 멘토 계정 |
| `eobom_demo_messages_v1` | 질문, 답변, 감사 데이터 |
| `eobom_demo_notifications_v1` | 읽지 않은 질문·답변·감사 알림 |
| `eobom_session_v1` | 현재 화면 상태와 누적 고민·답변 이력 |

### SessionStorage 키

| 키 | 내용 |
| --- | --- |
| `eobom_demo_login_active` | 현재 탭 로그인 유지 여부 |

### 저장 동작

- 새로고침으로 질문·답변·알림을 삭제하지 않는다.
- 로그아웃은 계정 로그인 정보만 제거한다.
- 로그인 상태는 현재 브라우저 탭이 닫히면 종료된다.
- 다른 브라우저 또는 다른 기기와 데이터가 공유되지 않는다.

### 데모 초기화 방법

완전히 처음부터 다시 시연해야 할 때만 브라우저 개발자 도구에서 다음 LocalStorage 키를 삭제한다.

```text
eobom_demo_users_v1
eobom_demo_messages_v1
eobom_demo_notifications_v1
eobom_session_v1
```

또는 해당 사이트의 저장 데이터를 전체 삭제한다.

주의:

- 일반 로그아웃 때는 데이터를 삭제하지 않는다.
- 시연 중간에 저장소를 삭제하면 질문과 답변 연결이 사라진다.

---

## 15. 테스트

### 전체 테스트 실행

프로젝트 루트에서 다음 명령을 실행한다.

```bash
node --test tests/*.test.mjs
```

2026년 8월 3일 기준 확인 결과:

```text
총 52개 통과
실패 0개
```

### 주요 JavaScript 구문 검사

```bash
node --check agents.js
node --check api.js
node --check demo-db.js
node --check matching.js
node --check storage.js
node --check stt.js
node --check tags.js
node --check ui.js
node --check api/solar.js
```

### 테스트 파일별 범위

| 파일 | 범위 |
| --- | --- |
| `ai-contract.test.mjs` | 후보 제한, 원문 제외, ID 검증, fallback |
| `demo-db.test.mjs` | 계정, 질문 분리, 답변 권한, 알림 |
| `history-storage.test.mjs` | 고민·답변 누적, 마이그레이션, 저장 용량 보호 |
| `mentor-answer.test.mjs` | 답변 유효성, 편지 구조화, 원문 복사 차단, 임시 저장 |
| `solar-handler.test.mjs` | API 형식, JSON 모드, 호환 재시도, 오류 검증 |
| `stt.test.mjs` | 중간 STT 보존, 중복 녹음 방지 |
| `ui-state.test.mjs` | 새로고침 복원, 로그인 상태, 알림, 질문 선택, 이력 UI |

---

## 16. Vercel 배포 가이드

현재 서버 코드는 Vercel Serverless Function 구조인 `api/solar.js`를 사용한다.

### 16.1 Git 저장소 준비

변경 사항을 커밋하고 원격 저장소에 push한다.

```bash
git add .
git commit -m "docs: add project plan and setup guide"
git push origin <브랜치명>
```

### 16.2 Vercel 프로젝트 생성

방법 1: Vercel 웹 대시보드

1. Vercel에 로그인한다.
2. 새 프로젝트를 생성한다.
3. GitHub 저장소를 Import한다.
4. 프로젝트 루트를 저장소 루트로 설정한다.
5. 별도의 빌드 명령 없이 정적 파일과 `api` 폴더를 배포한다.

방법 2: Vercel CLI

```bash
npx vercel
```

터미널 안내에 따라 프로젝트를 연결한다.

### 16.3 배포 환경변수 등록

Vercel 프로젝트 설정의 Environment Variables에 다음 값을 추가한다.

```text
Name: UPSTAGE_API_KEY
Value: 본인의 Upstage API Key
```

적용 환경:

- Production
- Preview
- Development

필요한 환경에 각각 체크한다.

환경변수를 추가하거나 변경한 뒤에는 새로 배포해야 반영된다.

### 16.4 프로덕션 배포

Vercel 대시보드에서 재배포하거나 CLI를 사용할 수 있다.

```bash
npx vercel --prod
```

### 16.5 배포 후 확인

배포 주소에서 다음을 확인한다.

1. 메인 페이지와 로고가 정상 표시되는가
2. 브라우저 개발자 도구에 404 파일 오류가 없는가
3. 고민 분석 요청이 `/api/solar`로 전송되는가
4. 서버 응답에 API Key가 노출되지 않는가
5. 마이크 권한 요청이 나타나는가
6. 임산부 질문 저장 후 멘토 로그인에서 질문이 보이는가
7. 답변 후 임산부 프로필 알림이 나타나는가

---

## 17. 실행·배포 환경 정보

| 항목 | 로컬 개발 | Vercel 배포 |
| --- | --- | --- |
| Frontend 제공 | Vercel Dev Server | Vercel Static Hosting |
| AI API | `api/solar.js` 로컬 서버 함수 | Vercel Serverless Function |
| 환경변수 | `.env.local` | Vercel Environment Variables |
| 기본 API 경로 | `/api/solar` | `/api/solar` |
| 데이터 저장 | 해당 브라우저 LocalStorage | 접속한 각 브라우저의 LocalStorage |
| 로그인 유지 | 현재 탭 SessionStorage | 현재 탭 SessionStorage |
| 마이크 | localhost 권한 필요 | HTTPS 사이트 권한 필요 |
| 다른 기기 데이터 공유 | 불가능 | 불가능 |

중요:

Vercel에 배포해도 질문과 답변 데이터는 서버 DB가 아니라 각 사용자의 브라우저 LocalStorage에 저장된다.

따라서 현재 배포본도 서로 다른 기기 사이의 실제 전달 서비스가 아니라 한 브라우저 안에서 전체 흐름을 시연하는 MVP다.

---

## 18. 자주 발생하는 문제

### 18.1 `UPSTAGE_API_KEY 환경변수가 설정되지 않았습니다`

원인:

- `.env.local`이 없음
- 변수명 오타
- Vercel에 환경변수를 추가하지 않음
- 환경변수 추가 후 재배포하지 않음

해결:

```env
UPSTAGE_API_KEY=실제_API_Key
```

설정 후 개발 서버를 완전히 종료하고 다시 실행한다.

### 18.2 Solar 응답 시간 초과

화면 또는 서버에서 다음 오류가 발생할 수 있다.

```text
SOLAR_TIMEOUT
```

확인 사항:

- 인터넷 연결
- Upstage API Key 유효성
- Upstage API 상태
- 요청을 연속으로 너무 많이 보내지 않았는지

어르신 답변 처리 중 시간 초과가 발생하면 가짜 편지를 생성하지 않고 원문을 임시 저장하며 재시도 버튼을 제공한다.

### 18.3 마이크 버튼이 동작하지 않음

확인 사항:

- Chrome 또는 Edge 사용
- 사이트 마이크 권한 허용
- 마이크 장치 연결
- `file://`이 아닌 localhost 또는 HTTPS 접속
- 다른 앱이 마이크를 독점하고 있지 않은지

### 18.4 어르신 로그인이 되지 않음

이름과 나이가 `dummy_mentors.json`과 정확히 일치해야 한다.

예시:

```text
이름: 김정희
나이: 72
```

공백과 다른 나이를 확인한다.

### 18.5 어르신 화면에 질문이 없음

- 임산부가 추천 결과만 확인하고 `고민 전달하기`를 누르지 않았을 수 있다.
- 추천된 멘토가 아닌 다른 멘토로 로그인했을 수 있다.
- 브라우저 저장 데이터를 삭제했을 수 있다.
- 다른 브라우저나 시크릿 창으로 이동했을 수 있다.

질문은 같은 브라우저 저장소와 정확한 `mentorId`를 기준으로 조회한다.

### 18.6 답변 알림이 보이지 않음

- 어르신이 AI 결과만 확인하고 `최종 전달하기`를 누르지 않았을 수 있다.
- 처음 사용한 임산부 이름과 상태가 다를 수 있다.
- 다른 브라우저 탭 또는 다른 브라우저에서 로그인했을 수 있다.

### 18.7 로고 이미지가 깨짐

저장소 루트의 파일명을 확인한다.

```text
eobom.png
eobom(nowriting).png
```

HTML의 참조 이름과 대소문자, 괄호까지 정확히 일치해야 한다.

### 18.8 음성 저장 후 LocalStorage 용량 오류

브라우저 저장 공간이 부족하면 코드가 음성 URL을 제외하고 텍스트와 편지는 보존한다.

오래된 시연 데이터가 필요하지 않다면 사이트 저장 데이터를 초기화한 뒤 다시 실행한다.

---

## 19. 보안 및 개인정보 주의사항

현재 데이터는 해커톤 데모를 위한 가상 데이터다.

실제 사용자 데이터를 사용할 때는 다음이 필요하다.

- 개인정보 수집 및 이용 동의
- 음성 녹음 동의
- 경험의 재사용·공개 범위 동의
- 제3자 개인정보 익명화
- 데이터 보관 기간
- 삭제 요청 기능
- 운영자 검토 및 신고 처리
- 실제 서버 DB의 접근 제어

현재 LocalStorage는 보안이 필요한 실제 개인정보 저장소로 사용해서는 안 된다.

API Key는 반드시 서버 환경변수로 관리한다.

---

## 20. 현재 MVP의 제한사항

- 같은 브라우저에서만 임산부와 어르신 데이터가 연결된다.
- 실제 사용자 인증이 없다.
- 서버 데이터베이스가 없다.
- 다른 기기나 다른 브라우저로 질문이 전달되지 않는다.
- 음성 데이터는 브라우저 저장 용량의 영향을 받는다.
- Web Speech API 지원은 브라우저별로 다르다.
- 경험 아카이브는 가상 멘토 데이터다.
- 실제 운영을 위한 관리자 승인·신고 기능은 없다.

---

## 21. 향후 확장

- 실제 인증과 서버 DB 도입
- 멀티 디바이스 질문·답변 전달
- 음성 파일 객체 저장소 연동
- 푸시·웹 알림
- 기관 관리자 화면
- 경험 승인 및 신고 처리
- 개인정보 익명화와 삭제 관리
- 실제 동의 기반 경험 아카이브
- 여러 검색 후보 비교
- 응답 가능 멘토 상태 반영
- 사용자 반응 기반 경험 품질 측정

---

## 22. 관련 문서

| 문서 | 설명 |
| --- | --- |
| `PROJECT_PLAN.md` | 서비스 문제 정의, AI 구조, 기능, 실용화 계획을 담은 상세 기획서 |
| `AGENTS.md` | Solar Agent 역할, 응답 구조, 검증 원칙 |
| `DEMO.md` | 현재 LocalStorage 데모의 데이터 흐름과 한계 |
| `TEST_CASES.md` | 기능별 테스트 시나리오와 체크리스트 |
| `AIdocument.md` | 서비스 AI와 개발 지원 AI의 활용 범위를 정리한 증빙 문서 |

---
