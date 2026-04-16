import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
    selector: 'app-sign-out',
    template: '',
    standalone: true
})
export class SignOutComponent {
    constructor(private authService: AuthService, private router: Router) {
        this.signOut();
    }

    signOut() {
        this.authService.signOut();
        this.router.navigate(['/']).then(() => {
            window.location.reload();
        });
    }
}