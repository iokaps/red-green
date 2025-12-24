import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore, type GamePhase } from '@/state/stores/global-store';
import { useSnapshot } from '@kokimoki/app';
import { useEffect, useRef } from 'react';
import { useServerTimer } from './useServerTime';

/**
 * Get the next phase in the game cycle
 */
function getNextPhase(phase: GamePhase): GamePhase {
	switch (phase) {
		case 'go':
			return 'warning';
		case 'warning':
			return 'freeze';
		case 'freeze':
			return 'go';
		default:
			return phase;
	}
}

/**
 * Hook to control and modify the global state
 * @returns A boolean indicating if the current client is the global controller
 */
export function useGlobalController() {
	const {
		controllerConnectionId,
		gamePhase,
		phaseStartTimestamp,
		currentPhaseDuration,
		started
	} = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(250); // tick every 250ms for smoother phase transitions

	// Track if we're currently processing a phase transition
	const isTransitioningRef = useRef(false);
	// Track if traitor has been assigned for this game
	const traitorAssignedRef = useRef(false);

	// Maintain connection that is assigned to be the global controller
	useEffect(() => {
		// Check if global controller is online
		if (connectionIds.has(controllerConnectionId)) {
			return;
		}

		// Select new host, sorting by connection id
		kmClient
			.transact([globalStore], ([globalState]) => {
				const connectionIdsArray = Array.from(connectionIds);
				connectionIdsArray.sort();
				globalState.controllerConnectionId = connectionIdsArray[0] || '';
			})
			.then(() => {})
			.catch(() => {});
	}, [connectionIds, controllerConnectionId]);

	// Assign traitor when game starts (only once per game)
	useEffect(() => {
		if (!isGlobalController || !started || traitorAssignedRef.current) {
			return;
		}

		traitorAssignedRef.current = true;
		gameActions.assignTraitor().catch(console.error);
	}, [isGlobalController, started]);

	// Reset traitor tracking when game stops
	useEffect(() => {
		if (!started) {
			traitorAssignedRef.current = false;
		}
	}, [started]);

	// Game phase management
	useEffect(() => {
		if (!isGlobalController || !started) {
			return;
		}

		// Skip if not in an active game phase
		if (
			gamePhase === 'lobby' ||
			gamePhase === 'victory' ||
			!phaseStartTimestamp
		) {
			return;
		}

		// Check if phase duration has elapsed (use currentPhaseDuration from state)
		const phaseDuration = currentPhaseDuration;
		const elapsed = serverTime - phaseStartTimestamp;

		if (elapsed < phaseDuration || isTransitioningRef.current) {
			return;
		}

		// Prevent multiple transitions
		isTransitioningRef.current = true;

		const handlePhaseTransition = async () => {
			try {
				// Handle end-of-phase logic
				if (gamePhase === 'go') {
					// End of GO phase - calculate progress and update MVPs before WARNING
					await gameActions.calculateTeamProgress();
					await gameActions.updateMvpPlayers();
				} else if (gamePhase === 'freeze') {
					// End of FREEZE phase - check violations
					await gameActions.checkViolationsAndPenalize();

					// Check for victory
					const winner = await gameActions.checkVictory();
					if (winner) {
						await gameActions.setWinner(winner);
						return;
					}
				}

				// Clear shake reports before next phase
				await gameActions.clearShakeReports();

				// Transition to next phase
				const nextPhase = getNextPhase(gamePhase);
				await gameActions.transitionPhase(nextPhase);
			} catch (error) {
				console.error('Phase transition error:', error);
			} finally {
				isTransitioningRef.current = false;
			}
		};

		handlePhaseTransition();
	}, [isGlobalController, started, gamePhase, phaseStartTimestamp, serverTime]);

	return isGlobalController;
}
