import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('PersonModule (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it('/graphql Query all', async () => {
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

  it('/graphql Query person by ID', async () => {
    const queryData = {
      query: `query GetOne($id: Int!) {
        getOne(id: $id) {
          id,
          name,
          age
        }
      }`,
      variables: { id: 1 },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.getOne.id).toBe(1);
  });

  it('/graphql Mutation add new person', async () => {
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

    expect(response.body.data.createPerson.name).toBe(person.name);
    expect(response.body.data.createPerson.age).toBe(person.age);
    expect(response.body.data.createPerson.id).toBeGreaterThanOrEqual(1);
  });

  it('/graphql Mutation add new person with age lower than 1', async () => {
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
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0].message).toBe(
      'Bad Request (400): age must not be less than 1',
    );
  });
});
