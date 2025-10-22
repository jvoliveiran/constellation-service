#!/usr/bin/env node

/**
 * Simple test script to verify OpenTelemetry setup
 * Run this after starting the application and Jaeger
 */

import { request } from 'http';

// GraphQL mutation to create a person
const createPersonMutation = {
  query: `
    mutation CreatePerson($input: CreatePersonInput!) {
      createPerson(personInput: $input) {
        id
        name
        age
      }
    }
  `,
  variables: {
    input: {
      name: 'Test User',
      age: 25,
    },
  },
};

// GraphQL query to get all people
const getAllPeopleQuery = {
  query: `
    query GetAllPeople {
      people {
        id
        name
        age
      }
    }
  `,
};

function makeGraphQLRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'OpenTelemetry-Test-Script/1.0',
      },
    };

    const req = request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testTelemetry() {
  console.log('🚀 Testing OpenTelemetry setup...\n');

  try {
    // Test 1: Create a person (should generate traces)
    console.log('📝 Creating a test person...');
    const createResult = await makeGraphQLRequest(createPersonMutation);

    if (createResult.errors) {
      console.error('❌ Error creating person:', createResult.errors);
    } else {
      console.log('✅ Person created:', createResult.data.createPerson);
    }

    // Wait a bit for async processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 2: Query all people (should generate more traces)
    console.log('\n📋 Querying all people...');
    const queryResult = await makeGraphQLRequest(getAllPeopleQuery);

    if (queryResult.errors) {
      console.error('❌ Error querying people:', queryResult.errors);
    } else {
      console.log('✅ People retrieved:', queryResult.data.people);
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('\n📊 Check your traces at: http://localhost:16686');
    console.log('📈 Check your metrics at: http://localhost:9464/metrics');
    console.log('\n🔍 In Jaeger UI:');
    console.log(
      '   1. Select "constellation-service" from the service dropdown',
    );
    console.log('   2. Click "Find Traces" to see the generated traces');
    console.log('   3. Look for spans like:');
    console.log('      - HTTP POST /graphql');
    console.log('      - GraphQL operations');
    console.log('      - PersonService.create');
    console.log('      - PersonService.findAll');
    console.log('      - Database operations');
    console.log('      - Queue operations');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Make sure:');
    console.log('   1. The application is running on port 3000');
    console.log('   2. Jaeger is running on port 16686');
    console.log('   3. Database is accessible');
    console.log('   4. Redis is running for queues');
  }
}

// Run the test
testTelemetry();
