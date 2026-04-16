import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DashboardService } from 'src/app/core/services/dashboard/dashboard.service';
import * as d3 from 'd3-hierarchy';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

@Component({
    selector: 'app-dashboard-details',
    templateUrl: './dashboard-details.component.html',
    styleUrls: ['./dashboard-details.component.scss'],
    standalone: true,
    imports: [CommonModule]
})
export class DashboardDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('cyContainer') containerElement!: ElementRef;

    private app?: PIXI.Application;
    private viewport?: Viewport;
    isLoading = true;
    error: string | null = null;
    projectData: any;

    constructor(private route: ActivatedRoute, private dashboardService: DashboardService) { }

    ngOnInit(): void {
        const projectId = this.route.snapshot.paramMap.get('projectId');
        const astDataId = this.route.snapshot.paramMap.get('astDataId');
        if (projectId && astDataId) this.fetchData(+projectId, +astDataId);
    }

    ngOnDestroy(): void {
        // [제거] baseTexture 삭제, 최신 API 규격 적용
        this.app?.destroy(true, { children: true, texture: true });
    }

    fetchData(projectId: number, astId: number): void {
        this.dashboardService.getTeamDashboardWithAstData(projectId, astId).subscribe({
            next: (res) => {
                // [최적화] 명확한 데이터 존재 여부 체크 (Type Guard)
                if (res.success && res.data && res.data.astData) {
                    this.projectData = res.data;
                    this.isLoading = false;
                    const astData = res.data.astData; // 로컬 변수 할당으로 undefined 방지
                    setTimeout(() => this.initPixi(astData), 0);
                } else {
                    this.error = 'Invalid data structure';
                    this.isLoading = false;
                }
            },
            error: () => { this.error = 'Failed to fetch'; this.isLoading = false; }
        });
    }

    private async initPixi(astData: any): Promise<void> {
        if (!this.containerElement) return;

        const container = this.containerElement.nativeElement;
        const width = container.clientWidth;
        const height = 600;

        // 1. Pixi Application 인스턴스 생성 (옵션 없이 생성)
        this.app = new PIXI.Application();

        // 2. 비동기 초기화 실행 (v8 핵심 변경 사항)
        await this.app.init({
            width,
            height,
            backgroundColor: 0xf9fafb,
            antialias: true,
            resolution: window.devicePixelRatio || 2,
            // v8에서는 autoDensity가 기본적으로 최적화되어 작동합니다.
        });

        // 3. view 대신 canvas 사용 및 DOM 추가
        container.appendChild(this.app.canvas);

        container.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
        }, { passive: false });

        // 4. Viewport 설정 (v8의 이벤트를 바인딩)
        this.viewport = new Viewport({
            screenWidth: width,
            screenHeight: height,
            worldWidth: width,
            worldHeight: height,
            events: this.app.renderer.events // v8에서도 events 사용
        });

        this.app.stage.addChild(this.viewport);

        // Viewport 플러그인 활성화
        this.viewport
            .drag()
            .pinch()
            .wheel()
            .clampZoom({ minScale: 0.1, maxScale: 10 });

        // 트리맵 렌더링 실행
        this.renderTreemap(astData, width, height);
    }

    private renderTreemap(astData: any, width: number, height: number): void {
        const nodes = astData?.astContent?.nodes;
        if (!nodes || nodes.length === 0) return;

        // 1. 계층 구조 생성
        const root = d3.hierarchy(nodes[0])
            .sum(d => (d.type === 'METHOD' ? 100 : 0))
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        // 2. Treemap 레이아웃 설정 및 데이터 적용
        // 이 과정을 거쳐야 root 객체 산하 노드들에 좌표(x0, y0...)가 주입됩니다.
        const treemapLayout = d3.treemap<any>()
            .size([width, height])
            .paddingOuter(16)
            .paddingTop(24)
            .paddingInner(4)
            .round(true);

        treemapLayout(root);

        const graphics = new PIXI.Graphics();
        this.viewport?.addChild(graphics);

        const colorMap: Record<string, number> = {
            'DIRECTORY': 0xe5e7eb,
            'FILE': 0xfef3c7,
            'CLASS': 0xd1fae5,
            'METHOD': 0x3b82f6
        };

        // 3. descendants() 호출 시 타입을 HierarchyRectangularNode로 캐스팅
        (root.descendants() as d3.HierarchyRectangularNode<any>[]).forEach(node => {
            // 이제 TypeScript가 x0, y0, x1, y1 속성을 인식합니다.
            const { x0, y0, x1, y1 } = node;
            const nodeWidth = x1 - x0;
            const nodeHeight = y1 - y0;
            const data = node.data;

            graphics.lineStyle(1, 0xd1d5db);
            graphics.beginFill(colorMap[data.type] || 0xffffff);
            graphics.drawRect(x0, y0, nodeWidth, nodeHeight);
            graphics.endFill();

            if (nodeWidth > 50 && nodeHeight > 20) {
                const labelText = data.name.split('/').pop() || data.type;
                const label = new PIXI.Text(labelText, {
                    fontSize: 10,
                    fill: 0x4b5563,
                    fontWeight: 'bold',
                });
                label.resolution = 2;
                label.position.set(Math.round(x0 + 5), Math.round(y0 + 5));
                this.viewport?.addChild(label);
            }
        });
    }
}