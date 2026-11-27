import React from 'react';
import { RaagLogo, RaagLogoProps } from './RaagLogo';

export const PeacockMascot: React.FC<RaagLogoProps> = (props) => {
  return <RaagLogo {...props} />;
};

export const MascotIcon = PeacockMascot;
