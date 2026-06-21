import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders() {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  getUsers() {
    return this.http.get<any[]>(`${this.apiUrl}/users`, { headers: this.getHeaders() });
  }

  getGroups() {
    return this.http.get<any[]>(`${this.apiUrl}/groups`, { headers: this.getHeaders() });
  }

  createGroup(name: string) {
    return this.http.post<any>(`${this.apiUrl}/groups`, { name }, { headers: this.getHeaders() });
  }

  joinGroup(groupId: string) {
    return this.http.post<any>(`${this.apiUrl}/groups/${groupId}/join`, {}, { headers: this.getHeaders() });
  }

  getPrivateMessages(otherUserId: string) {
    return this.http.get<any[]>(`${this.apiUrl}/messages/private/${otherUserId}`, { headers: this.getHeaders() });
  }

  getGroupMessages(groupId: string) {
    return this.http.get<any[]>(`${this.apiUrl}/messages/group/${groupId}`, { headers: this.getHeaders() });
  }
}
