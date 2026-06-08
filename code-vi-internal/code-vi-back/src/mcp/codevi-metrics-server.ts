import axios, { AxiosError, AxiosInstance } from 'axios';
import { Buffer } from 'node:buffer';
import process from 'node:process';

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface AnalysisListItem {
  jobId: number;
  status: string;
  teamProjectId: number;
  analysisType: string;
  filePath?: string | null;
  requestedAt?: string;
  completedAt?: string | null;
}

interface ToolCallResultPayload {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

/**
 * Metrics API를 MCP tool 인터페이스로 감싸는 최소 stdio 서버입니다.
 * initialize, tools/list, tools/call만 지원합니다.
 */
class CodeviMetricsMcpServer {
  private readonly transport = new StdioJsonRpcTransport();

  private readonly api = new MetricsApiClient();

  private readonly tools: McpToolDefinition[] = [
    {
      name: 'run_metric_analysis',
      description:
        'Run a metric analysis job against the CodeVi Metrics API using ast_json or source_code input.',
      inputSchema: {
        type: 'object',
        properties: {
          teamProjectId: { type: 'integer', minimum: 1 },
          analysisType: {
            type: 'string',
            enum: ['full', 'classic', 'ck', 'oo', 'smells'],
          },
          sourceType: {
            type: 'string',
            enum: ['ast_json', 'source_code'],
          },
          filePath: { type: 'string' },
          language: { type: 'string' },
          astData: { type: 'object' },
          sourceCode: { type: 'string' },
        },
        required: ['analysisType', 'sourceType'],
        additionalProperties: false,
      },
    },
    {
      name: 'list_metric_analyses',
      description:
        'List metric analysis jobs visible to the configured API key, optionally filtered by project, type, or status.',
      inputSchema: {
        type: 'object',
        properties: {
          teamProjectId: { type: 'integer', minimum: 1 },
          analysisType: {
            type: 'string',
            enum: ['full', 'classic', 'ck', 'oo', 'smells'],
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'SUCCESS', 'FAILED'],
          },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'get_metric_analysis',
      description:
        'Get a single metric analysis job detail including summary and metric result payloads.',
      inputSchema: {
        type: 'object',
        properties: {
          jobId: { type: 'integer', minimum: 1 },
        },
        required: ['jobId'],
        additionalProperties: false,
      },
    },
  ];

  /**
   * MCP 서버 루프를 시작합니다.
   */
  start(): void {
    this.transport.onMessage(async (message) => {
      await this.handleMessage(message);
    });
  }

  /**
   * 요청 메서드별로 MCP 응답을 구성합니다.
   */
  private async handleMessage(message: JsonRpcRequest): Promise<void> {
    if (message.method === 'notifications/initialized') {
      return;
    }

    if (message.method === 'ping') {
      this.transport.write({
        jsonrpc: '2.0',
        id: message.id ?? null,
        result: {},
      });
      return;
    }

    try {
      switch (message.method) {
        case 'initialize':
          this.transport.write({
            jsonrpc: '2.0',
            id: message.id ?? null,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: {
                name: 'codevi-metrics-mcp',
                version: '0.1.0',
              },
              capabilities: {
                tools: {
                  listChanged: false,
                },
              },
            },
          });
          return;
        case 'tools/list':
          this.transport.write({
            jsonrpc: '2.0',
            id: message.id ?? null,
            result: {
              tools: this.tools,
            },
          });
          return;
        case 'tools/call':
          await this.handleToolCall(message);
          return;
        default:
          this.transport.write({
            jsonrpc: '2.0',
            id: message.id ?? null,
            error: {
              code: -32601,
              message: `Method not found: ${message.method}`,
            },
          });
      }
    } catch (error) {
      this.transport.write({
        jsonrpc: '2.0',
        id: message.id ?? null,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Unknown MCP error',
        },
      });
    }
  }

