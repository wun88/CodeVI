import { HttpClient, HttpHeaders } from "@angular/common/http";
import { BehaviorSubject, map, Observable, tap } from "rxjs";
import { Router } from "@angular/router";
import { AuthResponse } from "../../models/auth/auth-response.interface";
import { Injectable } from "@angular/core";
import { DecodedToken } from "../../models/auth/decoded-token.interface";
import { environment } from 'src/environments/environment';
import { CreateUserRequest } from "../../models/users/user-request.interface";
import { UserResponse } from "../../models/users/user-response.interface";
import { ApiResponse } from "../../models/common/api-response.interface";
import { SignInRequest } from "../../models/auth/sign-in-request.interface";
import { jwtDecode } from 'jwt-decode';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<DecodedToken | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private apiUrl = environment.apiUrl + '/auth';
  private readonly TOKEN_KEY = 'jwtToken';

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromToken();
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  // 토큰 저장 및 사용자 정보 업데이트
  saveToken(jwtToken: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, jwtToken);
    this.loadUserFromToken();
  }

  signUp(createUserRequest: CreateUserRequest): Observable<ApiResponse<UserResponse>> {
    return this.http.post<ApiResponse<UserResponse>>(`${this.apiUrl}/signup`, createUserRequest, {
    });
  }

  // 일반 이메일/비밀번호 로그인
  signIn(signInRequestData: SignInRequest): Observable<AuthResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<AuthResponse>(`${this.apiUrl}/signin`, signInRequestData, { headers, withCredentials: true, observe: 'response' }).pipe(
      tap(response => {
        const jwtToken = response.headers.get('Authorization');
        if (jwtToken) {
          this.saveToken(jwtToken);
        } else if (response.body && response.body.data && response.body.data.jwtToken) {
          this.saveToken(response.body.data.jwtToken);
        }
      }),
      map(response => {
        if (response.body) {
          return response.body as AuthResponse;
        }
        return {} as AuthResponse; // 혹은 throw new Error('Empty response body');
      })
    );
  }

  initiateGoogleSignIn(): void {
    window.location.href = `${this.apiUrl}/google/signin`;
  }

  signOut(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSubject.next(null);
  }

  loadUserFromToken(): DecodedToken | null {
    const jwtToken = sessionStorage.getItem('jwtToken');
    if (jwtToken) {
      try {
        const decoded = (jwtDecode as (token: string) => DecodedToken)(jwtToken);
        this.currentUserSubject.next(decoded);
        return decoded;
      } catch (error) {
        this.currentUserSubject.next(null);
        return null;
      }
    }
    return null;
  }

  // 토큰 만료 여부 확인
  isTokenExpired(): boolean {
    const tokenData = this.currentUserSubject.value;
    if (tokenData && tokenData.exp) {
      const expirationTime = tokenData.exp * 1000; // JWT 'exp'는 초 단위
      return Date.now() >= expirationTime;
    }
    return true;
  }

  getAttendanceJwt(classId: number, sessionId: number): Observable<ApiResponse<string>> {
    console.log('get attendance jwt token: ', `${this.apiUrl}/attendance/${classId}/${sessionId}`);

    const jwtToken = sessionStorage.getItem('jwtToken');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    });

    return this.http.get<ApiResponse<string>>(`${this.apiUrl}/attendance/${classId}/${sessionId}`, {
      headers: headers,
      withCredentials: true
    });
  }
}