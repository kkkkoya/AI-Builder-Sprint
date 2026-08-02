import assert from "node:assert/strict";
import test from "node:test";

import handler from "../api/solar.js";

const validAnalysis = {
  route: "IN_SCOPE",
  needsClarification: false,
  clarifyingQuestion: "",
  response: "",
  analysis: {
    summary: "출산 이후 경력 복귀를 걱정하고 있다.",
    concerns: [
      {
        type: "경력 변화",
        description: "다시 일하지 못할까 걱정한다.",
        priority: 1,
      },
    ],
    emotions: [
      {
        name: "불안",
        intensity: 80,
        evidence: "다시 일하지 못할까 봐 걱정돼요.",
      },
    ],
    situation: "출산 이후 복귀를 앞두고 있다.",
    needs: ["경력 회복 경험"],
    standardTags: ["경력 단절"],
    urgency: "normal",
  },
};

const validMentorResult = {
  answerCheck: {
    status: "VALID",
    reason: "실제 경험이 포함되어 있습니다.",
    followUpQuestion: "",
  },
  processingStatus: "COMPLETED",
  experienceCard: {
    title: "육아로 힘들었던 경험",
    summary: "아이를 돌보며 잠이 부족해 힘들었던 경험이다.",
    timeline: ["아이를 돌봄"],
    emotions: ["힘듦"],
    helpTypes: ["실제 경험"],
    standardTags: ["수면 부족"],
  },
  letter: "저도 아이를 돌보며 잠이 부족해 힘들었어요.",
  edits: [],
  fidelity: { preservedMeaning: true, addedFacts: [], warnings: [] },
  safety: { riskLevel: "safe", flags: [], guidance: "" },
};

function upstreamResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => null,
    },
    json: async () => body,
  };
}

function successfulCompletion(content) {
  return upstreamResponse(200, {
    choices: [
      {
        message: {
          content:
            typeof content === "string"
              ? content
              : JSON.stringify(content),
        },
      },
    ],
  });
}

async function invoke(action, payload) {
  let statusCode = 0;
  let body = null;

  await handler(
    {
      method: "POST",
      body: { action, payload },
    },
    {
      setHeader() {},
      status(value) {
        statusCode = value;
        return this;
      },
      json(value) {
        body = value;
        return value;
      },
    }
  );

  return { statusCode, body };
}

test("빠른 1차 요청에는 reasoning_effort를 보내지 않는다", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.UPSTAGE_API_KEY;
  const requestBodies = [];

  process.env.UPSTAGE_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    requestBodies.push(JSON.parse(options.body));
    return successfulCompletion(validAnalysis);
  };

  try {
    const result = await invoke("analyze-concern", {
      text: "출산 후 복귀가 걱정돼요.",
      history: [],
    });

    assert.equal(result.statusCode, 200);
    assert.equal(result.body.ok, true);
    assert.equal(requestBodies.length, 1);
    assert.equal("reasoning_effort" in requestBodies[0], false);
    assert.equal(requestBodies[0].max_tokens, 1200);
    assert.equal("response_format" in requestBodies[0], false);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.UPSTAGE_API_KEY = originalKey;
  }
});

test("구조가 복잡한 작업은 첫 요청부터 JSON 모드를 사용한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.UPSTAGE_API_KEY;
  const requestBodies = [];

  process.env.UPSTAGE_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    requestBodies.push(JSON.parse(options.body));
    return successfulCompletion({
      answerCheck: {
        status: "VALID",
        reason: "실제 경험이 포함되어 있습니다.",
        followUpQuestion: "",
      },
      processingStatus: "COMPLETED",
      experienceCard: {
        title: "일을 쉬었던 경험",
        summary: "아이를 낳고 일을 쉬었던 경험이다.",
        timeline: ["아이를 낳고 일을 쉼"],
        emotions: [],
        helpTypes: ["경력 단절 경험"],
        standardTags: ["경력 단절"],
      },
      letter: "저도 아이를 낳고 일을 쉬었습니다.",
      edits: [],
      fidelity: {
        preservedMeaning: true,
        addedFacts: [],
        warnings: [],
      },
      safety: {
        riskLevel: "safe",
        flags: [],
        guidance: "개인의 경험입니다.",
      },
    });
  };

  try {
    const result = await invoke("process-mentor-answer", {
      question: "경험을 들려주세요.",
      transcript: "저도 아이를 낳고 일을 쉬었습니다.",
      selectedMatch: {
        mentorId: "mentor-003",
        experienceId: "experience-006",
      },
    });

    assert.equal(result.statusCode, 200);
    assert.deepEqual(requestBodies[0].response_format, {
      type: "json_object",
    });
    assert.equal(requestBodies[0].max_tokens, 1800);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.UPSTAGE_API_KEY = originalKey;
  }
});

