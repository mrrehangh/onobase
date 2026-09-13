/**
 * dataGenerator.ts
 * Fake test data generator for database tables.
 * Powered by @faker-js/faker (MIT)
 * https://github.com/faker-js/faker
 * Onobase — Obnet Pty Ltd © 2026
 */

import { faker } from '@faker-js/faker'

export interface ColumnInfo {
  name: string
  dataType: string
  isNullable: boolean
  isPk: boolean
  maxLength?: number
}

export function generateFakeValue(col: ColumnInfo): unknown {
  if (col.isPk) return undefined // skip PKs — let DB auto-generate

  const name = col.name.toLowerCase()
  const type = col.dataType.toLowerCase()

  // ── Column-name heuristics ────────────────────────────────────────────────
  if (name.includes('email'))
    return faker.internet.email()
  if (name.includes('phone') || name.includes('mobile'))
    return faker.phone.number()
  if (name === 'first_name' || name === 'firstname')
    return faker.person.firstName()
  if (name === 'last_name' || name === 'lastname' || name === 'surname')
    return faker.person.lastName()
  if (name === 'name' || name.includes('full_name') || name.includes('fullname'))
    return faker.person.fullName()
  if (name.includes('company') || name.includes('organisation') || name.includes('organization'))
    return faker.company.name()
  if (name.includes('address') || name.includes('street'))
    return faker.location.streetAddress()
  if (name.includes('city'))
    return faker.location.city()
  if (name.includes('state') || name.includes('province'))
    return faker.location.state()
  if (name.includes('country'))
    return faker.location.country()
  if (name.includes('postcode') || name.includes('zipcode') || name.includes('zip') || name.includes('postal'))
    return faker.location.zipCode()
  if (name.includes('url') || name.includes('website') || name.includes('homepage'))
    return faker.internet.url()
  if (name.includes('username') || name.includes('user_name'))
    return faker.internet.username()
  if (name.includes('password') || name.includes('passwd'))
    return faker.internet.password()
  if (name.includes('description') || name.includes('notes') || name.includes('comment') || name.includes('remarks'))
    return faker.lorem.sentence()
  if (name.includes('title') && !name.includes('job'))
    return faker.lorem.words(3)
  if (name.includes('job_title') || name.includes('jobtitle') || name.includes('position'))
    return faker.person.jobTitle()
  if (name.includes('bio') || name.includes('about') || name.includes('summary'))
    return faker.lorem.paragraph()
  if (name.includes('color') || name.includes('colour'))
    return faker.color.human()
  if (name.includes('ip') || name.includes('ip_address') || name.includes('ipaddress'))
    return faker.internet.ipv4()
  if (name.includes('mac') || name.includes('mac_address'))
    return faker.internet.mac()
  if (name.includes('latitude') || name === 'lat')
    return parseFloat(faker.location.latitude().toString())
  if (name.includes('longitude') || name === 'lng' || name === 'lon')
    return parseFloat(faker.location.longitude().toString())
  if (name.includes('amount') || name.includes('price') || name.includes('cost') || name.includes('salary'))
    return parseFloat(faker.finance.amount({ min: 10, max: 10000 }))
  if (name.includes('age'))
    return faker.number.int({ min: 18, max: 80 })
  if (name.includes('score') || name.includes('rating'))
    return faker.number.int({ min: 1, max: 10 })
  if (name.includes('quantity') || name.includes('count') || name.includes('qty'))
    return faker.number.int({ min: 1, max: 100 })

  // ── Type-based fallbacks ──────────────────────────────────────────────────
  if (type === 'uuid')
    return faker.string.uuid()
  if (type === 'boolean' || type === 'bool')
    return faker.datatype.boolean()
  if (type.includes('int') || type === 'numeric' || type === 'decimal' || type === 'real' || type.includes('float') || type.includes('double'))
    return faker.number.int({ min: 1, max: 10000 })
  if (type === 'date')
    return faker.date.past().toISOString().split('T')[0]
  if (type.includes('timestamp'))
    return faker.date.past().toISOString()
  if (type.includes('time'))
    return faker.date.past().toISOString().split('T')[1].split('.')[0]
  if (type.includes('char') || type === 'text' || type === 'name' || type === 'citext') {
    const maxLen = col.maxLength ?? 50
    return faker.lorem.words(2).slice(0, maxLen)
  }
  if (type === 'jsonb' || type === 'json')
    return JSON.stringify({ key: faker.lorem.word(), value: faker.lorem.word() })
  if (type === 'inet' || type === 'cidr')
    return faker.internet.ipv4()
  if (type === 'macaddr')
    return faker.internet.mac()

  // Default
  return faker.lorem.word().slice(0, col.maxLength ?? 50)
}

export function generateFakeRows(
  columns: ColumnInfo[],
  count: number
): Record<string, unknown>[] {
  return Array.from({ length: count }, () => {
    const row: Record<string, unknown> = {}
    for (const col of columns) {
      if (!col.isPk) {
        row[col.name] = generateFakeValue(col)
      }
    }
    return row
  })
}
