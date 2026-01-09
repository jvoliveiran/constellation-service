import { Module } from '@nestjs/common';
import { PersonService } from './person.service';
import { PersonResolver } from './person.resolver';
import { BullModule } from '@nestjs/bull';
import { PersonConsumer } from './person.consumer';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'person' }), TelemetryModule],
  providers: [PersonService, PersonResolver, PersonConsumer],
  exports: [],
})
export class PersonModule {}
