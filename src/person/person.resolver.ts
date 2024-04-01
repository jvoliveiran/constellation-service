import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Person } from './person.types';
import { PersonService } from './person.service';

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
}
