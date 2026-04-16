import { UserRole } from "./user-role.enum";

export interface CreateUserRequest {
    username: string;
    password: string;
    passwordConfirm: string;
    email: string;
    role: UserRole;
}

export interface UpdateUserRequest {
    // username: string;
    password: string;
    passwordConfirm: string;
    email: string;
    // role: UserRole;
}