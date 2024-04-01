import { Injectable } from '@nestjs/common';
import { Person } from './person.types';

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
}
