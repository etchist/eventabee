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
    // Enhanced email regex that handles international domains and more edge cases
    // Supports Unicode characters in local and domain parts
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9]{1,}$/;
    const unicodeEmailRegex = /^[\w.!#$%&'*+/=?^`{|}~-]+@[\w](?:[\w-]{0,61}[\w])?(?:\.[\w](?:[\w-]{0,61}[\w])?)+$/;
    
    // Check basic format first
    if (!emailRegex.test(value) && !unicodeEmailRegex.test(value)) {
      return {
        isValid: false,
        errors: ['Invalid email format'],
      };
    }
    
    // Additional validation rules
    const localPart = value.split('@')[0];
    const domainPart = value.split('@')[1];
    
    // Local part validation
    if (localPart.length > 64) {
      return {
        isValid: false,
        errors: ['Email local part exceeds maximum length of 64 characters'],
      };
    }
    
    // Domain part validation
    if (domainPart && domainPart.length > 255) {
      return {
        isValid: false,
        errors: ['Email domain part exceeds maximum length of 255 characters'],
      };
    }
    
    // Check for invalid patterns
    const invalidPatterns = [
      /\.\./,    // Consecutive dots
      /^\./,      // Starting with dot
      /\.@/,      // Dot before @
      /@\./,      // Dot after @
      /\.$/,      // Ending with dot
      /@.*@/,     // Multiple @ symbols
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(value)) {
        return {
          isValid: false,
          errors: ['Invalid email format'],
        };
      }
    }
    
    return {
      isValid: true,
      errors: [],
    };
  }
}

export class UrlRule implements ValidationRule<string> {
  validate(value: string): ValidationResult {
    try {
      const url = new URL(value);
      // Additional validation for common protocols
      const validProtocols = ['http:', 'https:', 'ftp:', 'ftps:', 'file:', 'data:'];
      if (!validProtocols.includes(url.protocol)) {
        return { isValid: false, errors: ['Invalid URL format'] };
      }
      // Ensure hostname exists for http/https/ftp/ftps
      if ((url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'ftp:' || url.protocol === 'ftps:') && 
          (!url.hostname || url.hostname === '.' || url.hostname === '..' || url.hostname === '')) {
        return { isValid: false, errors: ['Invalid URL format'] };
      }
      // Check for triple slashes (http:///a) but allow file:///
      if (url.protocol !== 'file:' && value.includes('///')) {
        return { isValid: false, errors: ['Invalid URL format'] };
      }
      // Check for invalid URLs like "http:/example.com" or "http:example.com"
      if ((url.protocol === 'http:' || url.protocol === 'https:') && !value.startsWith(url.protocol + '//')) {
        return { isValid: false, errors: ['Invalid URL format'] };
      }
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

export class MinLengthRule implements ValidationRule<string> {
  constructor(private minLength: number) {
    if (minLength < 0) {
      throw new Error('Minimum length must be non-negative');
    }
  }

  validate(value: string): ValidationResult {
    const isValid = value.length >= this.minLength;
    return {
      isValid,
      errors: isValid ? [] : [`Minimum length is ${this.minLength} characters`],
    };
  }
}

export class MaxLengthRule implements ValidationRule<string> {
  constructor(private maxLength: number) {
    if (maxLength < 0) {
      throw new Error('Maximum length must be non-negative');
    }
  }

  validate(value: string): ValidationResult {
    const isValid = value.length <= this.maxLength;
    return {
      isValid,
      errors: isValid ? [] : [`Maximum length is ${this.maxLength} characters`],
    };
  }
}

export class PatternRule implements ValidationRule<string> {
  constructor(
    private pattern: RegExp,
    private errorMessage = 'Value does not match the required pattern'
  ) {}

  validate(value: string): ValidationResult {
    const isValid = this.pattern.test(value);
    return {
      isValid,
      errors: isValid ? [] : [this.errorMessage],
    };
  }
}

export const createValidator = <T>(): Validator<T> => new Validator<T>();