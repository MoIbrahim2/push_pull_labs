import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  
  currentUser = signal<{ _id: string, username: string, email: string } | null>(null);
  
  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  loadUserFromStorage() {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (userStr && token) {
      this.currentUser.set(JSON.parse(userStr));
    }
  }

  signup(data: any) {
    return this.http.post<{ message: string, token: string, user: any }>(`${this.apiUrl}/signup`, data).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  login(data: any) {
    return this.http.post<{ message: string, token: string, user: any }>(`${this.apiUrl}/login`, data).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  private handleAuthResponse(res: any) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUser.set(res.user);
    this.router.navigate(['/chat']);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}
