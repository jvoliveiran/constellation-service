import { Global, Module } from '@nestjs/common';
import { TokenRevocationService } from './token-revocation.service';

@Global()
@Module({
  providers: [TokenRevocationService],
  exports: [TokenRevocationService],
})
export class AuthModule {}
