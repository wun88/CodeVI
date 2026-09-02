import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class AiRefactoringSuggestDto {
  @ApiProperty({ example: 42 })
  @IsInt()
  snapshotId: number;

  @ApiProperty({
    example: [101, 102],
    description: '리팩토링 인사이트에 이미 표시 중인 후보 클래스 id (최대 4개)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsInt({ each: true })
  classIds: number[];
}

/** AI 생성분(improvedCode/effectSummary/detailExplanation/effectHighlights)만 담는 내부 타입. */
export interface AiRefactoringSuggestionText {
  improvedCode: string;
  effectSummary: string;
  detailExplanation: string;
  effectHighlights: string[];
}

/** 프론트 RefactoringSuggestion과 동일한 필드 구조로 반환한다. */
export class AiRefactoringSuggestionDto {
  classId: number;
  targetLabel: string;
  problemSummary: string;
  problemCode: string;
  improvedCode: string;
  effectSummary: string;
  detailExplanation: string;
  severity: 'risk' | 'improve';
  effectHighlights: string[];
  // CK 메트릭 배지용 — problemCode가 실제 소스로 바뀌면서 프론트가 텍스트 파싱 대신 값으로 받는다.
  metrics: { cbo: number; wmc: number; lcom: number };
}
