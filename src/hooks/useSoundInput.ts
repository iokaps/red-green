import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSoundInputResult {
	/** Current volume level in dB (-100 to 0) */
	volumeLevel: number;
	/** Whether current volume exceeds threshold */
	isLoud: boolean;
	/** Peak volume detected */
	peakVolume: number;
	/** Whether audio context has been initialized */
	isInitialized: boolean;
	/** Request microphone permission */
	requestPermission: () => Promise<boolean>;
}

/**
 * Hook to detect sound/clapping via microphone
 */
export function useSoundInput(threshold = -50): UseSoundInputResult {
	const [volumeLevel, setVolumeLevel] = useState(0);
	const [isLoud, setIsLoud] = useState(false);
	const [peakVolume, setPeakVolume] = useState(0);
	const [isInitialized, setIsInitialized] = useState(false);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const dataArrayRef = useRef<Uint8Array | null>(null);
	const animationFrameRef = useRef<number | null>(null);

	const requestPermission = useCallback(async (): Promise<boolean> => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			const audioContext = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 2048;
			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);

			const dataArray = new Uint8Array(analyser.frequencyBinCount);

			audioContextRef.current = audioContext;
			analyserRef.current = analyser;
			dataArrayRef.current = dataArray;
			setIsInitialized(true);

			// Start analyzing
			const analyze = () => {
				if (!analyserRef.current || !dataArrayRef.current) return;

				analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

				let sum = 0;
				for (let i = 0; i < dataArrayRef.current.length; i++) {
					sum += dataArrayRef.current[i];
				}
				const average = sum / dataArrayRef.current.length;

				// Convert to dB scale (-100 to 0)
				const dB = 20 * Math.log10(average / 255);

				setVolumeLevel(dB);
				setIsLoud(dB > threshold);
				setPeakVolume(Math.max(peakVolume, dB));

				animationFrameRef.current = requestAnimationFrame(analyze);
			};

			analyze();
			return true;
		} catch (error) {
			console.error('Microphone permission denied:', error);
			return false;
		}
	}, [peakVolume, threshold]);

	useEffect(() => {
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, []);

	return {
		volumeLevel,
		isLoud,
		peakVolume,
		isInitialized,
		requestPermission
	};
}
