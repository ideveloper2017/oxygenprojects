import { verify } from 'jsonwebtoken';
import { NestMiddleware, Injectable, ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';

import { AccessTokenPayload } from '../type/jwtPayload';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UsersService) {}

  async use(req: Request | any, res: Response, next: () => void) {
    const bearerHeader = req.headers.authorization;
    const accessToken = bearerHeader && bearerHeader.split(' ')[1];
    let user;

    if (!bearerHeader || !accessToken) {
      return next();
    }

    try {
      const decoded = verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET,
      ) as AccessTokenPayload;
      
      if (typeof decoded === 'string') {
        throw new Error('Invalid access token');
      }
      
      const { userId: id, roles } = decoded;
      user = await this.userService.findOneById(id);
    } catch (error) {
      throw new ForbiddenException('Please register or sign in.');
    }

    if (user) {
      req.user = user;
    }
    next();
  }
}
