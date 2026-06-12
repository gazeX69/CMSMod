import { AdminPlugin } from '@modern-cms/plugin-sdk';
import React from 'react';
import CommentsPage from './CommentsPage';
import CommentsInspector, { bindCommentsInspectorSdk, commentToggles } from './CommentsInspector';

const MessageIcon = ({ size = 14, className }: { size?: number; className?: string }) => 
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
    React.createElement('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })
  );

const apiFetch = (path: string, options: RequestInit = {}) =>
  fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000'}${path}`, {
    ...options,
    credentials: 'include',
  });

function registerCommentsEditorIntegration(sdk: any) {
  bindCommentsInspectorSdk(sdk);

  sdk.editor.inspector.register({
    id: 'comments-toggle',
    title: 'Discussion',
    order: 40,
    component: CommentsInspector,
  });

  sdk.editor.document.registerSupplementalSave(async (context: any) => {
    let enabled = commentToggles.get(context.contentUuid);
    
    // If it's a new draft being saved for the first time, check the new draft key
    if (enabled === undefined) {
      enabled = commentToggles.get('__new_draft__');
    }

    if (enabled !== undefined) {
      const response = await apiFetch(`/api/comments/admin/metadata/${context.contentUuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error('Failed to save discussion settings metadata');
      }
      
      // Cache it to the actual contentUuid and clear draft placeholder
      commentToggles.set(context.contentUuid, enabled);
      commentToggles.delete('__new_draft__');
    }
  });
}

const CommentsPlugin: AdminPlugin = {
  id: 'comments',
  icon: MessageIcon,
  component: CommentsPage,
  register: registerCommentsEditorIntegration
};

export default CommentsPlugin;
