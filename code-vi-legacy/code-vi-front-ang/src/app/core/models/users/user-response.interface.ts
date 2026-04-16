import { ClassRegistrationResponse } from "../class-registration/class-registration.interface";
import { UserRole } from "./user-role.enum";

export interface UserResponse {
    id: number;
    username: string;
    email: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
    classRegistrations: ClassRegistrationResponse[];
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    role: UserRole;
    createdAt?: Date;
    updatedAt?: Date;
    classRegistrations?: ClassRegistrationResponse[];
}