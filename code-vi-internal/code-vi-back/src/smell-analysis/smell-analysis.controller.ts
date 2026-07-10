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
import { SmellAnalysisJwtOrApiKeyGuard } from './guards/smell-analysis-jwt-or-api-key.guard';
import { SmellAnalysisService } from './smell-analysis.service';
import { CreateSmellAnalysisRequestDto } from './dto/create-smell-analysis-request.dto';
import {
  QuerySmellAnalysisRequestDto,
  QuerySmellFindingsRequestDto,
} from './dto/query-smell-analysis-request.dto';
import {
  SmellAnalysisDetailDto,
  SmellAnalysisExecutionResponseDto,
  SmellAnalysisFindingsResponseDto,
  SmellAnalysisListItemDto,
} from './dto/smell-analysis-response.dto';

@ApiTags('Smell Analyses')
@ApiBearerAuth()
@Controller('smell-analyses')
export class SmellAnalysisController {
  constructor(private readonly smellAnalysisService: SmellAnalysisService) {}

  /**
   * POST /api/smell-analyses
   *
   * advanced_pyexamine smell 분석을 실행하고 결과를 저장한다.
   * backend는 내부적으로 advanced-pyexamine-service /analyze 를 호출한다.
   */
  @Post()
  @UseGuards(SmellAnalysisJwtOrApiKeyGuard)
  @ApiOperation({ summary: 'Smell 분석 실행 및 저장' })
  @ApiResponse({
    status: 201,
    description: 'Smell 분석 실행 성공',
    type: SmellAnalysisExecutionResponseDto,
  })
  async createSmellAnalysis(
    @Body() dto: CreateSmellAnalysisRequestDto,
    @GetUser() user?: User,
    @GetApiKey() apiKey?: ApiKey,
  ): Promise<ApiResponseDto<SmellAnalysisExecutionResponseDto>> {
    const result = await this.smellAnalysisService.createSmellAnalysis(dto, user, apiKey);

    return new ApiResponseDto(
      true,
      HttpStatus.CREATED,
      'Smell analysis created successfully',
      result,
    );
  }

  /**
   * GET /api/smell-analyses?teamProjectId=1&language=python&status=SUCCESS
   *
   * 저장된 smell analysis 목록을 조회한다.
   */
  @Get()
  @UseGuards(SmellAnalysisJwtOrApiKeyGuard)
  @ApiOperation({ summary: 'Smell 분석 이력 목록 조회' })
  @ApiResponse({
    status: 200,
    description: 'Smell 분석 목록 조회 성공',
    type: [SmellAnalysisListItemDto],
  })
  async getSmellAnalyses(
    @Query() query: QuerySmellAnalysisRequestDto,
    @GetUser() user?: User,
    @GetApiKey() apiKey?: ApiKey,
  ): Promise<ApiResponseDto<SmellAnalysisListItemDto[]>> {
    const analyses = await this.smellAnalysisService.getSmellAnalyses(query, user, apiKey);

    return new ApiResponseDto(
      true,
      HttpStatus.OK,
      'Smell analyses retrieved successfully',
      analyses.items,
      { total: analyses.total },
    );
  }

  /**
   * GET /api/smell-analyses/:id
   *
   * 단건 smell analysis 상세 조회. findings 배열 포함.
   */
  @Get(':id')
  @UseGuards(SmellAnalysisJwtOrApiKeyGuard)
  @ApiOperation({ summary: 'Smell 분석 결과 단건 조회 (findings 포함)' })
  @ApiResponse({
    status: 200,
    description: 'Smell 분석 단건 조회 성공',
    type: SmellAnalysisDetailDto,
  })
  async getSmellAnalysisDetail(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user?: User,
    @GetApiKey() apiKey?: ApiKey,
  ): Promise<ApiResponseDto<SmellAnalysisDetailDto>> {
    const analysis = await this.smellAnalysisService.getSmellAnalysisDetail(id, user, apiKey);

    return new ApiResponseDto(
      true,
      HttpStatus.OK,
      'Smell analysis retrieved successfully',
      analysis,
    );
  }

  /**
   * GET /api/smell-analyses/:id/findings?severity=high&name=long_method&filePath=src/
   *
   * finding 목록을 severity, name, filePath 등으로 필터링하여 조회한다.
   * dashboard 상세 테이블 전용.
   */
  @Get(':id/findings')
  @UseGuards(SmellAnalysisJwtOrApiKeyGuard)
  @ApiOperation({ summary: 'Smell finding 목록 필터 조회' })
  @ApiResponse({
    status: 200,
    description: 'Smell finding 목록 조회 성공',
    type: SmellAnalysisFindingsResponseDto,
  })
  async getSmellFindings(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QuerySmellFindingsRequestDto,
    @GetUser() user?: User,
    @GetApiKey() apiKey?: ApiKey,
  ): Promise<ApiResponseDto<SmellAnalysisFindingsResponseDto>> {
    const result = await this.smellAnalysisService.getSmellFindings(id, query, user, apiKey);

    return new ApiResponseDto(
      true,
      HttpStatus.OK,
      'Smell findings retrieved successfully',
      result,
    );
  }
}
