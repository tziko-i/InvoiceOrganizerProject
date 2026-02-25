import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  errorMessage: string = '';
  successMessage: string = '';

  registerForm = this.fb.group({
    Username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.registerForm.invalid) {
        this.errorMessage = 'אנא בדוק את הטופס, נראה שיש שדות חסרים או לא תקינים.';
        this.registerForm.markAllAsTouched();
        return;
    }

    console.log('Registering...', this.registerForm.value);
    this.http.post("http://localhost:5042/api/account/register", this.registerForm.value)
    .subscribe({
      next: (data:any) => {
        this.successMessage = 'ההרשמה בוצעה בהצלחה! מועבר למערכת...';
        let loggedUser = {username:data.username, token:data.token }
        localStorage.setItem("user", JSON.stringify(loggedUser));
        
        // השהייה קטנה של שנייה כדי שהמשתמש יספיק לראות את הודעת ההצלחה
        setTimeout(() => {
            this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        console.error("Registration error:", err);
        if (err.error && typeof err.error === 'string') {
          this.errorMessage = err.error;
        } else {
          this.errorMessage = 'שגיאה בהרשמה. ייתכן והאימייל כבר קיים במערכת.';
        }
      }
    });
  }
}
