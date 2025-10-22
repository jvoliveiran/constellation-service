import { Inject, Injectable, Logger } from '@nestjs/common';
import { Person } from './person.types';
import { CreatePersonInput } from './person.dto';
import { PrismaService } from '../prisma/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TelemetryService } from '../telemetry/telemetry.service';
import { SpanKind } from '@opentelemetry/api';

@Injectable()
export class PersonService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    @InjectQueue('person')
    private readonly personQueue: Queue,
    private readonly telemetryService: TelemetryService,
  ) {}

  async findAll(): Promise<Person[]> {
    return await this.telemetryService.withSpan(
      'PersonService.findAll',
      async () => {
        this.logger.log('Finding all people', PersonService.name);
        this.telemetryService.addAttributes({
          'person.operation': 'findAll',
          'person.service': 'PersonService',
        });

        const people = await this.prismaService.person.findMany();

        this.telemetryService.addAttributes({
          'person.count': people.length,
        });
        this.telemetryService.addEvent('people.retrieved', {
          count: people.length,
        });

        return people;
      },
      { kind: SpanKind.SERVER },
    );
  }

  async findOne(id: number): Promise<Person> {
    return await this.telemetryService.withSpan(
      'PersonService.findOne',
      async () => {
        this.logger.debug('Finding one person', PersonService.name);
        this.telemetryService.addAttributes({
          'person.operation': 'findOne',
          'person.service': 'PersonService',
          'person.id': id,
        });

        const person = await this.prismaService.person.findUnique({
          where: {
            id,
          },
        });

        if (person) {
          this.telemetryService.addEvent('person.found', {
            personId: person.id,
            personName: person.name,
          });
        } else {
          this.telemetryService.addEvent('person.not_found', {
            requestedId: id,
          });
        }

        return person;
      },
      { kind: SpanKind.SERVER },
    );
  }

  async create(personInput: CreatePersonInput): Promise<Person> {
    return await this.telemetryService.withSpan(
      'PersonService.create',
      async () => {
        this.telemetryService.addAttributes({
          'person.operation': 'create',
          'person.service': 'PersonService',
          'person.input.name': personInput.name,
          'person.input.age': personInput.age,
        });

        // Create person in database
        const person = await this.telemetryService.withSpan(
          'PersonService.create.database',
          async () => {
            return await this.prismaService.person.create({
              data: personInput,
            });
          },
          { kind: SpanKind.CLIENT },
        );

        // Add to queue for processing
        const job = await this.telemetryService.withSpan(
          'PersonService.create.queue',
          async () => {
            return await this.personQueue.add('create-person', person);
          },
          { kind: SpanKind.PRODUCER },
        );

        this.telemetryService.addAttributes({
          'person.created.id': person.id,
          'person.queue.job.id': job.id,
        });

        this.telemetryService.addEvent('person.created', {
          personId: person.id,
          personName: person.name,
          jobId: job.id,
        });

        this.logger.log('Person created', { person, job });
        return person;
      },
      { kind: SpanKind.SERVER },
    );
  }
}
