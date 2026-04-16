import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { ApiResponse } from "../../models/common/api-response.interface";
import { UserResponse } from "../../models/users/user-response.interface";
import { Injectable } from "@angular/core";
import { CreateUserRequest, UpdateUserRequest } from "../../models/users/user-request.interface";
import { environment } from 'src/environments/environment';

@Injectable()
export class UserService {
    private apiUrl = environment.apiUrl + '/users';

    constructor(private http: HttpClient) { }

    private createHeaders(): HttpHeaders {
        const jwtToken = sessionStorage.getItem('jwtToken');
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `${jwtToken}`
        });
    }

    getAllUsers(): Observable<ApiResponse<UserResponse[]>> {
        return this.http.get<ApiResponse<UserResponse[]>>(`${this.apiUrl}`, {
            headers: this.createHeaders(),
            withCredentials: true
        });
    }

    getAllUserPaginated(page: number, limit: number): Observable<ApiResponse<UserResponse[]>> {
        return this.http.get<ApiResponse<UserResponse[]>>(`${this.apiUrl}?page=${page}&limit=${limit}`, {
            headers: this.createHeaders(),
            withCredentials: true
        });
    }

    updateUser(id: number, updateUserRequest: UpdateUserRequest): Observable<ApiResponse<UserResponse>> {
        return this.http.put<ApiResponse<UserResponse>>(`${this.apiUrl}/${id}`, updateUserRequest, {
            headers: this.createHeaders(),
            withCredentials: true
        });
    }

    deleteUser(id: number): Observable<ApiResponse<UserResponse>> {
        return this.http.delete<ApiResponse<UserResponse>>(`${this.apiUrl}/${id}`, {
            headers: this.createHeaders(),
            withCredentials: true
        });
    }
}
