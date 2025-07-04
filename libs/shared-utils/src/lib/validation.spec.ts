import {
  RequiredRule,
  EmailRule,
  UrlRule,
  MinLengthRule,
  MaxLengthRule,
  PatternRule,
  Validator,
  createValidator,
  ValidationRule,
} from './validation';

describe('validation', () => {
  describe('RequiredRule', () => {
    let rule: RequiredRule<unknown>;

    beforeEach(() => {
      rule = new RequiredRule();
    });

    it('should pass for non-empty string', () => {
      const result = rule.validate('hello');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should pass for number zero', () => {
      const result = rule.validate(0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should pass for boolean false', () => {
      const result = rule.validate(false);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should pass for arrays', () => {
      const result = rule.validate([]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should pass for objects', () => {
      const result = rule.validate({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail for null', () => {
      const result = rule.validate(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Field is required']);
    });

    it('should fail for undefined', () => {
      const result = rule.validate(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Field is required']);
    });

    it('should fail for empty string', () => {
      const result = rule.validate('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Field is required']);
    });

    it('should pass for whitespace string', () => {
      const result = rule.validate('   ');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('EmailRule', () => {
    let rule: EmailRule;

    beforeEach(() => {
      rule = new EmailRule();
    });

    it('should pass for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'test123@test-domain.com',
        'a@b.c',
        'test_user@example.com',
        'firstName.lastName@company.org',
      ];

      validEmails.forEach(email => {
        const result = rule.validate(email);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should fail for invalid email addresses', () => {
      const invalidEmails = [
        'invalid.email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example .com',
        'user@.com',
        'user..name@example.com',
        '',
        'user',
        'user@',
        '@',
        'user@example',
        'user name@example.com',
        'user@exam ple.com',
      ];

      invalidEmails.forEach(email => {
        const result = rule.validate(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(['Invalid email format']);
      });
    });

    it('should handle edge cases', () => {
      // Very long email
      const longEmail = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.com';
      const result1 = rule.validate(longEmail);
      expect(result1.isValid).toBe(true);

      // Email with numbers
      const numberEmail = '123@456.789';
      const result2 = rule.validate(numberEmail);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('UrlRule', () => {
    let rule: UrlRule;

    beforeEach(() => {
      rule = new UrlRule();
    });

    it('should pass for valid URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://www.example.com',
        'https://example.com/path',
        'https://example.com/path/to/resource',
        'https://example.com:8080',
        'https://example.com?query=value',
        'https://example.com#anchor',
        'https://example.com/path?query=value#anchor',
        'ftp://example.com',
        'file:///path/to/file',
        'https://sub.domain.example.com',
        'https://example.com/path%20with%20spaces',
        'https://user:pass@example.com',
        'https://192.168.1.1',
        'https://[::1]',
      ];

      validUrls.forEach(url => {
        const result = rule.validate(url);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should fail for invalid URLs', () => {
      const invalidUrls = [
        'not a url',
        'example.com',
        'www.example.com',
        '//example.com',
        'http:/example.com',
        'http//example.com',
        'http:example.com',
        'ht tp://example.com',
        '',
        'javascript:alert(1)',
        'http://',
        'http://.',
        'http://..',
        'http://../',
        'http://?',
        'http://??',
        'http://??/',
        'http://#',
        'http://##',
        'http://##/',
        'http:///a',
        'http:// ',
      ];

      invalidUrls.forEach(url => {
        const result = rule.validate(url);
        expect(result.isValid).toBe(false);
        expect(result.errors).toEqual(['Invalid URL format']);
      });
    });

    it('should handle special URL formats', () => {
      // Data URL
      const dataUrl = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==';
      const result1 = rule.validate(dataUrl);
      expect(result1.isValid).toBe(true);

      // Localhost URL
      const localhostUrl = 'http://localhost:3000';
      const result2 = rule.validate(localhostUrl);
      expect(result2.isValid).toBe(true);

      // URL with port
      const portUrl = 'https://example.com:65535/path';
      const result3 = rule.validate(portUrl);
      expect(result3.isValid).toBe(true);
    });
  });

  describe('Validator', () => {
    let validator: Validator<string>;

    beforeEach(() => {
      validator = new Validator<string>();
    });

    it('should pass when no rules are added', () => {
      const result = validator.validate('any value');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate with single rule', () => {
      validator.addRule(new RequiredRule());

      const result1 = validator.validate('value');
      expect(result1.isValid).toBe(true);
      expect(result1.errors).toEqual([]);

      const result2 = validator.validate('');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toEqual(['Field is required']);
    });

    it('should validate with multiple rules', () => {
      validator
        .addRule(new RequiredRule())
        .addRule(new EmailRule());

      const result1 = validator.validate('test@example.com');
      expect(result1.isValid).toBe(true);
      expect(result1.errors).toEqual([]);

      const result2 = validator.validate('');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toEqual(['Field is required', 'Invalid email format']);

      const result3 = validator.validate('not-an-email');
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toEqual(['Invalid email format']);
    });

    it('should support method chaining', () => {
      const result = validator
        .addRule(new RequiredRule())
        .addRule(new EmailRule());

      expect(result).toBe(validator);
    });

    it('should collect all errors from all rules', () => {
      // Custom rule that always fails
      const customRule: ValidationRule<string> = {
        validate: () => ({
          isValid: false,
          errors: ['Custom error 1', 'Custom error 2'],
        }),
      };

      validator
        .addRule(new RequiredRule())
        .addRule(new EmailRule())
        .addRule(customRule);

      const result = validator.validate('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        'Field is required',
        'Invalid email format',
        'Custom error 1',
        'Custom error 2',
      ]);
    });

    it('should stop at first error if all rules pass', () => {
      const passingRule: ValidationRule<string> = {
        validate: () => ({
          isValid: true,
          errors: [],
        }),
      };

      validator
        .addRule(passingRule)
        .addRule(passingRule)
        .addRule(passingRule);

      const result = validator.validate('any value');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('createValidator', () => {
    it('should create a new Validator instance', () => {
      const validator = createValidator<string>();
      expect(validator).toBeInstanceOf(Validator);
    });

    it('should create validators with different types', () => {
      const stringValidator = createValidator<string>();
      const numberValidator = createValidator<number>();
      const objectValidator = createValidator<{ email: string }>();

      expect(stringValidator).toBeInstanceOf(Validator);
      expect(numberValidator).toBeInstanceOf(Validator);
      expect(objectValidator).toBeInstanceOf(Validator);
    });

    it('should create independent validator instances', () => {
      const validator1 = createValidator<string>();
      const validator2 = createValidator<string>();

      validator1.addRule(new RequiredRule());

      const result1 = validator1.validate('');
      const result2 = validator2.validate('');

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Custom ValidationRule', () => {
    it('should allow custom validation rules', () => {
      const minLengthRule = (minLength: number): ValidationRule<string> => ({
        validate: (value: string) => ({
          isValid: value.length >= minLength,
          errors: value.length >= minLength ? [] : [`Minimum length is ${minLength}`],
        }),
      });

      const maxLengthRule = (maxLength: number): ValidationRule<string> => ({
        validate: (value: string) => ({
          isValid: value.length <= maxLength,
          errors: value.length <= maxLength ? [] : [`Maximum length is ${maxLength}`],
        }),
      });

      const validator = createValidator<string>()
        .addRule(minLengthRule(5))
        .addRule(maxLengthRule(10));

      const result1 = validator.validate('test');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toEqual(['Minimum length is 5']);

      const result2 = validator.validate('valid');
      expect(result2.isValid).toBe(true);
      expect(result2.errors).toEqual([]);

      const result3 = validator.validate('this is too long');
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toEqual(['Maximum length is 10']);
    });

    it('should allow async-like validation rules', () => {
      // Note: The current implementation is synchronous, but we can test
      // that it works with rules that could be made async in the future
      const databaseCheckRule: ValidationRule<string> = {
        validate: (value: string) => {
          // Simulate database check
          const existingUsers = ['admin', 'user', 'test'];
          const exists = existingUsers.includes(value);
          
          return {
            isValid: !exists,
            errors: exists ? ['Username already taken'] : [],
          };
        },
      };

      const validator = createValidator<string>()
        .addRule(new RequiredRule())
        .addRule(databaseCheckRule);

      const result1 = validator.validate('admin');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toEqual(['Username already taken']);

      const result2 = validator.validate('newuser');
      expect(result2.isValid).toBe(true);
      expect(result2.errors).toEqual([]);
    });
  });

  describe('MinLengthRule', () => {
    it('should validate minimum length correctly', () => {
      const rule = new MinLengthRule(5);

      expect(rule.validate('hello').isValid).toBe(true);
      expect(rule.validate('hello world').isValid).toBe(true);
      expect(rule.validate('hi').isValid).toBe(false);
      expect(rule.validate('hi').errors).toEqual(['Minimum length is 5 characters']);
      expect(rule.validate('').isValid).toBe(false);
    });

    it('should handle zero minimum length', () => {
      const rule = new MinLengthRule(0);

      expect(rule.validate('').isValid).toBe(true);
      expect(rule.validate('any string').isValid).toBe(true);
    });

    it('should throw error for negative minimum length', () => {
      expect(() => new MinLengthRule(-1)).toThrow('Minimum length must be non-negative');
    });
  });

  describe('MaxLengthRule', () => {
    it('should validate maximum length correctly', () => {
      const rule = new MaxLengthRule(10);

      expect(rule.validate('hello').isValid).toBe(true);
      expect(rule.validate('hello world').isValid).toBe(false);
      expect(rule.validate('hello world').errors).toEqual(['Maximum length is 10 characters']);
      expect(rule.validate('0123456789').isValid).toBe(true);
      expect(rule.validate('01234567890').isValid).toBe(false);
    });

    it('should handle zero maximum length', () => {
      const rule = new MaxLengthRule(0);

      expect(rule.validate('').isValid).toBe(true);
      expect(rule.validate('a').isValid).toBe(false);
    });

    it('should throw error for negative maximum length', () => {
      expect(() => new MaxLengthRule(-1)).toThrow('Maximum length must be non-negative');
    });
  });

  describe('PatternRule', () => {
    it('should validate against custom regex pattern', () => {
      const rule = new PatternRule(/^[A-Z][a-z]+$/, 'Must start with uppercase letter');

      expect(rule.validate('Hello').isValid).toBe(true);
      expect(rule.validate('hello').isValid).toBe(false);
      expect(rule.validate('hello').errors).toEqual(['Must start with uppercase letter']);
      expect(rule.validate('HELLO').isValid).toBe(false);
      expect(rule.validate('H').isValid).toBe(false); // Requires at least one lowercase
    });

    it('should use default error message when not provided', () => {
      const rule = new PatternRule(/^\d+$/);

      expect(rule.validate('123').isValid).toBe(true);
      expect(rule.validate('abc').isValid).toBe(false);
      expect(rule.validate('abc').errors).toEqual(['Value does not match the required pattern']);
    });

    it('should work with complex patterns', () => {
      // Phone number pattern
      const phoneRule = new PatternRule(
        /^\+?[1-9]\d{1,14}$/,
        'Invalid phone number format'
      );

      expect(phoneRule.validate('+1234567890').isValid).toBe(true);
      expect(phoneRule.validate('1234567890').isValid).toBe(true);
      expect(phoneRule.validate('123-456-7890').isValid).toBe(false);
      expect(phoneRule.validate('').isValid).toBe(false);

      // Alphanumeric with underscores
      const usernameRule = new PatternRule(
        /^[a-zA-Z0-9_]{3,20}$/,
        'Username must be 3-20 characters, alphanumeric or underscore'
      );

      expect(usernameRule.validate('user_123').isValid).toBe(true);
      expect(usernameRule.validate('us').isValid).toBe(false);
      expect(usernameRule.validate('user@123').isValid).toBe(false);
    });
  });

  describe('Combined validation rules', () => {
    it('should work with multiple length rules', () => {
      const validator = createValidator<string>()
        .addRule(new RequiredRule())
        .addRule(new MinLengthRule(5))
        .addRule(new MaxLengthRule(10));

      expect(validator.validate('hello').isValid).toBe(true);
      expect(validator.validate('hi').isValid).toBe(false);
      expect(validator.validate('hello world!').isValid).toBe(false);
      expect(validator.validate('').isValid).toBe(false);
    });

    it('should work with pattern and length rules', () => {
      const validator = createValidator<string>()
        .addRule(new MinLengthRule(8))
        .addRule(new PatternRule(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain lowercase, uppercase, and number'
        ));

      expect(validator.validate('Pass123!').isValid).toBe(true);
      expect(validator.validate('password').isValid).toBe(false); // No uppercase or number
      expect(validator.validate('Pass!').isValid).toBe(false); // Too short
      expect(validator.validate('PASSWORD123').isValid).toBe(false); // No lowercase
    });
  });
});