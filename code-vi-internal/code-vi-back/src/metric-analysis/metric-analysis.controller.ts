import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../common/api-response-dto/api-response.dto';
import { GetApiKey } from '../api-key/decorators/get-api-key.decorator';
import { ApiKey } from '../api-key/entities/api-key.entity';
import { GetUser } from '../auth/custom-guards-decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateMetricAnalysisRequestDto } from './dto/create-metric-analysis-request.dto';
import {
  MetricAnalysisDetailDto,
  MetricAnalysisExecutionResponseDto,
  MetricAnalysisListItemDto,
} from './dto/metric-analysis-response.dto';
import { QueryMetricAnalysisRequestDto } from './dto/query-metric-analysis-request.dto';
import { JwtOrApiKeyGuard } from './guards/jwt-or-api-key.guard';
import { MetricAnalysisService } from './metric-analysis.service';

@ApiTags('Metric Analyses')
@ApiBearerAuth()
@Controller('analyses')
export class MetricAnalysisController {
  constructor(private readonly metricAnalysisService: MetricAnalysisService) {}

  @Post()
  @UseGuards(JwtOrApiKeyGuard)
  @ApiOperation({ summary: '메트릭 분석 실행 및 저장' })
  @ApiResponse({
    status: 201,
    description: '메트릭 분석 실행 성공',
    type: MetricAnalysisExecutionResponseDto,
  })
  async createAnalysis(
    @Body() dto: CreateMetricAnalysisRequestDto,
    @GetUser() user?: User,
    @GetApiKey() apiKey?: ApiKey,
  ): Promise<ApiResponseDto<MetricAnalysisExecutionResponseDto>> {
    const result = await this.metricAnalysisService.createAnalysis(dto, user, apiKey);

    return new ApiResponseDto(
      true,
      HttpStatus.CREATED,
      'Metric analysis created successfully',
      result,
    );
  }

  @Get()
  @UseGuards(JwtOrApiKeyGuard)
  @ApiOperation({ summary: '메트릭 분석 이력 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '메트릭 분석 이력 목록 조회 성공',
    type: [MetricAnalysisListItemDto],
  })
  async getAnalyses(
    @Query() query: QueryMetricAnalysisRequestDto,
    @GetUser() user?: User,
    @GetApiKey() apiKey?: ApiKey,
  ): Promise<ApiResponseDto<MetricAnalysisListItemDto[]>> {
    const analyses = await this.metricAnalysisService.getAnalyses(query, user, apiKey);

    return new ApiResponseDto(
      true,
      HttpStatus.OK,
      'Metric analyses retrieved successfully',
      analyses,
      { total: analyses.length },
    );
  }

  @Get(':id')
  @UseGuards(JwtOrApiKeyGuard)
  @ApiOperation({ summary: '메트릭 분석 결과 단건 조회' })
  @ApiResponse({
    status: 200,
    description: '메트릭 분석 결과 단건 조회 성공',
    type: MetricAnalysisDetailDto,
  })
  async getAnalysisDetail(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user?: User,
    @GetApiKey() apiKey?: ApiKey,
  ): Promise<ApiResponseDto<MetricAnalysisDetailDto>> {
    const analysis = await this.metricAnalysisService.getAnalysisDetail(id, user, apiKey);

    return new ApiResponseDto(
      true,
      HttpStatus.OK,
      'Metric analysis retrieved successfully',
      analysis,
    );
  }
}
