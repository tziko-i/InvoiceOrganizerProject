import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);

  userProfile: any = null;
  userInitials: string = '';

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const loggedUser = JSON.parse(userStr);
        // Fallback initials until API responds or if it fails
        this.userInitials = this.getInitials(loggedUser.username || '?');

        const headers = { 'Authorization': `Bearer ${loggedUser.token}` };
        this.http.get('http://localhost:5042/api/account/profile', { headers })
          .subscribe({
            next: (profile: any) => {
              this.userProfile = profile;
              this.userInitials = this.getInitials(profile.fullName || profile.email || loggedUser.username || '?');
            },
            error: (err) => {
              console.error('Failed to load user profile in sidebar', err);
              // Keeps the fallback username
              this.userProfile = { fullName: loggedUser.username }; 
            }
          });
      } catch (e) {
        console.error('Error parsing user token:', e);
      }
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const splitName = name.trim().split(' ');
    if (splitName.length > 1) {
      return (splitName[0][0] + splitName[splitName.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  isOpen = false; // משתנה לניהול מצב התפריט במובייל
  menuItems = [
    { label: 'דשבורד', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'העלאת חשבוניות', icon: 'pi pi-cloud-upload', route: '/upload' },
    { label: 'חשבוניות', icon: 'pi pi-file', route: '/invoices' },
    { label: 'דוחות', icon: 'pi pi-chart-bar', route: '/reports' },
    { label: 'אזור אישי', icon: 'pi pi-cog', route: '/settings' }
 ];
  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }
  
  closeSidebar() {
    this.isOpen = false;
  }

  logout() {
    console.log("Logging out & clearing localStorage...");
    localStorage.clear(); // מחיקה טוטאלית של הטוקן וכל מידע הפרופיל והלוגאין
    this.router.navigate(['/login']);
  }
}
