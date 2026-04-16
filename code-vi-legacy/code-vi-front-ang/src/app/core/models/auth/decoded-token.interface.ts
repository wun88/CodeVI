export interface DecodedToken {
    id: number;
    username: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
}