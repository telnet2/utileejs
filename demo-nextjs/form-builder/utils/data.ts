/**
 * Data Manipulation Utilities
 */

/**
 * Get a value from an object by path
 * @param obj The object
 * @param path Dot-notation path (e.g., "user.address.city")
 * @param defaultValue Default value if path doesn't exist
 * @returns The value at the path
 */
export function getValueByPath(obj: any, path: string, defaultValue?: any): any {
  if (!path) return obj;
  if (!obj) return defaultValue;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }

    // Handle array indices
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      current = current[arrayName]?.[parseInt(index, 10)];
    } else {
      current = current[key];
    }
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Set a value in an object by path (immutable)
 * @param obj The object
 * @param path Dot-notation path (e.g., "user.address.city")
 * @param value The value to set
 * @returns New object with the value set
 */
export function setValueByPath(obj: any, path: string, value: any): any {
  if (!path) return value;

  const keys = path.split('.');
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  let current: any = newObj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // Handle array indices
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      const idx = parseInt(index, 10);

      if (!current[arrayName]) {
        current[arrayName] = [];
      } else {
        current[arrayName] = [...current[arrayName]];
      }

      if (!current[arrayName][idx]) {
        current[arrayName][idx] = {};
      } else {
        current[arrayName][idx] = Array.isArray(current[arrayName][idx])
          ? [...current[arrayName][idx]]
          : { ...current[arrayName][idx] };
      }

      current = current[arrayName][idx];
    } else {
      if (!current[key]) {
        current[key] = {};
      } else {
        current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
      }
      current = current[key];
    }
  }

  const lastKey = keys[keys.length - 1];
  const arrayMatch = lastKey.match(/^(\w+)\[(\d+)\]$/);

  if (arrayMatch) {
    const [, arrayName, index] = arrayMatch;
    const idx = parseInt(index, 10);

    if (!current[arrayName]) {
      current[arrayName] = [];
    } else {
      current[arrayName] = [...current[arrayName]];
    }

    current[arrayName][idx] = value;
  } else {
    current[lastKey] = value;
  }

  return newObj;
}

/**
 * Delete a value from an object by path (immutable)
 * @param obj The object
 * @param path Dot-notation path
 * @returns New object with the value deleted
 */
export function deleteValueByPath(obj: any, path: string): any {
  if (!path) return obj;

  const keys = path.split('.');
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  let current: any = newObj;
  const parents: any[] = [{ obj: newObj, key: null }];

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    if (!current[key]) {
      return obj; // Path doesn't exist, return original
    }

    current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] };
    current = current[key];
    parents.push({ obj: current, key });
  }

  const lastKey = keys[keys.length - 1];
  if (Array.isArray(current)) {
    current.splice(parseInt(lastKey, 10), 1);
  } else {
    delete current[lastKey];
  }

  return newObj;
}

/**
 * Check if a path exists in an object
 * @param obj The object
 * @param path Dot-notation path
 * @returns Whether the path exists
 */
export function hasPath(obj: any, path: string): boolean {
  if (!path) return true;
  if (!obj) return false;

  const value = getValueByPath(obj, path);
  return value !== undefined;
}

/**
 * Deep clone an object
 * @param obj The object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as any;
  }

  const cloned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned as T;
}

/**
 * Deep merge two objects
 * @param target Target object
 * @param source Source object
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * Get all paths in an object
 * @param obj The object
 * @param prefix Current path prefix
 * @returns Array of all paths
 */
export function getAllPaths(obj: any, prefix: string = ''): string[] {
  if (!obj || typeof obj !== 'object') {
    return prefix ? [prefix] : [];
  }

  const paths: string[] = [];

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const path = prefix ? `${prefix}[${index}]` : `[${index}]`;
      paths.push(path);
      paths.push(...getAllPaths(item, path));
    });
  } else {
    Object.keys(obj).forEach((key) => {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      paths.push(...getAllPaths(obj[key], path));
    });
  }

  return paths;
}

/**
 * Compare two values for equality (deep comparison)
 * @param a First value
 * @param b Second value
 * @returns Whether the values are equal
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => deepEqual(a[key], b[key]));
}
