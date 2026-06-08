import {
  Controller,
  Logger,
  Post,
  Body,
  HttpStatus,
  Get,
  HttpCode,
} from '@nestjs/common';
import { CodeAnalysisService } from './code-analysis.service';
import { CreateCodeAnalysisDto } from './dto/create-code-analysis.dto';
import { PartialAnalysisDto } from './dto/partial-analysis.dto';
import { ApiResponseDto } from '../common/api-response-dto/api-response.dto';

@Controller('code-analysis')
export class CodeAnalysisController {
  private readonly logger = new Logger(CodeAnalysisController.name);

  constructor(private readonly codeAnalysisService: CodeAnalysisService) {}

  @Post()
  async createJenkinsNotification(
    @Body() createCodeAnalysisDto: CreateCodeAnalysisDto,
  ): Promise<void> {
    await this.codeAnalysisService.createJenkinsNotification(
      createCodeAnalysisDto,
    );
  }

  @Post('snippet')
  @HttpCode(201)
  analyzePartialCode(@Body() partialAnalysisDto: PartialAnalysisDto) {
    return this.codeAnalysisService.analyzePartialCode(partialAnalysisDto);
  }

  @Get()
  async getDashboardData() {
    return this.codeAnalysisService.findAll();
  }
}
