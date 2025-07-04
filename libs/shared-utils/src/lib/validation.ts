export interface ValidationRule<T> {
  validate(value: T): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class RequiredRule<T> implements ValidationRule<T> {
  validate(value: T): ValidationResult {
    const isValid = value !== null && value !== undefined && value !== '';
    return {
      isValid,
      errors: isValid ? [] : ['Field is required'],
    };
  }
}

export class EmailRule implements ValidationRule<string> {
  validate(value: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(value);
    return {
      isValid,
      errors: isValid ? [] : ['Invalid email format'],
    };
  }
}

export class UrlRule implements ValidationRule<string> {
  validate(value: string): ValidationResult {
    try {
      new URL(value);
      return { isValid: true, errors: [] };
    } catch {
      return { isValid: false, errors: ['Invalid URL format'] };
    }
  }
}

export class Validator<T> {
  private rules: ValidationRule<T>[] = [];

  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  validate(value: T): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      const result = rule.validate(value);
      if (!result.isValid) {
        errors.push(...result.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const createValidator = <T>(): Validator<T> => new Validator<T>();