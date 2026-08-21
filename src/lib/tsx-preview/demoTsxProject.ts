export const TSX_DEMO_CODE = `import React, { useState, useEffect } from 'react';

export const VoiceActiveIndicator = React.memo(() => {
  const [phase, setPhase] = useState('entering');

  useEffect(() => {
    const idleTimer = setTimeout(() => setPhase('idle'), 1000);
    const activeTimer = setTimeout(() => setPhase('active'), 3000);

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(activeTimer);
    };
  }, []);

  const isActive = phase === 'active';
  const waves = [
    { id: 1, height: '40%', color: '#00E5FF', delay: '0s' },
    { id: 2, height: '70%', color: '#7000FF', delay: '0.2s' },
    { id: 3, height: '100%', color: '#FF00E5', delay: '0.4s' },
    { id: 4, height: '60%', color: '#00E5FF', delay: '0.6s' },
    { id: 5, height: '80%', color: '#7000FF', delay: '0.8s' },
  ];

  return (
    <div style={{ background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', gap: '10px', padding: '20px' }}>
      <style>
        {\`
          @keyframes voice-wave {
            0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
            50% { transform: scaleY(1); opacity: 1; }
          }
        \`}
      </style>
      {waves.map((wave) => (
        <div
          key={wave.id}
          style={{
            width: '14px',
            height: wave.height,
            background: \`linear-gradient(to top, \${wave.color}, rgba(255,255,255,0.5))\`,
            borderRadius: '999px',
            animation: isActive ? \`voice-wave 1s ease-in-out infinite\` : 'none',
            animationDelay: wave.delay,
            boxShadow: isActive ? \`0 0 15px \${wave.color}\` : 'none',
            transformOrigin: 'center',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
});

export default VoiceActiveIndicator;
`;

export const TSX_DEMO_CSS = `/* TSX Demo Styles */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
`;
