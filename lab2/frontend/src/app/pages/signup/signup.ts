import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="glass-panel auth-card">
        <h2>Create Account</h2>
        <p>Join the real-time chat community</p>
        
        <form class="auth-form" (ngSubmit)="onSubmit()">
          <div>
            <input type="text" class="form-control" placeholder="Username" [(ngModel)]="username" name="username" required>
          </div>
          <div>
            <input type="email" class="form-control" placeholder="Email Address" [(ngModel)]="email" name="email" required>
          </div>
          <div>
            <input type="password" class="form-control" placeholder="Password" [(ngModel)]="password" name="password" required>
          </div>
          
          <div *ngIf="error" class="error-text">{{ error }}</div>
          
          <button type="submit" class="btn-primary" [disabled]="loading">
            {{ loading ? 'Creating Account...' : 'Sign Up' }}
          </button>
        </form>
        
        <div class="auth-links">
          Already have an account? <a routerLink="/login">Log in</a>
        </div>
      </div>
    </div>
  `
})
export class SignupComponent {
  username = '';
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private authService: AuthService) {}

  onSubmit() {
    if (!this.username || !this.email || !this.password) return;
    
    this.loading = true;
    this.error = '';
    
    this.authService.signup({ username: this.username, email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Failed to sign up';
      }
    });
  }
}
