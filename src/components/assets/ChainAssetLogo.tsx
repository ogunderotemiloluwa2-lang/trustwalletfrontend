import React from 'react';

export type ChainAssetLogoKind =
  | 'bitcoin'
  | 'tether'
  | 'tron'
  | 'solana'
  | 'dogecoin'
  | 'litecoin'
  | 'ripple'
  | 'cosmos';

interface ChainAssetLogoProps {
  kind: ChainAssetLogoKind;
  className?: string;
}

const ChainAssetLogo: React.FC<ChainAssetLogoProps> = ({ kind, className = 'h-7 w-7' }) => {
  if (kind === 'bitcoin') {
    return (
      <svg aria-label="Bitcoin logo" className={className} role="img" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <text
          fill="white"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="21"
          fontWeight="700"
          textAnchor="middle"
          x="16"
          y="23"
        >
          ₿
        </text>
      </svg>
    );
  }

  if (kind === 'tether') {
    return (
      <svg aria-label="Tether logo" className={className} role="img" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#26A17B" />
        <path d="M5.2 7.1h21.6v5.1h-8.2v3.2c4.8.2 8.3 1 8.3 2s-3.5 1.8-8.3 2v5.5h-5.2v-5.5c-4.8-.2-8.3-1-8.3-2s3.5-1.8 8.3-2v-3.2H5.2V7.1zm8.2 8.4v2.2c.8.1 1.7.1 2.6.1s1.8 0 2.6-.1v-2.2c-.8-.1-1.7-.1-2.6-.1s-1.8 0-2.6.1zm-5.4 1.9c1 .5 3.2.9 5.4 1v-1.6c-2.5.1-4.5.3-5.4.6zm10.6 1c2.2-.1 4.4-.5 5.4-1-.9-.3-2.9-.5-5.4-.6v1.6z" fill="white" />
      </svg>
    );
  }

  if (kind === 'solana') {
    return (
      <svg aria-label="Solana logo" className={className} role="img" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#000000" />
        <defs>
          <linearGradient id="solana-gradient" x1="0" x2="1" y1="1" y2="0">
            <stop offset="0%" stopColor="#9945FF" />
            <stop offset="100%" stopColor="#14F195" />
          </linearGradient>
        </defs>
        <g fill="url(#solana-gradient)">
          <path d="M10.4 20.6c.1-.1.3-.2.5-.2h12.3c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H8.3c-.3 0-.5-.4-.3-.6l2.4-2.4z" />
          <path d="M10.4 8.6c.1-.1.3-.2.5-.2h12.3c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H8.3c-.3 0-.5-.4-.3-.6l2.4-2.4z" />
          <path d="M21.6 14.6c-.1-.1-.3-.2-.5-.2H8.8c-.3 0-.5.4-.3.6l2.4 2.4c.1.1.3.2.5.2h12.3c.3 0 .5-.4.3-.6l-2.4-2.4z" />
        </g>
      </svg>
    );
  }

  if (kind === 'dogecoin') {
    return (
      <svg aria-label="Dogecoin logo" className={className} role="img" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#C2A633" />
        <text
          fill="white"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="20"
          fontWeight="700"
          textAnchor="middle"
          x="16"
          y="23"
        >
          Ð
        </text>
      </svg>
    );
  }

  if (kind === 'litecoin') {
    return (
      <svg aria-label="Litecoin logo" className={className} role="img" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#345D9D" />
        <path d="M17.6 6.4h-3.4l-2.3 9.1-2.1.8-.7 2.6 2.1-.8-1.1 4.3h9.6l.8-3.2h-6.1l.9-3.5 2.1-.8.7-2.6-2.1.8 1.6-6.7z" fill="white" />
      </svg>
    );
  }

  if (kind === 'ripple') {
    return (
      <svg aria-label="XRP logo" className={className} role="img" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#23292F" />
        <path d="M23.1 8h2.6l-5.3 5.2a6.2 6.2 0 0 1-8.8 0L6.3 8h2.6l4 3.9a3.9 3.9 0 0 0 5.5 0l4.7-3.9zM8.9 24H6.3l5.3-5.2a6.2 6.2 0 0 1 8.8 0l5.3 5.2h-2.6l-4-3.9a3.9 3.9 0 0 0-5.5 0L8.9 24z" fill="white" />
      </svg>
    );
  }

  if (kind === 'cosmos') {
    return (
      <svg aria-label="Cosmos logo" className={className} role="img" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#2E3148" />
        <g fill="none" stroke="white" strokeWidth="1.4">
          <ellipse cx="16" cy="16" rx="9.5" ry="4" />
          <ellipse cx="16" cy="16" rx="9.5" ry="4" transform="rotate(60 16 16)" />
          <ellipse cx="16" cy="16" rx="9.5" ry="4" transform="rotate(120 16 16)" />
        </g>
        <circle cx="16" cy="16" r="2.1" fill="white" />
      </svg>
    );
  }

  return (
    <svg aria-label="TRON logo" className={className} role="img" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="#EF0027" />
      <path d="M6.3 7.1 26 10l-9.8 15L6.3 7.1zm3.1 2.7 6.7 11 1.9-8.8-8.6-2.2zm10.2 2.9-1.7 7.7 5.2-7.9-3.5.2zM8.8 8.9l8.4 2.1 6.1-.4-14.5-1.7z" fill="white" />
    </svg>
  );
};

export default ChainAssetLogo;
