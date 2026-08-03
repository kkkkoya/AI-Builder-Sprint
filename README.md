# 이어봄

> AI가 사람을 대신 위로하는 것이 아니라, 먼저 그 시간을 살아본 사람의 경험이 필요한 사람에게 닿도록 연결하는 세대 경험 연결 플랫폼

이어봄은 임산부의 고민과 출산·육아 경험을 가진 어르신의 실제 경험을 연결하는 웹 서비스다.

현재 해커톤 MVP는 같은 브라우저의 LocalStorage를 사용해 임산부와 어르신의 계정, 질문, 답변, 감사와 알림 흐름을 재현한다.

---

## 1. 문서 구성

| 문서                | 설명                                        |
| ----------------- | ----------------------------------------- |
| `README.md`       | 로컬 실행 방법, 환경변수, 실행·배포 환경과 Vercel 배포 방법    |
| `PROJECT_PLAN.md` | 서비스 문제 정의, AI 구조, 기능, 실용화 계획을 담은 상세 기획서   |
| `AGENTS.md`       | Solar Agent 역할, 응답 구조, 검증 원칙              |
| `AIdocument.md`   | 서비스 AI 모델, API 활용 위치, 프롬프트 설정과 테스트·검증 산출물 |
| `DEMO.md`         | 현재 LocalStorage 데모의 데이터 흐름과 한계            |
| `TEST_CASES.md`   | 세부 테스트 시나리오와 검증 항목 |

---

## 2. 실행 환경

### 2.1 필수 환경

* Node.js가 설치된 환경
* 인터넷 연결
* Upstage API Key
* 마이크가 연결된 PC 또는 모바일 기기
* ES Module과 Web Speech API를 지원하는 브라우저

### 2.2 권장 브라우저

* Google Chrome
* Microsoft Edge

Web Speech API와 MediaRecorder 지원은 브라우저마다 다르다. 음성 시연은 Chrome 또는 Edge에서 먼저 확인하는 것을 권장한다.

### 2.3 마이크 사용 조건

브라우저 마이크 권한이 필요하다.

일반적으로 마이크 기능은 다음 환경에서 사용해야 한다.

* `localhost`
* HTTPS가 적용된 배포 주소

브라우저 주소창 또는 사이트 설정에서 마이크 권한을 허용해야 한다.

---

## 3. 환경변수

현재 필수 환경변수는 하나다.

| 변수명               | 필수 | 사용 위치          | 설명                        |
| ----------------- | -- | -------------- | ------------------------- |
| `UPSTAGE_API_KEY` | 필수 | `api/solar.js` | Upstage Solar API 호출 인증 키 |

### 3.1 로컬 환경변수 파일

프로젝트 루트에 `.env.local` 파일을 만든다.

```env
UPSTAGE_API_KEY=여기에_본인의_Upstage_API_Key_입력
```

주의사항:

* API Key 앞뒤에 불필요한 공백을 넣지 않는다.
* 실제 키를 README, 코드, 화면 캡처, 커밋 기록에 포함하지 않는다.
* `.env.local`은 Git에 올리지 않는다.
* 브라우저 JavaScript 파일에 API Key를 직접 작성하지 않는다.
* API Key는 서버 함수인 `api/solar.js`에서만 읽는다.

### 3.2 환경변수와 코드 설정의 차이

`api.js`의 `AI_MODE`는 현재 코드 상수로 `solar`에 설정되어 있다.

```js
export const AI_MODE = AI_MODES.SOLAR;
```

`AI_MODE`는 현재 환경변수가 아니다. 실행 환경에서 변경하려면 코드를 수정해야 하므로, 제출본에서는 그대로 유지한다.

---

## 4. 로컬 실행 가이드

AI 서버 함수까지 포함한 전체 기능을 실행하려면 Vercel 개발 서버를 사용한다.

### 4.1 저장소 클론

```bash
git clone <저장소-주소>
cd <저장소-폴더>
```

