// DEAD CODE (2026-07-11): 어디서도 import되지 않는 더미 테스트 서비스.
// 실제 훅/페이지는 services/astDataService.ts(실 API)를 사용 중.
import type { AstSnapshot, AstSnapshotSummary } from '../interface/ast.interface';
import { dummySnapshots, dummySnapshotDetail } from '../dummy/astDummyData';
import { dummySnapshotDetailLarge } from '../dummy/astDummyDataLarge';

/**
 * ⚠️ UI 디자인 테스트를 위한 임시 서비스입니다.
 * 실제 백엔드 연동 전까지 Dummy 데이터를 반환합니다.
 */
export const astDataService = {
  /**
   * 프로젝트의 모든 스냅샷 목록 조회 (Dummy)
   */
  async getSnapshots(): Promise<AstSnapshotSummary[]> {
    console.log(`[TEST_API] Fetching snapshots`);
    // 실제 API 통신 지연시간 시뮬레이션
    return new Promise((resolve) => {
      setTimeout(() => resolve(dummySnapshots), 500);
    });
  },

  /**
   * 특정 스냅샷 상세 AST 데이터 조회 (Dummy)
   */
  async getSnapshot(snapshotId: number): Promise<AstSnapshot> {
    console.log(`[TEST_API] Fetching snapshot ID: ${snapshotId}`);
    // snapshotId=4 → 실제 스냅샷 규모(dirs 140 / files 486)의 대용량 더미 (가독성 테스트용)
    const detail = snapshotId === 4 ? dummySnapshotDetailLarge : dummySnapshotDetail;
    return new Promise((resolve) => {
      setTimeout(() => resolve(detail), 800);
    });
  },

  /**
   * 계층 구조 데이터 가져오기 (SnapshotDetail과 동일한 로직으로 Dummy 반환)
   */
  async getHierarchyBySnapshot(snapshotId: number): Promise<AstSnapshot> {
    return this.getSnapshot(snapshotId);
  }
};
