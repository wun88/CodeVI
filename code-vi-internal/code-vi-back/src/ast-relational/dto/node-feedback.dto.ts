import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString } from 'class-validator';

export type AstNodeFeedbackType = 'directory' | 'file' | 'class' | 'function';

export class NodeFeedbackRequestDto {
  @ApiProperty({ example: 42 })
  @IsInt()
  snapshotId: number;

  @ApiProperty({ enum: ['directory', 'file', 'class', 'function'] })
  @IsString()
  @IsIn(['directory', 'file', 'class', 'function'])
  nodeType: AstNodeFeedbackType;

  @ApiProperty({ example: 101 })
  @IsInt()
  nodeId: number;
}

/** 서술형 문장 대신 항목별로 정리해 보여주기 위한 구조화된 응답. */
export class NodeFeedbackResponseDto {
  smells: string[];
  problems: string[];
  suggestions: string[];
}