이미 프로젝트 폴더가 있다면 해당 폴더로 이동한다.

### 4.2 필수 파일 확인

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

### 4.3 환경변수 설정

프로젝트 루트에 `.env.local`을 만든다.

```env
UPSTAGE_API_KEY=본인의_API_Key
```

### 4.4 Vercel 개발 서버 실행

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

### 4.5 브라우저 접속

브라우저에서 다음 파일을 직접 열지 말고 개발 서버 주소로 접속한다.

```text
http://localhost:3000
```

`file:///.../index.html` 형태로 직접 열면 ES Module, JSON fetch, 서버 API, 마이크 권한이 정상적으로 동작하지 않을 수 있다.

---

## 5. Vercel 배포 가이드

현재 서버 코드는 Vercel Serverless Function 구조인 `api/solar.js`를 사용한다.

### 5.1 Git 저장소 준비

변경 사항을 커밋하고 원격 저장소에 push한다.

```bash
git add .
git commit -m "docs: add project plan and setup guide"
git push origin <브랜치명>
```

### 5.2 Vercel 프로젝트 생성

#### Vercel 웹 대시보드

1. Vercel에 로그인한다.
2. 새 프로젝트를 생성한다.
3. GitHub 저장소를 Import한다.
4. 프로젝트 루트를 저장소 루트로 설정한다.
5. 별도의 빌드 명령 없이 정적 파일과 `api` 폴더를 배포한다.

#### Vercel CLI

```bash
npx vercel
```

터미널 안내에 따라 프로젝트를 연결한다.

### 5.3 배포 환경변수 등록

Vercel 프로젝트 설정의 Environment Variables에 다음 값을 추가한다.

```text
Name: UPSTAGE_API_KEY
Value: 본인의 Upstage API Key
```

적용 환경:

* Production
* Preview
* Development

필요한 환경에 각각 체크한다.

환경변수를 추가하거나 변경한 뒤에는 새로 배포해야 반영된다.

### 5.4 프로덕션 배포

Vercel 대시보드에서 재배포하거나 CLI를 사용할 수 있다.

```bash
npx vercel --prod
```

### 5.5 배포 후 확인

배포 주소에서 다음을 확인한다.

1. 메인 페이지와 로고가 정상 표시되는가
2. 브라우저 개발자 도구에 404 파일 오류가 없는가
3. 고민 분석 요청이 `/api/solar`로 전송되는가
4. 서버 응답에 API Key가 노출되지 않는가
5. 마이크 권한 요청이 나타나는가
6. 임산부 질문 저장 후 멘토 로그인에서 질문이 보이는가
7. 답변 후 임산부 프로필 알림이 나타나는가

---

## 6. 실행·배포 환경 정보

| 항목           | 로컬 개발                   | Vercel 배포                    |
| ------------ | ----------------------- | ---------------------------- |
| Frontend 제공  | Vercel Dev Server       | Vercel Static Hosting        |
| AI API       | `api/solar.js` 로컬 서버 함수 | Vercel Serverless Function   |
| 환경변수         | `.env.local`            | Vercel Environment Variables |
| 기본 API 경로    | `/api/solar`            | `/api/solar`                 |
| 데이터 저장       | 해당 브라우저 LocalStorage    | 접속한 각 브라우저의 LocalStorage     |
| 로그인 유지       | 현재 탭 SessionStorage     | 현재 탭 SessionStorage          |
| 마이크          | localhost 권한 필요         | HTTPS 사이트 권한 필요              |
| 다른 기기 데이터 공유 | 불가능                     | 불가능                          |

Vercel에 배포해도 질문과 답변 데이터는 서버 DB가 아니라 각 사용자의 브라우저 LocalStorage에 저장된다.

따라서 현재 배포본도 서로 다른 기기 사이의 실제 전달 서비스가 아니라 한 브라우저 안에서 전체 흐름을 시연하는 MVP다.
