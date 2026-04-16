import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FlowNodeData, FlowNodeType } from '../../interface/flow.interface';
import styles from './AstNode.module.css';

const NODE_CONFIG: Record<FlowNodeType, { emoji: string; className: string }> = {
  directory: { emoji: '📁', className: styles.directory },
  file: { emoji: '📄', className: styles.file },
  class: { emoji: '🏛️', className: styles.class },
  function: { emoji: '⚡', className: styles.function },
};

// @xyflow/react v12: NodeProps uses Record<string, unknown> generic
// We cast data to FlowNodeData after receiving it
function AstNode({ data: rawData, selected }: NodeProps) {
  const data = rawData as FlowNodeData;
  const config = NODE_CONFIG[data.nodeType] ?? { emoji: '🔷', className: '' };
  const { metrics } = data;

  return (
    <div
      className={`${styles.node} ${config.className} ${selected ? styles.selected : ''}`}
      data-node-type={data.nodeType}
      data-selected={selected ? 'true' : 'false'}
    >
      <Handle type="target" position={Position.Top} className={styles.handle} />

      <div className={styles.header}>
        <span className={styles.emoji}>{config.emoji}</span>
        <span className={styles.label} title={data.label}>
          {data.label}
        </span>
      </div>

      {data.meta && (
        <div className={styles.meta}>
          {data.meta.methodCount != null && (
            <span className={styles.metaTag}>{data.meta.methodCount} methods</span>
          )}
          {data.meta.fileCount != null && (
            <span className={styles.metaTag}>{data.meta.fileCount} files</span>
          )}
        </div>
      )}

      {/* 상세 메트릭은 hover/selected에서만 노출 (CSS로 제어) */}
      {data.nodeType === 'class' && metrics && (
        <div className={styles.metricsPopover} aria-hidden={!selected}>
          <div className={styles.metricsGrid}>
            <div className={styles.metricItem} title="Coupling Between Objects">
              <span className={styles.metricLabel}>CBO</span>
              <span className={styles.metricValue}>{metrics.cbo}</span>
            </div>
            <div className={styles.metricItem} title="Response For a Class">
              <span className={styles.metricLabel}>RFC</span>
              <span className={styles.metricValue}>{metrics.rfc}</span>
            </div>
            <div className={styles.metricItem} title="Lack of Cohesion in Methods">
              <span className={`${styles.metricLabel} ${metrics.lcom > 50 ? styles.warn : ''}`}>LCOM</span>
              <span className={styles.metricValue}>{metrics.lcom}</span>
            </div>
            <div className={styles.metricItem} title="Weighted Methods per Class (Complexity)">
              <span className={styles.metricLabel}>WMC</span>
              <span className={styles.metricValue}>{metrics.wmc}</span>
            </div>
            <div className={styles.metricItem} title="Depth of Inheritance Tree">
              <span className={styles.metricLabel}>DIT</span>
              <span className={styles.metricValue}>{metrics.dit}</span>
            </div>
            <div className={styles.metricItem} title="Number of Children">
              <span className={styles.metricLabel}>NOC</span>
              <span className={styles.metricValue}>{metrics.noc}</span>
            </div>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className={styles.handle} />
    </div>
  );
}

export default memo(AstNode);
