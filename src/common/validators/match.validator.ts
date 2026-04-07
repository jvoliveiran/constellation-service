import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function Match(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    if (typeof propertyName !== 'string') {
      return;
    }

    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const relatedPropertyName = args.constraints[0];
          if (typeof relatedPropertyName !== 'string') {
            return false;
          }
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          return value === relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const relatedPropertyName = args.constraints[0];
          if (typeof relatedPropertyName !== 'string') {
            return `${args.property} must match the related property`;
          }
          return `${args.property} must match ${relatedPropertyName}`;
        },
      },
    });
  };
}
