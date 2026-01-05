import { globalStore } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { useKmAudioContext } from '@kokimoki/shared';
import { useEffect, useRef } from 'react';

export const GameAudioController = () => {
	const { playSound } = useKmAudioContext();
	const { gamePhase } = useSnapshot(globalStore.proxy);

	// Track previous phase to detect transitions
	const prevPhaseRef = useRef(gamePhase);

	useEffect(() => {
		if (prevPhaseRef.current !== gamePhase) {
			prevPhaseRef.current = gamePhase;

			// Phase transition sounds
			if (gamePhase === 'go') {
				playSound('go');
			} else if (gamePhase === 'warning') {
				playSound('warning');
			} else if (gamePhase === 'freeze') {
				playSound('freeze');
			} else if (gamePhase === 'victory') {
				playSound('victory');
			}
		}
	}, [gamePhase, playSound]);

	// Track penalties
	const lastPenaltyTimestamps = useRef({ red: 0, blue: 0 });
	const { teams } = useSnapshot(globalStore.proxy);

	useEffect(() => {
		if (teams.red.lastPenaltyTimestamp > lastPenaltyTimestamps.current.red) {
			lastPenaltyTimestamps.current.red = teams.red.lastPenaltyTimestamp;
			playSound('penalty');
		}
		if (teams.blue.lastPenaltyTimestamp > lastPenaltyTimestamps.current.blue) {
			lastPenaltyTimestamps.current.blue = teams.blue.lastPenaltyTimestamp;
			playSound('penalty');
		}
	}, [
		teams.red.lastPenaltyTimestamp,
		teams.blue.lastPenaltyTimestamp,
		playSound
	]);

	return null;
};
