import React from 'react';

interface SecurityBadgeProps {
  icon: string;
  title: string;
  description: string;
  /** Tailwind text color class for the icon glyph */
  iconColor?: string;
  /** Optional trailing element; defaults to a chevron */
  trailing?: React.ReactNode;
}

const SecurityBadge: React.FC<SecurityBadgeProps> = ({
  icon,
  title,
  description,
  iconColor = 'text-tertiary',
  trailing,
}) => {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low transition-colors hover:bg-surface-container">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center ${iconColor}`}
        >
          <span
            className="material-symbols-outlined text-lg"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-lg text-label-lg text-on-surface">{title}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {description}
          </span>
        </div>
      </div>
      {trailing ?? (
        <span className="material-symbols-outlined text-on-surface-variant text-sm">
          chevron_right
        </span>
      )}
    </div>
  );
};

export default SecurityBadge;