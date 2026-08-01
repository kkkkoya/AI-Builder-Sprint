import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createFallbackMatchResult,
  prepareExperienceArchiveForAi,
  selectExperienceCandidates,
  validateAiMatchResult,
} from "../matching.js";

const archive = JSON.parse(
  await readFile(
    new URL("../dummy_mentors.json", import.meta.url),
    "utf8"
  )
);

const analysis = {
  summary: "출산 후 경력 중단과 배우자 역할 갈등을 걱정하고 있다.",
  concerns: [
    {
      type: "경력 변화",
      description: "다시 일을 시작하지 못할까 걱정한다.",
      priority: 1,
    },
    {
      type: "배우자 관계",
      description: "육아 역할을 두고 갈등하고 있다.",
      priority: 2,
    },
  ],
  emotions: [
    {
      name: "불안",
      intensity: 80,
      evidence: "다시 일을 시작하지 못할까 걱정한다.",
    },
  ],
  situation: "출산 이후 경력과 가족 역할의 변화를 앞두고 있다.",
  needs: ["경력 회복 경험", "배우자와 역할을 조정한 경험"],
  standardTags: ["경력 단절", "재취업", "부부 갈등"],
  urgency: "normal",
};

test("Solar 후보는 최대 3개이며 민감한 원문을 포함하지 않는다", () => {
  const candidates = prepareExperienceArchiveForAi(analysis, archive);

  assert.equal(candidates.length, 3);
  assert.equal(new Set(candidates.map(({ experienceId }) => experienceId)).size, 3);

  for (const candidate of candidates) {
    assert.equal("transcript" in candidate, false);
    assert.equal("letter" in candidate, false);
    assert.equal("retrieval" in candidate, false);
  }
});

test("3개 후보 안에 관련도 1위와 감정 맥락 후보를 함께 둔다", () => {
  const candidates = selectExperienceCandidates(analysis, archive);

  assert.equal(candidates[0].experienceId, "experience-006");
  assert.ok(
    candidates.some((candidate) =>
      candidate.retrieval.emotionMatches.includes("불안")
    )
  );
});

test("Solar가 전달받지 않은 경험 ID를 반환하면 선택을 거부한다", () => {
  const allowedCandidates = prepareExperienceArchiveForAi(analysis, archive);
  const invalidResult = {
    selected: {
      mentorId: "mentor-001",
      experienceId: "experience-001",
      totalScore: 100,
    },
    alternatives: [],
    mentorQuestion: "경험을 들려주세요.",
  };

  const validated = validateAiMatchResult(
    invalidResult,
    archive,
    allowedCandidates
  );

  assert.equal(validated.selected, null);
});

test("fallback도 최신 계약과 같이 최종 경험 한 개만 반환한다", () => {
  const fallback = createFallbackMatchResult(analysis, archive);

  assert.ok(fallback.selected);
  assert.deepEqual(fallback.alternatives, []);
});
