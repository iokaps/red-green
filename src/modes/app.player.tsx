import { PlayerMenu } from '@/components/menu';
import { NameLabel } from '@/components/name-label';
import { withKmProviders } from '@/components/with-km-providers';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { PlayerLayout } from '@/layouts/player';
import { kmClient } from '@/services/km-client';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { CreateProfileView } from '@/views/create-profile-view';
import { PlayerGameView } from '@/views/player-game-view';
import { PlayerVictoryView } from '@/views/player-victory-view';
import { TeamSelectView } from '@/views/team-select-view';
import { useSnapshot } from '@kokimoki/app';
import * as React from 'react';

const App: React.FC = () => {
	const { title } = config;
	const { name, currentView } = useSnapshot(playerStore.proxy);
	const { started, gamePhase, playerTeams, winningTeam, teams } = useSnapshot(
		globalStore.proxy
	);

	useGlobalController();
	useDocumentTitle(title);

	// Get player's team
	const myTeamId = playerTeams[kmClient.id];

	// Handle view routing based on game state
	React.useEffect(() => {
		if (gamePhase === 'victory') {
			playerActions.setCurrentView('victory');
		} else if (started && myTeamId) {
			// Game is running and player has a team
			playerActions.setCurrentView('game');
		} else if (!started && myTeamId) {
			// Has team but game not started - show team select to see status
			playerActions.setCurrentView('team-select');
		} else if (!myTeamId) {
			// No team selected
			playerActions.setCurrentView('team-select');
		} else {
			playerActions.setCurrentView('lobby');
		}
	}, [started, gamePhase, myTeamId]);

	// Name entry screen
	if (!name) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<CreateProfileView />
				</PlayerLayout.Main>
			</PlayerLayout.Root>
		);
	}

	// Victory screen
	if (currentView === 'victory' && winningTeam) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<PlayerVictoryView
						winningTeam={teams[winningTeam]}
						isMyTeam={myTeamId === winningTeam}
					/>
				</PlayerLayout.Main>
			</PlayerLayout.Root>
		);
	}

	// Game in progress
	if (currentView === 'game' && started) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<PlayerGameView />
				</PlayerLayout.Main>
				<PlayerLayout.Footer>
					<NameLabel name={name} />
				</PlayerLayout.Footer>
			</PlayerLayout.Root>
		);
	}

	// Team selection / lobby
	return (
		<PlayerLayout.Root>
			<PlayerLayout.Header>
				<PlayerMenu />
			</PlayerLayout.Header>
			<PlayerLayout.Main>
				{currentView === 'team-select' && <TeamSelectView />}
				{currentView === 'lobby' && <TeamSelectView />}
			</PlayerLayout.Main>
			<PlayerLayout.Footer>
				<NameLabel name={name} />
				{myTeamId && (
					<span
						className="rounded-full px-3 py-1 text-sm font-medium text-white"
						style={{ backgroundColor: teams[myTeamId].color }}
					>
						{teams[myTeamId].name}
					</span>
				)}
			</PlayerLayout.Footer>
		</PlayerLayout.Root>
	);
};

export default withKmProviders(App);
