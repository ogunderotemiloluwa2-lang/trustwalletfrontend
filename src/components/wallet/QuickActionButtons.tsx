import React from 'react';

interface QuickActionButtonsProps {
  onAction: (action: 'send' | 'receive' | 'buy' | 'swap') => void;
}

interface QuickAction {
  id: 'send' | 'receive' | 'buy' | 'swap';
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  iconRotation: string;
  shadow: string;
  border?: string;
}

const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({ onAction }) => {
  const actions: QuickAction[] = [
    {
      id: 'send',
      label: 'Send',
      icon: 'arrow_upward',
      bgColor: 'bg-tw-primary',
      textColor: 'text-tw-on-primary',
      iconRotation: 'rotate-45 -translate-y-0.5',
      shadow: 'shadow-[0_4px_16px_rgba(61,90,254,0.3)]',
    },
    {
      id: 'receive',
      label: 'Receive',
      icon: 'arrow_downward',
      bgColor: 'bg-tw-surface-container-high',
      textColor: 'text-tw-primary',
      iconRotation: '',
      shadow: '',
      border: 'border border-white/[0.06]',
    },
    {
      id: 'buy',
      label: 'Buy',
      icon: 'credit_card',
      bgColor: 'bg-tw-surface-container-high',
      textColor: 'text-tw-on-surface',
      iconRotation: '',
      shadow: '',
      border: 'border border-white/[0.06]',
    },
    {
      id: 'swap',
      label: 'Swap',
      icon: 'swap_horiz',
      bgColor: 'bg-tw-surface-container-high',
      textColor: 'text-tw-primary',
      iconRotation: '',
      shadow: '',
      border: 'border border-white/[0.06]',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 pt-3 mt-1 border-t border-white/[0.05]">
      {actions.map((action) => (
        <button
          key={action.id}
          className="group flex flex-col items-center gap-1.5 focus:outline-none"
          onClick={() => onAction(action.id)}
        >
          <div className="relative flex h-12 w-12 p-3 items-center justify-center rounded-2xl transition-all active:scale-90 group-hover:scale-105">
            <div
              className={`relative flex h-12 w-12 p-3 items-center justify-center rounded-2xl ${action.bgColor} ${
                action.textColor
              } ${action.shadow} ${action.border || ''} transition-all`}
            >
              <span
                className={`material-symbols-outlined text-[24px] ${action.iconRotation}`}
              >
                {action.icon}
              </span>
            </div>
          </div>
          <span
            className={`font-display text-[11px] font-normal group-hover:text-tw-primary transition-colors ${
              action.id === 'send' ? 'text-tw-on-surface' : 'text-tw-on-surface'
            }`}
          >
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default QuickActionButtons;