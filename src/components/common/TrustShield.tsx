import React from 'react';

interface TrustShieldProps {
  className?: string;
}

const TrustShield: React.FC<TrustShieldProps> = ({ className }) => {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 100 120" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Shield (Trust Electric Blue) */}
      <path 
        d="M50 0L95 18V55C95 87 75 112 50 120C25 112 5 87 5 55V18L50 0Z" 
        fill="#0500FF"
      />
      {/* Inner Shield (Teal-Mint Protection) */}
      <path 
        d="M50 14L83 28.5V56C83 80.5 68.5 99.5 50 106.5C31.5 99.5 17 80.5 17 56V28.5L50 14Z" 
        fill="#26E19D"
      />
      {/* Subtle glassy highlight split */}
      <path 
        d="M50 14L83 28.5V56C83 80.5 68.5 99.5 50 106.5V14Z" 
        fill="white" 
        fillOpacity="0.12"
      />
    </svg>
  );
};

export default TrustShield;