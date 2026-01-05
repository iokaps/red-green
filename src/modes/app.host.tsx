import { GameAudioController } from '@/components/game-audio-controller';
import { withKmProviders } from '@/components/with-km-providers';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { generateLink } from '@/kit/generate-link';
import { HostPresenterLayout } from '@/layouts/host-presenter';
import { kmClient } from '@/services/km-client';
import { gameActions } from '@/state/actions/game-actions';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { HostTeamManager } from '@/views/host-team-manager';
import { useSnapshot } from '@kokimoki/app';
import {
	CirclePlay,
	CircleStop,
	RotateCcw,
	SquareArrowOutUpRight
} from 'lucide-react';
import * as React from 'react';

const App: React.FC = () => {
	useGlobalController();
	const { title } = config;
	const isHost = kmClient.clientContext.mode === 'host';
	const { started, showPresenterQr, gamePhase, playerTeams } = useSnapshot(
		globalStore.proxy
	);
	const [buttonCooldown, setButtonCooldown] = React.useState(true);
	useDocumentTitle(title);

	// Check start conditions
	const redCount = Object.values(playerTeams).filter((t) => t === 'red').length;
	const blueCount = Object.values(playerTeams).filter(
		(t) => t === 'blue'
	).length;
	const canStart =
		redCount >= config.minPlayersPerTeam &&
		blueCount >= config.minPlayersPerTeam;

	// Button cooldown to prevent accidentally spamming start/stop
	React.useEffect(() => {
		setButtonCooldown(true);
		const timeout = setTimeout(() => {
			setButtonCooldown(false);
		}, 1000);

		return () => clearTimeout(timeout);
	}, [started]);

	if (kmClient.clientContext.mode !== 'host') {
		throw new Error('App host rendered in non-host mode');
	}

	const playerLink = generateLink(kmClient.clientContext.playerCode, {
		mode: 'player'
	});

	const presenterLink = generateLink(kmClient.clientContext.presenterCode, {
		mode: 'presenter',
		playerCode: kmClient.clientContext.playerCode
	});

	const handleStartGame = async () => {
		await globalActions.startGame();
		await gameActions.transitionPhase('go');
	};

	const handleStopGame = async () => {
		await globalActions.stopGame();
		await gameActions.resetGame();
	};

	const handleResetGame = async () => {
		await gameActions.resetGame();
	};

	return (
		<HostPresenterLayout.Root>
			<GameAudioController />
			<HostPresenterLayout.Header />
			<HostPresenterLayout.Main>
				<div className="space-y-6">
					<HostTeamManager />

					<button
						type="button"
						className={showPresenterQr ? 'km-btn-neutral' : 'km-btn-secondary'}
						onClick={globalActions.togglePresenterQr}
					>
						{config.togglePresenterQrButton}
					</button>
				</div>
			</HostPresenterLayout.Main>

			<HostPresenterLayout.Footer>
				<div className="inline-flex gap-4">
					{!started && gamePhase === 'lobby' && isHost && (
						<button
							type="button"
							className="km-btn-primary"
							onClick={handleStartGame}
							disabled={buttonCooldown || !canStart}
							title={
								!canStart
									? `Need at least ${config.minPlayersPerTeam} players per team`
									: undefined
							}
						>
							<CirclePlay className="size-5" />
							{config.startButton}
						</button>
					)}
					{started && isHost && (
						<button
							type="button"
							className="km-btn-error"
							onClick={handleStopGame}
							disabled={buttonCooldown}
						>
							<CircleStop className="size-5" />
							{config.stopButton}
						</button>
					)}
					{gamePhase === 'victory' && !started && isHost && (
						<button
							type="button"
							className="km-btn-secondary"
							onClick={handleResetGame}
							disabled={buttonCooldown}
						>
							<RotateCcw className="size-5" />
							{config.resetButton}
						</button>
					)}
				</div>
				<div className="inline-flex gap-4">
					<a
						href={playerLink}
						target="_blank"
						rel="noreferrer"
						className="km-btn-secondary"
					>
						{config.playerLinkLabel}
						<SquareArrowOutUpRight className="size-5" />
					</a>

					<a
						href={presenterLink}
						target="_blank"
						rel="noreferrer"
						className="km-btn-secondary"
					>
						{config.presenterLinkLabel}
						<SquareArrowOutUpRight className="size-5" />
					</a>
				</div>
			</HostPresenterLayout.Footer>
		</HostPresenterLayout.Root>
	);
};

export default withKmProviders(App);
