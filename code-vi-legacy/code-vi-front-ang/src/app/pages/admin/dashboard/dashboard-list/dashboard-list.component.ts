import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/core/components/button/button.component';
import { DashboardService } from 'src/app/core/services/dashboard/dashboard.service';
import { TableColumn, TabType, TeamDisplayItem } from '../../../../core/models/dashboard/dashboard-display.interface';
import { TeamProjectResponseDto } from '../../../../core/models/dashboard/dashboard-response.interface';

@Component({
  selector: 'app-dashboard-list',
  templateUrl: './dashboard-list.component.html',
  styleUrls: ['./dashboard-list.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, AngularSvgIconModule, ButtonComponent]
})
export class DashboardListComponent implements OnInit {
  // 현재 선택된 탭 상태
  selectedTab: TabType = 'team';

  isLoading = false;
  error: string | null = null;

  // 테이블에 렌더링될 실제 데이터 리스트
  items: any[] = [];

  currentPage = 1;
  totalPages = [1];

  changePage(page: number): void {
    this.currentPage = page;
  }

  // 각 탭별 테이블 헤더 및 데이터 키 설정 (중복 코드 방지 및 확장성 확보)
  readonly COLUMN_CONFIG: Record<TabType, TableColumn[]> = {
    team: [
      { key: 'buildNumber', label: '빌드 #', width: '5%' },
      { key: 'date', label: '최근 분석일', width: '10%' },
      { key: 'teamName', label: '팀명', width: '10%' },
      { key: 'members', label: '팀원', width: '20%' },
      { key: 'bugCount', label: '버그 수', width: '8%' },
      { key: 'riskCount', label: '보안 위험', width: '8%' },
      { key: 'ncloc', label: '코드 라인 수', width: '8%' },
      { key: 'codeSmells', label: '코드 스멜 수', width: '8%' },
      { key: 'complexity', label: '순환 복잡도', width: '8%' },
      { key: 'action', label: '분석 상세', width: '15%' }
    ],
    course: [
      { key: 'id', label: '#', width: '5%' },
      { key: 'courseName', label: '강좌명', width: '20%' },
      { key: 'studentCount', label: '수강생', width: '15%' },
      { key: 'attendanceRate', label: '출석률', width: '20%' },
      { key: 'progress', label: '진척률', width: '20%' },
      { key: 'skillUp', label: '역량 향상', width: '20%' }
    ],
    individual: [
      { key: 'id', label: '#', width: '5%' },
      { key: 'userName', label: '사용자명', width: '20%' },
      { key: 'courseTitle', label: '수강 강좌', width: '30%' },
      { key: 'attendance', label: '출석률', width: '20%' },
      { key: 'codingLevel', label: '코딩 수준', width: '25%' }
    ]
  };

  // 현재 선택된 탭의 컬럼 정보만 반환하는 Getter
  get currentColumns(): TableColumn[] {
    return this.COLUMN_CONFIG[this.selectedTab];
  }

  constructor(
    private dashboardService: DashboardService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * 탭 전환 핸들러
   */
  onSelectTab(tab: TabType): void {
    this.selectedTab = tab;
    this.loadData();
  }

  /**
   * 탭 상태에 따른 데이터 로드 분기
   */
  private loadData(): void {
    this.items = []; // 로딩 중 상태 표현을 위해 초기화
    this.error = null;
    this.isLoading = true;

    switch (this.selectedTab) {
      case 'team':
        this.loadTeamItems();
        break;
      case 'course':
        this.items = this.getMockData('course');
        this.isLoading = false;
        break;
      case 'individual':
        this.items = this.getMockData('individual');
        this.isLoading = false;
        break;
    }
  }

  /**
   * 팀별 분석 데이터 로드 (백엔드 API 연동)
   */
  private loadTeamItems(): void {
    this.dashboardService.getAllTeamDashboard().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log('Raw Backend Response Data:', response.data); // 디버깅용 로그
          this.items = response.data.map(item => ({
            id: item.id,
            buildNumber: item.codeAnalysis?.buildNumber ?? 0,
            date: item.codeAnalysis?.createdAt ? String(item.codeAnalysis.createdAt) : '-',
            teamName: item.teamName,
            members: item.members?.join(', ') || '없음',
            bugCount: item.codeAnalysis?.bugs ?? 0,
            riskCount: (item.codeAnalysis?.vulnerabilities ?? 0) + (item.codeAnalysis?.securityHotspots ?? 0),
            ncloc: item.codeAnalysis?.ncloc ?? 0,
            codeSmells: item.codeAnalysis?.codeSmells ?? 0,
            complexity: item.codeAnalysis?.complexity ?? 0,
            astDataId: item.codeAnalysis?.astDataId ?? 0,
            action: '상세보기'
          }));
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('데이터 로드 실패', err);
        this.error = '데이터를 불러오는 중 오류가 발생했습니다.';
        this.isLoading = false;
      }
    });
  }

  /**
   * 백엔드 데이터를 프론트엔드 테이블 구조로 변환하는 Mapper
   */
  private mapToTeamDisplayItem(team: TeamProjectResponseDto): TeamDisplayItem {
    return {
      buildNumber: team.codeAnalysis?.buildNumber ?? 0,
      date: team.codeAnalysis?.createdAt ? String(team.codeAnalysis.createdAt) : '-',
      teamName: team.teamName,
      members: team.members?.join(', ') || '없음',
      bugCount: team.codeAnalysis?.bugs ?? 0,
      // 보안 위험 = 취약점 + 보안 핫스팟 합산
      riskCount: (team.codeAnalysis?.vulnerabilities ?? 0) + (team.codeAnalysis?.securityHotspots ?? 0),
      ncloc: team.codeAnalysis?.ncloc ?? 0,
      codeSmells: team.codeAnalysis?.codeSmells ?? 0,
      complexity: team.codeAnalysis?.complexity ?? 0,
      action: '상세보기'
    };
  }

  /**
   * 상세 페이지 이동 또는 모달 오픈 핸들러
   */
  onAction(item: any): void {
    console.log('[DashboardList] Action triggered for item:', item);

    if (!item?.id) {
      console.error('[DashboardList] Navigation Error: Missing analysis ID (item.id).');
      return;
    }

    // TODO: 백엔드에서 id 제공할 때까지 임시로 0 사용
    const projectId = item.id ?? 0;
    const astDataId = item.astDataId ?? 0;

    console.log(`[DashboardList] ProjectID: ${projectId}, AnalysisID: ${item.id}`);

    if (item.id === undefined || item.id === null) {
      console.warn('[DashboardList] Warning: id is missing. Defaulting to 0.');
    }

    console.log(`[DashboardList] Navigating to details. ProjectID: ${projectId}, astDataId: ${astDataId}`);

    this.router.navigate(['/dashboard/details', projectId, astDataId])
      .catch(error => console.error('[DashboardList] Navigation failed:', error));
  }

  /**
   * 테스트용 목 데이터 (API 미완성 시 사용)
   */
  private getMockData(type: string): any[] {
    if (type === 'course') {
      return [
        { id: 1, courseName: 'SW 시각화 마스터', studentCount: 15, attendanceRate: '98%', progress: '75%', skillUp: 'A' }
      ];
    }
    return [];
  }
}