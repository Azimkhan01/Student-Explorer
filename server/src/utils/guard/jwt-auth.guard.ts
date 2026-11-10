import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { jwtVerify } from 'jose';

import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {

    const request:any = context
      .switchToHttp()
      .getRequest<Request>();

    // Read role-specific cookies
    const adminToken = request.cookies?.admin_access_token;
    const userToken = request.cookies?.user_access_token;
      
    // Select available token
    const token = adminToken || userToken;
    // console.log(token);
    
    if (!token) {
      throw new UnauthorizedException(
        'Authentication required. Please login first.',
      );
    }

    try {
      const secret = this.configService.get<string>(
        'JWT_SECRET',
      );

      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }

      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
      );

      // console.log(payload);
      

      // Validate role
      const allowedRoles = ['admin', 'teacher', 'student'];

      if (
        typeof payload.role !== 'string' ||
        !allowedRoles.includes(payload.role)
      ) {
        throw new UnauthorizedException('Invalid user role.');
      }

      // Attach authenticated user to request
      request.user = {
        id: payload.sub,
        email: payload.email as string,
        role: payload.role,
      };

      return true;

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }
  }
}