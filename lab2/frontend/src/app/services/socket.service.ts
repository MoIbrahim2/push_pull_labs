import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;

  public privateMessageReceived = new Subject<any>();
  public groupMessageReceived = new Subject<any>();
  public userCreated = new Subject<any>();
  public groupCreated = new Subject<any>();
  public usersUpdated = new Subject<void>();
  public groupsUpdated = new Subject<void>();

  constructor(private authService: AuthService) {}

  connect() {
    const token = this.authService.getToken();
    if (!token) return;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io('http://localhost:3000', {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('receive-private-message', (message) => {
      this.privateMessageReceived.next(message);
    });

    this.socket.on('receive-group-message', (message) => {
      this.groupMessageReceived.next(message);
    });

    this.socket.on('user-created', (user) => {
      this.userCreated.next(user);
    });

    this.socket.on('users-updated', () => {
      this.usersUpdated.next();
    });

    this.socket.on('group-created', (group) => {
      this.groupCreated.next(group);
    });

    this.socket.on('groups-updated', () => {
      this.groupsUpdated.next();
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  joinGroup(groupId: string) {
    if (this.socket) {
      this.socket.emit('join-group', groupId);
    }
  }

  leaveGroup(groupId: string) {
    if (this.socket) {
      this.socket.emit('leave-group', groupId);
    }
  }

  sendPrivateMessage(receiverId: string, content: string) {
    if (this.socket) {
      this.socket.emit('send-private-message', { receiverId, content });
    }
  }

  sendGroupMessage(groupId: string, content: string) {
    if (this.socket) {
      this.socket.emit('send-group-message', { groupId, content });
    }
  }
}
