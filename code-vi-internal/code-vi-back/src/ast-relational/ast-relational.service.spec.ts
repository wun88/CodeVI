import { NotFoundException } from '@nestjs/common';
import { AstRelationalService } from './ast-relational.service';
import { NvidiaLlmService } from '../llm/nvidia-llm.service';
import { AiRefactoringSuggestDto } from './dto/ai-refactoring-suggest.dto';

describe('AstRelationalService.generateAiRefactoringSuggestions', () => {
  const highLcomClass = {
    id: 101,
    name: 'HighLcomClass',
    metrics: { lcom: 60, cbo: 2, wmc: 5 },
    methods: [{ name: 'doA' }, { name: 'doB' }],
  };
  const highCboClass = {
    id: 102,
    name: 'HighCboClass',
    metrics: { lcom: 10, cbo: 12, wmc: 4 },
    methods: [{ name: 'call' }],
  };

  function buildSnapshot(teamProjectId: number) {
    return {
      id: 999,
      teamProjectId,
      buildNumber: null,
      directories: [
        {
          files: [{ classes: [highLcomClass, highCboClass] }],
        },
      ],
    };
  }

  function buildService(
    snapshot: unknown,
    nvidiaLlmService: Partial<NvidiaLlmService>,
  ) {
    const snapshotRepo = { findOne: jest.fn().mockResolvedValue(snapshot) };
    const dataSource = {
      getRepository: jest
        .fn()
        .mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }),
    };
    const service = new AstRelationalService(
      snapshotRepo as any,
      {} as any, // directoryRepo
      {} as any, // fileRepo
      {} as any, // classRepo
      {} as any, // functionRepo
      {} as any, // teamProjectRepo
      dataSource as any,
      {} as any, // codeMappingService
      nvidiaLlmService as NvidiaLlmService,
    );
    return service;
  }

  it('rejects a snapshot that does not belong to the requested teamProjectId', async () => {
    const service = buildService(buildSnapshot(1), { generateJson: jest.fn() });
    const dto: AiRefactoringSuggestDto = { snapshotId: 999, classIds: [101] };

    await expect(
      service.generateAiRefactoringSuggestions(2, dto),
    ).rejects.toThrow(NotFoundException);
  });

  it('ignores classIds that are not present in the snapshot', async () => {
    const service = buildService(buildSnapshot(1), { generateJson: jest.fn() });
    const dto: AiRefactoringSuggestDto = { snapshotId: 999, classIds: [9999] };

    const result = await service.generateAiRefactoringSuggestions(1, dto);
    expect(result).toEqual([]);
  });

  it('merges AI-generated text onto the deterministic suggestion when the LLM call succeeds', async () => {
    const generateJson = jest.fn().mockResolvedValue([
      {
        classId: 101,
        improvedCode: 'AI: extract role-specific helpers from HighLcomClass',
        effectSummary: 'AI effect summary',
        detailExplanation: 'AI detail explanation',
        effectHighlights: ['효과1'],
      },
    ]);
    const service = buildService(buildSnapshot(1), { generateJson });
    const dto: AiRefactoringSuggestDto = { snapshotId: 999, classIds: [101] };

    const [suggestion] = await service.generateAiRefactoringSuggestions(1, dto);

    expect(suggestion.classId).toBe(101);
    // 결정론적 필드는 그대로 유지된다 (LLM이 숫자/대상을 만들지 않음)
    expect(suggestion.targetLabel).toBe('HighLcomClass');
    expect(suggestion.problemSummary).toContain('LCOM');
    expect(suggestion.severity).toBe('improve');
    // AI 텍스트로 덮어써진 필드
    expect(suggestion.improvedCode).toBe(
      'AI: extract role-specific helpers from HighLcomClass',
    );
    expect(suggestion.effectSummary).toBe('AI effect summary');
    expect(suggestion.effectHighlights).toEqual(['효과1']);
  });

  it('falls back to the deterministic template for every item when the LLM call throws', async () => {
    const generateJson = jest
      .fn()
      .mockRejectedValue(new Error('NVIDIA API down'));
    const service = buildService(buildSnapshot(1), { generateJson });
    const dto: AiRefactoringSuggestDto = {
      snapshotId: 999,
      classIds: [101, 102],
    };

    const result = await service.generateAiRefactoringSuggestions(1, dto);

    expect(result).toHaveLength(2);
    expect(result[0].improvedCode).toContain('책임 분리');
    expect(result[1].improvedCode).toContain('책임 분리');
  });

  it('falls back only the malformed item when the LLM response is missing required fields for it', async () => {
    const generateJson = jest.fn().mockResolvedValue([
      {
        classId: 101,
        improvedCode: 'AI improved',
        effectSummary: 'AI effect',
        detailExplanation: 'AI detail',
        effectHighlights: [],
      },
      // 102는 improvedCode 누락 — 이 항목만 폴백되어야 한다
      { classId: 102, effectSummary: 'incomplete' },
    ]);
    const service = buildService(buildSnapshot(1), { generateJson });
    const dto: AiRefactoringSuggestDto = {
      snapshotId: 999,
      classIds: [101, 102],
    };

    const result = await service.generateAiRefactoringSuggestions(1, dto);

    const item101 = result.find((r) => r.classId === 101);
    const item102 = result.find((r) => r.classId === 102);
    expect(item101?.improvedCode).toBe('AI improved');
    expect(item102?.improvedCode).toContain('책임 분리');
  });
});
