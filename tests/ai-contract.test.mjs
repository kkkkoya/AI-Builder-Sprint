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

test("Solar 후보는 관련도 1위 한 개이며 민감한 원문을 포함하지 않는다", () => {
  const candidates = prepareExperienceArchiveForAi(analysis, archive);

  assert.equal(candidates.length, 1);

  for (const candidate of candidates) {
    assert.equal("transcript" in candidate, false);
    assert.equal("letter" in candidate, false);
    assert.equal("retrieval" in candidate, false);
  }
});

test("규칙 검색 결과의 관련도 1위 경험만 Solar 후보로 사용한다", () => {
  const candidates = selectExperienceCandidates(analysis, archive);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].experienceId, "experience-006");
  assert.ok(candidates[0].retrieval.retrievalScore > 0);
  assert.ok(
    candidates[0].retrieval.exactTagMatches.length > 0 ||
      candidates[0].retrieval.relatedTagMatches.length > 0 ||
      candidates[0].retrieval.needMatches.length > 0 ||
      candidates[0].retrieval.emotionMatches.length > 0
  );
});

test("서버 매칭 계약도 후보 한 개와 적합성 검토 역할로 통일한다", async () => {
  const source = await readFile(
    new URL("../api/solar.js", import.meta.url),
    "utf8"
  );
  const matchPrompt = source.slice(
    source.indexOf('너는 "이어봄"의 Experience Match Judge'),
    source.indexOf('function normalizeCompactScores')
  );

  assert.match(source, /const MAX_MATCH_CANDIDATES = 1;/);
  assert.match(matchPrompt, /관련도 1위 경험 한 개/);
  assert.doesNotMatch(matchPrompt, /답변 유효성 판정/);
  assert.match(
    source,
    /"analyze-concern": \{\s*timeoutMs: 20000,\s*maxTokens: 1200,/
  );
  assert.match(
    source,
    /"match-experience": \{\s*timeoutMs: 25000,\s*maxTokens: 900,/
  );
  assert.match(
    source,
    /"process-mentor-answer": \{\s*timeoutMs: 30000,\s*maxTokens: 1800,/
  );
  assert.match(
    source,
    /"create-impact-feedback": \{\s*timeoutMs: 15000,\s*maxTokens: 500,/
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

test("최종 선택 뒤에는 실제 아카이브 원문과 편지를 복원한다", () => {
  const allowedCandidates = prepareExperienceArchiveForAi(analysis, archive);
  const selectedCandidate = allowedCandidates[0];
  const validated = validateAiMatchResult(
    {
      selected: {
        mentorId: selectedCandidate.mentorId,
        experienceId: selectedCandidate.experienceId,
        totalScore: 80,
      },
      alternatives: [],
      mentorQuestion: "경험을 들려주세요.",
    },
    archive,
    allowedCandidates
  );

  assert.ok(validated.selected.transcript);
  assert.ok(validated.selected.letter);
  assert.equal(validated.selected.experienceTitle, selectedCandidate.title);
});

test("fallback도 최신 계약과 같이 최종 경험 한 개만 반환한다", () => {
  const fallback = createFallbackMatchResult(analysis, archive);

  assert.ok(fallback.selected);
  assert.deepEqual(fallback.alternatives, []);
});
