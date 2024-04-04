import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Person } from './person.types';
import { PersonService } from './person.service';
import { CreatePersonInput } from './person.dto';

@Resolver('Person')
export class PersonResolver {
  constructor(private personService: PersonService) {}

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
}
