import React from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { useEditorContext } from '../core/EditorContext';
import { EditorToolbarItem } from '../contracts';

export interface ResolvedToolbarGroup {
  id: string;
  label?: string;
  order: number;
  items: EditorToolbarItem[];
}

export interface ResolvedToolbarTab {
  id: string;
  label: string;
  order: number;
  groups: ResolvedToolbarGroup[];
}

const TAB_LABELS: Record<string, string> = {
  format: 'Format',
  insert: 'Insert',
};

const TAB_ORDER: Record<string, number> = {
  format: 10,
  insert: 20,
};

const ICONS: Record<string, LucideIcon> = {
  alignCenter: AlignCenter,
  alignJustify: AlignJustify,
  alignLeft: AlignLeft,
  alignRight: AlignRight,
  bold: Bold,
  code: Code,
  image: ImageIcon,
  italic: Italic,
  link: Link,
  list: List,
  listOrdered: ListOrdered,
  minus: Minus,
  quote: Quote,
  strike: Strikethrough,
  type: Type,
};

export function resolveToolbarLayout(items: EditorToolbarItem[]): ResolvedToolbarTab[] {
  const tabs = new Map<string, ResolvedToolbarTab>();

  items.forEach((item) => {
    const tab = tabs.get(item.tab) || {
      id: item.tab,
      label: TAB_LABELS[item.tab] || item.tab,
      order: TAB_ORDER[item.tab] ?? 100,
      groups: [],
    };
    const group = tab.groups.find((candidate) => candidate.id === item.group) || {
      id: item.group,
      label: item.groupLabel,
      order: item.groupOrder ?? 100,
      items: [],
    };

    if (!tab.groups.includes(group)) {
      tab.groups.push(group);
    }
    group.items.push(item);
    tabs.set(item.tab, tab);
  });

  return [...tabs.values()]
    .map((tab) => ({
      ...tab,
      groups: tab.groups
        .map((group) => ({
          ...group,
          items: [...group.items].sort((a, b) => (a.order ?? 100) - (b.order ?? 100)),
        }))
        .sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order);
}

interface EditorToolbarRibbonProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRequestDialog?: (dialog: 'link' | 'image') => void;
}

export function EditorToolbarRibbon({
  activeTab,
  onTabChange,
  onRequestDialog,
}: EditorToolbarRibbonProps) {
  const { editor, runtime } = useEditorContext();
  const layout = resolveToolbarLayout(runtime.getToolbarItems());
  const selectedTab = layout.some((tab) => tab.id === activeTab) ? activeTab : layout[0]?.id;
  const activeLayout = layout.find((tab) => tab.id === selectedTab);

  if (!editor || !activeLayout) return null;

  return (
    <>
      <div className="editor-tabs-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '0 1rem', background: 'rgba(0,0,0,0.1)' }}>
        {layout.map((tab) => (
          <button
            key={tab.id}
            className={`editor-tab-btn ${selectedTab === tab.id ? 'active' : ''}`}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => onTabChange(tab.id)}
            style={{ background: 'transparent', borderBottom: selectedTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="editor-toolbar" style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {activeLayout.groups.map((group, groupIndex) => (
          <React.Fragment key={group.id}>
            {groupIndex > 0 && <ToolbarDivider />}
            {group.items.map((item) => (
              <ToolbarItem
                key={item.id}
                item={item}
                onRequestDialog={onRequestDialog}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

function ToolbarItem({
  item,
  onRequestDialog,
}: {
  item: EditorToolbarItem;
  onRequestDialog?: (dialog: 'link' | 'image') => void;
}) {
  const { editor, runtime } = useEditorContext();
  if (!editor) return null;

  if (item.type === 'select') {
    return (
      <select
        title={item.label}
        value={item.getValue?.(editor) || ''}
        disabled={item.isDisabled?.(editor)}
        onChange={(event) => {
          if (item.commandName) {
            runtime.executeCommand(editor, item.commandName, event.target.value);
          }
          item.action?.({
            editor,
            executeCommand: (name, ...args) => runtime.executeCommand(editor, name, ...args),
            requestDialog: onRequestDialog,
          });
        }}
        style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', fontSize: '0.8rem', cursor: 'pointer' }}
      >
        {(item.options || []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  const Icon = ICONS[item.icon] || Type;

  return (
    <button
      title={item.label}
      className={`toolbar-btn ${item.isActive?.(editor) ? 'active' : ''}`}
      disabled={item.isDisabled?.(editor)}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={() => {
        if (item.commandName) {
          runtime.executeCommand(editor, item.commandName, ...(item.commandArgs || []));
        }
        item.action?.({
          editor,
          executeCommand: (name, ...args) => runtime.executeCommand(editor, name, ...args),
          requestDialog: onRequestDialog,
        });
      }}
    >
      <Icon size={15} />
    </button>
  );
}

function ToolbarDivider() {
  return <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.25rem' }} />;
}
