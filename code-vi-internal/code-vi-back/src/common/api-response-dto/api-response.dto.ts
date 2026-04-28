import { HttpStatus } from '@nestjs/common';

export class ApiResponseDto<T> {
  success: boolean;
  statusCode: HttpStatus;
  message: string;
  data?: T;
  meta?: {
    total: number;
  };

  constructor(
    success: boolean,
    statusCode: HttpStatus,
    message: string,
    data?: T,
    meta?: { total: number },
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}
