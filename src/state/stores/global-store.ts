import { kmClient } from '@/services/km-client';

export type GamePhase =
	| 'lobby'
	| 'preview'
	| 'go'
	| 'warning'
	| 'freeze'
	| 'victory';
export type TeamId = 'red' | 'blue';
export type InputMode =
	| 'shake'
	| 'tap'
	| 'tilt'
	| 'swipe'
	| 'sound'
	| 'target'
	| 'spinner';

export interface TeamState {
	name: string;
	color: string;
	position: number;
	lastPenaltyTimestamp: number;
}

export interface ShakeReport {
	totalMagnitude: number;
	maxMagnitude: number;
	shakeCount: number;
	wasActive: boolean;
	timestamp: number;
}

export interface MvpPlayer {
	clientId: string;
	name: string;
	magnitude: number;
}

export interface GlobalState {
	controllerConnectionId: string;
	started: boolean;
	startTimestamp: number;
	players: Record<string, { name: string }>;
	showPresenterQr: boolean;

	// Game-specific state
	gamePhase: GamePhase;
	phaseStartTimestamp: number;
	currentPhaseDuration: number; // Variable phase length
	currentRound: number;
	currentInputMode: InputMode;

	teams: {
		red: TeamState;
		blue: TeamState;
	};

	playerTeams: Record<string, TeamId>; // clientId -> team
	shakeReports: Record<string, ShakeReport>; // clientId -> report
	winningTeam: TeamId | null;

	// MVP Spotlight
	mvpPlayers: {
		red: MvpPlayer | null;
		blue: MvpPlayer | null;
	};

	// Traitor Mode
	traitorEnabled: boolean;
	traitorId: string | null; // clientId of traitor
	traitorRevealed: boolean;
}

const initialState: GlobalState = {
	controllerConnectionId: '',
	started: false,
	startTimestamp: 0,
	players: {},
	showPresenterQr: true,

	// Game-specific initial state
	gamePhase: 'lobby',
	phaseStartTimestamp: 0,
	currentPhaseDuration: 0,
	currentInputMode: 'shake' as InputMode,
	currentRound: 1,

	teams: {
		red: {
			name: 'Red Thieves',
			color: '#ef4444',
			position: 0,
			lastPenaltyTimestamp: 0
		},
		blue: {
			name: 'Blue Bandits',
			color: '#3b82f6',
			position: 0,
			lastPenaltyTimestamp: 0
		}
	},

	playerTeams: {},
	shakeReports: {},
	winningTeam: null,

	// MVP Spotlight
	mvpPlayers: {
		red: null,
		blue: null
	},

	// Traitor Mode
	traitorEnabled: false,
	traitorId: null,
	traitorRevealed: false
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
