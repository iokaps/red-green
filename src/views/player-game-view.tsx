import { config } from '@/config';
import { useAccelerometer } from '@/hooks/useAccelerometer';
import { useServerTimer } from '@/hooks/useServerTime';
import { useSoundInput } from '@/hooks/useSoundInput';
import { useSpinnerInput } from '@/hooks/useSpinnerInput';
import { useSwipeInput } from '@/hooks/useSwipeInput';
import { useTapInput } from '@/hooks/useTapInput';
import { useTargetTapping } from '@/hooks/useTargetTapping';
import { useTiltInput } from '@/hooks/useTiltInput';
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

	// Input detection hooks - one for each input mode
	const { data, isShaking, requestPermission, permissionGranted } =
		useAccelerometer({
			threshold: config.shakeThreshold
		});
	const { swipeCount, totalDistance } = useSwipeInput();
	const { tapCount } = useTapInput();
	const { totalTilt } = useTiltInput();
	const { targets, hitCount } = useTargetTapping(gamePhase === 'go');
	const { rotation, spinCount } = useSpinnerInput();
	const { volumeLevel, clapCount } = useSoundInput(gamePhase === 'go');

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

	// Track accumulated input data for this phase
	const inputDataRef = React.useRef({
		totalMagnitude: 0,
		maxMagnitude: 0,
		inputCount: 0,
		wasActive: false,
		phaseTimestamp: 0,
		swipeCount: 0,
		swipeDistance: 0
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

	// Reset input data when phase changes
	React.useEffect(() => {
		if (phaseStartTimestamp !== inputDataRef.current.phaseTimestamp) {
			inputDataRef.current = {
				totalMagnitude: 0,
				maxMagnitude: 0,
				inputCount: 0,
				wasActive: false,
				phaseTimestamp: phaseStartTimestamp,
				swipeCount: 0,
				swipeDistance: 0
			};
		}
	}, [phaseStartTimestamp]);

	// Track input data during GO phase (accumulate once per frame)
	React.useEffect(() => {
		if (gamePhase !== 'go') {
			return;
		}

		const ref = inputDataRef.current;

		// SHAKE mode - magnitude-based
		if (currentInputMode === 'shake' && data) {
			ref.totalMagnitude += data.magnitude;
			ref.maxMagnitude = Math.max(ref.maxMagnitude, data.magnitude);

			if (isShaking) {
				ref.inputCount++;
				ref.wasActive = true;
			}
		}

		// SWIPE mode - distance-based
		if (currentInputMode === 'swipe' && totalDistance > 0) {
			ref.swipeCount = swipeCount;
			ref.swipeDistance = totalDistance;
			ref.wasActive = true;
			ref.inputCount = swipeCount;
			// Convert swipe distance to magnitude-like value for consistent progress calculation
			ref.totalMagnitude += totalDistance * 0.1;
		}

		// TAP mode - count-based
		if (currentInputMode === 'tap' && tapCount > 0) {
			ref.inputCount = tapCount;
			ref.wasActive = true;
			// Each tap worth ~1 unit of progress
			ref.totalMagnitude += tapCount * 0.5;
		}

		// TILT mode - angle-based
		if (currentInputMode === 'tilt') {
			ref.totalMagnitude += totalTilt;
			ref.maxMagnitude = Math.max(ref.maxMagnitude, totalTilt);
			if (totalTilt > 0.2) {
				ref.inputCount++;
				ref.wasActive = true;
			}
		}

		// TARGET mode - hit-based
		if (currentInputMode === 'target' && hitCount > 0) {
			ref.inputCount = hitCount;
			ref.wasActive = true;
			// Each successful hit worth ~2 units of progress
			ref.totalMagnitude += hitCount * 2;
		}

		// SPINNER mode - rotation-based
		if (currentInputMode === 'spinner') {
			ref.inputCount = spinCount;
			// Convert rotation to progress (each 360° = 10 units)
			ref.totalMagnitude += Math.abs(rotation) / 36;
			if (spinCount > 0) {
				ref.wasActive = true;
			}
		}

		// SOUND mode - volume-based
		if (currentInputMode === 'sound') {
			ref.totalMagnitude += volumeLevel * 0.1;
			ref.inputCount = clapCount;
			if (clapCount > 0) {
				ref.wasActive = true;
			}
		}
	}, [
		data,
		isShaking,
		gamePhase,
		currentInputMode,
		swipeCount,
		totalDistance,
		tapCount,
		totalTilt,
		hitCount,
		rotation,
		spinCount,
		volumeLevel,
		clapCount
	]);

	// Submit input report when GO phase ends (detected by phase change)
	const lastPhaseRef = React.useRef(gamePhase);
	React.useEffect(() => {
		if (lastPhaseRef.current !== gamePhase) {
			const prevPhase = lastPhaseRef.current;
			lastPhaseRef.current = gamePhase;

			// Submit report for GO phase
			if (prevPhase === 'go') {
				const ref = inputDataRef.current;
				gameActions.submitShakeReport({
					totalMagnitude: ref.totalMagnitude,
					maxMagnitude: ref.maxMagnitude,
					shakeCount: ref.inputCount,
					wasActive: ref.wasActive
				});
			}
		}
	}, [gamePhase]);

	// Calculate input intensity for visual feedback (0-100)
	let inputIntensity = 0;
	let inputLabel = 'Intensity';

	if (currentInputMode === 'shake' && data) {
		inputIntensity = Math.min(
			100,
			(data.magnitude / config.shakeThreshold) * 50
		);
		inputLabel = config.shakeIntensityLabel;
	} else if (currentInputMode === 'swipe') {
		inputIntensity = Math.min(100, (totalDistance / 300) * 50);
		inputLabel = 'Swipe Intensity';
	} else if (currentInputMode === 'tap') {
		inputIntensity = Math.min(100, (tapCount / 20) * 50);
		inputLabel = 'Tap Speed';
	} else if (currentInputMode === 'tilt') {
		inputIntensity = Math.min(100, (totalTilt / 1) * 50);
		inputLabel = 'Tilt Angle';
	} else if (currentInputMode === 'target') {
		inputIntensity = Math.min(100, (hitCount / 10) * 50);
		inputLabel = 'Accuracy';
	} else if (currentInputMode === 'spinner') {
		inputIntensity = Math.min(100, (Math.abs(rotation) / 720) * 50);
		inputLabel = 'Spin Speed';
	} else if (currentInputMode === 'sound') {
		inputIntensity = Math.min(100, (volumeLevel / 100) * 50);
		inputLabel = 'Volume Level';
	}

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

			{/* TARGET Mode Game Area */}
			{gamePhase === 'go' && currentInputMode === 'target' && (
				<div
					id="target-game-area"
					className="relative h-96 w-full max-w-md overflow-hidden rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 shadow-lg"
				>
					{/* Targets */}
					{targets.map((target) => (
						<div
							key={target.id}
							className={cn(
								'absolute rounded-full border-2 border-pink-600 transition-all',
								target.hit
									? 'scale-150 border-green-600 bg-green-400'
									: 'cursor-pointer bg-pink-400 hover:scale-110'
							)}
							style={{
								left: `${target.x}px`,
								top: `${target.y}px`,
								width: `${target.size}px`,
								height: `${target.size}px`,
								opacity: target.hit ? 0.5 : 0.8
							}}
						/>
					))}

					{/* Hit Counter */}
					<div className="absolute top-4 left-4 rounded-lg bg-white px-4 py-2 font-bold text-pink-600 shadow-md">
						Hits: {hitCount}
					</div>
				</div>
			)}

			{/* SPINNER Mode Game Area */}
			{gamePhase === 'go' && currentInputMode === 'spinner' && (
				<div className="flex flex-col items-center gap-4">
					<div className="relative h-48 w-48">
						<svg
							className="absolute inset-0 h-full w-full"
							viewBox="0 0 200 200"
							style={{ transform: `rotate(${rotation}deg)` }}
						>
							{/* Spinner wheel */}
							<circle
								cx="100"
								cy="100"
								r="80"
								fill="none"
								stroke="#f59e0b"
								strokeWidth="20"
							/>
							{/* Segments */}
							{[...Array(8)].map((_, i) => {
								const angle = (i * 360) / 8;
								const rad = (angle * Math.PI) / 180;
								const x = 100 + 80 * Math.cos(rad);
								const y = 100 + 80 * Math.sin(rad);
								return (
									<line
										key={i}
										x1="100"
										y1="100"
										x2={x}
										y2={y}
										stroke="#b45309"
										strokeWidth="2"
									/>
								);
							})}
							{/* Center circle */}
							<circle cx="100" cy="100" r="15" fill="#b45309" />
						</svg>
					</div>
					<div className="text-center">
						<p className="text-xl font-bold text-orange-600">
							Spins: {spinCount}
						</p>
						<p className="text-sm text-orange-600">
							Rotation: {Math.abs(rotation).toFixed(0)}°
						</p>
					</div>
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

			{/* Accumulated Input Count Display */}
			{gamePhase === 'go' && inputDataRef.current.inputCount > 0 && (
				<div className="w-full max-w-md rounded-xl bg-slate-100 px-4 py-2 text-center shadow-sm">
					<p className="text-sm font-semibold text-slate-700">
						{currentInputMode === 'shake'
							? `${inputDataRef.current.inputCount} Shakes`
							: currentInputMode === 'swipe'
								? `${inputDataRef.current.inputCount} Swipes`
								: currentInputMode === 'tap'
									? `${inputDataRef.current.inputCount} Taps`
									: currentInputMode === 'tilt'
										? `${inputDataRef.current.inputCount} Tilts`
										: currentInputMode === 'target'
											? `${inputDataRef.current.inputCount} Hits`
											: currentInputMode === 'spinner'
												? `${inputDataRef.current.inputCount} Spins`
												: `${inputDataRef.current.inputCount} Claps`}
					</p>
				</div>
			)}

			{/* Input Indicator */}
			<div className="w-full max-w-md">
				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-slate-600">{inputLabel}</span>
					<span className="font-medium">
						{currentInputMode === 'shake'
							? data
								? `${data.magnitude.toFixed(1)} m/s²`
								: '0.0 m/s²'
							: currentInputMode === 'swipe'
								? `${totalDistance.toFixed(0)} px`
								: currentInputMode === 'tap'
									? `${tapCount} taps`
									: currentInputMode === 'tilt'
										? `${(totalTilt * 100).toFixed(0)}%`
										: currentInputMode === 'target'
											? `${hitCount} hits`
											: currentInputMode === 'spinner'
												? `${Math.abs(rotation).toFixed(0)}°`
												: `${volumeLevel.toFixed(0)} dB`}
					</span>
				</div>
				<div className="h-4 overflow-hidden rounded-full bg-slate-200">
					<div
						className={cn(
							'h-full bg-green-500 transition-all duration-100',
							(() => {
								// Determine active state based on input mode
								let isInputActive = false;
								if (currentInputMode === 'shake') isInputActive = isShaking;
								else if (currentInputMode === 'swipe')
									isInputActive = swipeCount > 0;
								else if (currentInputMode === 'tap')
									isInputActive = tapCount > 0;
								else if (currentInputMode === 'tilt')
									isInputActive = totalTilt > 0.2;
								else if (currentInputMode === 'target')
									isInputActive = hitCount > 0;
								else if (currentInputMode === 'spinner')
									isInputActive = spinCount > 0;
								else if (currentInputMode === 'sound')
									isInputActive = clapCount > 0;

								return isInputActive ? 'bg-green-500' : 'bg-slate-400';
							})()
						)}
						style={{ width: `${inputIntensity}%` }}
					/>
				</div>
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
