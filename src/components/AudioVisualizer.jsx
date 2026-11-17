import React from 'react';
import { usePlayer } from '../context/PlayerContext';

export default function AudioVisualizer({ dominantColor = '16, 185, 129' }) {
  const { isPlaying } = usePlayer();

  const bars = [
    { height: 'h-3', activeHeight: 'animate-eq-1' },
    { height: 'h-5', activeHeight: 'animate-eq-2' },
    { height: 'h-7', activeHeight: 'animate-eq-3' },
    { height: 'h-4', activeHeight: 'animate-eq-1' },
    { height: 'h-6', activeHeight: 'animate-eq-2' },
    { height: 'h-8', activeHeight: 'animate-eq-3' },
    { height: 'h-5', activeHeight: 'animate-eq-1' },
    { height: 'h-3', activeHeight: 'animate-eq-2' },
  ];

  return (
    <div className="flex items-center justify-center gap-1.5 h-8 py-1 select-none">
      {bars.map((bar, i) => (
        <span
          key={i}
          className={`w-1 rounded-full transition-all duration-300 ${
            isPlaying ? bar.activeHeight : bar.height
          }`}
          style={{
            backgroundColor: `rgb(${dominantColor})`,
            opacity: isPlaying ? 0.9 : 0.35,
            boxShadow: isPlaying ? `0 0 8px rgba(${dominantColor}, 0.6)` : 'none'
          }}
        />
      ))}
    </div>
  );
}
