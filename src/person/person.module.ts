import { Module } from '@nestjs/common';
import { PersonService } from './person.service';
import { PersonResolver } from './person.resolver';
import { PersonRepository } from './person.repository';
import { BullModule } from '@nestjs/bull';
import { PersonConsumer } from './person.consumer';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'person' }), PrismaModule],
  providers: [PersonRepository, PersonService, PersonResolver, PersonConsumer],
  exports: [],
})
export class PersonModule {}
