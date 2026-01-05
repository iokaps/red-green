import { globalStore } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { useEffect, useRef } from 'react';

/**
 * Game audio controller
 * Plays sounds for game phase transitions and penalties
 * Note: Audio files (go.mp3, warning.mp3, etc.) need to be created in public/audio/
 */
export const GameAudioController = () => {
	const { gamePhase } = useSnapshot(globalStore.proxy);

	// Track previous phase to detect transitions
	const prevPhaseRef = useRef(gamePhase);

	useEffect(() => {
		if (prevPhaseRef.current !== gamePhase) {
			prevPhaseRef.current = gamePhase;

			// Audio playback would go here once audio files are available
			// console.log('Phase transition:', gamePhase);
		}
	}, [gamePhase]);

	// Track penalties
	const lastPenaltyTimestamps = useRef({ red: 0, blue: 0 });
	const { teams } = useSnapshot(globalStore.proxy);

	useEffect(() => {
		if (teams.red.lastPenaltyTimestamp > lastPenaltyTimestamps.current.red) {
			lastPenaltyTimestamps.current.red = teams.red.lastPenaltyTimestamp;
			// Penalty sound would play here
			// console.log('Red team penalty');
		}
		if (teams.blue.lastPenaltyTimestamp > lastPenaltyTimestamps.current.blue) {
			lastPenaltyTimestamps.current.blue = teams.blue.lastPenaltyTimestamp;
			// Penalty sound would play here
			// console.log('Blue team penalty');
		}
	}, [teams.red.lastPenaltyTimestamp, teams.blue.lastPenaltyTimestamp]);

	return null;
};
