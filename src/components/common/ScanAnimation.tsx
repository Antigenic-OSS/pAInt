'use client';

interface ScanAnimationProps {
  active: boolean;
  label?: string;
}

export function ScanAnimation({ active, label = 'SCANNING' }: ScanAnimationProps) {
  if (!active) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Pulsing rings */}
      <div className="relative" style={{ width: 48, height: 48 }}>
        {[0, 0.6, 1.2].map((delay, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid var(--accent)',
              animation: 'scan-ring 2.4s ease-out infinite',
              animationDelay: `${delay}s`,
            }}
          />
        ))}
        {/* Center dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: 'scan-glow 1.6s ease-in-out infinite',
          }}
        />
      </div>

      {/* Status text */}
      <div
        className="text-[11px] font-medium tracking-wide"
        style={{
          color: 'var(--accent)',
          animation: 'scan-pulse 2s ease-in-out infinite',
        }}
      >
        {label}
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 0.2, 0.4, 0.6, 0.8].map((delay, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'var(--accent)',
              animation: 'scan-dot 1.4s ease-in-out infinite',
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
