import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
  private routerSubscription?: Subscription;

  userProfile: any = null;
  userInitials: string = '';
  private currentToken: string | null = null;

  ngOnInit() {
    this.loadUserProfile();

    // האזנה לניווטים (למשל כאשר עוברים לעמוד אחרי התחברות)
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.loadUserProfile();
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  loadUserProfile() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.userProfile = null;
      this.userInitials = '';
      this.currentToken = null;
      return;
    }

    try {
      const loggedUser = JSON.parse(userStr);
      
      // אין צורך למשוך שוב מהשרת אם כבר טענו עבור הטוקן הזה
      if (this.currentToken === loggedUser.token && this.userProfile) {
        return;
      }
      
      this.currentToken = loggedUser.token;

      // Fallback initials until API responds or if it fails
      this.userInitials = this.getInitials(loggedUser.username || '?');

      const headers = { 'Authorization': `Bearer ${loggedUser.token}` };
      this.http.get('http://localhost:5042/api/account/profile', { headers })
        .subscribe({
          next: (profile: any) => {
            this.userProfile = profile;
            this.userInitials = this.getInitials(profile.fullName || profile.email || loggedUser.username || '?');
            this.cd.detectChanges();
          },
          error: (err) => {
            console.error('Failed to load user profile in sidebar', err);
            // Keeps the fallback username
            this.userProfile = { fullName: loggedUser.username }; 
            this.currentToken = null; // נאפשר ניסיון חוזר בהמשך
            this.cd.detectChanges();
          }
        });
    } catch (e) {
      console.error('Error parsing user token:', e);
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
