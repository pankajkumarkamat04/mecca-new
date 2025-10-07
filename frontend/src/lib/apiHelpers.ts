/**
 * API helper functions for safe data access
 */

/**
 * Safely extract data from API response
 */
export const getApiData = <T = any>(response: any, fallback: T = null as T): T => {
  return response?.data?.data || fallback;
};

/**
 * Safely extract nested data from API response
 */
export const getNestedApiData = <T = any>(
  response: any, 
  path: string, 
  fallback: T = null as T
): T => {
  const keys = path.split('.');
  let current = response?.data?.data;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return fallback;
    }
  }
  
  return current || fallback;
};

/**
 * Safely extract array data from API response
 */
export const getApiArray = <T = any>(response: any, fallback: T[] = []): T[] => {
  const data = response?.data?.data;
  return Array.isArray(data) ? data : fallback;
};

/**
 * Safely extract pagination data from API response
 */
export const getApiPagination = (response: any) => {
  return response?.data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false
  };
};

/**
 * Safe array access with fallback
 */
export const safeArrayAccess = <T = any>(array: T[] | undefined | null, index: number, fallback: T = null as T): T => {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return fallback;
  }
  return array[index];
};

/**
 * Safe object property access with fallback
 */
export const safeProp = <T = any>(obj: any, prop: string, fallback: T = null as T): T => {
  return obj?.[prop] || fallback;
};

/**
 * Safe nested object property access with fallback
 */
export const safeNestedProp = <T = any>(obj: any, path: string, fallback: T = null as T): T => {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return fallback;
    }
  }
  
  return current || fallback;
};

/**
 * Create a safe data accessor for API responses
 */
export const createApiAccessor = <T = any>(response: any) => ({
  data: getApiData<T>(response),
  array: (fallback: T[] = []) => getApiArray<T>(response, fallback),
  nested: (path: string, fallback: T = null as T) => getNestedApiData<T>(response, path, fallback),
  pagination: getApiPagination(response),
  isSuccess: response?.data?.success === true,
  message: response?.data?.message || 'No message',
  error: response?.data?.error || null
});

/**
 * Safe date parsing with fallback
 */
export const safeDateParse = (dateString: any, fallback: Date = new Date()): Date => {
  if (!dateString) return fallback;
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? fallback : date;
  } catch {
    return fallback;
  }
};

/**
 * Safe number parsing with fallback
 */
export const safeNumberParse = (value: any, fallback: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Safe string access with fallback
 */
export const safeString = (value: any, fallback: string = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

/**
 * Safe boolean access with fallback
 */
export const safeBoolean = (value: any, fallback: boolean = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (typeof value === 'number') return value !== 0;
  return fallback;
};
