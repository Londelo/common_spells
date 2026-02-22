# External Dependencies - dmd-pipeline

## Production Dependencies

| Package | Version | Purpose | Usage Location |
|---------|---------|---------|----------------|
| @aws-sdk/client-athena | ^3.564.0 | AWS Athena client for querying data lake | Not actively used in src/ |
| @aws-sdk/client-dynamodb | ^3.564.0 | AWS DynamoDB client for database operations | Not actively used in src/ |
| @aws-sdk/client-dynamodb-streams | ^3.564.0 | DynamoDB Streams for change data capture | Used in `src/core/parse.ts` for stream record types |
| @aws-sdk/client-s3 | ^3.564.0 | AWS S3 client for object storage | Used in `src/delivery/S3Storage.ts` for file uploads |
| @aws-sdk/credential-providers | ^3.564.0 | AWS credential provider utilities | Not actively imported (may be transitive) |
| @aws-sdk/lib-dynamodb | ^3.564.0 | High-level DynamoDB document client | Not actively used in src/ |
| @aws-sdk/util-dynamodb | ^3.564.0 | DynamoDB utility functions (marshall/unmarshall) | Used in `src/core/parse.ts` for unmarshalling records |
| avsc | ^5.7.7 | Apache Avro serialization library | Used in `src/format/avro/index.ts` for Avro encoding/decoding |
| liquidjs | ^10.11.1 | Template engine (Liquid syntax) | Not found in src/ (unused) |
| parquets | ^0.10.10 | Apache Parquet file format library | Used in `src/format/parquet/index.ts` for Parquet encoding/decoding |
| uuid | Not listed | UUID generation library | Used in `src/delivery/S3Storage.ts` for unique file names |
| winston | ^3.13.0 | Logging library | Used in `src/logger.ts` for custom log formatting |

## Dev Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| @types/aws-lambda | ^8.10.137 | TypeScript types for AWS Lambda | Type Definitions |
| @types/jest | ^29.5.12 | TypeScript types for Jest | Type Definitions |
| @types/node | ^20.12.7 | TypeScript types for Node.js | Type Definitions |
| @types/uuid | ^9.0.8 | TypeScript types for uuid | Type Definitions |
| @typescript-eslint/eslint-plugin | ^7.7.1 | ESLint plugin for TypeScript | Linting |
| @typescript-eslint/parser | ^7.7.1 | TypeScript parser for ESLint | Linting |
| esbuild | ^0.20.2 | JavaScript bundler and minifier | Build Tools |
| eslint | ^8.54.1 | JavaScript/TypeScript linter | Linting |
| eslint-config-prettier | ^9.1.0 | Prettier config for ESLint | Linting |
| eslint-import-resolver-typescript | ^3.6.1 | TypeScript resolver for eslint-plugin-import | Linting |
| eslint-plugin-import | ^2.29.1 | Import/export syntax linting | Linting |
| eslint-plugin-prettier | ^5.1.3 | Prettier as ESLint rules | Linting |
| jest | ^29.7.0 | Testing framework | Testing |
| prettier | ^3.2.5 | Code formatter | Formatting |
| ts-jest | ^29.1.2 | Jest transformer for TypeScript | Testing |
| ts-node | ^10.9.2 | TypeScript execution for Node.js | Development |
| typescript | ^5.4.5 | TypeScript compiler | Build Tools |

## Peer Dependencies

None specified.

## Package Manager

- **Manager**: Yarn v4.0.2
- **Constraint**: Specified in `packageManager` field

## Dependency Notes

### AWS SDK v3
The project uses AWS SDK v3 with modular packages. All AWS packages are on version ^3.564.0 (consistent versioning).

### Data Serialization
Two serialization formats are supported:
- **Avro** via `avsc` - Binary serialization format
- **Parquet** via `parquets` - Columnar storage format

### Unused Dependencies
- **liquidjs** (^10.11.1) - Template engine not found in any source imports
- **@aws-sdk/client-athena** - Not actively used in src/
- **@aws-sdk/client-dynamodb** - Not actively used (using streams and util instead)
- **@aws-sdk/lib-dynamodb** - Not actively used in src/
- **@aws-sdk/credential-providers** - May be unused (not explicitly imported)

### Missing from package.json
- **uuid** - Imported in `S3Storage.ts` but not listed in dependencies (should be added)
