import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/core/components/button/button.component';
import { SignInRequest } from 'src/app/core/models/auth/sign-in-request.interface';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ToastComponent } from 'src/app/core/components/toast/toast.component';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    AngularSvgIconModule,
    NgClass,
    NgIf,
    ButtonComponent,
    ToastComponent
  ],
})
export class SignInComponent implements OnInit {
  signInForm: FormGroup;
  errorMessage: string = '';

  @ViewChild('emailInput') emailInput!: ElementRef;
  @ViewChild(ToastComponent) toast!: ToastComponent;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.signInForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    const storedEmail = localStorage.getItem('rememberedEmail');
    const isRemembered = localStorage.getItem('rememberMe') === 'true';

    if (storedEmail && isRemembered) {
      this.signInForm.patchValue({
        email: storedEmail,
        rememberMe: true,
      });
    }
  }

  onSignIn() {
    if (this.signInForm.invalid) {
      this.showToastMessage('이메일 또는 비밀번호를 다시 확인 하세요.');
      this.emailInput.nativeElement.focus();
      return;
    }

    const signInRequest: SignInRequest = this.signInForm.value;
    const rememberMe = this.signInForm.value.rememberMe;

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', signInRequest.email);
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberMe');
    }

    this.authService.signIn(signInRequest).subscribe({
      next: response => {
        if (response.success) {
          window.location.href = '/dashboard';
        } else {
          this.showToastMessage('이메일 또는 비밀번호를 다시 확인 하세요.');
        }
      },
      error: err => {
        this.showToastMessage('이메일 또는 비밀번호를 다시 확인 하세요.');
        this.emailInput.nativeElement.focus();
      },
    });
  }

  onGoogleSignIn() {
    this.authService.initiateGoogleSignIn();
  }


  private showToastMessage(message: string) {
    this.toast.show(message);
  }
}