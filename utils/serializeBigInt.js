export function serializeBigInts(obj) {
  // Handle BigInt values
  if (typeof obj === 'bigint') {
    return obj.toString(); // ✅ Convert to string
  }
  
  // Handle arrays recursively
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts); // ✅ Process each array element
  }
  
  // Handle objects recursively
  if (obj && typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, serializeBigInts(v)])
    ); // ✅ Process each object property
  }
  
  // Return primitive values unchanged
  return obj;
}
