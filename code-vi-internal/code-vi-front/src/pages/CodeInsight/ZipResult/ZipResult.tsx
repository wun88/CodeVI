import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AstNode from '../../../components/flow/AstNode';
import { zipTreeToFlow, type ParserTreeNode } from '../../../utils/zipResultFlow';
import '../CodeInsight.css';
import './ZipResult.css';

const nodeTypes: NodeTypes = {
  astNode: AstNode,
};

interface StoredZipResult {
  repoName: string;
  analyzedAt: string;
  result: {
    data?: {
      nodes?: ParserTreeNode[];
    };
  };
}

function readStoredResult(): StoredZipResult | null {
  try {
    const raw = sessionStorage.getItem('zipAnalysisResult');
    return raw ? (JSON.parse(raw) as StoredZipResult) : null;
  } catch {
    return null;
  }
}

function ZipResult() {
  const navigate = useNavigate();

  const stored = useMemo(readStoredResult, []);
  const treeNodes = stored?.result?.data?.nodes;

  const flow = useMemo(() => (treeNodes?.length ? zipTreeToFlow(treeNodes) : null), [treeNodes]);

  return (
    <div className="code-insight-page">
      <Header variant="internal" />
      <main className="code-insight-content zip-result-shell">
        <button className="back-btn" onClick={() => navigate('/code-insight/upload')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          돌아가기
        </button>

        <div className="code-insight-header header-left">
          <h1>ZIP 분석 결과</h1>
          <p>1회성 분석 — 저장되지 않으며 이 세션에서만 유지됩니다.</p>
        </div>

        {!flow ? (
          <div className="zipResultEmpty">
            <p>표시할 분석 결과가 없습니다. 세션이 만료되었거나 결과가 너무 커서 보관되지 않았을 수 있습니다.</p>
            <button className="analyze-btn" onClick={() => navigate('/code-insight/upload')}>
              다시 분석하기
            </button>
          </div>
        ) : (
          <section className="zipResultCard">
            <div className="zipResultHead">
              <div className="zipResultTitle">
                <span className="zipResultRepo">{stored!.repoName}</span>
                <span className="zipResultTime">
                  {new Date(stored!.analyzedAt).toLocaleString()}
                </span>
              </div>
              <div className="zipResultStats">
                <span className="zipStat">📁 {flow.stats.directories}</span>
                <span className="zipStat">📄 {flow.stats.files}</span>
                <span className="zipStat">🏛️ {flow.stats.classes}</span>
                <span className="zipStat">⚡ {flow.stats.functions}</span>
              </div>
            </div>

            <div className="zipResultCanvas">
              <ReactFlow
                nodes={flow.nodes}
                edges={flow.edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.05}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
              >
                <Controls
                  style={{
                    background: 'rgba(255,255,255,0.62)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    borderRadius: 12,
                    boxShadow: '0 4px 14px rgba(34,34,34,0.05)',
                  }}
                />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(148, 163, 184, 0.4)" />
              </ReactFlow>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default ZipResult;
