import { config } from '@/config';
import { useAccelerometer } from '@/hooks/useAccelerometer';
import { gameActions } from '@/state/actions/game-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { cn } from '@/utils/cn';
import { useSnapshot } from '@kokimoki/app';
import { Smartphone, Users } from 'lucide-react';
import * as React from 'react';

export const TeamSelectView: React.FC = () => {
	const { playerTeams, teams } = useSnapshot(globalStore.proxy);
	const { clientIds: onlinePlayerIds } = useSnapshot(globalStore.connections);
	const { motionPermissionGranted } = useSnapshot(playerStore.proxy);
	const { requestPermission, permissionGranted } = useAccelerometer({
		threshold: config.shakeThreshold
	});
	const [isRequesting, setIsRequesting] = React.useState(false);

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

	const handleRequestPermission = async () => {
		setIsRequesting(true);
		try {
			const granted = await requestPermission();
			await gameActions.setMotionPermission(granted);
		} finally {
			setIsRequesting(false);
		}
	};

	const handleJoinTeam = async (teamId: 'red' | 'blue') => {
		await gameActions.joinTeam(teamId);
	};

	const canJoinTeam = motionPermissionGranted || permissionGranted;

	return (
		<div className="flex w-full flex-col items-center gap-8">
			<div className="text-center">
				<h1 className="mb-2 text-2xl font-bold">{config.teamSelectTitle}</h1>
				<p className="text-slate-600">{config.teamSelectDescription}</p>
			</div>

			{/* Motion Permission Section */}
			{!canJoinTeam && (
				<div className="w-full max-w-sm rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
					<Smartphone className="mx-auto mb-3 size-10 text-slate-400" />
					<p className="mb-4 text-sm text-slate-600">
						{config.motionPermissionDescription}
					</p>
					<button
						type="button"
						className="km-btn-primary w-full"
						onClick={handleRequestPermission}
						disabled={isRequesting}
					>
						{isRequesting ? config.loading : config.motionPermissionButton}
					</button>
				</div>
			)}

			{/* Permission Granted Indicator */}
			{canJoinTeam && (
				<div className="flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm text-green-700">
					<Smartphone className="size-4" />
					{config.motionPermissionGranted}
				</div>
			)}

			{/* Team Selection */}
			<div className="grid w-full max-w-md grid-cols-2 gap-4">
				{/* Red Team */}
				<button
					type="button"
					onClick={() => handleJoinTeam('red')}
					disabled={!canJoinTeam}
					className={cn(
						'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
						canJoinTeam
							? 'cursor-pointer border-red-300 bg-red-50 hover:border-red-500 hover:bg-red-100'
							: 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-50'
					)}
				>
					<div
						className="size-16 rounded-full"
						style={{ backgroundColor: teams.red.color }}
					/>
					<span className="font-bold text-red-700">{teams.red.name}</span>
					<div className="flex items-center gap-1 text-sm text-slate-600">
						<Users className="size-4" />
						<span>{teamCounts.red}</span>
					</div>
				</button>

				{/* Blue Team */}
				<button
					type="button"
					onClick={() => handleJoinTeam('blue')}
					disabled={!canJoinTeam}
					className={cn(
						'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
						canJoinTeam
							? 'cursor-pointer border-blue-300 bg-blue-50 hover:border-blue-500 hover:bg-blue-100'
							: 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-50'
					)}
				>
					<div
						className="size-16 rounded-full"
						style={{ backgroundColor: teams.blue.color }}
					/>
					<span className="font-bold text-blue-700">{teams.blue.name}</span>
					<div className="flex items-center gap-1 text-sm text-slate-600">
						<Users className="size-4" />
						<span>{teamCounts.blue}</span>
					</div>
				</button>
			</div>
		</div>
	);
};
