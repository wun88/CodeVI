import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgIf } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/core/components/button/button.component';
import { CreateUserRequest } from 'src/app/core/models/users/user-request.interface';
import { UserRole } from 'src/app/core/models/users/user-role.enum';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ToastComponent } from 'src/app/core/components/toast/toast.component';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss'],
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
export class SignUpComponent {
  signUpForm: FormGroup;
  passwordStrength: string = '';
  errorMessage: string = '';

  @ViewChild(ToastComponent) toast!: ToastComponent;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signUpForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, this.passwordStrengthValidator.bind(this)]],
      passwordConfirm: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: [UserRole.STUDENT]
    });
  }

  passwordStrengthValidator(control: any) {
    const password = control.value;
    if (password) {
      this.passwordStrength = this.calculatePasswordStrength(password);
    } else {
      this.passwordStrength = '';
    }
    return null;
  }

  calculatePasswordStrength(password: string): string {
    let strength = 'Weak';
    const lengthCriteria = password.length >= 8;
    const numberCriteria = /[0-9]/.test(password);
    const specialCharCriteria = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (lengthCriteria && numberCriteria && specialCharCriteria) {
      strength = 'Strong';
    } else if (lengthCriteria && (numberCriteria || specialCharCriteria)) {
      strength = 'Medium';
    }
    return strength;
  }

  onSignUp() {
    if (this.signUpForm.invalid) {
      this.showToastMessage('모든 필드를 올바르게 입력하세요.');
      return;
    }

    const createUserRequest: CreateUserRequest = this.signUpForm.value;
    console.log(createUserRequest.email);

    this.authService.signUp(createUserRequest).subscribe({
      next: response => {
        if (response.success) {
          console.log('Sign Up successful:', response.data);
          this.router.navigate(['auth/sign-in']);
        } else {
          this.showToastMessage(response.message || '회원가입에 실패했습니다.');
        }
      },
      error: err => {
        this.showToastMessage('회원가입 중 오류가 발생했습니다.');
        console.error('Sign Up error:', err.error);
      },
      complete: () => {
        console.log('Sign Up request completed.');
      }
    });
  }

  onGoogleSignIn() {
    this.authService.initiateGoogleSignIn();
  }

  private showToastMessage(message: string) {
    this.toast.show(message); // 토스트 메시지 표시
  }
}