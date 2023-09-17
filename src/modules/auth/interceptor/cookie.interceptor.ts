import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Set refreshToken to cookie and remove refreshToken from payload */
@Injectable()
export class CookieInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        const res = context.switchToHttp().getResponse();
        // const req = context.switchToHttp().getRequest();

        const { accessToken, refreshToken } = data;

        // req.cookie('refreshToken', refreshToken, {
        //     httpOnly: true,
        //     secure:true,
        //     sameSite:'none',
        //     // maxAge: 1000 * 60 * 60 * 24 * 7,
        //     // path: '/api/auth/refresh-token',
        // })
        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure:true,
          sameSite:'none',
          // maxAge: 1000 * 60 * 60 * 24 * 7,
          // path: '/api/auth/refresh-token',
        });

        return { accessToken,refreshToken };
      }),
    );
  }
}
