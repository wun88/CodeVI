import {
  BadGatewayException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { CreateZipAnalysisRequestDto } from './dto/create-zip-analysis-request.dto';
import { ZipAnalysisResponseDto } from './dto/zip-analysis-response.dto';
import { UploadedZipFile } from './interfaces/uploaded-zip-file.interface';

interface ParserAstNode {
  type: string;
  name: string;
  children?: ParserAstNode[];
  [key: string]: unknown;
}

interface ParserAnalyzeResponse {
  nodes?: ParserAstNode[];
  [key: string]: unknown;
}

@Injectable()
export class ZipAnalysisService {
  private readonly logger = new Logger(ZipAnalysisService.name);
  private readonly excludedDirectoryNames = new Set([
    '__MACOSX',
    '.git',
    '.idea',
    '.gradle',
    'build',
    'dist',
    'out',
    'target',
    'node_modules',
    '.next',
    'coverage',
  ]);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Intent: CI에 등록되지 않은 ZIP 파일을 parser로 프록시해
   * 일회성 분석 결과(JSON)만 반환한다.
   */
  async analyzeZipFile(
    file: UploadedZipFile,
    dto: CreateZipAnalysisRequestDto,
  ): Promise<ZipAnalysisResponseDto> {
    const parserUrl = this.configService.get<string>('PARSER_URL');

    if (!parserUrl) {
      throw new InternalServerErrorException('PARSER_URL is not configured.');
    }

    const formData = new FormData();
    const zipBlob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || 'application/zip',
    });

    formData.append('file', zipBlob, file.originalname);

    if (dto.repoName) {
      formData.append('repoName', dto.repoName);
    }

    try {
      const parserResponse = await axios.post(parserUrl, formData, {
        headers: {
          Accept: 'application/json',
        },
        maxBodyLength: Number.POSITIVE_INFINITY,
        maxContentLength: Number.POSITIVE_INFINITY,
        validateStatus: () => true,
      });

      const parserData = parserResponse.data;

      if (parserResponse.status < 200 || parserResponse.status >= 300) {
        this.logger.error(
          `Parser returned ${parserResponse.status}: ${JSON.stringify(parserData)}`,
        );
        throw new BadGatewayException('Parser analysis request failed.');
      }

      const filteredParserData = this.filterParserResponse(
        parserData as ParserAnalyzeResponse,
      );
      const normalizedParserData = this.normalizeParserResponse(
        filteredParserData,
        dto.repoName,
      );

      // TODO: 코드품질분석필요
      return new ZipAnalysisResponseDto(
        true,
        'ZIP analysis completed successfully.',
        normalizedParserData,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof AxiosError) {
        this.logger.error(
          `Parser proxy request failed: ${error.message} / status=${error.response?.status} / data=${JSON.stringify(error.response?.data)}`,
        );
      } else {
        const message =
          error instanceof Error ? error.message : 'Unknown parser proxy error';
        this.logger.error(`Parser proxy request failed: ${message}`);
      }

      throw new BadGatewayException('Failed to reach parser service.');
    }
  }

  /**
   * Intent: ZIP 해제 산출물에서 메타데이터·빌드 산출물 디렉터리를 제거해
   * 실제 소스 구조만 남긴다.
   */
  private filterParserResponse(
    parserData: ParserAnalyzeResponse,
  ): ParserAnalyzeResponse {
    if (!Array.isArray(parserData.nodes)) {
      return parserData;
    }

    return {
      ...parserData,
      nodes: parserData.nodes
        .map((node) => this.filterAstNode(node))
        .filter((node): node is ParserAstNode => node !== null),
    };
  }

  /**
   * Intent: parser 임시 절대경로를 제거하고 업로드된 저장소 기준 상대경로로 정규화한다.
   */
  private normalizeParserResponse(
    parserData: ParserAnalyzeResponse,
    repoName?: string,
  ): ParserAnalyzeResponse {
    if (!Array.isArray(parserData.nodes) || parserData.nodes.length === 0) {
      return parserData;
    }

    const normalizedRoots = parserData.nodes.flatMap((node) =>
      this.normalizeRootNode(node, repoName),
    );

    return {
      ...parserData,
      nodes: normalizedRoots,
    };
  }

  private normalizeRootNode(
    node: ParserAstNode,
    requestedRepoName?: string,
  ): ParserAstNode[] {
    if (!Array.isArray(node.children) || node.children.length === 0) {
      return [this.normalizeAstNodePaths(node, '', requestedRepoName)];
    }

    // 래퍼 디렉토리 승격은 안전한 경우에만:
    // (1) repoName과 이름이 일치하는 자식(GitHub zip: repo-name/...) 또는
    // (2) 최상위가 단일 디렉토리 하나뿐인 경우.
    // 그 외(최상위에 src/·lib/ 등 여러 항목)에는 temp 루트를 유지해야 형제 디렉토리가 유실되지 않는다.
    const promoted = this.pickWrapperNode(node.children, requestedRepoName);

    if (promoted) {
      return [
        this.normalizeAstNodePaths(
          promoted,
          '',
          requestedRepoName || this.extractNodeName(promoted.name),
        ),
      ];
    }

    return [
      this.normalizeAstNodePaths(
        node,
        '',
        requestedRepoName || this.extractNodeName(node.name),
      ),
    ];
  }

  private pickWrapperNode(
    nodes: ParserAstNode[],
    requestedRepoName?: string,
  ): ParserAstNode | undefined {
    if (requestedRepoName) {
      const matchedNode = nodes.find(
        (node) => this.extractNodeName(node.name) === requestedRepoName,
      );

      if (matchedNode) {
        return matchedNode;
      }
    }

    if (nodes.length === 1 && this.isDirectoryNode(nodes[0])) {
      return nodes[0];
    }

    return undefined;
  }

  private isDirectoryNode(node: ParserAstNode): boolean {
    return String(node.type ?? '').toLowerCase() === 'directory';
  }

  private normalizeAstNodePaths(
    node: ParserAstNode,
    parentRelativePath: string,
    rootDisplayName?: string,
  ): ParserAstNode {
    const nodeName = this.extractNodeName(node.name);
    const currentRelativePath =
      parentRelativePath === ''
        ? (rootDisplayName ?? nodeName)
        : `${parentRelativePath}/${nodeName}`;

    const normalizedChildren = Array.isArray(node.children)
      ? node.children.map((child) =>
          this.normalizeAstNodePaths(child, currentRelativePath),
        )
      : undefined;

    return {
      ...node,
      name: currentRelativePath,
      ...(normalizedChildren ? { children: normalizedChildren } : {}),
    };
  }

  private filterAstNode(node: ParserAstNode): ParserAstNode | null {
    const nodeName = this.extractNodeName(node.name);

    if (this.shouldExcludeNode(node.type, nodeName)) {
      return null;
    }

    const filteredChildren = Array.isArray(node.children)
      ? node.children
          .map((child) => this.filterAstNode(child))
          .filter((child): child is ParserAstNode => child !== null)
      : undefined;

    // 파서는 type을 'directory'(소문자)로 내려준다 — 대소문자 무시 비교
    if (this.isDirectoryNode(node) && filteredChildren && filteredChildren.length === 0) {
      return null;
    }

    return {
      ...node,
      ...(filteredChildren ? { children: filteredChildren } : {}),
    };
  }

  private shouldExcludeNode(nodeType: string, nodeName: string): boolean {
    if (!nodeName) {
      return false;
    }

    if (nodeName.startsWith('._')) {
      return true;
    }

    if (String(nodeType ?? '').toLowerCase() === 'directory') {
      return this.excludedDirectoryNames.has(nodeName);
    }

    return false;
  }

  private extractNodeName(nodePath: string): string {
    const normalizedPath = nodePath.replace(/\\/g, '/');
    const segments = normalizedPath.split('/').filter(Boolean);
    return segments.at(-1) ?? normalizedPath;
  }
}
