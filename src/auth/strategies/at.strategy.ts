import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET_KEY || 'YOUR_ACCESS_TOKEN_SECRET', // TODO: Move to .env (must match AuthService)
    });
  }

  validate(payload: any) {
    // This return value becomes 'req.user'
    return payload;
  }
}
