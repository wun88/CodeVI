export interface ApiResponse<T> {
    headers?: any;
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    meta?: {
        total: number;
    };
}