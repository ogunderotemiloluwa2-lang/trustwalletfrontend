import React from 'react';
import { useNavigate } from 'react-router-dom';

interface CreateAccountLinkProps {
  /** Extra classes for spacing, e.g. `mt-6`. */
  className?: string;
  /** Wording of the link; the default suits a sign-in screen. */
  label?: string;
}

/**
 * Entry point to wallet creation, shown on every screen that is not already
 * part of the setup flow. Creating a wallet creates the account that owns it,
 * so this is the "create a new account" action.
 */
const CreateAccountLink: React.FC<CreateAccountLinkProps> = ({
  className = '',
  label = 'New here? Create a new account',
}) => {
  const navigate = useNavigate();

  return (
    <button
      className={`flex items-center justify-center gap-1.5 text-sm text-primary ${className}`.trim()}
      onClick={() => navigate('/create-account')}
      type="button"
    >
      <span className="material-symbols-outlined text-base">add_circle</span>
      <span>{label}</span>
    </button>
  );
};

export default CreateAccountLink;
