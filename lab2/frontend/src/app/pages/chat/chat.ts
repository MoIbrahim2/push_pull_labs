import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  currentUser: any;
  
  activeTab: 'users' | 'groups' = 'users';
  users: any[] = [];
  groups: any[] = [];
  
  selectedChat: any = null; // Can be a user or a group
  chatType: 'private' | 'group' | null = null;
  messages: any[] = [];
  
  newMessage = '';
  newGroupName = '';
  showCreateGroup = false;

  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUser = this.authService.currentUser();
  }

  ngOnInit() {
    this.socketService.connect();
    this.loadUsers();
    this.loadGroups();

    this.subs.add(this.socketService.userCreated.subscribe(user => {
      this.users.push(user);
      this.cdr.detectChanges();
    }));

    this.subs.add(this.socketService.usersUpdated.subscribe(() => {
      this.loadUsers();
    }));

    this.subs.add(this.socketService.groupCreated.subscribe(group => {
      this.groups.unshift(group);
      this.cdr.detectChanges();
    }));

    this.subs.add(this.socketService.groupsUpdated.subscribe(() => {
      this.loadGroups();
    }));

    this.subs.add(this.socketService.privateMessageReceived.subscribe(msg => {
      if (this.chatType === 'private' && (
          (msg.sender._id === this.selectedChat._id && msg.receiver._id === this.currentUser?._id) ||
          (msg.sender._id === this.currentUser?._id && msg.receiver._id === this.selectedChat._id)
         )) {
        this.messages.push(msg);
        this.cdr.detectChanges();
      }
    }));

    this.subs.add(this.socketService.groupMessageReceived.subscribe(msg => {
      if (this.chatType === 'group' && msg.group === this.selectedChat._id) {
        this.messages.push(msg);
        this.cdr.detectChanges();
      }
    }));
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.socketService.disconnect();
  }

  loadUsers() {
    this.chatService.getUsers().subscribe(users => {
      this.users = users;
      this.cdr.detectChanges();
    });
  }

  loadGroups() {
    this.chatService.getGroups().subscribe(groups => {
      this.groups = groups;
      this.cdr.detectChanges();
    });
  }

  createGroup() {
    if (!this.newGroupName.trim()) return;
    this.chatService.createGroup(this.newGroupName).subscribe({
      next: (group) => {
        this.newGroupName = '';
        this.showCreateGroup = false;
        this.cdr.detectChanges();
      },
      error: err => console.error(err)
    });
  }

  selectUser(user: any) {
    if (this.chatType === 'group' && this.selectedChat) {
      this.socketService.leaveGroup(this.selectedChat._id);
    }
    this.selectedChat = user;
    this.chatType = 'private';
    this.chatService.getPrivateMessages(user._id).subscribe(msgs => {
      this.messages = msgs;
      this.cdr.detectChanges();
    });
  }

  selectGroup(group: any) {
    if (this.chatType === 'group' && this.selectedChat && this.selectedChat._id !== group._id) {
      this.socketService.leaveGroup(this.selectedChat._id);
    }
    this.selectedChat = group;
    this.chatType = 'group';
    this.socketService.joinGroup(group._id);
    this.chatService.getGroupMessages(group._id).subscribe(msgs => {
      this.messages = msgs;
      this.cdr.detectChanges();
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChat) return;

    if (this.chatType === 'private') {
      this.socketService.sendPrivateMessage(this.selectedChat._id, this.newMessage);
    } else if (this.chatType === 'group') {
      this.socketService.sendGroupMessage(this.selectedChat._id, this.newMessage);
    }
    
    this.newMessage = '';
  }

  logout() {
    this.authService.logout();
  }
}
