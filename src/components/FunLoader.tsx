'use client';
import { useState, useEffect } from 'react';

const WORDS = [
    'Brewing', 'Puffing', 'Whisking', 'Simmering', 'Polishing',
    'Toasting', 'Doodling', 'Shuffling', 'Sprinkling', 'Marinating',
    'Percolating', 'Tumbling', 'Fizzing', 'Folding', 'Garnishing',
    'Steeping', 'Kneading', 'Drizzling', 'Uncorking', 'Stirring',
];

function pickRandom(exclude: number) {
    let i: number;
    do { i = Math.floor(Math.random() * WORDS.length); } while (i === exclude && WORDS.length > 1);
    return i;
}

interface FunLoaderProps {
    /** Overall size — controls spinner + text proportionally */
    size?: 'sm' | 'md';
}

export function FunLoader({ size = 'md' }: FunLoaderProps) {
    // Start with a stable index to avoid hydration mismatch, randomize after mount
    const [idx, setIdx] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        setIdx(pickRandom(-1));
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setIdx(prev => pickRandom(prev));
                setFade(true);
            }, 250);
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    const isSm = size === 'sm';
    const spinnerSize = isSm ? 14 : 24;
    const fontSize = isSm ? '13px' : '15px';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: isSm ? '8px' : '12px', padding: isSm ? '12px 0' : '40px 0',
        }}>
            <span
                className="btn-spinner"
                style={{ width: spinnerSize, height: spinnerSize, borderWidth: isSm ? 2 : 3 }}
                aria-hidden="true"
            />
            <span style={{
                fontSize,
                color: 'var(--color-muted)',
                fontWeight: 500,
                opacity: fade ? 1 : 0,
                transition: 'opacity 0.25s ease',
                minWidth: isSm ? '80px' : '110px',
            }}>
                {WORDS[idx]}…
            </span>
        </div>
    );
}
