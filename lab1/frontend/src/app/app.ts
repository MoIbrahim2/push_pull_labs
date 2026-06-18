import { Component, signal, ChangeDetectorRef } from '@angular/core';
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

  constructor(private postsService: PostsService, private cdr: ChangeDetectorRef) {}

  resetDatabase() {
    if (this.isClearing) return;
    this.isClearing = true;
    this.successMessage = '';
    this.cdr.markForCheck();

    this.postsService.clearPosts().subscribe({
      next: () => {
        this.isClearing = false;
        this.successMessage = 'Database cleared! Waiting connections updated.';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (err) => {
        this.isClearing = false;
        this.cdr.markForCheck();
        console.error('Failed to clear database:', err);
      }
    });
  }
}


