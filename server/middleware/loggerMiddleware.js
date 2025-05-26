// Create a logger middleware to help debug API requests

const logger = (req, res, next) => {
  const start = Date.now();
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  // Log request body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  
  // Log request parameters
  if (Object.keys(req.params).length > 0) {
    console.log('Request params:', req.params);
  }
  
  // Capture the original res.json method
  const originalJson = res.json;
  
  // Override res.json to log the response
  res.json = function(body) {
    const responseTime = Date.now() - start;
    console.log(`[${new Date().toISOString()}] Response (${res.statusCode}) - ${responseTime}ms`);
    
    if (res.statusCode >= 400) {
      console.error('Error response:', body);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

module.exports = logger;
