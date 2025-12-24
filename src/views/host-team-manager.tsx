import { config } from '@/config';
import { usePlayersWithStatus } from '@/hooks/usePlayersWithStatus';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore, type TeamId } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { useSnapshot } from '@kokimoki/app';
import { ArrowLeftRight, Users } from 'lucide-react';
import * as React from 'react';

export const HostTeamManager: React.FC = () => {
	const { playerTeams, teams } = useSnapshot(globalStore.proxy);
	const { players } = usePlayersWithStatus();

	// Group players by team
	const teamPlayers = React.useMemo(() => {
		const grouped: Record<TeamId | 'unassigned', typeof players> = {
			red: [],
			blue: [],
			unassigned: []
		};

		for (const player of players) {
			const teamId = playerTeams[player.id];
			if (teamId) {
				grouped[teamId].push(player);
			} else {
				grouped.unassigned.push(player);
			}
		}

		return grouped;
	}, [players, playerTeams]);

	const handleReassign = async (clientId: string, toTeam: TeamId) => {
		await gameActions.reassignPlayer(clientId, toTeam);
	};

	const teamDiff = Math.abs(teamPlayers.red.length - teamPlayers.blue.length);
	const isBalanced = teamDiff <= 1;

	return (
		<div className="w-full space-y-6">
			<div className="text-center">
				<h2 className="mb-2 text-xl font-bold">{config.teamManagerTitle}</h2>
				<p className="text-sm text-slate-600">
					{config.teamManagerDescription}
				</p>
			</div>

			{/* Balance Indicator */}
			<div
				className={cn(
					'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm',
					isBalanced
						? 'bg-green-100 text-green-700'
						: 'bg-amber-100 text-amber-700'
				)}
			>
				<Users className="size-4" />
				{isBalanced
					? config.teamsBalanced
					: config.teamsUnbalanced.replace('{diff}', String(teamDiff))}
			</div>

			{/* Team Columns */}
			<div className="grid grid-cols-2 gap-4">
				{/* Red Team */}
				<div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="font-bold text-red-700">{teams.red.name}</h3>
						<span className="rounded-full bg-red-200 px-2 py-1 text-xs font-medium text-red-700">
							{teamPlayers.red.length}
						</span>
					</div>
					<ul className="space-y-2">
						{teamPlayers.red.map((player) => (
							<li
								key={player.id}
								className="flex items-center justify-between rounded-lg bg-white p-2"
							>
								<div className="flex items-center gap-2">
									<div
										className={cn(
											'size-2 rounded-full',
											player.isOnline ? 'bg-green-500' : 'bg-slate-300'
										)}
									/>
									<span className="text-sm">{player.name}</span>
								</div>
								<button
									type="button"
									onClick={() => handleReassign(player.id, 'blue')}
									className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-500"
									title={config.moveToBlue}
								>
									<ArrowLeftRight className="size-4" />
								</button>
							</li>
						))}
						{teamPlayers.red.length === 0 && (
							<li className="py-4 text-center text-sm text-slate-400">
								{config.noPlayersOnTeam}
							</li>
						)}
					</ul>
				</div>

				{/* Blue Team */}
				<div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="font-bold text-blue-700">{teams.blue.name}</h3>
						<span className="rounded-full bg-blue-200 px-2 py-1 text-xs font-medium text-blue-700">
							{teamPlayers.blue.length}
						</span>
					</div>
					<ul className="space-y-2">
						{teamPlayers.blue.map((player) => (
							<li
								key={player.id}
								className="flex items-center justify-between rounded-lg bg-white p-2"
							>
								<div className="flex items-center gap-2">
									<div
										className={cn(
											'size-2 rounded-full',
											player.isOnline ? 'bg-green-500' : 'bg-slate-300'
										)}
									/>
									<span className="text-sm">{player.name}</span>
								</div>
								<button
									type="button"
									onClick={() => handleReassign(player.id, 'red')}
									className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
									title={config.moveToRed}
								>
									<ArrowLeftRight className="size-4" />
								</button>
							</li>
						))}
						{teamPlayers.blue.length === 0 && (
							<li className="py-4 text-center text-sm text-slate-400">
								{config.noPlayersOnTeam}
							</li>
						)}
					</ul>
				</div>
			</div>

			{/* Unassigned Players */}
			{teamPlayers.unassigned.length > 0 && (
				<div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
					<h3 className="mb-4 font-bold text-slate-700">
						{config.unassignedPlayers} ({teamPlayers.unassigned.length})
					</h3>
					<ul className="space-y-2">
						{teamPlayers.unassigned.map((player) => (
							<li
								key={player.id}
								className="flex items-center justify-between rounded-lg bg-white p-2"
							>
								<div className="flex items-center gap-2">
									<div
										className={cn(
											'size-2 rounded-full',
											player.isOnline ? 'bg-green-500' : 'bg-slate-300'
										)}
									/>
									<span className="text-sm">{player.name}</span>
								</div>
								<div className="flex gap-1">
									<button
										type="button"
										onClick={() => handleReassign(player.id, 'red')}
										className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
									>
										{config.redTeamShort}
									</button>
									<button
										type="button"
										onClick={() => handleReassign(player.id, 'blue')}
										className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
									>
										{config.blueTeamShort}
									</button>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};
