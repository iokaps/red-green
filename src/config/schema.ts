import { z } from '@kokimoki/kit';

export const schema = z.object({
	// translations
	title: z.string().default('My Game'),

	players: z.string().default('Players'),
	online: z.string().default('Online'),
	offline: z.string().default('Offline'),
	startButton: z.string().default('Start Game'),
	stopButton: z.string().default('Stop Game'),
	resetButton: z.string().default('Reset Game'),
	loading: z.string().default('Loading...'),

	createProfileMd: z.string().default('# Create your player profile'),
	playerNamePlaceholder: z.string().default('Your name...'),
	playerNameLabel: z.string().default('Name:'),
	playerNameButton: z.string().default('Continue'),

	playerLinkLabel: z.string().default('Player Link'),
	presenterLinkLabel: z.string().default('Presenter Link'),

	togglePresenterQrButton: z.string().default('Toggle Presenter QR'),

	menuAriaLabel: z.string().default('Open menu drawer'),
	menuHelpAriaLabel: z.string().default('Open help drawer'),

	// Game phase settings (fixed durations)
	goPhaseDurationMs: z.number().default(6000),
	warningPhaseDurationMs: z.number().default(2000),
	freezePhaseDurationMs: z.number().default(4500),

	// Variable phase length ranges
	goPhaseMinMs: z.number().default(4000),
	goPhaseMaxMs: z.number().default(8000),
	freezePhaseMinMs: z.number().default(3000),
	freezePhaseMaxMs: z.number().default(6000),
	variablePhasesEnabled: z.boolean().default(true),

	// Shake detection settings
	shakeThreshold: z.number().default(12),

	// Progress calculation weights
	magnitudeWeight: z.number().default(0.2),
	activeCountWeight: z.number().default(2),

	// Penalty settings
	freezeViolationThreshold: z.number().default(0.05),
	penaltyDistance: z.number().default(10),
	totalDistance: z.number().default(100),
	penaltyMultiplier: z.number().default(1.0),
	violationDetectionMode: z
		.enum(['strict', 'moderate', 'relaxed'])
		.default('moderate'),

	// Game settings
	minPlayersPerTeam: z.number().default(1),

	// Input mode settings
	inputModes: z
		.array(
			z.enum(['shake', 'tap', 'tilt', 'swipe', 'sound', 'target', 'spinner'])
		)
		.default(['shake', 'tap', 'tilt', 'swipe']),
	inputModeRotation: z.enum(['sequential', 'random']).default('sequential'),
	previewDurationMs: z.number().default(3000),

	// Input mode labels
	inputModeShakeLabel: z.string().default('🤲 SHAKE'),
	inputModeTapLabel: z.string().default('👆 TAP'),
	inputModeTiltLabel: z.string().default('⬅️➡️ TILT'),
	inputModeSwipeLabel: z.string().default('🔄 SWIPE'),
	inputModeSoundLabel: z.string().default('🔊 CLAP'),
	inputModeTargetLabel: z.string().default('🎯 TAP'),
	inputModeSpinnerLabel: z.string().default('🎡 SPIN'),

	// Input mode instructions
	inputModeShakeInstructions: z
		.string()
		.default('Shake your phone as hard as you can!'),
	inputModeTapInstructions: z
		.string()
		.default('Tap the screen as fast as possible!'),
	inputModeTiltInstructions: z
		.string()
		.default('Tilt your phone left and right!'),
	inputModeSwipeInstructions: z
		.string()
		.default('Swipe across the screen repeatedly!'),
	inputModeSoundInstructions: z
		.string()
		.default('Clap and cheer! Louder = more progress!'),
	inputModeTargetInstructions: z
		.string()
		.default('Tap the targets as fast as you can!'),
	inputModeSpinnerInstructions: z.string().default('Flick to spin the wheel!'),

	// Team selection view
	teamSelectTitle: z.string().default('Choose Your Team'),
	teamSelectDescription: z
		.string()
		.default('Pick a team and help them steal the trophy!'),
	motionPermissionDescription: z
		.string()
		.default(
			'This game uses your phone motion sensor. Please enable it to play.'
		),
	motionPermissionButton: z.string().default('Enable Motion Sensor'),
	motionPermissionGranted: z.string().default('Motion sensor enabled!'),

	// Team manager (host)
	teamManagerTitle: z.string().default('Team Manager'),
	teamManagerDescription: z
		.string()
		.default('Click the arrows to move players between teams'),
	teamsBalanced: z.string().default('Teams are balanced'),
	teamsUnbalanced: z.string().default('Teams unbalanced by {diff} players'),
	noPlayersOnTeam: z.string().default('No players yet'),
	unassignedPlayers: z.string().default('Unassigned Players'),
	moveToRed: z.string().default('Move to Red team'),
	moveToBlue: z.string().default('Move to Blue team'),
	redTeamShort: z.string().default('Red'),
	blueTeamShort: z.string().default('Blue'),

	// Game phase text
	goPhaseText: z.string().default('GO!'),
	warningPhaseText: z.string().default('WARNING!'),
	freezePhaseText: z.string().default('FREEZE!'),

	// Player game view
	shakeIntensityLabel: z.string().default('Shake Intensity'),
	movementDetected: z.string().default('⚠️ Movement detected!'),
	goPhaseInstruction: z
		.string()
		.default('Shake your phone to move your team forward!'),
	warningPhaseInstruction: z.string().default('Get ready to freeze...'),
	freezePhaseInstruction: z
		.string()
		.default('Hold perfectly still! Any movement = penalty!'),

	// Victory
	victoryText: z.string().default('WINS!'),
	waitingForTeam: z.string().default('Waiting for game to start...'),

	// MVP Spotlight
	mvpSpotlightEnabled: z.boolean().default(true),
	mvpLabel: z.string().default('⭐ TOP SHAKER'),

	// Traitor Mode
	traitorModeEnabled: z.boolean().default(false),
	traitorSecretMessage: z
		.string()
		.default(
			'🔥 You are the TRAITOR! Shake during FREEZE to help the other team!'
		),
	traitorRevealMessage: z.string().default('The traitor was revealed!')
});

export type Config = z.infer<typeof schema>;
