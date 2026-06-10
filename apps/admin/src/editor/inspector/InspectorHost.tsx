import { useState, type ReactNode } from 'react';
import { AlignCenter, AlignLeft, AlignRight, FileText, Heading, History, LayoutList, ListTree, MousePointerSquareDashed, Pilcrow, Quote, type LucideIcon } from 'lucide-react';
import { useEditorContext } from '../core/EditorContext';
import { PropertyPanelHost } from '../property-panels';
import type { EditorInspectorMode, EditorInspectorSectionDefinition } from '../contracts';

const SECTION_ICONS: Record<string, LucideIcon> = {
  document: FileText,
  blocks: LayoutList,
  history: History,
  outline: ListTree,
};

type InspectorTab = 'document' | 'outline' | 'blocks' | 'history';

interface InspectorHostProps {
  documentContent?: ReactNode;
  historyContent?: ReactNode;
}

export function InspectorHost({ documentContent, historyContent }: InspectorHostProps) {
  const { editor, runtime, selectionState } = useEditorContext();
  const selectedNode = selectionState.selectedNode;
  const selectedBlockNode = selectionState.selectedBlockNode;
  const selectedBlockPos = selectionState.selectedBlockPos;
  const mode: EditorInspectorMode = selectedNode || selectedBlockNode ? 'block' : 'document';
  const [activeTab, setActiveTab] = useState<InspectorTab>('document');

  if (!editor) return null;

  const blockStats = getBlockStatistics(editor.getJSON());

  if (mode === 'block') {
    const blockNode = selectedNode || selectedBlockNode;
    return (
      <aside className="editor-inspector-shell" data-inspector-mode="block">
        <div className="editor-inspector-header">
          <div>
            <span className="editor-inspector-kicker">Selected Block</span>
            <h3>{getBlockInspectorTitle(blockNode)}</h3>
          </div>
          <MousePointerSquareDashed size={18} className="lucide-icon" />
        </div>
        {selectedNode ? (
          <PropertyPanelHost />
        ) : (
          <ActiveBlockSettings node={selectedBlockNode} pos={selectedBlockPos} />
        )}
      </aside>
    );
  }

  const sections = runtime.getInspectorSectionsByMode('document');

  return (
    <aside className="editor-inspector-shell" data-inspector-mode="document">
      <div className="editor-inspector-header">
        <div>
          <span className="editor-inspector-kicker">Inspector</span>
          <h3>Document</h3>
        </div>
        <FileText size={18} className="lucide-icon" />
      </div>
      <div className="editor-inspector-tabs" role="tablist" aria-label="Inspector sections">
        {(['document', 'outline', 'blocks', 'history'] as InspectorTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`editor-inspector-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      {activeTab === 'document' && (
        <div className="editor-inspector-section-list">
          {documentContent || sections.map((section) => (
            <InspectorSection key={section.id} section={section} />
          ))}
        </div>
      )}
      {activeTab === 'outline' && <OutlinePanel />}
      {activeTab === 'blocks' && <BlockStatistics stats={blockStats} />}
      {activeTab === 'history' && (
        <div className="editor-inspector-section-list">
          {historyContent || (
            <section className="editor-inspector-section" data-inspector-section="history">
              <div className="editor-inspector-section-heading">
                <History size={15} className="lucide-icon" />
                <div>
                  <h4>History</h4>
                  <p>Revision activity will appear here in a later phase.</p>
                </div>
              </div>
              <div className="editor-inspector-placeholder">No revision timeline is connected yet.</div>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}

function ActiveBlockSettings({ node, pos }: { node: any | null; pos: number | null }) {
  const { editor } = useEditorContext();

  if (!editor || !node) {
    return (
      <div className="editor-inspector-placeholder">Select a block to configure it.</div>
    );
  }

  const nodeType = node.type?.name || 'block';
  const isHeading = nodeType === 'heading';
  const isQuote = nodeType === 'blockquote';
  const level = node.attrs?.level || 1;

  const focusBlock = () => {
    const chain = editor.chain().focus();
    if (typeof pos === 'number') {
      chain.setTextSelection(Math.min(pos + 1, editor.state.doc.content.size));
    }

    return chain;
  };

  const applyTextBlock = (next: 'paragraph' | 1 | 2) => {
    const chain = focusBlock();

    if (next === 'paragraph') {
      chain.setParagraph().run();
      return;
    }

    chain.toggleHeading({ level: next }).run();
  };

  const toggleQuote = () => {
    focusBlock().toggleBlockquote().run();
  };

  const setAlignment = (alignment: 'left' | 'center' | 'right') => {
    focusBlock().setTextAlign(alignment).run();
  };

  return (
    <div className="editor-inspector-section-list">
      <section className="editor-inspector-section" data-inspector-section="active-block">
        <div className="editor-inspector-section-heading">
          {isHeading ? <Heading size={15} className="lucide-icon" /> : isQuote ? <Quote size={15} className="lucide-icon" /> : <Pilcrow size={15} className="lucide-icon" />}
          <div>
            <h4>{isHeading ? `Heading ${level}` : isQuote ? 'Quote' : 'Paragraph'}</h4>
            <p>Configure the selected content block.</p>
          </div>
        </div>
        <div className="active-block-panel">
          <div className="active-block-group">
            <span>Transform</span>
            <div className="active-block-segmented">
              <button type="button" className={!isHeading && !isQuote ? 'active' : ''} onClick={() => applyTextBlock('paragraph')}>P</button>
              <button type="button" className={isHeading && level === 1 ? 'active' : ''} onClick={() => applyTextBlock(1)}>H1</button>
              <button type="button" className={isHeading && level === 2 ? 'active' : ''} onClick={() => applyTextBlock(2)}>H2</button>
              <button type="button" className={isQuote ? 'active' : ''} onClick={toggleQuote}>Quote</button>
            </div>
          </div>

          <div className="active-block-group">
            <span>Style</span>
            <div className="active-block-icon-row">
              <button type="button" title="Align left" onClick={() => setAlignment('left')}><AlignLeft size={14} /></button>
              <button type="button" title="Align center" onClick={() => setAlignment('center')}><AlignCenter size={14} /></button>
              <button type="button" title="Align right" onClick={() => setAlignment('right')}><AlignRight size={14} /></button>
            </div>
          </div>

          <div className="active-block-group">
            <span>Spacing</span>
            <div className="active-block-metric-row">
              <label>
                Before
                <input value="Default" readOnly />
              </label>
              <label>
                After
                <input value="Default" readOnly />
              </label>
            </div>
          </div>

          <details className="active-block-advanced">
            <summary>Advanced</summary>
            <label>
              Anchor
              <input value="" readOnly placeholder="section-anchor" />
            </label>
            <label>
              Custom Class
              <input value="" readOnly placeholder="Not configured" />
            </label>
          </details>
        </div>
      </section>
    </div>
  );
}

function OutlinePanel() {
  const { editor } = useEditorContext();
  if (!editor) return null;

  const outline = getHeadingOutline(editor);

  return (
    <div className="editor-inspector-section-list">
      <section className="editor-inspector-section" data-inspector-section="outline">
        <div className="editor-inspector-section-heading">
          <ListTree size={15} className="lucide-icon" />
          <div>
            <h4>Outline</h4>
            <p>Jump through the document heading structure.</p>
          </div>
        </div>
        {outline.length === 0 ? (
          <div className="editor-inspector-placeholder">No headings yet.</div>
        ) : (
          <div className="editor-outline-list">
            {outline.map((item) => (
              <button
                key={`${item.pos}-${item.text}`}
                type="button"
                className={`editor-outline-item editor-outline-item--h${item.level}`}
                onClick={() => {
                  editor.chain().focus().setTextSelection(Math.min(item.pos + 1, editor.state.doc.content.size)).run();
                }}
              >
                <span>{item.text}</span>
                <strong>H{item.level}</strong>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getHeadingOutline(editor: any) {
  const outline: Array<{ level: number; text: string; pos: number }> = [];

  editor.state.doc.descendants((node: any, pos: number) => {
    if (node.type.name !== 'heading') return;
    const text = node.textContent?.trim() || 'Untitled heading';
    outline.push({
      level: node.attrs?.level || 1,
      text,
      pos,
    });
  });

  return outline;
}

function getBlockInspectorTitle(node: any | null) {
  const nodeType = node?.type?.name;
  if (nodeType === 'heading') return `Heading ${node.attrs?.level || 1} Settings`;
  if (nodeType === 'mediaNode' || nodeType === 'externalImageNode') return 'Image Settings';
  if (nodeType === 'table') return 'Table Settings';
  if (nodeType === 'paragraph') return 'Paragraph Settings';
  return 'Block Settings';
}

function InspectorSection({ section }: { section: EditorInspectorSectionDefinition }) {
  const { editor, selectionState } = useEditorContext();
  const Icon = SECTION_ICONS[section.id] || FileText;
  const SectionComponent = section.component;

  return (
    <section className="editor-inspector-section" data-inspector-section={section.id}>
      <div className="editor-inspector-section-heading">
        <Icon size={15} className="lucide-icon" />
        <div>
          <h4>{section.title}</h4>
          {section.description && <p>{section.description}</p>}
        </div>
      </div>
      {SectionComponent ? (
        <SectionComponent editor={editor!} selectedNode={selectionState.selectedNode} />
      ) : (
        <div className="editor-inspector-placeholder">Available in a later phase.</div>
      )}
    </section>
  );
}

function BlockStatistics({ stats }: { stats: ReturnType<typeof getBlockStatistics> }) {
  return (
    <div className="editor-inspector-section-list">
      <section className="editor-inspector-section" data-inspector-section="blocks">
        <div className="editor-inspector-section-heading">
          <LayoutList size={15} className="lucide-icon" />
          <div>
            <h4>Blocks</h4>
            <p>Lightweight structure summary for the current draft.</p>
          </div>
        </div>
        <div className="editor-block-stat-grid">
          <Stat label="Headings" value={stats.headings} />
          <Stat label="Paragraphs" value={stats.paragraphs} />
          <Stat label="Images" value={stats.images} />
          <Stat label="Lists" value={stats.lists} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="editor-block-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getBlockStatistics(doc: any) {
  const stats = {
    headings: 0,
    paragraphs: 0,
    images: 0,
    lists: 0,
  };

  const visit = (node: any) => {
    if (!node) return;
    if (node.type === 'heading') stats.headings += 1;
    if (node.type === 'paragraph') stats.paragraphs += 1;
    if (node.type === 'mediaNode' || node.type === 'externalImageNode') stats.images += 1;
    if (node.type === 'bulletList' || node.type === 'orderedList') stats.lists += 1;
    node.content?.forEach(visit);
  };

  visit(doc);
  return stats;
}
