/**
 * Substitutes environment variable placeholders in a string
 * Supports syntax: ${ENV_VAR_NAME} or ${ENV_VAR_NAME:-default_value}
 *
 * @param text - The text containing environment variable placeholders
 * @returns The text with placeholders replaced by environment variable values
 *
 * @example
 * // With process.env.AWS_KEY = "my-key"
 * substituteEnvVars("accessKey: ${AWS_KEY}") // "accessKey: my-key"
 * substituteEnvVars("region: ${AWS_REGION:-us-east-1}") // "region: us-east-1" (if AWS_REGION not set)
 */
export function substituteEnvVars(text: string): string {
  // Match ${VAR_NAME} or ${VAR_NAME:-default_value}
  const envVarPattern = /\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/g;

  return text.replace(envVarPattern, (match, varName, _, defaultValue) => {
    const envValue = process.env[varName];

    if (envValue !== undefined) {
      return envValue;
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // If no default and env var not set, leave the placeholder as-is
    console.warn(
      `Environment variable ${varName} is not set and no default value provided. Leaving placeholder unchanged.`
    );
    return match;
  });
}

/**
 * Recursively substitutes environment variables in an object
 * Processes all string values in the object, including nested objects and arrays
 *
 * @param obj - The object to process
 * @returns A new object with environment variables substituted
 */
export function substituteEnvVarsInObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return substituteEnvVars(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => substituteEnvVarsInObject(item)) as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVarsInObject(value);
    }
    return result as T;
  }

  return obj;
}
