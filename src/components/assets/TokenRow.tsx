import React from 'react';
import { Token } from '../../types';
import ChainAssetLogo from './ChainAssetLogo';

interface TokenRowProps {
  token: Token;
  onClick?: () => void;
}

const withAlpha = (hex: string, alpha: number) => {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TokenRow: React.FC<TokenRowProps> = ({ token, onClick }) => {
  const renderIcon = () => {
    if (
      token.icon === 'bitcoin' ||
      token.icon === 'tether' ||
      token.icon === 'tron' ||
      token.icon === 'solana' ||
      token.icon === 'dogecoin' ||
      token.icon === 'litecoin' ||
      token.icon === 'ripple' ||
      token.icon === 'cosmos'
    ) {
      return <ChainAssetLogo className="h-7 w-7" kind={token.icon} />;
    }

    if (token.icon === 'bnb') {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.5L7.25 7.25l2.25 2.25L12 7l2.5 2.5 2.25-2.25L12 2.5zm0 14.5l-2.5-2.5-2.25 2.25L12 21.5l4.75-4.75-2.25-2.25L12 17zm-4.75-7.25L2.5 12l4.75 4.75 2.25-2.25L7 12l2.25-2.25-2-2.5zm9.5 0l-2 2.5 2.25 2.25-2.25 2.25 4.75-4.75-4.75-4.75z"></path>
          <polygon points="12,9.75 9.75,12 12,14.25 14.25,12"></polygon>
        </svg>
      );
    }

    if (token.icon === 'ethereum') {
      return (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 32 32">
          <path d="M16 2L6 18l10 6 10-6L16 2zm0 21.8L6 19.3 16 30l10-10.7-10 4.5z"></path>
        </svg>
      );
    }

    if (token.icon === 'shield') {
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 2L4 6V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V6L12 2Z"
            fill={token.iconColor}
            fillOpacity="0.2"
            stroke={token.iconColor}
            strokeWidth="2"
          />
          <path
            d="M12 2V22C16.5 21 20 16.5 20 11.5V6L12 2Z"
            fill={token.iconColor}
          />
        </svg>
      );
    }

    return (
      <span className="material-symbols-outlined text-[26px]">{token.icon}</span>
    );
  };

  return (
    <div 
      className={`token-row flex items-center justify-between p-3 rounded-2xl bg-tw-surface-container-low/80 hover:bg-tw-surface-container border border-white/[0.04] active:scale-[0.99] transition-all cursor-pointer ${
        token.isOfficial ? 'border-tw-primary/20 relative overflow-hidden' : ''
      }`}
      data-name={token.name}
      data-symbol={token.symbol}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {token.isOfficial && (
        <div className="pointer-events-none absolute -right-6 -bottom-6 w-20 h-20 bg-tw-primary/10 rounded-full blur-xl"></div>
      )}
      
      <div className="flex items-center gap-2.5 min-w-0">
        <div 
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ 
            backgroundColor: withAlpha(token.iconColor, 0.15),
            borderColor: withAlpha(token.iconColor, 0.3)
          }}
        >
          <div style={{ color: token.glyphColor ?? token.iconColor }}>
            {renderIcon()}
          </div>
          {token.badge && (
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-tw-surface-container-high text-[9px] font-bold border border-tw-surface"
              style={{ color: token.badge.color }}
            >
              {token.badge.label}
            </span>
          )}
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-medium text-[13px] text-tw-on-surface truncate">
              {token.symbol}
            </span>
            <span className="rounded-[0.25rem] px-1 py-0.5 text-[9px] font-medium bg-white/[0.06] text-tw-on-surface-variant">
              {token.network}
            </span>
            {token.isOfficial && (
              <span className="rounded-[0.25rem] px-1 py-0.5 text-[9px] font-medium bg-tw-primary/20 text-tw-primary border border-tw-primary/30">
                Official
              </span>
            )}
            {token.isVerified === false && (
              <span className="rounded-[0.25rem] px-1 py-0.5 text-[9px] font-medium bg-white/[0.06] text-tw-on-surface-variant">
                Unverified
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="max-w-28 truncate text-[10px] text-tw-on-surface-variant" title={token.name}>
              {token.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-tw-on-surface-variant font-normal">
              {token.price}
            </span>
            {token.change && <span 
              className={`text-[10px] font-medium flex items-center ${
                token.changeType === 'gain' ? 'text-tw-gain' : 'text-tw-loss'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] font-bold">
                {token.changeType === 'gain' ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
              {token.change}
            </span>}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end shrink-0 pl-2">
        <span className="font-display font-medium text-[12px] text-tw-on-surface">
          {token.amount}
        </span>
        <span className="text-[11px] text-tw-on-surface-variant font-normal balance-fiat">
          {token.fiatValue}
        </span>
      </div>
    </div>
  );
};

export default TokenRow;