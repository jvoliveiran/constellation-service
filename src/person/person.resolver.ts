import {
  Args,
  Int,
  Mutation,
  Query,
  ResolveReference,
  Resolver,
} from '@nestjs/graphql';
import { Person } from './person.types';
import { PersonService } from './person.service';
import { CreatePersonInput } from './person.dto';
import { Inject, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver('Person')
export class PersonResolver {
  constructor(
    private personService: PersonService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  @Query(() => [Person])
  async getAll(): Promise<Person[]> {
    return await this.personService.findAll();
  }

  @Query(() => Person)
  async getOne(@Args('id', { type: () => Int }) id: number): Promise<Person> {
    return await this.personService.findOne(id);
  }

  @Mutation(() => Person)
  async createPerson(
    @Args('person') person: CreatePersonInput,
  ): Promise<Person> {
    return await this.personService.create(person);
  }

  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    this.logger.log(
      `Resolving reference ${reference.__typename} for id ${reference.id}`,
    );
    return this.personService.findOne(Int.parseValue(reference.id));
  }
}
