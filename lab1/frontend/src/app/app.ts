import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PostsService } from './services/posts.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Polling Demonstration');
  isClearing = false;
  successMessage = '';

  constructor(private postsService: PostsService) {}

  resetDatabase() {
    if (this.isClearing) return;
    this.isClearing = true;
    this.successMessage = '';

    this.postsService.clearPosts().subscribe({
      next: () => {
        this.isClearing = false;
        this.successMessage = 'Database cleared! Waiting connections updated.';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (err) => {
        this.isClearing = false;
        console.error('Failed to clear database:', err);
      }
    });
  }
}