  /**
   * Tool 이름에 따라 백엔드 API를 호출하고 MCP 결과 형태로 감쌉니다.
   */
  private async handleToolCall(message: JsonRpcRequest): Promise<void> {
    const toolName = String(message.params?.name ?? '');
    const argumentsPayload = (message.params?.arguments ?? {}) as Record<
      string,
      unknown
    >;

    try {
      let data: unknown;

      switch (toolName) {
        case 'run_metric_analysis':
          data = await this.api.runMetricAnalysis(argumentsPayload);
          break;
        case 'list_metric_analyses':
          data = await this.api.listMetricAnalyses(argumentsPayload);
          break;
        case 'get_metric_analysis':
          data = await this.api.getMetricAnalysis(argumentsPayload);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      this.transport.write({
        jsonrpc: '2.0',
        id: message.id ?? null,
        result: this.buildToolSuccessResult(data),
      });
    } catch (error) {
      this.transport.write({
        jsonrpc: '2.0',
        id: message.id ?? null,
        result: this.buildToolErrorResult(
          error instanceof Error ? error.message : 'Unknown tool error',
        ),
      });
    }
  }

  /**
   * 성공 응답을 MCP tool content + structuredContent로 정규화합니다.
   */
  private buildToolSuccessResult(data: unknown): ToolCallResultPayload {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
      structuredContent: data,
    };
  }

  /**
   * 백엔드 또는 입력 오류를 MCP tool 에러 형태로 정규화합니다.
   */
  private buildToolErrorResult(message: string): ToolCallResultPayload {
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Metrics API 백엔드 호출 및 응답 정규화를 담당합니다.
 */
class MetricsApiClient {
  private readonly client: AxiosInstance;

  private readonly defaultTeamProjectId?: number;

  constructor() {
    const baseURL = process.env.CODEVI_METRICS_BASE_URL?.trim();
    const apiKey = process.env.CODEVI_METRICS_API_KEY?.trim();
    const timeout = Number(process.env.CODEVI_METRICS_REQUEST_TIMEOUT_MS ?? '15000');
    const defaultTeamProjectId = process.env.CODEVI_METRICS_DEFAULT_TEAM_PROJECT_ID;

    if (!baseURL) {
      throw new Error('CODEVI_METRICS_BASE_URL is required.');
    }

    if (!apiKey) {
      throw new Error('CODEVI_METRICS_API_KEY is required.');
    }

    this.client = axios.create({
      baseURL,
      timeout: Number.isFinite(timeout) ? timeout : 15000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      validateStatus: () => true,
    });

    if (defaultTeamProjectId) {
      const parsed = Number(defaultTeamProjectId);
      if (Number.isInteger(parsed) && parsed > 0) {
        this.defaultTeamProjectId = parsed;
      }
    }
  }

  /**
   * 분석 실행 요청을 보냅니다.
   */
  async runMetricAnalysis(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const requestBody = this.normalizeRunMetricAnalysisPayload(payload);
    const response = await this.client.post('/analyses', requestBody);
    const data = this.unwrapResponse<Record<string, unknown>>(response.data);

    return data;
  }

  /**
   * 분석 목록을 조회합니다.
   */
  async listMetricAnalyses(
    payload: Record<string, unknown>,
  ): Promise<{ items: AnalysisListItem[]; total: number }> {
    const queryParams: Record<string, unknown> = {};

    if (typeof payload.teamProjectId === 'number') {
      queryParams.teamProjectId = payload.teamProjectId;
    }

    if (typeof payload.analysisType === 'string') {
      queryParams.analysisType = payload.analysisType;
    }

    if (typeof payload.status === 'string') {
      queryParams.status = payload.status;
    }

    const response = await this.client.get('/analyses', {
      params: queryParams,
    });
    const data = this.unwrapResponse<AnalysisListItem[]>(response.data);
    const total = Number(response.data?.meta?.total ?? data.length ?? 0);

    return {
      items: data,
      total,
    };
  }

  /**
   * 분석 상세를 조회합니다.
   */
  async getMetricAnalysis(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const jobId = Number(payload.jobId);

    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new Error('jobId must be a positive integer.');
    }

    const response = await this.client.get(`/analyses/${jobId}`);
    return this.unwrapResponse<Record<string, unknown>>(response.data);
  }

  /**
   * MCP tool 입력값을 백엔드 분석 요청 형식으로 정규화합니다.
   */
  private normalizeRunMetricAnalysisPayload(
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const teamProjectId =
      typeof payload.teamProjectId === 'number'
        ? payload.teamProjectId
        : this.defaultTeamProjectId;

    if (!teamProjectId) {
      throw new Error(
        'teamProjectId is required unless CODEVI_METRICS_DEFAULT_TEAM_PROJECT_ID is configured.',
      );
    }

    const analysisType = payload.analysisType;
    const sourceType = payload.sourceType;

    if (typeof analysisType !== 'string') {
      throw new Error('analysisType is required.');
    }

    if (typeof sourceType !== 'string') {
      throw new Error('sourceType is required.');
    }

    if (sourceType === 'ast_json' && !payload.astData) {
      throw new Error('astData is required when sourceType is ast_json.');
    }

    if (sourceType === 'source_code' && typeof payload.sourceCode !== 'string') {
      throw new Error(
        'sourceCode is required when sourceType is source_code.',
      );
    }

    if (
      sourceType === 'source_code' &&
      typeof payload.language !== 'string' &&
      typeof payload.filePath !== 'string'
    ) {
      throw new Error(
        'language or filePath is required when sourceType is source_code.',
      );
    }

    return {
      teamProjectId,
      analysisType,
      sourceType,
      filePath: payload.filePath,
      language: payload.language,
      astData: payload.astData,
      sourceCode: payload.sourceCode,
    };
  }

  /**
   * 백엔드 응답 envelope을 data 중심 구조로 해제하고 에러 메시지를 정규화합니다.
   */
  private unwrapResponse<T>(body: any): T {
    if (body?.success === true) {
      return body.data as T;
    }

    throw this.toReadableError(body);
  }

  /**
   * HTTP/백엔드 에러를 에이전트가 읽기 쉬운 메시지로 변환합니다.
   */
  private toReadableError(body: any): Error {
    const statusCode = Number(body?.statusCode ?? 0);
    const message = String(body?.message ?? 'Unknown API error');

    if (statusCode === 401) {
      return new Error('Invalid or expired API key.');
    }

    if (statusCode === 403) {
      return new Error(
        'No access to the requested team project or analysis.',
      );
    }

    if (statusCode === 404) {
      return new Error('Requested analysis was not found.');
    }

    if (statusCode === 502) {
      return new Error('Parser service is unavailable or misconfigured.');
    }

    return new Error(message);
  }
}

/**
 * MCP stdio JSON-RPC 메시지 프레이밍을 처리합니다.
 */
class StdioJsonRpcTransport {
  private buffer = Buffer.alloc(0);

