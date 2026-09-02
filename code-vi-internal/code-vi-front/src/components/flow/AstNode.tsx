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
function AstNode({ id, data: rawData, selected }: NodeProps) {
  const data = rawData as FlowNodeData;
  const config = NODE_CONFIG[data.nodeType] ?? { emoji: '🔷', className: '' };
  const { metrics, smells, qualityScore } = data;

  const smellClass = smells?.high ? styles.smellHigh : smells?.medium ? styles.smellMedium : '';
  const scoreGrade =
    qualityScore != null ? (qualityScore >= 90 ? 'good' : qualityScore >= 70 ? 'warn' : 'bad') : undefined;
  const showScore =
    qualityScore != null && (data.nodeType === 'directory' || data.nodeType === 'file');
  const heatGrade = data.showHeat && showScore ? scoreGrade : undefined;

  return (
    <div
      className={`${styles.node} ${config.className} ${selected ? styles.selected : ''} ${smellClass}`}
      data-node-type={data.nodeType}
      data-selected={selected ? 'true' : 'false'}
      data-heat={heatGrade}
    >
      <Handle type="target" position={Position.Top} className={styles.handle} />

      <div className={styles.header}>
        <span className={styles.emoji}>{config.emoji}</span>
        <span className={styles.label} title={data.label}>
          {data.label}
        </span>
        {smells && smells.total > 0 && (
          <span
            className={styles.smellBadge}
            data-sev={smells.high ? 'high' : 'medium'}
            title={`smell ${smells.total} — ${smells.names.join(', ')}`}
          >
            {smells.total}
          </span>
        )}
        {data.expandable && (
          <button
            type="button"
            className={styles.expandBtn}
            onClick={(e) => {
              e.stopPropagation();
              data.onToggle?.(id);
            }}
            aria-label={data.expanded ? '하위 접기' : '하위 펼치기'}
            title={data.expanded ? '하위 접기' : `하위 ${data.hiddenChildren}개 펼치기`}
          >
            {data.expanded ? '−' : `+${data.hiddenChildren}`}
          </button>
        )}
      </div>

      {(data.meta || showScore) && (
        <div className={styles.meta}>
          {showScore && (
            <span className={styles.scoreTag} data-grade={scoreGrade}>
              {qualityScore}점
            </span>
          )}
          {data.meta?.methodCount != null && (
            <span className={styles.metaTag}>
              {data.meta.methodCount} method{data.meta.methodCount !== 1 ? 's' : ''}
            </span>
          )}
          {data.meta?.fileCount != null && (
            <span className={styles.metaTag}>
              {data.meta.fileCount} file{data.meta.fileCount !== 1 ? 's' : ''}
            </span>
          )}
          {data.meta?.childDirCount != null && data.meta.childDirCount > 0 && (
            <span className={styles.metaTag}>
              {data.meta.childDirCount} sub
            </span>
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
