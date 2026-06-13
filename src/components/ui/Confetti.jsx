import React, { useEffect, useState } from 'react';

const ConfettiPiece = ({ id, x, y, angle, speed, opacity }) => {
  const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
  const color = colors[id % colors.length];
  
  return (
    <div
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        width: '10px',
        height: '10px',
        backgroundColor: color,
        opacity: opacity,
        transform: `rotate(${angle}deg)`,
        transition: 'top 2s ease-out, opacity 2s ease-out, left 1s',
        zIndex: 9999,
      }}
    />
  );
};

export default function Confetti({ trigger }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (trigger) {
      const newPieces = Array.from({ length: 100 }).map((_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        angle: Math.random() * 360,
        speed: 2 + Math.random() * 3,
        opacity: 1,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [trigger]);

  useEffect(() => {
    if (pieces.length > 0) {
      const animationTimer = setTimeout(() => {
        setPieces(currentPieces =>
          currentPieces.map(p => ({
            ...p,
            y: window.innerHeight + 20,
            x: p.x + (Math.random() - 0.5) * 200,
            opacity: 0,
          }))
        );
      }, 50);
      return () => clearTimeout(animationTimer);
    }
  }, [pieces]);

  return (
    <div>
      {pieces.map(piece => (
        <ConfettiPiece key={piece.id} {...piece} />
      ))}
    </div>
  );
}