  private messageHandler?: (message: JsonRpcRequest) => Promise<void>;

  constructor() {
    process.stdin.on('data', (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.processBuffer();
    });

    process.stdin.resume();
  }

  /**
   * 상위 서버가 요청 핸들러를 등록합니다.
   */
  onMessage(handler: (message: JsonRpcRequest) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /**
   * JSON-RPC 응답을 MCP framing으로 stdout에 씁니다.
   */
  write(response: JsonRpcResponse): void {
    const json = JSON.stringify(response);
    const body = Buffer.from(json, 'utf8');
    const header = Buffer.from(
      `Content-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n`,
      'utf8',
    );

    process.stdout.write(Buffer.concat([header, body]));
  }

  /**
   * stdin 버퍼에서 완전한 MCP 프레임을 추출합니다.
   */
  private processBuffer(): void {
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return;
      }

      const headerText = this.buffer.subarray(0, headerEnd).toString('utf8');
      const contentLength = this.parseContentLength(headerText);
      const frameLength = headerEnd + 4 + contentLength;

      if (this.buffer.length < frameLength) {
        return;
      }

      const body = this.buffer
        .subarray(headerEnd + 4, frameLength)
        .toString('utf8');
      this.buffer = this.buffer.subarray(frameLength);

      if (!this.messageHandler) {
        continue;
      }

      void this.messageHandler(JSON.parse(body) as JsonRpcRequest);
    }
  }

  /**
   * 헤더 문자열에서 Content-Length를 읽습니다.
   */
  private parseContentLength(headerText: string): number {
    const lines = headerText.split('\r\n');
    const header = lines.find((line) =>
      line.toLowerCase().startsWith('content-length:'),
    );

    if (!header) {
      throw new Error('Missing Content-Length header.');
    }

    const value = Number(header.split(':')[1]?.trim() ?? '0');
    if (!Number.isFinite(value) || value < 0) {
      throw new Error('Invalid Content-Length header.');
    }

    return value;
  }
}

const server = new CodeviMetricsMcpServer();

try {
  server.start();
} catch (error) {
  const message =
    error instanceof Error ? error.message : 'Failed to start MCP server.';
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
