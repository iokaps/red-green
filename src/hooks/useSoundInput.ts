import { useEffect, useRef, useState } from 'react';

export interface UseSoundInputResult {
	volumeLevel: number;
	clapCount: number;
	isActive: boolean;
	permissionGranted: boolean;
	requestPermission: () => Promise<void>;
}

/**
 * Hook to detect sound/clap input using microphone
 * Tracks audio level and clap events
 * @param isEnabled Whether to actively listen for sound
 * @returns Object containing volume level, clap count, and permission state
 */
export function useSoundInput(isEnabled = true): UseSoundInputResult {
	const [volumeLevel, setVolumeLevel] = useState(0);
	const [clapCount, setClapCount] = useState(0);
	const [isActive, setIsActive] = useState(false);
	const [permissionGranted, setPermissionGranted] = useState(false);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const dataArrayRef = useRef<Uint8Array | null>(null);
	const lastClapTimeRef = useRef(0);

	const requestPermission = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			setPermissionGranted(true);

			const audioContext = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 256;
			analyserRef.current = analyser;
			dataArrayRef.current = new Uint8Array(
				analyser.frequencyBinCount
			) as Uint8Array<ArrayBuffer>;

			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);

			// Start monitoring audio
			const checkAudio = () => {
				if (!analyserRef.current || !dataArrayRef.current) return;

				analyserRef.current.getByteFrequencyData(
					dataArrayRef.current as Uint8Array<ArrayBuffer>
				);
				const average =
					dataArrayRef.current.reduce((a, b) => a + b) /
					dataArrayRef.current.length;
				const normalizedLevel = Math.min(100, (average / 255) * 100);

				setVolumeLevel(normalizedLevel);

				// Detect clap: sharp increase in volume
				if (normalizedLevel > 50) {
					const now = Date.now();
					if (now - lastClapTimeRef.current > 200) {
						setClapCount((prev) => prev + 1);
						lastClapTimeRef.current = now;
						setIsActive(true);
						setTimeout(() => setIsActive(false), 150);
					}
				}

				if (isEnabled) {
					requestAnimationFrame(checkAudio);
				}
			};

			checkAudio();
		} catch (error) {
			console.error('Microphone permission denied:', error);
			setPermissionGranted(false);
		}
	};

	useEffect(() => {
		return () => {
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
			}
		};
	}, []);

	return {
		volumeLevel,
		clapCount,
		isActive,
		permissionGranted,
		requestPermission
	};
}
