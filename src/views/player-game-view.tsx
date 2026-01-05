import { config } from '@/config';
import { useAccelerometer } from '@/hooks/useAccelerometer';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore, type GamePhase } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { cn } from '@/utils/cn';
import { useSnapshot } from '@kokimoki/app';
import { KmTimeCountdown } from '@kokimoki/shared';
import * as React from 'react';
import { RoundPreviewView } from './round-preview-view';

/**
 * Get phase display configuration - uses currentPhaseDuration from state
 */
function getPhaseConfig(phase: GamePhase, currentPhaseDuration: number) {
	// Use variable duration from state if available, else fallback to config
	const getDuration = () => {
		if (currentPhaseDuration > 0) {
			return currentPhaseDuration;
		}
		switch (phase) {
			case 'go':
				return config.goPhaseDurationMs;
			case 'warning':
				return config.warningPhaseDurationMs;
			case 'freeze':
				return config.freezePhaseDurationMs;
			default:
				return 0;
		}
	};
	switch (phase) {
		case 'go':
			return {
				text: config.goPhaseText,
				bgColor: 'bg-green-500',
				textColor: 'text-white',
				duration: getDuration()
			};
		case 'warning':
			return {
				text: config.warningPhaseText,
				bgColor: 'bg-yellow-400',
				textColor: 'text-yellow-900',
				duration: getDuration()
			};
		case 'freeze':
			return {
				text: config.freezePhaseText,
				bgColor: 'bg-red-500',
				textColor: 'text-white',
				duration: getDuration()
			};
		default:
			return {
				text: '',
				bgColor: 'bg-slate-500',
				textColor: 'text-white',
				duration: 0
			};
	}
}

