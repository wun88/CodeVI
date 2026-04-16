import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { ApiResponse } from "../../models/common/api-response.interface";
import { TeamProjectResponseDto, TeamProjectResponseDtoWithAstData } from "../../models/dashboard/dashboard-response.interface";


@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    // 백엔드 컨트롤러 경로와 일치시킴
    private teamProjectApiUrl = `${environment.apiUrl}/team-projects`;

    constructor(private http: HttpClient) { }

    private createHeaders(): HttpHeaders {
        const jwtToken = sessionStorage.getItem('jwtToken');
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `${jwtToken}`
        });
    }

    getAllTeamDashboard(): Observable<ApiResponse<TeamProjectResponseDto[]>> {
        const url = `${this.teamProjectApiUrl}/history`;
        return this.http.get<ApiResponse<TeamProjectResponseDto[]>>(url, {
            headers: this.createHeaders(),
            withCredentials: true
        });
    }

    getTeamDashboardWithAstData(projectId: number, astId: number): Observable<ApiResponse<TeamProjectResponseDtoWithAstData>> {
        console.log('getTeamDashboardWithAstData Method Started');

        const url = `${this.teamProjectApiUrl}/${projectId}/${astId}`;
        return this.http.get<ApiResponse<TeamProjectResponseDtoWithAstData>>(url, {
            headers: this.createHeaders(),
            withCredentials: true
        });
    }
}