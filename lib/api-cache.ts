// Simple client-side cache for API responses
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttlMinutes: number = 30) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000, // Convert to milliseconds
    });
  }
  
  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
}

export const apiCache = new ApiCache();

// Cached fetch wrapper
export async function cachedFetch(
  url: string, 
  options?: RequestInit,
  ttlMinutes: number = 30
): Promise<any> {
  const cacheKey = `${url}_${JSON.stringify(options || {})}`;
  
  // Try to get from cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from network
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    apiCache.set(cacheKey, data, ttlMinutes);
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}