import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  private router = inject(Router);

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