test("선택된 경험 연결 정보가 없어도 어르신 답변을 정리한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.UPSTAGE_API_KEY;
  let userPayload;

  process.env.UPSTAGE_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    const requestBody = JSON.parse(options.body);
    userPayload = JSON.parse(requestBody.messages.at(-1).content);
    return successfulCompletion(validMentorResult);
  };

  try {
    const result = await invoke("process-mentor-answer", {
      question: "육아 경험을 들려주세요.",
      transcript: "저도 아이를 돌보며 잠을 못 자서 많이 힘들었어요.",
    });

    assert.equal(result.statusCode, 200);
    assert.equal(userPayload.selectedMatch, null);
    assert.equal(result.body.data.processingStatus, "COMPLETED");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.UPSTAGE_API_KEY = originalKey;
  }
});

test("선택 매개변수가 거부되면 기본 요청으로 복구한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.UPSTAGE_API_KEY;
  const requestBodies = [];

  process.env.UPSTAGE_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    const requestBody = JSON.parse(options.body);
    requestBodies.push(requestBody);

    if (requestBodies.length === 1) {
      return upstreamResponse(400, {
        error: { message: "unsupported parameter: max_tokens" },
      });
    }

    return successfulCompletion(validAnalysis);
  };

  try {
    const result = await invoke("analyze-concern", {
      text: "출산 후 복귀가 걱정돼요.",
      history: [],
    });

    assert.equal(result.statusCode, 200);
    assert.equal(requestBodies.length, 2);
    assert.equal("max_tokens" in requestBodies[1], false);
    assert.equal("response_format" in requestBodies[1], false);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.UPSTAGE_API_KEY = originalKey;
  }
});

test("형식이 불완전한 Solar 응답은 성공으로 위장하지 않는다", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.UPSTAGE_API_KEY;
  const originalConsoleError = console.error;

  process.env.UPSTAGE_API_KEY = "test-key";
  console.error = () => {};
  globalThis.fetch = async () =>
    successfulCompletion({
      experienceCard: {},
      letter: "",
    });

  try {
    const result = await invoke("process-mentor-answer", {
      question: "경험을 들려주세요.",
      transcript: "저도 일을 쉬었습니다.",
      selectedMatch: {
        mentorId: "mentor-003",
        experienceId: "experience-006",
      },
    });

    assert.equal(result.statusCode, 502);
    assert.equal(result.body.ok, false);
    assert.equal(result.body.error.code, "SOLAR_INVALID_RESPONSE");
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    process.env.UPSTAGE_API_KEY = originalKey;
  }
});

test("일시적인 Upstage 서버 오류는 한 번 재시도한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.UPSTAGE_API_KEY;
  let requestCount = 0;

  process.env.UPSTAGE_API_KEY = "test-key";
  globalThis.fetch = async () => {
    requestCount += 1;

    if (requestCount === 1) {
      return upstreamResponse(503, {
        error: { message: "temporarily unavailable" },
      });
    }

    return successfulCompletion(validAnalysis);
  };

  try {
    const result = await invoke("analyze-concern", {
      text: "출산 후 복귀가 걱정돼요.",
      history: [],
    });

    assert.equal(result.statusCode, 200);
    assert.equal(result.body.ok, true);
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.UPSTAGE_API_KEY = originalKey;
  }
});
