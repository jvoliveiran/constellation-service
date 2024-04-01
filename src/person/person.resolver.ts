import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Person } from './person.types';
import { PersonService } from './person.service';
import { CreatePersonInput } from './person.dto';

@Resolver('Person')
export class PersonResolver {
  constructor(private personService: PersonService) {}

  @Query(() => [Person])
  getAll(): Person[] {
    return this.personService.findAll();
  }

  @Query(() => Person)
  getOne(@Args('id', { type: () => Int }) id: number): Person {
    return this.personService.findOne(id);
  }

  @Mutation(() => Person)
  createPerson(@Args('person') person: CreatePersonInput): Person {
    return this.personService.create(person);
  }
}
