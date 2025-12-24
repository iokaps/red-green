import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import {
	globalStore,
	type GamePhase,
	type MvpPlayer,
	type ShakeReport,
	type TeamId
} from '../stores/global-store';
import { playerStore } from '../stores/player-store';

/**
 * Generate a random duration within a range
 */
function getRandomDuration(minMs: number, maxMs: number): number {
	return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export const gameActions = {
	/**
	 * Join a team (player action)
	 */
	async joinTeam(teamId: TeamId) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.playerTeams[kmClient.id] = teamId;
		});
	},

	/**
	 * Leave current team (player action)
	 */
	async leaveTeam() {
		await kmClient.transact([globalStore], ([globalState]) => {
			delete globalState.playerTeams[kmClient.id];
		});
	},

	/**
	 * Reassign a player to a different team (host action)
	 */
	async reassignPlayer(clientId: string, teamId: TeamId) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.playerTeams[clientId] = teamId;
		});
	},

	/**
	 * Submit shake report for current player
	 */
	async submitShakeReport(report: Omit<ShakeReport, 'timestamp'>) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.shakeReports[kmClient.id] = {
				...report,
				timestamp: kmClient.serverTimestamp()
			};
		});
	},

	/**
	 * Clear all shake reports (called by controller between phases)
	 */
	async clearShakeReports() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.shakeReports = {};
		});
	},

	/**
	 * Transition to a new game phase
	 */
	async transitionPhase(phase: GamePhase) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.gamePhase = phase;
			globalState.phaseStartTimestamp = kmClient.serverTimestamp();

			// Calculate variable duration if enabled
			if (config.variablePhasesEnabled) {
				if (phase === 'go') {
					globalState.currentPhaseDuration = getRandomDuration(
						config.goPhaseMinMs,
						config.goPhaseMaxMs
					);
				} else if (phase === 'freeze') {
					globalState.currentPhaseDuration = getRandomDuration(
						config.freezePhaseMinMs,
						config.freezePhaseMaxMs
					);
				} else if (phase === 'warning') {
					globalState.currentPhaseDuration = config.warningPhaseDurationMs;
				}
			} else {
				// Use fixed durations
				if (phase === 'go') {
					globalState.currentPhaseDuration = config.goPhaseDurationMs;
				} else if (phase === 'freeze') {
					globalState.currentPhaseDuration = config.freezePhaseDurationMs;
				} else if (phase === 'warning') {
					globalState.currentPhaseDuration = config.warningPhaseDurationMs;
				}
			}
		});
	},

	/**
	 * Calculate and apply team progress from shake reports (called at end of GO phase)
	 */
	async calculateTeamProgress() {
		await kmClient.transact([globalStore], ([globalState]) => {
			const { magnitudeWeight, activeCountWeight, totalDistance } = config;

			// Calculate progress for each team
			for (const teamId of ['red', 'blue'] as const) {
				// Get all players on this team
				const teamPlayers = Object.entries(globalState.playerTeams)
					.filter(([, team]) => team === teamId)
					.map(([clientId]) => clientId);

				// Sum up shake data from reports
				let totalMagnitude = 0;
				let activeCount = 0;

				for (const playerId of teamPlayers) {
					const report = globalState.shakeReports[playerId];
					if (report && report.wasActive) {
						totalMagnitude += report.totalMagnitude;
						activeCount++;
					}
				}

				// Calculate progress
				const progress =
					totalMagnitude * magnitudeWeight + activeCount * activeCountWeight;

				// Update team position
				globalState.teams[teamId].position = Math.min(
					globalState.teams[teamId].position + progress,
					totalDistance
				);
			}
		});
	},

	/**
	 * Update MVP players based on shake reports (called at end of GO phase)
	 */
	async updateMvpPlayers() {
		if (!config.mvpSpotlightEnabled) {
			return;
		}

		await kmClient.transact([globalStore], ([globalState]) => {
			// Find top shaker for each team
			for (const teamId of ['red', 'blue'] as const) {
				const teamPlayers = Object.entries(globalState.playerTeams)
					.filter(([, team]) => team === teamId)
					.map(([clientId]) => clientId);

				let topPlayer: MvpPlayer | null = null;

				for (const playerId of teamPlayers) {
					const report = globalState.shakeReports[playerId];
					const playerInfo = globalState.players[playerId];

					if (report && report.wasActive && playerInfo) {
						if (!topPlayer || report.totalMagnitude > topPlayer.magnitude) {
							topPlayer = {
								clientId: playerId,
								name: playerInfo.name,
								magnitude: report.totalMagnitude
							};
						}
					}
				}

				globalState.mvpPlayers[teamId] = topPlayer;
			}
		});
	},

	/**
	 * Check for freeze violations and apply penalties
	 * Traitor's shake during freeze helps the OPPOSING team
	 */
	async checkViolationsAndPenalize() {
		await kmClient.transact([globalStore], ([globalState]) => {
			const { freezeViolationThreshold, penaltyDistance } = config;
			const traitorId = globalState.traitorId;

			for (const teamId of ['red', 'blue'] as const) {
				const opposingTeamId = teamId === 'red' ? 'blue' : 'red';

				// Get all players on this team
				const teamPlayers = Object.entries(globalState.playerTeams)
					.filter(([, team]) => team === teamId)
					.map(([clientId]) => clientId);

				if (teamPlayers.length === 0) {
					continue;
				}

				// Count violators (players who moved during freeze)
				let violatorCount = 0;
				let traitorViolated = false;

				for (const playerId of teamPlayers) {
					const report = globalState.shakeReports[playerId];
					if (report && report.wasActive) {
						// Check if this is the traitor
						if (playerId === traitorId && globalState.traitorEnabled) {
							traitorViolated = true;
							// Traitor doesn't count toward team's violation
						} else {
							violatorCount++;
						}
					}
				}

				// Check if violation threshold exceeded (excluding traitor)
				const nonTraitorCount = teamPlayers.filter(
					(id) => id !== traitorId
				).length;
				const violationRate =
					nonTraitorCount > 0 ? violatorCount / nonTraitorCount : 0;

				if (violationRate >= freezeViolationThreshold) {
					// Apply penalty to this team
					globalState.teams[teamId].position = Math.max(
						0,
						globalState.teams[teamId].position - penaltyDistance
					);
					globalState.teams[teamId].lastPenaltyTimestamp =
						kmClient.serverTimestamp();
				}

				// Traitor's violation helps the opposing team advance
				if (traitorViolated) {
					const traitorReport = globalState.shakeReports[traitorId!];
					if (traitorReport) {
						// Give opposing team a small boost based on traitor's shake
						const traitorBoost = traitorReport.totalMagnitude * 0.005;
						globalState.teams[opposingTeamId].position = Math.min(
							config.totalDistance,
							globalState.teams[opposingTeamId].position + traitorBoost
						);
					}
				}
			}
		});
	},

	/**
	 * Check if any team has won
	 */
	async checkVictory(): Promise<TeamId | null> {
		const { totalDistance } = config;
		const { teams } = globalStore.proxy;

		if (teams.red.position >= totalDistance) {
			return 'red';
		}
		if (teams.blue.position >= totalDistance) {
			return 'blue';
		}
		return null;
	},

	/**
	 * Set the winning team and transition to victory phase
	 */
	async setWinner(teamId: TeamId) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.winningTeam = teamId;
			globalState.gamePhase = 'victory';
			globalState.phaseStartTimestamp = kmClient.serverTimestamp();
			// Reveal traitor on victory
			if (globalState.traitorEnabled && globalState.traitorId) {
				globalState.traitorRevealed = true;
			}
		});
	},

	/**
	 * Assign a random traitor from all players (called at game start)
	 */
	async assignTraitor() {
		if (!config.traitorModeEnabled) {
			return;
		}

		await kmClient.transact([globalStore], ([globalState]) => {
			const allPlayers = Object.keys(globalState.playerTeams);
			if (allPlayers.length < 4) {
				// Need at least 4 players for traitor mode
				globalState.traitorEnabled = false;
				globalState.traitorId = null;
				return;
			}

			// Pick a random player as traitor
			const randomIndex = Math.floor(Math.random() * allPlayers.length);
			globalState.traitorEnabled = true;
			globalState.traitorId = allPlayers[randomIndex];
			globalState.traitorRevealed = false;
		});
	},

	/**
	 * Reset game to lobby state
	 */
	async resetGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.gamePhase = 'lobby';
			globalState.phaseStartTimestamp = 0;
			globalState.currentPhaseDuration = 0;
			globalState.teams.red.position = 0;
			globalState.teams.red.lastPenaltyTimestamp = 0;
			globalState.teams.blue.position = 0;
			globalState.teams.blue.lastPenaltyTimestamp = 0;
			globalState.shakeReports = {};
			globalState.winningTeam = null;
			globalState.started = false;
			globalState.startTimestamp = 0;
			// Reset MVP
			globalState.mvpPlayers = { red: null, blue: null };
			// Reset traitor
			globalState.traitorEnabled = false;
			globalState.traitorId = null;
			globalState.traitorRevealed = false;
		});
	},

	/**
	 * Set player's motion permission status
	 */
	async setMotionPermission(granted: boolean) {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.motionPermissionGranted = granted;
		});
	}
};
