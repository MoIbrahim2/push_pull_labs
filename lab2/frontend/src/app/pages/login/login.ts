import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="glass-panel auth-card">
        <h2>Welcome Back</h2>
        <p>Log in to access your chats</p>
        
        <form class="auth-form" (ngSubmit)="onSubmit()">
          <div>
            <input type="email" class="form-control" placeholder="Email Address" [(ngModel)]="email" name="email" required>
          </div>
          <div>
            <input type="password" class="form-control" placeholder="Password" [(ngModel)]="password" name="password" required>
          </div>
          
          <div *ngIf="error" class="error-text">{{ error }}</div>
          
          <button type="submit" class="btn-primary" [disabled]="loading">
            {{ loading ? 'Logging in...' : 'Log In' }}
          </button>
        </form>
        
        <div class="auth-links">
          Don't have an account? <a routerLink="/signup">Sign up</a>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private authService: AuthService) {}

  onSubmit() {
    if (!this.email || !this.password) return;
    
    this.loading = true;
    this.error = '';
    
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Failed to log in';
      }
    });
  }
}
