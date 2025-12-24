import { kmClient } from '@/services/km-client';

export interface PlayerState {
	name: string;
	currentView: 'lobby' | 'team-select' | 'game' | 'victory';
	motionPermissionGranted: boolean;
}

const initialState: PlayerState = {
	name: '',
	currentView: 'lobby',
	motionPermissionGranted: false
};

export const playerStore = kmClient.localStore<PlayerState>(
	'player',
	initialState
);
