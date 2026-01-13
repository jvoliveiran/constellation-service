import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestModule } from './factory/create-test-module';
import { PrismaService } from 'src/prisma/prisma.service';
import { create as createPerson } from './factory/person.factory';
import { Person } from 'src/person/person.types';
import { JwtService } from '@nestjs/jwt';

describe('PersonModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let person: Person;
  let jwtToken: string;
  let jwtService: JwtService;

  const { init, close } = createTestModule();

  beforeAll(async () => {
    const testModule = await init();
    app = testModule.app;
    prisma = testModule.prisma;
    jwtService = app.get(JwtService);

    // Generate test JWT token
    jwtToken = jwtService.sign({
      sub: 'test-user-id',
      username: 'testuser',
    });

    person = await createPerson({ name: 'test', age: 1 }, prisma);
  });

  afterAll(async () => {
    await close();
  });

  it('should query all person', async () => {
    const queryData = {
      query: `query GetAllPerson {
        getAll {
          id
          name
          age
        }
      }
      `,
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.getAll.length).toBeGreaterThanOrEqual(1);
  });

  it('should query one person by ID with authentication', async () => {
    const queryData = {
      query: `query GetOne($id: Int!) {
        getOne(id: $id) {
          id,
          name,
          age
        }
      }`,
      variables: { id: person.id },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.getOne.id).toBe(person.id);
  });

  it('should not query one person by ID without authentication', async () => {
    const queryData = {
      query: `query GetOne($id: Int!) {
        getOne(id: $id) {
          id,
          name,
          age
        }
      }`,
      variables: { id: person.id },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0].message).toBe(
      'Unauthorized (401): No authorization token provided',
    );
  });

  it('should add a new person with authentication', async () => {
    const person = {
      name: 'JV',
      age: 15,
    };
    const mutationData = {
      query: `mutation CreatePerson($person: CreatePersonInput!) {
        createPerson(person: $person) {
          age
          id
          name
        }
      }`,
      variables: { person },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(mutationData)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.createPerson.name).toBe(person.name);
    expect(response.body.data.createPerson.age).toBe(person.age);
    expect(response.body.data.createPerson.id).toBeGreaterThanOrEqual(1);
  });

  it('should not add a new person without authentication', async () => {
    const person = {
      name: 'JV',
      age: 15,
    };
    const mutationData = {
      query: `mutation CreatePerson($person: CreatePersonInput!) {
        createPerson(person: $person) {
          age
          id
          name
        }
      }`,
      variables: { person },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(mutationData)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0].message).toBe(
      'Unauthorized (401): No authorization token provided',
    );
  });

  it('should not add a new person when age lower than 1', async () => {
    const person = {
      name: 'JV',
      age: 0,
    };
    const mutationData = {
      query: `mutation CreatePerson($person: CreatePersonInput!) {
        createPerson(person: $person) {
          age
          id
          name
        }
      }`,
      variables: { person },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(mutationData)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0].message).toBe(
      'Bad Request (400): age must not be less than 1',
    );
  });
});
