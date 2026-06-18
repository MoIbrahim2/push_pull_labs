import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostsService, Post } from '../services/posts.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-long-polling',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="demo-container page-long-polling">
      <!-- Header / Banner -->
      <div class="demo-header">
        <div class="strategy-badge teal">Long Polling</div>
        <h1>Long Polling Demonstration</h1>
        <p class="description">
          Long polling is a web development communication strategy where the client sends a request to the server, and the server holds the response open (pending) until new data is available. Upon receiving updates, the client immediately requests again.
        </p>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Control Panel & Metrics -->
        <div class="panel card">
          <div class="card-header">
            <h3>Metrics & Controls</h3>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">Request Count</span>
              <span class="metric-value text-teal animate-count">{{ requestCount }}</span>
              <span class="metric-desc">GET /long/posts requests opened</span>
            </div>
            
            <div class="metric-card">
              <span class="metric-label">Connection Status</span>
              <div class="status-indicator-wrapper">
                <span class="status-dot pulsing" [ngClass]="{'active': isPollingActive, 'pending': isWaitingOnServer}"></span>
                <span class="status-text">{{ statusText }}</span>
              </div>
              <span class="metric-desc">Active long-poll state</span>
            </div>
          </div>

          <div class="timestamp-box">
            <span>Last Updated:</span>
            <strong>{{ lastUpdatedText }}</strong>
          </div>

          <hr class="divider">

          <!-- Create Post Form -->
          <form (ngSubmit)="createPost()" class="post-form">
            <h4>Create New Post</h4>
            <div class="form-group">
              <input 
                type="text" 
                name="newPostTitle"
                [(ngModel)]="newPostTitle" 
                placeholder="Enter post title (e.g., Real-time update!)"
                required
                class="form-control"
              />
              <button type="submit" class="btn btn-teal" [disabled]="!newPostTitle.trim() || isSubmitting">
                <span>{{ isSubmitting ? 'Creating...' : 'Create Post' }}</span>
              </button>
            </div>
            <p class="form-tip">
              Creating this post will save it to MongoDB, retrieve all posts, and immediately resolve all pending client GET requests!
            </p>
          </form>
        </div>

        <!-- Request Logs Visualizer -->
        <div class="panel card">
          <div class="card-header flex-header">
            <h3>Network Request Log</h3>
            <button (click)="clearLogs()" class="btn-text">Clear Logs</button>
          </div>
          
          <div class="console-box" #consoleBox>
            <div *ngIf="logs.length === 0" class="console-empty">
              No network requests recorded yet.
            </div>
            <div *ngFor="let log of logs" class="console-line">
              <span class="log-time">[{{ log.time }}]</span>
              <span class="log-method" [class.text-teal]="log.type === 'get'">{{ log.method }}</span>
              <span class="log-status" [ngClass]="log.statusClass">{{ log.status }}</span>
              <span class="log-info">{{ log.info }}</span>
            </div>
          </div>
          <div class="panel-footer">
            <span class="badge badge-success">HTTP GET remains open in pending state</span>
          </div>
        </div>
      </div>

      <!-- Comparison Explainer Box -->
      <div class="explainer-section card">
        <h3>How Long Polling Works in This Demo</h3>
        <div class="comparison-row">
          <div class="comparison-column">
            <h5>Advantages</h5>
            <ul>
              <li><strong>Zero Waste:</strong> Request counters only increment when updates happen, saving massive client-side and server-side CPU and bandwidth.</li>
              <li><strong>Immediate updates:</strong> Near real-time communication. Clients receive data the millisecond it's created.</li>
              <li><strong>No Special Protocol:</strong> Operates entirely over standard HTTP/1.1 or HTTP/2 without requiring WebSockets.</li>
            </ul>
          </div>
          <div class="comparison-column">
            <h5>Disadvantages</h5>
            <ul class="text-warning-list">
              <li><strong>Server Connection Allocation:</strong> Server must hold connections open, occupying resources/sockets.</li>
              <li><strong>Complex Server State:</strong> Backend must maintain a list of pending responses (in-memory <code>pendingRequests</code> object).</li>
              <li><strong>Scale Requirements:</strong> If thousands of clients connect, standard servers require tuning to handle high levels of concurrent open sockets.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Posts List Section -->
      <div class="posts-section">
        <h2>Posts List ({{ posts.length }})</h2>
        <div class="posts-grid" *ngIf="posts.length > 0; else noPosts">
          <div class="post-card" *ngFor="let post of posts; trackBy: trackPostById">
            <div class="post-title">{{ post.title }}</div>
            <div class="post-meta">
              <span class="post-id">ID: {{ post._id }}</span>
              <span class="post-date">{{ post.createdAt | date:'mediumTime' }}</span>
            </div>
          </div>
        </div>
        <ng-template #noPosts>
          <div class="empty-posts-card card">
            <p>No posts found in the database. Use the form above to create one!</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .demo-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 12px 0;
    }
    .demo-header {
      margin-bottom: 8px;
    }
    .strategy-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .strategy-badge.teal {
      background-color: rgba(20, 184, 166, 0.15);
      color: #2dd4bf;
      border: 1px solid rgba(20, 184, 166, 0.3);
    }
    .description {
      color: #9ca3af;
      font-size: 1.05rem;
      max-width: 800px;
      line-height: 1.6;
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 24px;
    }
    @media (max-width: 900px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
    .panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .metric-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .metric-label {
      font-size: 0.8rem;
      text-transform: uppercase;
      color: #9ca3af;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 2.2rem;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 4px;
    }
    .metric-desc {
      font-size: 0.75rem;
      color: #6b7280;
    }
    .text-teal {
      color: #2dd4bf;
      text-shadow: 0 0 10px rgba(20, 184, 166, 0.3);
    }
    .status-indicator-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 40px;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: #4b5563;
      transition: all 0.3s ease;
    }
    .status-dot.active {
      background-color: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .status-dot.pending {
      background-color: #fbbf24;
      box-shadow: 0 0 8px #fbbf24;
    }
    .pulsing.active {
      animation: pulse 1.5s infinite alternate;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      100% { transform: scale(1.1); opacity: 1; }
    }
    .status-text {
      font-size: 0.95rem;
      font-weight: 600;
      color: #e5e7eb;
    }
    .timestamp-box {
      background: rgba(20, 184, 166, 0.05);
      border-radius: 8px;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      color: #9ca3af;
      border-left: 3px solid #14b8a6;
    }
    .divider {
      border: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 20px 0;
    }
    .post-form h4 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #f3f4f6;
    }
    .form-group {
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
    }
    .form-control {
      flex: 1;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px 16px;
      color: #f3f4f6;
      font-size: 0.95rem;
      transition: border-color 0.2s;
    }
    .form-control:focus {
      outline: none;
      border-color: #14b8a6;
      box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.25);
    }
    .form-tip {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0;
      line-height: 1.4;
    }
    .flex-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-text {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s, color 0.2s;
    }
    .btn-text:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #f3f4f6;
    }
    .console-box {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      font-family: 'Courier New', Courier, monospace;
      padding: 16px;
      flex: 1;
      overflow-y: auto;
      max-height: 280px;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .console-empty {
      color: #4b5563;
      text-align: center;
      margin: auto 0;
      font-size: 0.9rem;
    }
    .console-line {
      font-size: 0.8rem;
      line-height: 1.4;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
      padding-bottom: 4px;
    }
    .log-time {
      color: #64748b;
    }
    .log-method {
      font-weight: bold;
    }
    .log-status {
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: bold;
    }
    .log-status.status-200 {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
    }
    .log-status.status-201 {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
    }
    .log-status.status-pending {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
    }
    .log-status.status-error {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }
    .log-info {
      color: #cbd5e1;
    }
    .panel-footer {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
    }
    .badge-success {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .explainer-section {
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .explainer-section h3 {
      margin-top: 0;
      margin-bottom: 16px;
      color: #f3f4f6;
    }
    .comparison-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    @media (max-width: 768px) {
      .comparison-row {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
    .comparison-column h5 {
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 0.95rem;
      color: #e5e7eb;
    }
    .comparison-column ul {
      margin: 0;
      padding-left: 20px;
      color: #9ca3af;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .text-warning-list li strong {
      color: #fcd34d;
    }
    .posts-section {
      margin-top: 16px;
    }
    .posts-section h2 {
      margin-top: 0;
      margin-bottom: 16px;
      color: #f3f4f6;
    }
    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .post-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
      transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    .post-card:hover {
      transform: translateY(-2px);
      border-color: rgba(20, 184, 166, 0.25);
      box-shadow: 0 4px 20px rgba(20, 184, 166, 0.08);
    }
    .post-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #f3f4f6;
      word-break: break-word;
    }
    .post-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #6b7280;
    }
    .post-id {
      font-family: monospace;
      background: rgba(0, 0, 0, 0.2);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .empty-posts-card {
      padding: 40px;
      text-align: center;
      color: #9ca3af;
    }
  `]
})
export class LongPolling implements OnInit, OnDestroy {
  posts: Post[] = [];
  requestCount = 0;
  isPollingActive = false;
  isWaitingOnServer = false;
  statusText = 'Initializing...';
  lastUpdatedText = 'Never';
  
  newPostTitle = '';
  isSubmitting = false;
  logs: Array<{ time: string; method: string; status: string; statusClass: string; info: string; type: string }> = [];

  private pollSubscription: Subscription | null = null;

  constructor(private postsService: PostsService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.addLogEntry('Long polling page loaded. Initializing recursive poll sequence.');
    this.isPollingActive = true;
    
    // First, fetch the current state once so we have data immediately
    this.fetchInitialState();
  }

  ngOnDestroy() {
    this.addLogEntry('Long polling component destroyed. Closing active request channel.');
    this.isPollingActive = false;
    this.isWaitingOnServer = false;
    this.statusText = 'Polling Stopped';
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = null;
    }
  }

  /**
   * Fetches the current list of posts one-time via standard GET /posts
   * to seed the interface when the user loads/reloads the page.
   */
  fetchInitialState() {
    this.statusText = 'Fetching current database state...';
    this.cdr.markForCheck();
    this.postsService.getPosts().subscribe({
      next: (data) => {
        this.posts = data;
        if (data.length > 0) {
          this.lastUpdatedText = new Date().toLocaleTimeString();
        }
        this.addLogEntry(`Initial sync loaded ${data.length} post(s)`);
        this.cdr.markForCheck();
        
        // Start recursive long polling
        this.startLongPolling();
      },
      error: (err) => {
        this.addLogEntry('Initial database sync failed: ' + err.message);
        this.cdr.markForCheck();
        // Start long polling anyway
        this.startLongPolling();
      }
    });
  }

  /**
   * Initiates a recursive long poll request GET /long/posts.
   * Increments the request counter, marks status as waiting, and recursively schedules itself
   * immediately when a response is received or after a cooldown upon error.
   */
  startLongPolling() {
    if (!this.isPollingActive) return;

    this.requestCount++;
    this.cdr.markForCheck();
    const reqNum = this.requestCount;
    this.isWaitingOnServer = true;
    this.statusText = 'Waiting (Connection Open)';
    
    this.addLogEntry(`GET /long/posts (Req #${reqNum}) opened. Server keeping request pending...`, 'get', 'PENDING', 'status-pending');

    this.pollSubscription = this.postsService.getLongPosts().subscribe({
      next: (data) => {
        this.isWaitingOnServer = false;
        this.posts = data;
        const now = new Date();
        this.lastUpdatedText = now.toLocaleTimeString();
        
        this.addLogEntry(`GET /long/posts (Req #${reqNum}) resolved by server`, 'get', '200 OK', 'status-200', `Received ${data.length} posts`);
        this.statusText = 'Response Received!';
        this.cdr.markForCheck();

        // Recurse immediately to re-open the long poll connection
        this.startLongPolling();
      },
      error: (err) => {
        this.isWaitingOnServer = false;
        
        // Check if we are still active (i.e. did not destroy component)
        if (!this.isPollingActive) return;

        this.addLogEntry(`GET /long/posts (Req #${reqNum}) failed / timed out`, 'get', 'ERROR', 'status-error', err.message);
        this.statusText = 'Error. Retrying...';
        this.cdr.markForCheck();
        
        // Wait 3 seconds to throttle in case of connection outage, then re-poll
        setTimeout(() => {
          this.startLongPolling();
        }, 3000);
      }
    });
  }

  /**
   * Submits a new post to the long polling POST /long/post endpoint.
   * This immediately resolves the open long poll connections of all clients,
   * including this one.
   */
  createPost() {
    if (!this.newPostTitle.trim() || this.isSubmitting) return;

    this.isSubmitting = true;
    const title = this.newPostTitle.trim();
    this.newPostTitle = '';
    this.cdr.markForCheck();

    this.addLogEntry(`POST /long/post (creating: "${title}") sent...`, 'post');

    this.postsService.createLongPost(title).subscribe({
      next: (createdPost) => {
        this.isSubmitting = false;
        this.addLogEntry(`POST /long/post success`, 'post', '201 Created', 'status-201', `ID: ${createdPost._id}`);
        this.cdr.markForCheck();
        // Note: The UI posts array and request logs will update instantly through the
        // GET /long/posts subscription resolving!
      },
      error: (err) => {
        this.isSubmitting = false;
        this.addLogEntry(`POST /long/post failed`, 'post', 'ERROR', 'status-error', err.message);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Adds a new message line to the console-style log box in the UI.
   */
  addLogEntry(message: string, type: 'get' | 'post' | 'system' = 'system', status = '', statusClass = '', info = '') {
    const time = new Date().toLocaleTimeString();
    
    let method = 'SYSTEM';
    if (type === 'get') method = 'GET /long/posts';
    if (type === 'post') method = 'POST /long/post';

    this.logs.unshift({
      time,
      method,
      status,
      statusClass,
      info,
      type
    });

    if (this.logs.length > 50) {
      this.logs.pop();
    }
  }

  clearLogs() {
    this.logs = [];
    this.addLogEntry('Logs cleared by user.');
    this.cdr.markForCheck();
  }

  trackPostById(index: number, post: Post): string {
    return post._id || index.toString();
  }
}
