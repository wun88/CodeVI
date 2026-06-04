import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { ApiKey } from './entities/api-key.entity';

export interface CreateApiKeyParams {
  userId: number;
  name: string;
  teamProjectId?: number | null;
  expiresAt?: Date | null;
}

export interface CreatedApiKeyResult {
  apiKey: string;
  entity: ApiKey;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
  ) {}

  /**
   * API Key를 생성하고, 원문 키는 1회만 반환합니다.
   */
  async createKey(params: CreateApiKeyParams): Promise<CreatedApiKeyResult> {
    const teamProject = await this.resolveTeamProject(params.teamProjectId);
    const prefix = this.generatePrefix();
    const apiKey = this.generateRawKey();
    const hashedKey = this.hashKey(apiKey);

    const entity = this.apiKeyRepository.create({
      userId: params.userId,
      teamProjectId: teamProject?.id ?? null,
      name: params.name,
      prefix,
      hashedKey,
      lastUsedAt: null,
      expiresAt: params.expiresAt ?? null,
      revokedAt: null,
    });

    const savedEntity = await this.apiKeyRepository.save(entity);

    this.logger.verbose(
      `API key created for userId=${params.userId}, apiKeyId=${savedEntity.id}`,
    );

    return {
      apiKey,
      entity: savedEntity,
    };
  }

  /**
   * 사용자가 소유한 API Key 목록을 조회합니다.
   */
  async listKeys(userId: number): Promise<ApiKey[]> {
    return await this.apiKeyRepository.find({
      where: { userId },
      relations: ['teamProject'],
      order: { id: 'DESC' },
    });
  }

  /**
   * 사용자가 소유한 API Key를 폐기합니다.
   */
  async revokeKey(userId: number, keyId: number): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, userId },
      relations: ['teamProject'],
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${keyId} not found`);
    }

    apiKey.revokedAt = new Date();
    const revokedKey = await this.apiKeyRepository.save(apiKey);

    this.logger.verbose(`API key revoked: apiKeyId=${revokedKey.id}`);
    return revokedKey;
  }

  /**
   * 원문 API Key를 검증하고 엔티티를 반환합니다.
   */
  async validateKey(rawKey: string): Promise<ApiKey> {
    const hashedKey = this.hashKey(rawKey);
    const apiKey = await this.apiKeyRepository.findOne({
      where: {
        hashedKey,
        revokedAt: IsNull(),
      },
      relations: ['user', 'teamProject'],
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('API key has expired');
    }

    return apiKey;
  }

  /**
   * API Key의 마지막 사용 시각을 갱신합니다.
   */
  async touchLastUsedAt(keyId: number): Promise<void> {
    await this.apiKeyRepository.update(keyId, {
      lastUsedAt: new Date(),
    });
  }

  /**
   * 선택된 TeamProject가 존재하는지 확인합니다.
   */
  private async resolveTeamProject(
    teamProjectId?: number | null,
  ): Promise<TeamProject | null> {
    if (!teamProjectId) {
      return null;
    }

    const teamProject = await this.teamProjectRepository.findOne({
      where: { id: teamProjectId },
    });

    if (!teamProject) {
      throw new NotFoundException(
        `TeamProject with ID ${teamProjectId} not found`,
      );
    }

    return teamProject;
  }

  /**
   * 목록 식별과 운영 로그에 사용할 prefix를 생성합니다.
   */
  private generatePrefix(): string {
    return `cvk_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * 사용자에게 1회만 보여줄 원문 API Key를 생성합니다.
   */
  private generateRawKey(): string {
    return `cv_live_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * 원문 API Key를 DB 저장용 해시로 변환합니다.
   */
  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }
}
