import { Module } from '@nestjs/common';
import { UserReferenceResolver } from './user-reference.resolver';

@Module({
  providers: [UserReferenceResolver],
})
export class UserReferenceModule {}
