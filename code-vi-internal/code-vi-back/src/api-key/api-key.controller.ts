import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../common/api-response-dto/api-response.dto';
import { GetUser } from '../auth/custom-guards-decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyRequestDto } from './dto/create-api-key-request.dto';
import { ApiKeyListItemDto, CreatedApiKeyDto } from './dto/api-key-response.dto';
import { ApiKey } from './entities/api-key.entity';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(AuthGuard())
@Controller('api-keys')
export class ApiKeyController {
  private readonly logger = new Logger(ApiKeyController.name);

  constructor(private readonly apiKeyService: ApiKeyService) { }

  @Post()
  @ApiOperation({ summary: 'API Key 발급' })
  @ApiResponse({
    status: 201,
    description: '새 API Key 발급 성공',
    type: CreatedApiKeyDto,
  })
  async createApiKey(
    @GetUser() user: User,
    @Body() dto: CreateApiKeyRequestDto,
  ): Promise<ApiResponseDto<CreatedApiKeyDto>> {
    this.logger.verbose(`Creating API key for userId=${user.id}`);

    const created = await this.apiKeyService.createKey({
      userId: user.id,
      name: dto.name,
      teamProjectId: dto.teamProjectId ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    return new ApiResponseDto(
      true,
      HttpStatus.CREATED,
      'API key created successfully',
      this.toCreatedDto(created.entity, created.apiKey),
    );
  }

  @Get()
  @ApiOperation({ summary: '내 API Key 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '사용자 소유 API Key 목록',
    type: [ApiKeyListItemDto],
  })
  async getApiKeys(
    @GetUser() user: User,
  ): Promise<ApiResponseDto<ApiKeyListItemDto[]>> {
    this.logger.verbose(`Listing API keys for userId=${user.id}`);

    const apiKeys = await this.apiKeyService.listKeys(user.id);

    return new ApiResponseDto(
      true,
      HttpStatus.OK,
      'API keys retrieved successfully',
      apiKeys.map((apiKey) => this.toListItemDto(apiKey)),
      { total: apiKeys.length },
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'API Key 폐기' })
  @ApiResponse({
    status: 200,
    description: 'API Key 폐기 성공',
    type: ApiKeyListItemDto,
  })
  async revokeApiKey(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) keyId: number,
  ): Promise<ApiResponseDto<ApiKeyListItemDto>> {
    this.logger.verbose(`Revoking API key id=${keyId} for userId=${user.id}`);

    const revokedKey = await this.apiKeyService.revokeKey(user.id, keyId);

    return new ApiResponseDto(
      true,
      HttpStatus.OK,
      'API key revoked successfully',
      this.toListItemDto(revokedKey),
    );
  }

  /**
   * 원문 키 노출이 없는 안전한 조회 DTO로 변환합니다.
   */
  private toListItemDto(apiKey: ApiKey): ApiKeyListItemDto {
    return {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
      teamProjectId: apiKey.teamProjectId,
    };
  }

  /**
   * 발급 직후에만 원문 키를 포함한 응답 DTO로 변환합니다.
   */
  private toCreatedDto(apiKey: ApiKey, rawKey: string): CreatedApiKeyDto {
    return {
      ...this.toListItemDto(apiKey),
      apiKey: rawKey,
    };
  }
}
