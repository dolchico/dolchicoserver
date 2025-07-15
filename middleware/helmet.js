import helmet from 'helmet';

// Export a factory function so you always call it as helmet()
export default function helmetMiddleware(options = {}) {
  return helmet(options);
}
