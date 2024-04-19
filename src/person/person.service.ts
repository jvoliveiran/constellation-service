import { Inject, Injectable, Logger } from '@nestjs/common';
import { Person } from './person.types';
import { CreatePersonInput } from './person.dto';
import { PrismaService } from '../prisma/prisma.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class PersonService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async findAll(): Promise<Person[]> {
    this.logger.log('Finding all people', PersonService.name);
    return await this.prismaService.person.findMany();
  }

  async findOne(id: number): Promise<Person> {
    this.logger.debug('Finding one person', PersonService.name);
    return await this.prismaService.person.findUnique({
      where: {
        id,
      },
    });
  }

  async create(personInput: CreatePersonInput): Promise<Person> {
    const person = await this.prismaService.person.create({
      data: personInput,
    });
    return person;
  }
}