export const PlayerGameView: React.FC = () => {
	const {
		gamePhase,
		phaseStartTimestamp,
		currentPhaseDuration,
		currentRound,
		currentInputMode,
		playerTeams,
		teams,
		traitorEnabled,
		traitorId
	} = useSnapshot(globalStore.proxy);
	const { motionPermissionGranted } = useSnapshot(playerStore.proxy);
	const serverTime = useServerTimer(100);
	const { data, isShaking, requestPermission, permissionGranted } =
		useAccelerometer({
			threshold: config.shakeThreshold
		});

	// Auto-request permission if it was granted before (stored in playerStore)
	React.useEffect(() => {
		if (motionPermissionGranted && !permissionGranted) {
			requestPermission();
		}
	}, [motionPermissionGranted, permissionGranted, requestPermission]);

	// Check if current player is the traitor
	const isTraitor = traitorEnabled && traitorId === kmClient.id;

	// Track penalty flash
	const [penaltyFlash, setPenaltyFlash] = React.useState(false);
	const lastPenaltyTimestampRef = React.useRef(0);

	// Track accumulated shake data for this phase
	const shakeDataRef = React.useRef({
		totalMagnitude: 0,
		maxMagnitude: 0,
		shakeCount: 0,
		wasActive: false,
		phaseTimestamp: 0
	});

	// Get player's team
	const myTeamId = playerTeams[kmClient.id];
	const myTeam = myTeamId ? teams[myTeamId] : null;

	// Track penalty flash on last penalty update
	React.useEffect(() => {
		if (!myTeam) return;
		if (myTeam.lastPenaltyTimestamp > lastPenaltyTimestampRef.current) {
			lastPenaltyTimestampRef.current = myTeam.lastPenaltyTimestamp;
			setPenaltyFlash(true);
			setTimeout(() => setPenaltyFlash(false), 1000);
		}
	}, [myTeam?.lastPenaltyTimestamp]);

	// Get phase config
	const phaseConfig = getPhaseConfig(gamePhase, currentPhaseDuration);
	const timeRemaining = Math.max(
		0,
		phaseConfig.duration - (serverTime - phaseStartTimestamp)
	);

	// Reset shake data when phase changes
	React.useEffect(() => {
		if (phaseStartTimestamp !== shakeDataRef.current.phaseTimestamp) {
			shakeDataRef.current = {
				totalMagnitude: 0,
				maxMagnitude: 0,
				shakeCount: 0,
				wasActive: false,
				phaseTimestamp: phaseStartTimestamp
			};
		}
	}, [phaseStartTimestamp]);

	// Track shake data during GO phase (accumulate for progress)
	// or FREEZE phase (detect violations)
	React.useEffect(() => {
		if (!data || (gamePhase !== 'go' && gamePhase !== 'freeze')) {
			return;
		}

		const ref = shakeDataRef.current;
		ref.totalMagnitude += data.magnitude;
		ref.maxMagnitude = Math.max(ref.maxMagnitude, data.magnitude);

		if (isShaking) {
			ref.shakeCount++;
			ref.wasActive = true;
		}
	}, [data, isShaking, gamePhase]);

	// Submit shake report when phase ends (detected by phase change)
	const lastPhaseRef = React.useRef(gamePhase);
	React.useEffect(() => {
		if (lastPhaseRef.current !== gamePhase) {
			const prevPhase = lastPhaseRef.current;
			lastPhaseRef.current = gamePhase;

			// Submit report for GO or FREEZE phases
			if (prevPhase === 'go' || prevPhase === 'freeze') {
				const ref = shakeDataRef.current;
				gameActions.submitShakeReport({
					totalMagnitude: ref.totalMagnitude,
					maxMagnitude: ref.maxMagnitude,
					shakeCount: ref.shakeCount,
					wasActive: ref.wasActive
				});
			}
		}
	}, [gamePhase]);

	// Calculate shake intensity for visual feedback (0-100)
	const shakeIntensity = data
		? Math.min(100, (data.magnitude / config.shakeThreshold) * 50)
		: 0;

	// Show preview before GO phase
	if (gamePhase === 'preview') {
		return (
			<RoundPreviewView
				inputMode={currentInputMode}
				roundNumber={currentRound}
			/>
		);
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-6">
			{/* Traitor Secret Message */}
			{isTraitor && (
				<div className="w-full max-w-md rounded-xl border-2 border-amber-500 bg-amber-50 p-4 text-center">
					<p className="text-sm font-medium text-amber-800">
						{config.traitorSecretMessage}
					</p>
				</div>
			)}

			{/* Phase Indicator */}
			<div
				className={cn(
					'flex w-full max-w-md flex-col items-center gap-4 rounded-2xl p-8 shadow-lg transition-colors',
					phaseConfig.bgColor,
					phaseConfig.textColor
				)}
			>
				<div className="text-lg font-bold opacity-80">ROUND {currentRound}</div>
				<h1 className="text-4xl font-black tracking-tight">
					{phaseConfig.text}
				</h1>
				<div className="text-6xl font-bold tabular-nums">
					<KmTimeCountdown ms={timeRemaining} display="s" />
				</div>
			</div>

			{/* Shake Indicator */}
			<div className="w-full max-w-md">
				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-slate-600">{config.shakeIntensityLabel}</span>
					<span className="font-medium">
						{data ? data.magnitude.toFixed(1) : '0.0'} m/s²
					</span>
				</div>
				<div className="h-4 overflow-hidden rounded-full bg-slate-200">
					<div
						className={cn(
							'h-full transition-all duration-100',
							isShaking ? 'bg-green-500' : 'bg-slate-400',
							gamePhase === 'freeze' && isShaking && 'bg-red-500'
						)}
						style={{ width: `${shakeIntensity}%` }}
					/>
				</div>
				{gamePhase === 'freeze' && isShaking && (
					<p className="mt-2 text-center text-sm font-medium text-red-600">
						{config.movementDetected}
					</p>
				)}
			</div>

			{/* Team Progress */}
			{myTeam && (
				<div className="w-full max-w-md">
					<div className="mb-2 flex items-center justify-between">
						<span className="font-bold" style={{ color: myTeam.color }}>
							{myTeam.name}
						</span>
						<span className="text-sm text-slate-600">
							{Math.round(myTeam.position)} / {config.totalDistance}
						</span>
					</div>
					<div className="h-3 overflow-hidden rounded-full bg-slate-200">
						<div
							className="h-full transition-all duration-500"
							style={{
								width: `${(myTeam.position / config.totalDistance) * 100}%`,
								backgroundColor: myTeam.color
							}}
						/>
					</div>
				</div>
			)}

			{/* Instructions */}
			<p className="max-w-sm text-center text-sm text-slate-500">
				{gamePhase === 'go' && config.goPhaseInstruction}
				{gamePhase === 'warning' && config.warningPhaseInstruction}
				{gamePhase === 'freeze' && config.freezePhaseInstruction}

				{/* Penalty Flash Overlay */}
				{penaltyFlash && (
					<div className="animate-flash pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-red-500/50">
						<div className="rounded-xl bg-red-600 px-8 py-4 text-4xl font-black text-white shadow-xl">
							PENALTY!
						</div>
					</div>
				)}
			</p>
		</div>
	);
};
