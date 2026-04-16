import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  selector: 'app-google-callback',
  templateUrl: './google-callback.component.html',
  styleUrls: ['./google-callback.component.scss'],
  standalone: true,
  imports: []
})
export class GoogleCallbackComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const jwtToken = this.route.snapshot.queryParamMap.get('jwtToken');
    console.log('Google login callback: ', jwtToken);

    if (jwtToken) {
      this.authService.saveToken(jwtToken);
      console.log('Token saved successfully.');
      window.location.href = '/';
    } else {
      console.error('Google login callback: Token not found in URL query parameters.');
      this.router.navigate(['/auth/sign-in'], { queryParams: { error: 'google_token_missing' } });
    }
  }
}