import assert from "node:assert/strict";
import test from "node:test";

import { createImpactFeedback } from "../api.js";

test("확인되지 않은 고민 해소를 만든 감사 문장은 실제 임산부 반응으로 교체한다", async () => {
  const originalFetch = globalThis.fetch;
  const sentPayloads = [];
  globalThis.fetch = async (_url, options) => {
    sentPayloads.push(JSON.parse(options.body).payload);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          message: "이용자가 “마음이 조금 놓였어요”라고 전했습니다. 첫 출산의 두려움이 해소되었다니 다행입니다.",
          impactSummary: "두려움을 극복했습니다.",
          highlightedExperience: "첫 출산 경험",
        },
      }),
    };
  };

  try {
    const result = await createImpactFeedback({
      reaction: "마음이 조금 놓였어요",
      concernSummary: "첫 출산이 두렵다.",
      selectedMatch: {
        experienceTitle: "첫 출산의 두려움을 지나온 경험",
      },
    });

    assert.equal(sentPayloads.length, 1);
    assert.deepEqual(sentPayloads[0], {
      reaction: "마음이 조금 놓였어요",
    });
    assert.equal(result.ok, true);
    assert.equal(result.meta.usedFallback, true);
    assert.match(result.data.message, /마음이 조금 놓였어요/);
    assert.doesNotMatch(result.data.message, /첫 출산|해소|다행|극복/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("임산부의 실제 반응을 그대로 전달한 Solar 감사 문장은 유지한다", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      data: {
        message: "이용자가 “혼자가 아닌 것 같아요”라고 마음을 전했습니다. 선생님의 경험을 읽고 직접 남긴 감사의 반응입니다.",
        impactSummary: "이용자가 “혼자가 아닌 것 같아요”라는 반응을 남겼습니다.",
        highlightedExperience: "",
      },
    }),
  });

  try {
    const result = await createImpactFeedback({
      reaction: "혼자가 아닌 것 같아요",
      concernSummary: "전송하지 않아야 하는 고민 요약",
    });

    assert.equal(result.ok, true);
    assert.equal(result.meta.usedFallback, false);
    assert.match(result.data.message, /혼자가 아닌 것 같아요/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
