export const DEFAULT_AUDIO_FADE_SECONDS = 1;
export const MIN_AUDIO_FADE_SECONDS = 0;

/**
 * Linear fade multiplier (0 to 1) at `localTime` seconds into a clip.
 * When the two fades overlap, they multiply, so the clip still reaches silence
 * at both ends.
 */
export function resolveFadeGain({
	fadeInSeconds,
	fadeOutSeconds,
	localTime,
	durationSeconds,
}: {
	fadeInSeconds: number;
	fadeOutSeconds: number;
	localTime: number;
	durationSeconds: number;
}): number {
	let gain = 1;

	if (fadeInSeconds > 0 && localTime < fadeInSeconds) {
		gain *= Math.max(0, localTime / fadeInSeconds);
	}

	if (fadeOutSeconds > 0) {
		const remaining = durationSeconds - localTime;
		if (remaining < fadeOutSeconds) {
			gain *= Math.max(0, remaining / fadeOutSeconds);
		}
	}

	return gain;
}
