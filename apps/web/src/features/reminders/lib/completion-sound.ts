let completionAudioContext: AudioContext | null = null;
let resumePromise: Promise<void> | null = null;

const getAudioContext = () => {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return null;
  }

  completionAudioContext ??= new AudioContext({ latencyHint: "interactive" });
  return completionAudioContext;
};

const resumeAudioContext = (context: AudioContext) => {
  if (context.state !== "suspended") return Promise.resolve();

  resumePromise ??= context.resume().finally(() => {
    resumePromise = null;
  });
  return resumePromise;
};

const playChime = (context: AudioContext) => {
  const startedAt = context.currentTime;
  const notes = [
    { frequency: 659.25, offset: 0 },
    { frequency: 880, offset: 0.065 },
  ];

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStartedAt = startedAt + note.offset;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, noteStartedAt);

    gain.gain.setValueAtTime(0.0001, noteStartedAt);
    gain.gain.exponentialRampToValueAtTime(0.055, noteStartedAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStartedAt + 0.24);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStartedAt);
    oscillator.stop(noteStartedAt + 0.25);
  }
};

export const playReminderCompletionSound = () => {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    void resumeAudioContext(context)
      .then(() => playChime(context))
      .catch(() => undefined);
    return;
  }

  playChime(context);
};

export const prepareReminderCompletionSound = () => {
  const context = getAudioContext();
  if (!context || context.state !== "suspended") return;
  void resumeAudioContext(context).catch(() => undefined);
};
