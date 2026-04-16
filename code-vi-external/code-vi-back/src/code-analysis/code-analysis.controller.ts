import {
  Controller,
  Logger,
  Post,
  Body,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { CodeAnalysisService } from './code-analysis.service';
import { CreateCodeAnalysisDto } from './dto/create-code-analysis.dto';
import { ApiResponseDto } from '../common/api-response-dto/api-response.dto';

@Controller('code-analysis')
export class CodeAnalysisController {
  private readonly logger = new Logger(CodeAnalysisController.name);

  constructor(private readonly codeAnalysisService: CodeAnalysisService) {}

  @Post()
  async createJenkinsNotification(
    @Body() createCodeAnalysisDto: CreateCodeAnalysisDto,
  ): Promise<ApiResponseDto<void>> {
    // this.logger.verbose(`Received Jenkins Notification for Build #${createCodeAnalysisDto.buildNumber}`);

    await this.codeAnalysisService.createJenkinsNotification(
      createCodeAnalysisDto,
    );
    // this.logger.verbose(`Jenkins Notification received successfully`);
    return new ApiResponseDto(
      true,
      HttpStatus.CREATED,
      'Jenkins Notification received successfully',
    );
  }

  @Get()
  async getDashboardData() {
    const data = await this.codeAnalysisService.findAll();
    return {
      success: true,
      data: data,
    };
  }
}
