import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Post {
  _id?: string;
  title: string;
  createdAt: string | Date;
}

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  /**
   * Retrieves the current list of posts immediately from the database.
   * Used in Short Polling to check for updates at standard intervals.
   */
  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/posts`);
  }

  /**
   * Creates a new post in the database.
   * Standard POST action.
   */
  createPost(title: string): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/post`, { title });
  }

  /**
   * Initiates a Long Polling request.
   * The server will hold the HTTP connection open and only return when
   * a new post is created or the database is cleared.
   */
  getLongPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/long/posts`);
  }

  /**
   * Creates a new post and signals the server to resolve all pending Long Polling requests.
   * Used in the Long Polling page to broadcast updates.
   */
  createLongPost(title: string): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/long/post`, { title });
  }

  /**
   * Utility method to clear all posts from MongoDB and reset the demo.
   * Notifies active long pollers by returning an empty array.
   */
  clearPosts(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/posts`);
  }
}
