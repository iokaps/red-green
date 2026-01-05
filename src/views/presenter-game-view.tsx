import { GuardEye } from '@/components/guard-eye';
import { LaserGrid } from '@/components/laser-grid';
import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { globalStore, type GamePhase } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { useSnapshot } from '@kokimoki/app';
import { KmTimeCountdown, useKmConfettiContext } from '@kokimoki/shared';
import { Trophy } from 'lucide-react';
import * as React from 'react';

/**
 * Get phase duration - now uses currentPhaseDuration from state
 */
function getPhaseDuration(
	phase: GamePhase,
	currentPhaseDuration: number
): number {
	// Use variable duration from state if available
	if (currentPhaseDuration > 0) {
		return currentPhaseDuration;
	}
	// Fallback to config defaults
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
}

export const PresenterGameView: React.FC = () => {
	const {
		gamePhase,
		phaseStartTimestamp,
		currentPhaseDuration,
		currentRound,
		currentInputMode,
		teams,
		winningTeam,
		playerTeams,
		mvpPlayers,
		traitorId,
		traitorRevealed,
		players
	} = useSnapshot(globalStore.proxy);
	const { clientIds: onlinePlayerIds } = useSnapshot(globalStore.connections);
	const serverTime = useServerTimer(100);
	const confetti = useKmConfettiContext();

	// Fire confetti on victory
	const hasFiredConfetti = React.useRef(false);
	React.useEffect(() => {
		if (gamePhase === 'victory' && winningTeam && !hasFiredConfetti.current) {
			hasFiredConfetti.current = true;
			confetti.triggerConfetti({ preset: 'massive' });
		} else if (gamePhase !== 'victory') {
			hasFiredConfetti.current = false;
		}
	}, [gamePhase, winningTeam, confetti]);

	// Count online players per team
	const teamCounts = React.useMemo(() => {
		const counts = { red: 0, blue: 0 };
		for (const [clientId, teamId] of Object.entries(playerTeams)) {
			if (onlinePlayerIds.has(clientId)) {
				counts[teamId]++;
			}
		}
		return counts;
	}, [playerTeams, onlinePlayerIds]);

	// Calculate time remaining
	const phaseDuration = getPhaseDuration(gamePhase, currentPhaseDuration);
	const timeRemaining = Math.max(
		0,
		phaseDuration - (serverTime - phaseStartTimestamp)
	);

	// Track penalty flash
	const [penaltyFlash, setPenaltyFlash] = React.useState<'red' | 'blue' | null>(
		null
	);
	const lastPenaltyTimestamps = React.useRef({ red: 0, blue: 0 });

	React.useEffect(() => {
		// Check for new penalties
		if (teams.red.lastPenaltyTimestamp > lastPenaltyTimestamps.current.red) {
			lastPenaltyTimestamps.current.red = teams.red.lastPenaltyTimestamp;
			setPenaltyFlash('red');
			setTimeout(() => setPenaltyFlash(null), 1000);
		}
		if (teams.blue.lastPenaltyTimestamp > lastPenaltyTimestamps.current.blue) {
			lastPenaltyTimestamps.current.blue = teams.blue.lastPenaltyTimestamp;
			setPenaltyFlash('blue');
			setTimeout(() => setPenaltyFlash(null), 1000);
		}
	}, [teams.red.lastPenaltyTimestamp, teams.blue.lastPenaltyTimestamp]);

	// Victory screen
	if (gamePhase === 'victory' && winningTeam) {
		const winner = teams[winningTeam];
		const traitorName =
			traitorRevealed && traitorId && players[traitorId]
				? players[traitorId].name
				: null;

		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-8">
				<Trophy className="size-32 text-yellow-500" />
				<h1 className="text-6xl font-black" style={{ color: winner.color }}>
					{winner.name}
				</h1>
				<p className="text-3xl font-bold text-slate-600">
					{config.victoryText}
				</p>
				{traitorName && (
					<p className="mt-4 text-xl text-amber-600">
						{config.traitorRevealMessage} <strong>{traitorName}</strong>
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-between gap-8 p-8">
			{/* Laser Grid overlay during FREEZE */}
			<LaserGrid active={gamePhase === 'freeze'} />

			{/* Guard Eye */}
			<div className="flex flex-1 items-center justify-center">
				<GuardEye phase={gamePhase} className="scale-150" />
			</div>

			{/* Phase Timer */}
			{gamePhase !== 'lobby' && (
				<div className="flex flex-col items-center gap-2">
					<div className="text-xl font-bold text-slate-500">
						ROUND {currentRound} • {currentInputMode.toUpperCase()}
					</div>
					<div
						className={cn(
							'rounded-xl px-8 py-4 text-4xl font-bold tabular-nums',
							gamePhase === 'go' && 'bg-green-500 text-white',
							gamePhase === 'warning' && 'bg-yellow-400 text-yellow-900',
							gamePhase === 'freeze' && 'bg-red-500 text-white',
							gamePhase === 'preview' && 'bg-slate-500 text-white'
						)}
					>
						<KmTimeCountdown ms={timeRemaining} display="s" />
					</div>
				</div>
			)}

			{/* MVP Spotlight - Show during GO phase */}
			{gamePhase === 'go' && config.mvpSpotlightEnabled && (
				<div className="flex w-full max-w-2xl justify-between gap-4">
					{/* Red team MVP */}
					<div
						className="flex flex-1 items-center gap-3 rounded-lg p-3"
						style={{ backgroundColor: `${teams.red.color}20` }}
					>
						<span className="text-lg">{config.mvpLabel}</span>
						{mvpPlayers.red ? (
							<span className="font-bold" style={{ color: teams.red.color }}>
								{mvpPlayers.red.name}
							</span>
						) : (
							<span className="text-slate-400">—</span>
						)}
					</div>
					{/* Blue team MVP */}
					<div
						className="flex flex-1 items-center justify-end gap-3 rounded-lg p-3"
						style={{ backgroundColor: `${teams.blue.color}20` }}
					>
						{mvpPlayers.blue ? (
							<span className="font-bold" style={{ color: teams.blue.color }}>
								{mvpPlayers.blue.name}
							</span>
						) : (
							<span className="text-slate-400">—</span>
						)}
						<span className="text-lg">{config.mvpLabel}</span>
					</div>
				</div>
			)}

			{/* Race Track */}
			<div className="w-full max-w-4xl space-y-4">
				{/* Track container */}
				<div className="relative h-32 rounded-2xl border-4 border-slate-300 bg-slate-100">
					{/* Finish line */}
					<div className="absolute top-0 right-0 flex h-full w-16 items-center justify-center border-l-4 border-dashed border-slate-400 bg-slate-200">
						<Trophy className="size-10 text-yellow-500" />
					</div>

					{/* Red team avatar */}
					<div
						className={cn(
							'absolute top-2 flex h-12 w-20 items-center justify-center rounded-lg transition-all duration-500',
							penaltyFlash === 'red' && 'animate-shake'
						)}
						style={{
							left: `calc(${(teams.red.position / config.totalDistance) * 85}% )`,
							backgroundColor: teams.red.color
						}}
					>
						<span className="text-sm font-bold text-white">
							{teamCounts.red}
						</span>
					</div>

					{/* Blue team avatar */}
					<div
						className={cn(
							'absolute bottom-2 flex h-12 w-20 items-center justify-center rounded-lg transition-all duration-500',
							penaltyFlash === 'blue' && 'animate-shake'
						)}
						style={{
							left: `calc(${(teams.blue.position / config.totalDistance) * 85}%)`,
							backgroundColor: teams.blue.color
						}}
					>
						<span className="text-sm font-bold text-white">
							{teamCounts.blue}
						</span>
					</div>
				</div>

				{/* Team labels with positions */}
				<div className="flex justify-between text-lg">
					<div className="flex items-center gap-3">
						<div
							className="size-4 rounded-full"
							style={{ backgroundColor: teams.red.color }}
						/>
						<span className="font-bold" style={{ color: teams.red.color }}>
							{teams.red.name}
						</span>
						<span className="text-slate-500">
							{Math.round(teams.red.position)}m
						</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-slate-500">
							{Math.round(teams.blue.position)}m
						</span>
						<span className="font-bold" style={{ color: teams.blue.color }}>
							{teams.blue.name}
						</span>
						<div
							className="size-4 rounded-full"
							style={{ backgroundColor: teams.blue.color }}
						/>
					</div>
				</div>
			</div>

			{/* Penalty Flash Overlay */}
			{penaltyFlash && (
				<div
					className={cn(
						'animate-flash pointer-events-none fixed inset-0 z-50',
						penaltyFlash === 'red' ? 'bg-red-500/20' : 'bg-blue-500/20'
					)}
				/>
			)}
		</div>
	);
};
