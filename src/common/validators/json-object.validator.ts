import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const MAX_METADATA_SIZE_BYTES = 10 * 1024; // 10KB

function getValidationReason(value: unknown): string | null {
  if (typeof value !== 'string') {
    return 'metadata must be a string';
  }

  if (Buffer.byteLength(value, 'utf-8') > MAX_METADATA_SIZE_BYTES) {
    return 'metadata must not exceed 10KB';
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return 'metadata must be valid JSON';
  }

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    return 'metadata must be a JSON object (not array or primitive)';
  }

  return null;
}

@ValidatorConstraint({ name: 'isJsonObject', async: false })
export class JsonObjectValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return getValidationReason(value) === null;
  }

  defaultMessage(args: ValidationArguments): string {
    return (
      getValidationReason(args.value) ?? 'metadata must be a valid JSON object'
    );
  }
}
