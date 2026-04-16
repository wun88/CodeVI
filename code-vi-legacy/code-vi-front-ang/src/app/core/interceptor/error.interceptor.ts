import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

    constructor(private router: Router) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((err: any) => this.handleError(err))
        );
    }

    private handleError(err: HttpErrorResponse) {
        if (err.status === 0) {
            console.error('Network error: Unable to connect to the server.');
            this.router.navigate(['/errors/500']); // 네트워크 오류(서버 OFF 고려)
        } else if (err.status === 401 || err.status === 404 || err.status === 403 ) {
            console.error('Unauthorized: Redirecting to login page.');
            this.router.navigate(['/errors/400']); // 클라이언트 일반 오류
        } else {
            console.error('Error occurred:', err);
            this.router.navigate(['/errors/500']); // 서버 일반 오류
        }
        return throwError(() => new Error(err.message || 'Unknown error'));
    }
}
