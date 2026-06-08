import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateZipAnalysisRequestDto } from './dto/create-zip-analysis-request.dto';
import { ZipAnalysisResponseDto } from './dto/zip-analysis-response.dto';
import type { UploadedZipFile } from './interfaces/uploaded-zip-file.interface';
import { ZipAnalysisService } from './zip-analysis.service';

@ApiTags('zip-analysis')
@Controller('zip-analysis')
export class ZipAnalysisController {
  private readonly logger = new Logger(ZipAnalysisController.name);

  constructor(private readonly zipAnalysisService: ZipAnalysisService) {}

  /**
   * Intent: 프론트에서 업로드한 ZIP 파일을 받아 parser /analyze로 전달한다.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Analyze an unregistered ZIP file once via parser proxy' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        repoName: {
          type: 'string',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ZipAnalysisResponseDto,
  })
  async analyzeZipFile(
    @UploadedFile() file: UploadedZipFile,
    @Body() dto: CreateZipAnalysisRequestDto,
  ): Promise<ZipAnalysisResponseDto> {
    if (!file) {
      throw new BadRequestException('ZIP file is required.');
    }

    this.logger.log(`Received ZIP analysis request: ${file.originalname}`);
    return await this.zipAnalysisService.analyzeZipFile(file, dto);
  }
}
