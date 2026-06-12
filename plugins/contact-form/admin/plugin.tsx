import { AdminPlugin } from '@modern-cms/plugin-sdk';
import React from 'react';
import ContactFormPage from './ContactFormPage.js';

const MailIcon = ({ size = 14, className }: { size?: number; className?: string }) => 
  React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className
    },
    React.createElement('rect', { x: '3', y: '4', width: '18', height: '16', rx: '2' }),
    React.createElement('path', { d: 'M12 8h.01M8 12h8M8 16h8' })
  );

const ContactFormPlugin: AdminPlugin = {
  id: 'contact-form',
  icon: MailIcon,
  component: ContactFormPage
};

export default ContactFormPlugin;
