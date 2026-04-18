'use client';

import { useEffect, useState } from 'react';

const LETTERS: { char: string; dark: boolean }[] = [
  { char: 'c', dark: true },
  { char: 'e', dark: true },
  { char: 'n', dark: true },
  { char: 't', dark: true },
  { char: 's', dark: true },
  { char: 'a', dark: false },
  { char: 'b', dark: false },
  { char: 'l', dark: false },
  { char: 'y', dark: false },
];

export function SplashScreen() {
  const [phase, setPhase] = useState<'active' | 'exiting' | 'done'>('active');

  useEffect(() => {
    // React has hydrated — the app is loaded. Let the bounce finish, then exit.
    const t = setTimeout(() => setPhase('exiting'), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === 'exiting') {
      const t = setTimeout(() => setPhase('done'), 600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      id="splash-screen"
      className={phase === 'exiting' ? 'splash-exit' : ''}
      aria-hidden="true"
    >
      <div className="splash-curtain-left" />
      <div className="splash-curtain-right" />
      <div className="splash-center">
        <div className="splash-letters">
          {LETTERS.map((l, i) => (
            <span
              key={i}
              className={`splash-char ${l.dark ? 'splash-char-dark' : 'splash-char-orange'}`}
              style={{ '--letter-i': i } as React.CSSProperties}
            >
              {l.char}
              <span className="splash-char-shadow" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
