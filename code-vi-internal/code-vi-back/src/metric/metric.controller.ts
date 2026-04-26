import { Controller, Post, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricService } from './metric.service';
import {
  AnalyzeAstRequestDto,
  FileMetricResultDto,
  ClassicMetricsDto,
  CKMetricsDto,
  OOMetricsDto,
  CodeSmellDto,
} from './dto/metric-result.dto';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricController {
  constructor(private readonly metricService: MetricService) { }

  /**
   * AST 데이터를 분석하여 파일 메트릭을 반환합니다.
   */
  @Post('analyze')
  @ApiOperation({ summary: 'AST 데이터 분석' })
  @ApiResponse({
    status: 200,
    description: '파일 메트릭 결과',
    type: FileMetricResultDto,
  })
  analyzeAst(@Body() dto: AnalyzeAstRequestDto): FileMetricResultDto {
    // astData가 배열인 경우 첫 번째 요소 사용
    const ast = Array.isArray(dto.astData) ? dto.astData[0] : dto.astData;
    const result = this.metricService.analyzeFile(
      ast,
      dto.filePath || 'unknown',
      dto.sourceCode,
    );

    return result as FileMetricResultDto;
  }

  /**
   * AST 데이터에서 고전적 지표만 계산합니다.
   */
  @Post('analyze/classic')
  @ApiOperation({ summary: '고전적 지표 계산 (Cyclomatic, Halstead, Size)' })
  @ApiResponse({
    status: 200,
    description: '고전적 지표 결과',
    type: ClassicMetricsDto,
  })
  analyzeClassicMetrics(@Body() dto: AnalyzeAstRequestDto): ClassicMetricsDto {
    const ast = Array.isArray(dto.astData) ? dto.astData[0] : dto.astData;
    const result = this.metricService.calculateClassicMetrics(
      ast,
      dto.sourceCode,
    );

    return result as ClassicMetricsDto;
  }

  /**
   * AST 데이터에서 CK 메트릭만 계산합니다.
   */
  @Post('analyze/ck')
  @ApiOperation({ summary: 'CK 메트릭 계산 (WMC, DIT, NOC, CBO, RFC, LCOM)' })
  @ApiResponse({
    status: 200,
    description: 'CK 메트릭 결과 배열',
    type: [CKMetricsDto],
  })
  analyzeCKMetrics(@Body() dto: AnalyzeAstRequestDto): CKMetricsDto[] {
    const ast = Array.isArray(dto.astData) ? dto.astData[0] : dto.astData;
    const result = this.metricService.calculateAllCKMetrics(ast);

    return result as CKMetricsDto[];
  }

  /**
   * AST 데이터에서 추가 객체지향 지표만 계산합니다.
   */
  @Post('analyze/oo')
  @ApiOperation({ summary: 'OO 메트릭 계산 (PMI, PMIS, DMC, MAA, DAC, POM, UCGU, DCBO, PrIM, SML)' })
  @ApiResponse({
    status: 200,
    description: 'OO 메트릭 결과 배열',
    type: [OOMetricsDto],
  })
  analyzeOOMetrics(@Body() dto: AnalyzeAstRequestDto): OOMetricsDto[] {
    const ast = Array.isArray(dto.astData) ? dto.astData[0] : dto.astData;
    const result = this.metricService.calculateAllOOMetrics(ast);

    return result as OOMetricsDto[];
  }

  /**
   * AST 데이터에서 코드 스멜만 감지합니다.
   */
  @Post('analyze/smells')
  @ApiOperation({ summary: '코드 스멜 감지' })
  @ApiResponse({
    status: 200,
    description: '코드 스멜 결과 배열',
    type: [CodeSmellDto],
  })
  analyzeCodeSmells(@Body() dto: AnalyzeAstRequestDto): CodeSmellDto[] {
    const ast = Array.isArray(dto.astData) ? dto.astData[0] : dto.astData;
    const result = this.metricService.detectCodeSmells(ast, dto.filePath);

    return result as unknown as CodeSmellDto[];
  }

  /**
   * 순환 복잡도만 계산합니다.
   */
  @Post('complexity')
  @ApiOperation({ summary: '순환 복잡도 계산' })
  @ApiResponse({
    status: 200,
    description: '순환 복잡도 값',
  })
  calculateComplexity(@Body() dto: AnalyzeAstRequestDto): {
    cyclomaticComplexity: number;
  } {
    const ast = Array.isArray(dto.astData) ? dto.astData[0] : dto.astData;
    const complexity = this.metricService.calculateCyclomaticComplexity(ast);

    return { cyclomaticComplexity: complexity };
  }

  /**
   * Halstead 메트릭만 계산합니다.
   */
  @Post('halstead')
  @ApiOperation({ summary: 'Halstead 메트릭 계산' })
  calculateHalstead(@Body() dto: AnalyzeAstRequestDto) {
    const ast = Array.isArray(dto.astData) ? dto.astData[0] : dto.astData;
    return this.metricService.calculateHalsteadMetrics(ast);
  }

  /**
   * 사이즈 메트릭만 계산합니다.
   */
  @Post('size')
  @ApiOperation({ summary: '사이즈 메트릭 계산 (LOC, SLOC, CLOC, NCLOC)' })
  calculateSize(@Body() dto: AnalyzeAstRequestDto) {
    const ast = Array.isArray(dto.astData) ? dto.astData[0] : dto.astData;
    return this.metricService.calculateSizeMetrics(ast, dto.sourceCode);
  }
}
