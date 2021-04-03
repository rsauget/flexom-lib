#!/usr/bin/env node
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
const _ = require('lodash');
const inquirer = require('inquirer');
const flexom = require('../index.js');

async function main() {
  const answers = await inquirer.prompt([
    {
      message: 'Flexom email',
      name: 'email',
      type: 'input',
    }, {
      message: 'Flexom password',
      name: 'password',
      type: 'password',
    },
  ]);

  const client = await flexom.createClient(answers);

  const zones = await Promise.all((await client.getZones()).map(async zone => {
    const { settings } = await client.getZone(zone);
    return _.merge(zone, { settings });
  }));

  console.log(JSON.stringify(zones, null, 2));
}

main().catch(console.error);