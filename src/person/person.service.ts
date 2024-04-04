import { Injectable } from '@nestjs/common';
import { Person } from './person.types';
import { CreatePersonInput } from './person.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(): Promise<Person[]> {
    return await this.prismaService.person.findMany();
  }

  async findOne(id: number): Promise<Person> {
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
