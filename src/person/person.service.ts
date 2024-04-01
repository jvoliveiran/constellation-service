import { Injectable } from '@nestjs/common';
import { Person } from './person.types';
import { CreatePersonInput } from './person.dto';

@Injectable()
export class PersonService {
  private person: Person[] = [];

  constructor() {
    this.person = [
      {
        id: 1,
        name: 'João',
        age: 34,
      },
    ];
  }

  findAll(): Person[] {
    return this.person;
  }

  findOne(id: number) {
    return this.person.find((person) => person.id === id);
  }

  create(person: CreatePersonInput): Person {
    const nextId = this.person.length + 1;
    const newPerson: Person = {
      id: nextId,
      ...person,
    };
    this.person.push(newPerson);
    return newPerson;
  }
}
