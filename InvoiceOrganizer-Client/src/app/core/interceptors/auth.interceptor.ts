import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.token) {
        const authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${user.token}`)
        });
        return next(authReq);
      }
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
    }
  }
  return next(req);
};
