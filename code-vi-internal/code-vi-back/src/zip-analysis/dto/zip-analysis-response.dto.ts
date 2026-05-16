import { ApiProperty } from '@nestjs/swagger';

export class ZipAnalysisResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'ZIP analysis completed successfully.' })
  message: string;

  @ApiProperty({
    description: 'Parser /analyze endpoint response payload',
    additionalProperties: true,
  })
  data: unknown;

  constructor(success: boolean, message: string, data: unknown) {
    this.success = success;
    this.message = message;
    this.data = data;
  }
}
