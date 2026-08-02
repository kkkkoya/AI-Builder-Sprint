import assert from "node:assert/strict";
import test from "node:test";

import { startRecordingAndTranscription } from "../stt.js";

function installRecordingFakes() {
  let recognitionInstance;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalWindow = globalThis.window;
  const originalMediaRecorder = globalThis.MediaRecorder;
  const originalFileReader = globalThis.FileReader;

  class FakeRecognition {
    constructor() {
      recognitionInstance = this;
    }
    start() {
      this.onstart?.();
    }
    stop() {}
  }

  class FakeMediaRecorder {
    constructor() {
      this.state = "inactive";
    }
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      queueMicrotask(() => this.onstop?.());
    }
  }

  class FakeFileReader {
    readAsDataURL() {
      this.result = "data:audio/webm;base64,dGVzdA==";
      queueMicrotask(() => this.onloadend?.());
    }
  }

  const track = { stop() {} };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [track] }) } },
  });
  globalThis.window = {
    SpeechRecognition: FakeRecognition,
    MediaRecorder: FakeMediaRecorder,
  };
  globalThis.MediaRecorder = FakeMediaRecorder;
  globalThis.FileReader = FakeFileReader;

  return {
    getRecognition: () => recognitionInstance,
    restore() {
      if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
      else delete globalThis.navigator;
      globalThis.window = originalWindow;
      globalThis.MediaRecorder = originalMediaRecorder;
      globalThis.FileReader = originalFileReader;
    },
  };
}

test("중간 음성 인식 문장도 녹음 종료 시 transcript로 보존한다", async () => {
  const fake = installRecordingFakes();
  try {
    const stop = await startRecordingAndTranscription({});
    const interimResult = { 0: { transcript: "아이를 키울 때 많이 힘들었어요" }, isFinal: false };
    fake.getRecognition().onresult({ resultIndex: 0, results: [interimResult] });

    const result = await stop();
    assert.equal(result.transcript, "아이를 키울 때 많이 힘들었어요");
    assert.match(result.audioDataUrl, /^data:audio\/webm/);
  } finally {
    fake.restore();
  }
});

test("이미 녹음 중이면 두 번째 녹음 시작을 거부한다", async () => {
  const fake = installRecordingFakes();
  try {
    const stop = await startRecordingAndTranscription({});
    await assert.rejects(
      startRecordingAndTranscription({}),
      /already in progress/
    );
    await stop();
  } finally {
    fake.restore();
  }
});
